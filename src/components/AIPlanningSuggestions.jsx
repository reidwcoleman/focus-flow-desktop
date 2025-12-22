/**
 * AI Planning Suggestions Component
 * Provides intelligent planning recommendations based on assignments, grades, and deadlines
 */

import { useState, useEffect } from 'react'

export default function AIPlanningSuggestions({ assignments, grades }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateSuggestions()
  }, [assignments, grades])

  const generateSuggestions = () => {
    setLoading(true)
    const smartSuggestions = []

    // Analyze due dates and urgency
    const today = new Date()
    const upcomingAssignments = assignments
      .filter(a => !a.completed && a.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

    // Suggestion 1: Urgent assignments
    const dueSoon = upcomingAssignments.filter(a => {
      const daysUntil = Math.ceil((new Date(a.dueDate) - today) / (1000 * 60 * 60 * 24))
      return daysUntil <= 2 && daysUntil >= 0
    })

    if (dueSoon.length > 0) {
      smartSuggestions.push({
        id: 1,
        type: 'urgent',
        icon: '⏰',
        title: 'Urgent Tasks Need Attention',
        description: `You have ${dueSoon.length} assignment${dueSoon.length > 1 ? 's' : ''} due within 2 days. Focus on: ${dueSoon[0].title}`,
        color: 'from-red-500 to-orange-500',
        borderColor: 'border-red-500/30',
        priority: 'high'
      })
    }

    // Suggestion 2: Balanced workload
    const totalIncomplete = assignments.filter(a => !a.completed).length
    const completedToday = assignments.filter(a => a.completed).length

    if (totalIncomplete > 5 && completedToday === 0) {
      smartSuggestions.push({
        id: 2,
        type: 'motivation',
        icon: '💪',
        title: 'Start Your Day Strong',
        description: 'You have a busy schedule ahead. Start with one small task to build momentum!',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-500/30',
        priority: 'medium'
      })
    }

    // Suggestion 3: Grade-based recommendations
    if (grades.length > 0) {
      const lowGrades = grades.filter(g => g.current_score && g.current_score < 80)
      if (lowGrades.length > 0) {
        smartSuggestions.push({
          id: 3,
          type: 'academic',
          icon: '📚',
          title: 'Focus on Struggling Subjects',
          description: `${lowGrades[0].class_name} could use extra attention. Consider dedicating more study time to this course.`,
          color: 'from-blue-500 to-cyan-500',
          borderColor: 'border-blue-500/30',
          priority: 'medium'
        })
      } else {
        smartSuggestions.push({
          id: 3,
          type: 'academic',
          icon: '🌟',
          title: 'Great Academic Performance!',
          description: 'Your grades are looking excellent! Keep up the consistent study habits.',
          color: 'from-green-500 to-emerald-500',
          borderColor: 'border-green-500/30',
          priority: 'low'
        })
      }
    }

    // Suggestion 4: Time management
    const assignmentsWithTime = upcomingAssignments.filter(a => a.timeEstimate)
    if (assignmentsWithTime.length > 0) {
      const totalTime = assignmentsWithTime.reduce((acc, a) => {
        // Parse time estimate (e.g., "2h 30m" -> 150 minutes)
        const hours = parseInt(a.timeEstimate.match(/(\d+)h/)?.[1] || 0)
        const mins = parseInt(a.timeEstimate.match(/(\d+)m/)?.[1] || 0)
        return acc + (hours * 60) + mins
      }, 0)

      if (totalTime > 240) { // More than 4 hours
        smartSuggestions.push({
          id: 4,
          type: 'time',
          icon: '⏱️',
          title: 'Heavy Workload Ahead',
          description: `You have ~${Math.round(totalTime / 60)} hours of work. Break it into focused 25-minute sessions with breaks.`,
          color: 'from-amber-500 to-yellow-500',
          borderColor: 'border-amber-500/30',
          priority: 'medium'
        })
      }
    }

    // Suggestion 5: Completion encouragement
    const completionRate = assignments.length > 0
      ? Math.round((assignments.filter(a => a.completed).length / assignments.length) * 100)
      : 0

    if (completionRate > 80) {
      smartSuggestions.push({
        id: 5,
        type: 'achievement',
        icon: '🎯',
        title: 'Incredible Progress!',
        description: `${completionRate}% of your assignments completed! You're crushing it!`,
        color: 'from-primary-500 to-accent-cyan',
        borderColor: 'border-primary-500/30',
        priority: 'low'
      })
    }

    // Suggestion 6: Study routine
    const currentHour = new Date().getHours()
    if (currentHour >= 9 && currentHour <= 17 && upcomingAssignments.length > 0) {
      smartSuggestions.push({
        id: 6,
        type: 'routine',
        icon: '🧠',
        title: 'Peak Focus Time',
        description: 'It\'s prime study hours! Your brain is most alert now. Tackle challenging assignments first.',
        color: 'from-indigo-500 to-purple-500',
        borderColor: 'border-indigo-500/30',
        priority: 'medium'
      })
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    smartSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    setSuggestions(smartSuggestions.slice(0, 3)) // Show top 3 suggestions
    setLoading(false)
  }

  if (loading || suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-gradient-to-r from-primary-500/20 to-accent-cyan/20">
          <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-dark-text-primary">AI Smart Planning</h3>
          <p className="text-xs text-dark-text-muted">Personalized recommendations for you</p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-4 border ${suggestion.borderColor} hover:border-opacity-50 transition-all duration-300 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] animate-stagger-fade-in hover:scale-105`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${suggestion.color} opacity-5`}></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-2">
                <div className="text-3xl">{suggestion.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-dark-text-primary mb-1 leading-tight">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-dark-text-muted leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
