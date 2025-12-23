/**
 * Calendar Import Service
 * Parses and imports calendar files from Google Calendar and Apple Calendar (.ics or .zip format)
 */

import ICAL from 'ical.js'
import JSZip from 'jszip'
import calendarService from './calendarService'

class CalendarImportService {
  /**
   * Parse and import calendar file (supports .ics and .zip)
   * @param {File} file - .ics or .zip calendar file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Import results
   */
  async importCalendarFile(file, options = {}) {
    try {
      // Check file type
      const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'

      let allEvents = []

      if (isZip) {
        // Handle ZIP file (Google Calendar export)
        const icsFiles = await this.extractICSFromZip(file)

        for (const icsContent of icsFiles) {
          const events = await this.parseICS(icsContent)
          allEvents = allEvents.concat(events)
        }
      } else {
        // Handle single ICS file (Apple Calendar export)
        const content = await this.readFile(file)
        allEvents = await this.parseICS(content)
      }

      // Convert to our format and filter
      const activities = this.convertEventsToActivities(allEvents, options)

      // Import to database
      const results = await this.importActivities(activities, options)

      return results
    } catch (error) {
      console.error('Calendar import error:', error)
      throw new Error(`Failed to import calendar: ${error.message}`)
    }
  }

  /**
   * Extract .ics files from ZIP archive
   * @param {File} zipFile - ZIP file containing .ics files
   * @returns {Promise<Array<string>>} - Array of .ics file contents
   */
  async extractICSFromZip(zipFile) {
    try {
      const zip = new JSZip()
      const zipContents = await zip.loadAsync(zipFile)
      const icsFiles = []

      // Find all .ics files in the ZIP
      for (const filename in zipContents.files) {
        if (filename.toLowerCase().endsWith('.ics')) {
          const fileData = zipContents.files[filename]
          const content = await fileData.async('text')
          icsFiles.push(content)
        }
      }

      if (icsFiles.length === 0) {
        throw new Error('No .ics files found in ZIP archive')
      }

      console.log(`Extracted ${icsFiles.length} .ics file(s) from ZIP`)
      return icsFiles
    } catch (error) {
      console.error('ZIP extraction error:', error)
      throw new Error(`Failed to extract ZIP file: ${error.message}`)
    }
  }

  /**
   * Read file content as text
   * @param {File} file
   * @returns {Promise<string>}
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Parse ICS calendar format
   * @param {string} content - ICS file content
   * @returns {Array} - Parsed events
   */
  async parseICS(content) {
    try {
      // Parse using ical.js
      const jcalData = ICAL.parse(content)
      const comp = new ICAL.Component(jcalData)
      const vevents = comp.getAllSubcomponents('vevent')

      const events = []

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent)

        // Extract event properties
        const summary = event.summary || 'Untitled Event'
        const description = event.description || ''
        const location = event.location || ''

        // Handle start and end times
        const startTime = event.startDate
        const endTime = event.endDate

        // Check if all-day event
        const isAllDay = !startTime.hour && !startTime.minute && !startTime.second

        // Calculate duration in minutes
        let durationMinutes = null
        if (startTime && endTime) {
          const start = startTime.toJSDate()
          const end = endTime.toJSDate()
          durationMinutes = Math.round((end - start) / 1000 / 60)
        }

        // Extract recurrence rule if exists
        const rrule = vevent.getFirstPropertyValue('rrule')
        const isRecurring = rrule !== null

        events.push({
          summary,
          description,
          location,
          startDate: startTime ? startTime.toJSDate() : null,
          endDate: endTime ? endTime.toJSDate() : null,
          isAllDay,
          durationMinutes,
          isRecurring,
          rrule,
          uid: event.uid
        })
      }

