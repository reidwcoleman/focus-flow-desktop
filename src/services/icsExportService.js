/**
 * ICS Export Service
 * Creates iCalendar (.ics) files for Apple Calendar and other calendar apps
 */

class ICSExportService {
  /**
   * Generate ICS file content from activities
   * @param {Array} activities - Focus Flow activities
   * @param {string} calendarName - Name for the calendar
   * @returns {string} ICS file content
   */
  generateICS(activities, calendarName = 'Focus Flow') {
    const lines = []

    // Calendar header
    lines.push('BEGIN:VCALENDAR')
    lines.push('VERSION:2.0')
    lines.push('PRODID:-//Focus Flow//Focus Flow Desktop//EN')
    lines.push('CALSCALE:GREGORIAN')
    lines.push('METHOD:PUBLISH')
    lines.push(`X-WR-CALNAME:${calendarName}`)
    lines.push('X-WR-TIMEZONE:' + Intl.DateTimeFormat().resolvedOptions().timeZone)
    lines.push('X-WR-CALDESC:Activities from Focus Flow')

    // Add each activity as an event
    activities.forEach(activity => {
      if (!activity.activity_date) return

      lines.push('BEGIN:VEVENT')

      // UID - unique identifier
      lines.push(`UID:focus-flow-${activity.id}@focusflow.app`)

      // DTSTAMP - creation timestamp
      lines.push(`DTSTAMP:${this.formatICSDateTime(new Date())}`)

      // DTSTART and DTEND
      const startDateTime = this.getEventStartDateTime(activity)
      const endDateTime = this.getEventEndDateTime(activity)

      if (activity.start_time) {
        // Timed event
        lines.push(`DTSTART:${this.formatICSDateTime(startDateTime)}`)
        lines.push(`DTEND:${this.formatICSDateTime(endDateTime)}`)
      } else {
        // All-day event
        lines.push(`DTSTART;VALUE=DATE:${this.formatICSDate(startDateTime)}`)
        lines.push(`DTEND;VALUE=DATE:${this.formatICSDate(this.addDays(startDateTime, 1))}`)
      }

      // SUMMARY - title
      lines.push(`SUMMARY:${this.escapeICSText(activity.title)}`)

      // DESCRIPTION
      const description = activity.ai_description || activity.description || ''
      if (description) {
        lines.push(`DESCRIPTION:${this.escapeICSText(description)}`)
      }

      // CATEGORIES - activity type
      if (activity.activity_type) {
        lines.push(`CATEGORIES:${activity.activity_type.toUpperCase()}`)
      }

      // STATUS
      lines.push(`STATUS:${activity.is_completed ? 'COMPLETED' : 'CONFIRMED'}`)

      // PRIORITY (based on urgency)
      if (activity.due_date) {
        const dueDate = new Date(activity.due_date)
        const now = new Date()
        const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60)

        if (hoursUntilDue < 0) {
          lines.push('PRIORITY:1') // High priority - overdue
        } else if (hoursUntilDue < 24) {
          lines.push('PRIORITY:3') // Medium priority - due soon
        } else {
          lines.push('PRIORITY:5') // Normal priority
        }
      }

      // SEQUENCE - version number (0 for new)
      lines.push('SEQUENCE:0')

      lines.push('END:VEVENT')
    })

    // Calendar footer
    lines.push('END:VCALENDAR')

