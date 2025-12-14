# AI Tutor UI Updates - Mode Buttons & Explanations

## Changes Needed in src/components/AITutor.jsx

### 1. Add State for Mode Explanation Modal (after line 32)

```javascript
const [modeExplanation, setModeExplanation] = useState(null) // For showing mode info when clicking modes
```

### 2. Add Regular Chat Function (after line 300)

```javascript
const setRegularChat = () => {
  aiService.setRegularMode()
  setUltraThinkEnabled(false)
  setDeepResearchEnabled(false)
  // Show explanation
  setModeExplanation({
    title: '💬 Regular Chat Mode',
    description: 'Quick and efficient responses for straightforward questions. Perfect for homework help, quick explanations, and general tutoring.',
    tokens: '2,000 tokens',
    features: ['Fast responses', 'Clear and concise', 'Great for homework help', 'Quick concept explanations']
  })
}
```

### 3. Update toggleUltraThink (replace existing function around line 302)

```javascript
const toggleUltraThink = () => {
  const newState = aiService.toggleUltraThink()
  setUltraThinkEnabled(newState)
  setDeepResearchEnabled(false)

  // Show explanation when enabling
  if (newState) {
    setModeExplanation({
      title: '🧠 UltraThink Mode',
      description: 'Advanced reasoning mode that provides comprehensive, step-by-step explanations with deep analysis. Perfect for complex problems and thorough understanding.',
      tokens: '8,000 tokens',
      features: ['Detailed step-by-step reasoning', 'Multiple approaches explained', 'In-depth concept breakdowns', 'Practice problems included']
    })
  }
}
```

### 4. Update toggleDeepResearch (replace existing function around line 308)

```javascript
const toggleDeepResearch = () => {
  const newState = aiService.toggleDeepResearch()
  setDeepResearchEnabled(newState)
  setUltraThinkEnabled(false)

  // Show explanation when enabling
  if (newState) {
    setModeExplanation({
      title: '📚 Deep Research Mode',
      description: 'Comprehensive academic research mode that provides extensive analysis with multiple perspectives, historical context, and scholarly depth. Ideal for research papers and in-depth study.',
      tokens: '12,000 tokens',
      features: ['Extensive multi-perspective analysis', 'Historical context and evolution', 'Academic rigor and citations', 'Critical analysis of concepts']
    })
  }
}
```

### 5. Add Regular Chat Button (BEFORE the Image Upload button, around line 728)

```javascript
{/* Regular Chat Mode button */}
<button
  onClick={setRegularChat}
  disabled={isLoading}
  className={`w-9 h-9 rounded-lg border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center ${
    !ultraThinkEnabled && !deepResearchEnabled
      ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 border-green-500 shadow-glow-green'
      : 'bg-dark-bg-tertiary border-dark-border-glow hover:border-green-500/50 hover:bg-green-500/10'
  }`}
  title={!ultraThinkEnabled && !deepResearchEnabled ? 'Regular Chat: Standard mode active' : 'Switch to Regular Chat mode'}
>
  <svg className={`w-5 h-5 ${!ultraThinkEnabled && !deepResearchEnabled ? 'text-green-400' : 'text-dark-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
</button>
```

### 6. Add Mode Explanation Modal (at the end of the return statement, before the closing div)

```javascript
{/* Mode Explanation Modal */}
{modeExplanation && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    onClick={() => setModeExplanation(null)}
  >
    <div className="bg-dark-bg-secondary border border-dark-border-glow rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slideUp"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{modeExplanation.title.split(' ')[0]}</div>
        <h3 className="text-xl font-bold text-dark-text-primary">{modeExplanation.title.substring(2)}</h3>
      </div>

      <p className="text-dark-text-secondary mb-4 leading-relaxed">
        {modeExplanation.description}
      </p>

      <div className="bg-dark-bg-tertiary rounded-lg p-3 mb-4">
        <div className="text-xs text-dark-text-muted font-semibold mb-1">Max Response Length</div>
        <div className="text-primary-500 font-bold">{modeExplanation.tokens}</div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-xs text-dark-text-muted font-semibold">Features:</div>
        {modeExplanation.features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-dark-text-secondary">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setModeExplanation(null)}
        className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
      >
        Got it!
      </button>
    </div>
  </div>
)}
```

### 7. Add CSS for animations (in your global CSS or tailwind config)

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}
```

## Summary of Changes

1. ✅ **Regular Chat Button** - Green button to switch back to standard mode
2. ✅ **Mode Explanations** - Modal that appears when you click any mode button
3. ✅ **Visual Feedback** - Each mode has distinct colors (Green/Purple/Blue)
4. ✅ **Feature Lists** - Shows what each mode is good for
5. ✅ **Token Counts** - Displays max response length for each mode

## Order of Buttons (left to right in input area):
1. Regular Chat (Green) 💬
2. Image Upload
3. UltraThink (Purple) 🧠
4. Deep Research (Blue) 📚
5. Text Input
6. Send Button
