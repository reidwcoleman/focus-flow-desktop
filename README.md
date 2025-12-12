# Focus Flow - Desktop Edition

A premium, AI-powered student productivity app optimized for desktop screens. Built with a clean, minimalist, Apple-like aesthetic that feels like Notion × macOS × Cal AI.

**Core Promise:** "The AI that runs your school life automatically - now optimized for your desktop."

**Desktop Features:** Sidebar navigation, multi-column layouts, larger cards and fonts, and expanded screen real estate for maximum productivity.

## Features

### 🏠 Smart Dashboard (Desktop-Optimized)
- **2-column layout**: Assignments on left, stats sidebar on right
- **4-column quick stats grid** for at-a-glance insights
- Larger cards (p-7/p-8) with enhanced readability
- AI-powered homework cards with priority indicators
- Auto-captured assignments from screenshots
- Canvas LMS integration for automatic sync
- Real-time progress tracking with beautiful gradients
- Sticky sidebar with persistent quick access
- Subject-based color coding with larger badges

### 🤖 AI Tutor (Desktop-Optimized)
- **Wide-screen layout**: max-w-5xl for comfortable reading
- **Larger message bubbles**: Enhanced padding (px-6 py-5)
- **LaTeX math support**: Inline ($...$) and display ($$...$$) equations rendered beautifully
- **Real AI Integration**: OpenAI, Anthropic Claude, or Groq support
- **Lightning Fast**: Instant responses with typing indicators
- Interactive chat with smooth animations
- Markdown formatting with code blocks and lists
- Auto-resizing input (up to 150px)
- Chat history with auto-save
- Image upload and analysis capabilities
- Quick question shortcuts
- Beautiful gradient message bubbles
- Context-aware with access to your assignments and schedule

### 📅 Smart Study Planner
- AI-optimized daily study schedule
- Timeline view with current activity highlighting
- Break recommendations based on focus patterns
- Progress tracking throughout the day
- AI insights for peak productivity times
- One-tap session start

### 📊 Advanced Analytics
- Grade tracking and predictions
- Performance trends by subject
- Weekly activity charts
- Focus score monitoring
- Strengths and improvement areas
- AI-powered recommendations for GPA improvement

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- Mobile-first responsive design

## Getting Started

### Prerequisites
- Node.js 18.20+ (currently using 18.20.4)
- npm 9.2+

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. (Optional) Set up AI Tutor with real AI - **100% FREE & BLAZING FAST**:
\`\`\`bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your FREE Groq API key (takes 30 seconds!)
# Get your key from: https://console.groq.com/keys
# VITE_GROQ_API_KEY=gsk_your-key-here
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open your browser and navigate to:
\`\`\`
http://localhost:5173/
\`\`\`

**Note**: AI Tutor works in Demo Mode without an API key, but you can get **REAL AI tutoring 100% FREE** with Groq!

### Why Groq?
- ✅ **Completely FREE** - No credit card required
- ✅ **LIGHTNING FAST** - 100+ tokens/second (instant responses!)
- ✅ **Generous limits** - 30 requests/min, 14,400/day
- ✅ **High quality** - Powered by Meta's Llama 3.1 70B
- ✅ **Perfect for students** - Best free AI for learning

### Build for Production

\`\`\`bash
npm run build
\`\`\`

The production build will be output to the \`dist\` folder.

### Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Desktop Features

- **Sidebar Navigation**: Persistent left sidebar (264px) with all app sections
- **Wide Screen Support**: Optimized for monitors up to 1800px
- **Multi-Column Layouts**: Efficient 2-4 column grids throughout
- **Larger Fonts**: Increased text sizes (text-4xl headers, text-xl body)
- **Enhanced Spacing**: Generous padding (p-7 to p-12) and gaps (gap-6 to gap-8)
- **Sticky Elements**: Persistent sidebars and quick access panels
- **Keyboard Shortcuts**: Coming soon (Ctrl+K for search, etc.)
- **Smooth Animations**: All mobile animations preserved and enhanced

## Design Philosophy

- **Minimalist & Futuristic:** Apple-like clarity with smooth gradients
- **Trustworthy:** Academically serious yet youthful
- **Premium Feel:** Soft glows, cool blues, and neutral tones
- **Modern Stack:** React 18 + Vite + Tailwind CSS 3

## Project Structure

\`\`\`
focus-flow-desktop/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # 2-column dashboard (desktop-optimized)
│   │   ├── AITutor.jsx         # Wide-screen AI chat (max-w-5xl)
│   │   ├── Planner.jsx         # Calendar + task list (2-column)
│   │   ├── FocusMode.jsx       # Opal-style focus timer (4-col grid)
│   │   ├── StudyHub.jsx        # Large flashcard display
│   │   ├── Analytics.jsx       # 4-column stats dashboard
│   │   └── ...                 # Other components
│   ├── services/               # API and data services
│   ├── contexts/               # React context providers
│   ├── utils/                  # Helper functions
│   ├── App.jsx                 # Main app with sidebar navigation
│   ├── App.css                 # Animations and custom styles
│   ├── index.css               # Tailwind imports
│   └── main.jsx                # React entry point
├── index.html                  # HTML template
├── tailwind.config.js          # Desktop-optimized design system
└── vite.config.js              # Vite configuration
\`\`\`

## Mobile Version

Looking for the mobile-optimized version with bottom tab navigation? Check out the [Mobile App](https://github.com/reidwcoleman/focus-flow-ai/tree/main/mobile-app).

## Customization

### Premium Design System
The app uses a carefully crafted design system in \`tailwind.config.js\`:

\`\`\`js
colors: {
  primary: { /* Blue shades 50-900 */ },
  accent: { purple, pink, cyan },
  neutral: { /* Slate shades 50-950 */ },
}
boxShadow: {
  'soft': 'Subtle elevated shadows',
  'glow': 'AI feature highlights',
  'glow-lg': 'Active state emphasis',
}
\`\`\`

### Component Customization
Each component features:
- Smooth gradient backgrounds
- Glassmorphism effects
- AI-powered badges and indicators
- Responsive touch interactions
- Premium micro-animations

## Browser Support

- Chrome (mobile & desktop)
- Safari (iOS & macOS)
- Firefox (mobile & desktop)
- Edge

## Future Enhancements

- [ ] Screenshot-to-assignment AI capture
- [ ] Google Classroom API integration
- [ ] Email assignment parsing
- [ ] Real AI tutoring backend
- [ ] Grade prediction algorithms
- [ ] Parent dashboard (Ultra tier)
- [ ] ADHD-friendly customizations
- [ ] Offline PWA support
- [ ] Push notifications
- [ ] Dark mode
- [ ] Streak tracking and gamification

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
