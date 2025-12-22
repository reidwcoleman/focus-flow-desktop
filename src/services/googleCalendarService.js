/**
 * Google Calendar Service
 * Handles Google Calendar integration for syncing tasks and events
 */

import supabase from '../lib/supabase'
import authService from './authService'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar'

class GoogleCalendarService {
  constructor() {
    this.gapi = null
    this.isGapiLoaded = false
  }

  /**
   * Initialize Google API client
   * @returns {Promise<boolean>}
   */
  async initGoogleAPI() {
    if (this.isGapiLoaded) return true

    try {
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleAPIScript()
      }

      return new Promise((resolve) => {
        window.gapi.load('client:auth2', async () => {
          try {
            await window.gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              clientId: GOOGLE_CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: CALENDAR_SCOPES,
            })

            this.gapi = window.gapi
            this.isGapiLoaded = true
            resolve(true)
          } catch (error) {
            console.error('Google API init error:', error)
            resolve(false)
          }
        })
      })
    } catch (error) {
      console.error('Failed to initialize Google API:', error)
      return false
    }
  }

  /**
   * Load Google API script dynamically
   * @private
   * @returns {Promise<void>}
   */
  loadGoogleAPIScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = resolve
      script.onerror = reject
      document.body.appendChild(script)
    })
  }

  /**
   * Sign in to Google Calendar
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async signIn() {
    try {
      const initialized = await this.initGoogleAPI()
      if (!initialized) {
        throw new Error('Failed to initialize Google API')
      }

      const authInstance = this.gapi.auth2.getAuthInstance()
      const googleUser = await authInstance.signIn()
      const authResponse = googleUser.getAuthResponse(true)

      // Store tokens in database
      const userId = authService.getUserId()
      const connectionData = {
        user_id: userId,
        provider: 'google',
        access_token: authResponse.access_token,
        token_expires_at: new Date(authResponse.expires_at).toISOString(),
        is_active: true,
        sync_enabled: true,
      }

      const { error } = await supabase
        .from('calendar_connections')
        .upsert(connectionData, {
          onConflict: 'user_id,provider',
        })

      if (error) throw error

      return { success: true, error: null }
    } catch (error) {
      console.error('Google Calendar sign in failed:', error)
      return { success: false, error }
    }
  }

  /**
   * Sign out from Google Calendar
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async signOut() {
    try {
      const userId = authService.getUserId()

      // Remove connection from database
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('provider', 'google')

      if (error) throw error

      // Sign out from Google
      if (this.gapi) {
        const authInstance = this.gapi.auth2.getAuthInstance()
        await authInstance.signOut()
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Google Calendar sign out failed:', error)
      return { success: false, error }
    }
  }

  /**
   * Check if user is connected to Google Calendar
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    try {
      const userId = authService.getUserId()
      if (!userId) return false

      const { data } = await supabase
        .from('calendar_connections')
        .select('is_active')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      return !!data
    } catch (error) {
      return false
    }
  }

  /**
   * Get access token for API calls
   * @private
   * @returns {Promise<string|null>}
   */
  async getAccessToken() {
    try {
      const userId = authService.getUserId()
      if (!userId) return null

      const { data } = await supabase
        .from('calendar_connections')
        .select('access_token, token_expires_at')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      if (!data) return null

      // Check if token is expired
      const expiresAt = new Date(data.token_expires_at)
      if (expiresAt <= new Date()) {
        // Token expired, need to refresh
        return null
      }

      return data.access_token
    } catch (error) {
      return null
    }
  }

  /**
   * Create a calendar event from an assignment
   * @param {Object} assignment - Assignment object
   * @returns {Promise<{success: boolean, eventId: string|null, error: Error|null}>}
   */
  async createEvent(assignment) {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Not connected to Google Calendar')
      }

      const event = {
        summary: assignment.title,
        description: assignment.description || '',
        start: {
          dateTime: this.getEventStartTime(assignment.dueDate),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: this.getEventEndTime(assignment.dueDate),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 2 * 60 }, // 2 hours before
          ],
        },
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()
      return { success: true, eventId: data.id, error: null }
    } catch (error) {
      console.error('Failed to create calendar event:', error)
      return { success: false, eventId: null, error }
    }
  }

  /**
   * Sync upcoming events from Google Calendar
   * @param {number} daysAhead - Number of days to look ahead (default 30)
   * @returns {Promise<{events: Array, error: Error|null}>}
   */
  async syncEvents(daysAhead = 30) {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Not connected to Google Calendar')
      }

      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `singleEvents=true&` +
          `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()

      // Update last synced timestamp
      const userId = authService.getUserId()
      await supabase
        .from('calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'google')

      return { events: data.items || [], error: null }
    } catch (error) {
      console.error('Failed to sync calendar events:', error)
      return { events: [], error }
    }
  }

  /**
   * Get event start time (set to 2 hours before due date)
   * @private
   * @param {string} dueDate - Due date string
   * @returns {string} ISO datetime string
   */
  getEventStartTime(dueDate) {
    const date = new Date(dueDate)
    date.setHours(date.getHours() - 2)
    return date.toISOString()
  }

  /**
   * Get event end time (same as due date)
   * @private
   * @param {string} dueDate - Due date string
   * @returns {string} ISO datetime string
   */
  getEventEndTime(dueDate) {
    return new Date(dueDate).toISOString()
  }

  /**
   * Toggle sync for calendar connection
   * @param {boolean} enabled - Enable or disable sync
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  async toggleSync(enabled) {
    try {
      const userId = authService.getUserId()

      const { error } = await supabase
        .from('calendar_connections')
        .update({ sync_enabled: enabled })
        .eq('user_id', userId)
        .eq('provider', 'google')

      if (error) throw error
      return { success: true, error: null }
    } catch (error) {
      console.error('Failed to toggle sync:', error)
      return { success: false, error }
    }
  }

  /**
   * List user's Google calendars
   * @returns {Promise<{calendars: Array, error: Error|null}>}
   */
  async listCalendars() {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Not connected to Google Calendar')
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()
      return { calendars: data.items || [], error: null }
    } catch (error) {
      console.error('Failed to list calendars:', error)
      return { calendars: [], error }
    }
  }

  /**
   * Map Focus Flow activity to Google Calendar event
   * @param {Object} activity - Focus Flow activity
   * @returns {Object} Google Calendar event object
   */
  mapActivityToGoogleEvent(activity) {
    const startDateTime = new Date(`${activity.activity_date}T${activity.start_time || '09:00'}`)
    const endDateTime = new Date(startDateTime.getTime() + (activity.duration_minutes || 60) * 60000)

    return {
      summary: activity.title,
      description: activity.ai_description || activity.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      extendedProperties: {
        private: {
          focusFlowId: activity.id,
          activityType: activity.activity_type,
        },
      },
    }
  }

  /**
   * Push activity to Google Calendar (create or update)
   * @param {Object} activity - Focus Flow activity
   * @param {string} calendarId - Google Calendar ID (default: 'primary')
   * @returns {Promise<{success: boolean, eventId: string|null, error: Error|null}>}
   */
  async pushActivityToGoogle(activity, calendarId = 'primary') {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Not connected to Google Calendar')
      }

      const event = this.mapActivityToGoogleEvent(activity)

      // Check if event already exists (look for external_event_id in metadata)
      // For now, always create new - sync metadata table would track this
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      )

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()
      return { success: true, eventId: data.id, error: null }
    } catch (error) {
      console.error('Failed to push activity to Google:', error)
      return { success: false, eventId: null, error }
    }
  }

  /**
   * Pull events from Google Calendar
   * @param {string} calendarId - Google Calendar ID (default: 'primary')
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<{events: Array, error: Error|null}>}
   */
  async pullEventsFromGoogle(calendarId = 'primary', daysAhead = 30) {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Not connected to Google Calendar')
      }

      const timeMin = new Date().toISOString()
      const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `singleEvents=true&` +
          `orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()
      return { events: data.items || [], error: null }
    } catch (error) {
      console.error('Failed to pull events from Google:', error)
      return { events: [], error }
    }
  }

  /**
   * Map Google Calendar event to Focus Flow activity
   * @param {Object} event - Google Calendar event
   * @returns {Object} Focus Flow activity object
   */
  mapGoogleEventToActivity(event) {
    const startDateTime = new Date(event.start.dateTime || event.start.date)
    const endDateTime = new Date(event.end.dateTime || event.end.date)
    const durationMinutes = Math.round((endDateTime - startDateTime) / 60000)

    return {
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      activity_date: startDateTime.toISOString().split('T')[0],
      start_time: event.start.dateTime
        ? `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
        : null,
      duration_minutes: durationMinutes,
      activity_type: 'event',
      ai_generated: false,
    }
  }
}

// Export singleton instance
const googleCalendarService = new GoogleCalendarService()
export default googleCalendarService
