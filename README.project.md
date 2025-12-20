# Focus Flow Desktop

A comprehensive productivity app for students with AI-powered study tools, Canvas LMS integration, and advanced time management features.

## Features

### 📚 Study Tools
- **AI Tutor:** Get instant help with homework and study questions
- **Flashcards:** Create and study custom flashcard decks
- **Scanner:** Capture assignments by scanning syllabus documents
- **Study Sessions:** Track your focused study time with Pomodoro-style timers

### 📅 Planning & Organization
- **AI Calendar:** Natural language calendar ("Study chemistry tomorrow at 3pm")
- **Assignment Tracker:** Manage all your assignments in one place
- **Canvas LMS Integration:** Automatically sync assignments, courses, and grades
- **Infinite Campus Integration:** Sync assignments from Infinite Campus

### 🎯 Gamification
- **XP System:** Earn experience points for completing tasks
- **Badges & Achievements:** Unlock badges for study milestones
- **Streak Tracking:** Build and maintain study streaks
- **Leaderboard:** Compete with friends (coming soon)

### 📊 Analytics
- **Study Time Tracking:** Visualize your study patterns
- **Progress Insights:** See your productivity trends
- **Grade Tracking:** Monitor your academic performance

## Canvas LMS Integration

Focus Flow Desktop integrates seamlessly with Canvas LMS to automatically sync your:
- 📚 Courses and class information
- 📝 Assignments with due dates and submissions
- 📊 Current and final grades

### Setup Guide

For detailed instructions on setting up Canvas integration, see [CANVAS_SETUP.md](./CANVAS_SETUP.md)

**Quick Start:**
1. Generate a Canvas API token from your Canvas account settings
2. Go to Account tab in Focus Flow Desktop
3. Enter your Canvas URL and API token
4. Click "Test Connection" to verify
5. Navigate to Canvas Hub and click "Sync to App"

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/reidwcoleman/focus-flow-desktop.git
   cd focus-flow-desktop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_GROQ_API_KEY=your_groq_api_key
     ```

4. **Run database migrations:**
   ```bash
   # Set your Supabase access token
   export SUPABASE_ACCESS_TOKEN=your_access_token

   # Run migrations
   supabase db push
   ```

5. **Deploy Edge Functions (for Canvas/IC integration):**
   ```bash
   ./deploy-canvas-proxy.sh
   ./deploy-ic-proxy.sh
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open the app:**
   - Navigate to `http://localhost:5173` in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
focus-flow-desktop/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Planner.jsx      # AI calendar
│   │   ├── CanvasHub.jsx    # Canvas integration UI
│   │   ├── StudyHub.jsx     # Study tools
│   │   └── ...
│   ├── services/            # API services
│   │   ├── canvasService.js         # Canvas LMS integration
│   │   ├── infiniteCampusService.js # Infinite Campus integration
│   │   ├── assignmentsService.js    # Assignment management
│   │   ├── calendarService.js       # Calendar/activities
│   │   └── ...
│   ├── lib/                 # Shared libraries
│   │   └── supabase.js      # Supabase client
│   └── contexts/            # React contexts
│       └── StudyContext.jsx # Study session state
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── canvas-proxy/    # Canvas API proxy
│   │   ├── infinite-campus-proxy/  # IC API proxy
│   │   └── ai-chat/         # AI tutor backend
│   └── migrations/          # Database migrations
├── public/                  # Static assets
├── .env                     # Environment variables (not in git)
├── CANVAS_SETUP.md         # Canvas setup guide
└── README.md               # This file
```

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth
- **AI:** Groq API (Llama models)
- **Styling:** Tailwind CSS
- **Deployment:** GitHub Pages (static) + Supabase (backend)

## Database Schema

### Main Tables
- `user_profiles` - User profile data and settings
- `assignments` - All assignments (manual, Canvas, IC)
- `calendar_activities` - Calendar events and activities
- `flashcard_decks` - Flashcard deck metadata
- `flashcards` - Individual flashcards
- `study_sessions` - Study time tracking
- `xp_transactions` - XP gain/loss history
- `user_badges` - Earned badges

### Canvas Integration Tables
- `canvas_courses` - Synced Canvas courses
- `course_grades` - Course grades from Canvas
- Assignments with `source='canvas'` in `assignments` table

## Development

### Running Locally

```bash
npm run dev
```

### Running Database Locally

```bash
supabase start
```

### Running Edge Functions Locally

```bash
supabase functions serve
```

### Deploying Edge Functions

```bash
# Canvas proxy
./deploy-canvas-proxy.sh

# Infinite Campus proxy
./deploy-ic-proxy.sh
```

## Troubleshooting

### Canvas Integration Issues
See [CANVAS_SETUP.md](./CANVAS_SETUP.md#troubleshooting)

### Build Errors
- Make sure you're using Node.js 18+
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Supabase Connection Issues
- Verify your `.env` file has the correct Supabase credentials
- Check that your Supabase project is running
- Ensure RLS policies are properly configured

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For questions or issues:
- Check the documentation in this README
- Review the Canvas setup guide: [CANVAS_SETUP.md](./CANVAS_SETUP.md)
- Open an issue on GitHub

---

**Happy studying! 📚✨**
