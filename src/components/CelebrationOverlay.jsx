/**
 * Celebration Overlay Component
 * Displays confetti and celebration animation when all daily activities are completed
 */

import { useEffect, useState } from 'react'

export default function CelebrationOverlay({ show, onComplete }) {
  const [confetti, setConfetti] = useState([])

  useEffect(() => {
    if (show) {
      // Generate confetti pieces
      const pieces = []
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.5,
          duration: 2 + Math.random() * 1,
          rotation: Math.random() * 360,
          color: ['#3fb950', '#58a6ff', '#a371f7', '#f778ba', '#f85149', '#fbbf24'][Math.floor(Math.random() * 6)]
        })
      }
      setConfetti(pieces)

      // Auto-dismiss after animation
      const timer = setTimeout(() => {
        onComplete?.()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-fly-away"
          style={{
            left: `${piece.left}%`,
            top: '-10%',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        >
          <div
            className="w-full h-full rounded-sm"
            style={{ backgroundColor: piece.color }}
          ></div>
        </div>
      ))}

      {/* Celebration message */}
      <div className="relative bg-dark-bg-secondary/95 backdrop-blur-xl rounded-2xl p-8 border border-green-500/30 shadow-[0_0_40px_rgba(63,185,80,0.3)] animate-fadeIn">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-float">🎉</div>
          <h2 className="text-3xl font-bold text-dark-text-primary mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            All Done!
          </h2>
          <p className="text-dark-text-secondary text-lg">
            You've completed all activities for today!
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