    return lines.join('\r\n')
  }

  /**
   * Download ICS file
   * @param {Array} activities - Focus Flow activities
   * @param {string} filename - Filename for the download
   */
  downloadICS(activities, filename = 'focus-flow-calendar.ics') {
    const icsContent = this.generateICS(activities)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    window.URL.revokeObjectURL(url)
  }

  /**
   * Get event start date/time
   * @private
   * @param {Object} activity - Focus Flow activity
   * @returns {Date}
   */
  getEventStartDateTime(activity) {
    const date = new Date(activity.activity_date)
    if (activity.start_time) {
      const [hours, minutes] = activity.start_time.split(':').map(Number)
      date.setHours(hours, minutes, 0, 0)
    }
    return date
  }

  /**
   * Get event end date/time
   * @private
   * @param {Object} activity - Focus Flow activity
   * @returns {Date}
   */
  getEventEndDateTime(activity) {
    const startDate = this.getEventStartDateTime(activity)
    const durationMinutes = activity.duration_minutes || 60
    return new Date(startDate.getTime() + durationMinutes * 60000)
  }

  /**
   * Format date/time for ICS (YYYYMMDDTHHMMSSZ format in UTC)
   * @private
   * @param {Date} date - Date to format
   * @returns {string}
   */
  formatICSDateTime(date) {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  /**
   * Format date for ICS (YYYYMMDD format)
   * @private
   * @param {Date} date - Date to format
   * @returns {string}
   */
  formatICSDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * Escape special characters for ICS format
   * @private
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeICSText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  /**
   * Add days to a date
   * @private
   * @param {Date} date - Starting date
   * @param {number} days - Number of days to add
   * @returns {Date}
   */
  addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  /**
   * Import ICS file and parse into activities
   * @param {File} file - ICS file to import
   * @returns {Promise<Array>} Array of parsed activities
   */
  async importICS(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const icsContent = e.target.result
          const activities = this.parseICS(icsContent)
          resolve(activities)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Parse ICS content into activities
   * @private
   * @param {string} icsContent - ICS file content
   * @returns {Array} Array of activities
   */
  parseICS(icsContent) {
    const activities = []
    const lines = icsContent.split(/\r?\n/)

    let currentEvent = null
    let inEvent = false

    lines.forEach(line => {
      const trimmedLine = line.trim()

      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true
        currentEvent = {}
      } else if (trimmedLine === 'END:VEVENT' && inEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          activities.push(this.icsEventToActivity(currentEvent))
        }
        inEvent = false
        currentEvent = null
      } else if (inEvent && trimmedLine) {
        const colonIndex = trimmedLine.indexOf(':')
        if (colonIndex > 0) {
          const key = trimmedLine.substring(0, colonIndex).split(';')[0]
          const value = trimmedLine.substring(colonIndex + 1)

          switch (key) {
            case 'SUMMARY':
              currentEvent.summary = this.unescapeICSText(value)
              break
            case 'DESCRIPTION':
              currentEvent.description = this.unescapeICSText(value)
              break
            case 'DTSTART':
              currentEvent.dtstart = value
              break
            case 'DTEND':
              currentEvent.dtend = value
              break
            case 'CATEGORIES':
              currentEvent.categories = value.toLowerCase()
              break
          }
        }
      }
    })

    return activities
  }

  /**
   * Convert ICS event to Focus Flow activity
   * @private
   * @param {Object} event - Parsed ICS event
   * @returns {Object} Focus Flow activity
   */
  icsEventToActivity(event) {
    const startDate = this.parseICSDateTime(event.dtstart)
    const endDate = event.dtend ? this.parseICSDateTime(event.dtend) : null

    const durationMinutes = endDate
      ? Math.round((endDate - startDate) / 60000)
      : 60

    return {
      title: event.summary,
      description: event.description || '',
      activity_date: startDate.toISOString().split('T')[0],
      start_time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      duration_minutes: durationMinutes,
      activity_type: event.categories || 'event',
      ai_generated: false,
    }
  }

  /**
   * Parse ICS date/time string
   * @private
   * @param {string} icsDateTime - ICS date/time string
   * @returns {Date}
   */
  parseICSDateTime(icsDateTime) {
    // Handle both YYYYMMDDTHHMMSSZ and YYYYMMDD formats
    const dateOnly = /^\d{8}$/.test(icsDateTime)

    if (dateOnly) {
      const year = parseInt(icsDateTime.substring(0, 4))
      const month = parseInt(icsDateTime.substring(4, 6)) - 1
      const day = parseInt(icsDateTime.substring(6, 8))
      return new Date(year, month, day)
    } else {
      const year = parseInt(icsDateTime.substring(0, 4))
      const month = parseInt(icsDateTime.substring(4, 6)) - 1
      const day = parseInt(icsDateTime.substring(6, 8))
      const hours = parseInt(icsDateTime.substring(9, 11))
      const minutes = parseInt(icsDateTime.substring(11, 13))
      const seconds = parseInt(icsDateTime.substring(13, 15))

      if (icsDateTime.endsWith('Z')) {
        return new Date(Date.UTC(year, month, day, hours, minutes, seconds))
      } else {
        return new Date(year, month, day, hours, minutes, seconds)
      }
    }
  }

  /**
   * Unescape ICS text
   * @private
   * @param {string} text - Text to unescape
   * @returns {string}
   */
  unescapeICSText(text) {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
  }
}

export default new ICSExportService()