      return events
    } catch (error) {
      console.error('ICS parse error:', error)
      throw new Error('Invalid calendar file format')
    }
  }

  /**
   * Convert calendar events to our activity format
   * @param {Array} events - Parsed calendar events
   * @param {Object} options - Conversion options
   * @returns {Array} - Converted activities
   */
  convertEventsToActivities(events, options = {}) {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
      skipCompleted = true
    } = options

    const activities = []
    const now = new Date()

    for (const event of events) {
      if (!event.startDate) continue

      const eventDate = event.startDate

      // Skip events outside date range
      if (eventDate < startDate || eventDate > endDate) continue

      // Skip past events if requested
      if (skipCompleted && eventDate < now) continue

      // Detect activity type from event properties
      const activityType = this.detectActivityType(event)

      // Extract subject if possible
      const subject = this.extractSubject(event)

      // Format time strings
      const startTimeStr = event.isAllDay ? null : this.formatTime(event.startDate)
      const endTimeStr = event.isAllDay ? null : this.formatTime(event.endDate)

      const activity = {
        title: event.summary,
        description: event.description,
        activity_date: this.formatDate(eventDate),
        start_time: startTimeStr,
        end_time: endTimeStr,
        duration_minutes: event.durationMinutes,
        activity_type: activityType,
        subject: subject,
        location: event.location,
        is_all_day: event.isAllDay,
        is_completed: false,
        ai_generated: false
      }

      activities.push(activity)

      // Handle recurring events (expand for next N occurrences)
      if (event.isRecurring && event.rrule) {
        const expandedEvents = this.expandRecurringEvent(event, options)
        for (const expandedEvent of expandedEvents) {
          const expandedDate = expandedEvent.startDate

          if (expandedDate < startDate || expandedDate > endDate) continue
          if (skipCompleted && expandedDate < now) continue

          activities.push({
            title: expandedEvent.summary,
            description: expandedEvent.description,
            activity_date: this.formatDate(expandedDate),
            start_time: event.isAllDay ? null : this.formatTime(expandedEvent.startDate),
            end_time: event.isAllDay ? null : this.formatTime(expandedEvent.endDate),
            duration_minutes: expandedEvent.durationMinutes,
            activity_type: activityType,
            subject: subject,
            location: expandedEvent.location,
            is_all_day: event.isAllDay,
            is_completed: false,
            ai_generated: false
          })
        }
      }
    }

    return activities
  }

  /**
   * Expand recurring events into individual occurrences
   * @param {Object} event - Event with recurrence rule
   * @param {Object} options - Expansion options
   * @returns {Array} - Expanded events
   */
  expandRecurringEvent(event, options = {}) {
    const {
      endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    } = options

    const expanded = []

    try {
      // Use ical.js to expand recurrence
      // This is a simplified version - full implementation would handle all RRULE cases
      const maxOccurrences = 52 // Limit to 1 year of weekly events
      const startDate = event.startDate
      const rrule = event.rrule

      // For now, just return the original event
      // Full RRULE expansion would require more complex logic
      // Users can re-upload calendar for updates

    } catch (error) {
      console.error('Recurrence expansion error:', error)
    }

    return expanded
  }

  /**
   * Detect activity type from event properties
   * @param {Object} event
   * @returns {string}
   */
  detectActivityType(event) {
    const title = (event.summary || '').toLowerCase()
    const description = (event.description || '').toLowerCase()
    const combined = `${title} ${description}`

    if (combined.match(/class|lecture|lab|seminar|course/)) return 'class'
    if (combined.match(/study|homework|assignment|project|exam|test|quiz/)) return 'study'
    if (combined.match(/meeting|call|interview/)) return 'meeting'
    if (combined.match(/break|lunch|dinner|rest/)) return 'break'
    if (combined.match(/event|party|celebration/)) return 'event'
    if (combined.match(/assignment|due|submit/)) return 'assignment'

    return 'task'
  }

  /**
   * Extract subject from event title/description
   * @param {Object} event
   * @returns {string|null}
   */
  extractSubject(event) {
    const title = event.summary || ''

    // Common subject patterns
    const subjects = ['Math', 'Science', 'English', 'History', 'Chemistry', 'Physics',
                      'Biology', 'Computer Science', 'CS', 'Programming', 'Calculus',
                      'Algebra', 'Geometry', 'Literature', 'Writing', 'Spanish', 'French']

    for (const subject of subjects) {
      if (title.match(new RegExp(subject, 'i'))) {
        return subject
      }
    }

    // Try to extract from format like "CS101" or "MATH201"
    const courseMatch = title.match(/([A-Z]{2,4})\s*\d{3}/i)
    if (courseMatch) {
      return courseMatch[1].toUpperCase()
    }

    return null
  }

  /**
   * Format date as YYYY-MM-DD
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toISOString().split('T')[0]
  }

  /**
   * Format time as HH:MM:SS
   * @param {Date} date
   * @returns {string}
   */
  formatTime(date) {
    if (!date) return null
    return date.toTimeString().split(' ')[0]
  }

  /**
   * Import activities to database
   * @param {Array} activities - Activities to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Import results
   */
  async importActivities(activities, options = {}) {
    const {
      skipDuplicates = true,
      mergeConflicts = false
    } = options

    let imported = 0
    let skipped = 0
    let failed = 0
    const errors = []

    for (const activity of activities) {
      try {
        // Check for duplicates if requested
        if (skipDuplicates) {
          const existing = await calendarService.getActivitiesForDate(
            new Date(activity.activity_date)
          )

          const isDuplicate = existing.some(e =>
            e.title === activity.title &&
            e.start_time === activity.start_time &&
            e.activity_date === activity.activity_date
          )

          if (isDuplicate) {
            skipped++
            continue
          }
        }

        // Create activity
        await calendarService.createActivity(activity)
        imported++
      } catch (error) {
        console.error('Failed to import activity:', error)
        failed++
        errors.push({
          activity: activity.title,
          error: error.message
        })
      }
    }

    return {
      total: activities.length,
      imported,
      skipped,
      failed,
      errors
    }
  }
}

export default new CalendarImportService()
