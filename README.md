# NetScope

**Event Discovery & Networking Dashboard for Chicago**

A modern, dark-mode-first web application built for business development-minded professionals to discover events and explore networking communities in Chicago.

![NetScope](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4+-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### 📅 Event Discovery Feed
- Aggregate events from multiple sources (Eventbrite, Meetup, Luma)
- Filter by type, format, cost, topics, and date range
- Save events for later or dismiss irrelevant ones
- Mock/sample data included for immediate use

### 🏢 Club & Community Finder
- Curated directory of Chicago's best professional clubs and communities
- Pre-seeded with 12+ top Chicago clubs including:
  - Soho House Chicago
  - 1871 (tech hub)
  - mHUB (hardware innovation center)
  - YPO/EO chapters
  - And more...
- Track your membership status (Interested, Applied, Member)

### 📆 Calendar View
- Visual monthly calendar of saved events
- Click dates to see event details
- Never miss an important networking opportunity

### 💾 Local Data Persistence
- SQLite database for fast, local storage
- No cloud dependencies
- Your data stays on your machine

### 🎨 Modern UI/UX
- Dark-mode-first design (inspired by Linear/Raycast)
- Fully responsive (works great on mobile and desktop)
- Fast, minimal, information-dense
- Smooth transitions and interactions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd /data/.openclaw/workspace/netscope
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   ```bash
   npm run db:init
   ```
   This creates the SQLite database and seeds it with sample clubs and events.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! The app is fully functional with sample data out of the box.

## 📁 Project Structure

```
netscope/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── events/        # Event CRUD operations
│   │   └── clubs/         # Club CRUD operations
│   ├── calendar/          # Calendar view page
│   ├── clubs/             # Clubs browser page
│   ├── saved/             # Saved events page
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/Feed page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── event-card.tsx    # Event display card
│   ├── club-card.tsx     # Club display card
│   ├── filter-sidebar.tsx # Filter UI
│   └── nav.tsx           # Navigation
├── lib/                   # Utilities and core logic
│   ├── db.ts             # Database connection
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Helper functions
├── scripts/               # Setup scripts
│   └── init-db.js        # Database initialization
├── data/                  # SQLite database (created on init)
└── package.json
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (optional):

```env
# Eventbrite API (optional - app works without it)
EVENTBRITE_API_KEY=your_api_key_here

# Meetup API (optional)
MEETUP_API_KEY=your_api_key_here

# Database location (optional)
DATABASE_PATH=./data/netscope.db
```

**Note:** API keys are completely optional. The app ships with sample data and is fully functional without any external APIs.

### Adding API Keys via UI

You can also add API keys through the Settings page in the app (Settings → API Keys section).

## 📊 Database

NetScope uses **SQLite** via `better-sqlite3` for local data persistence.

### Schema

**Events Table:**
- Event metadata (title, description, dates, location)
- Type (conference, seminar, webinar, meetup, workshop, networking)
- Format (in-person, virtual, hybrid)
- Topics (JSON array)
- Cost information
- Status tracking (active, saved, dismissed)

**Clubs Table:**
- Club information (name, description, location)
- Type (social, professional, tech, coworking)
- Membership details and cost info
- Vibe/culture notes
- Status tracking (active, interested, applied, member, dismissed)

### Resetting the Database

To reset and re-seed the database:

```bash
rm -rf data/
npm run db:init
```

## 🎨 Customization

### Adding More Clubs

Edit `scripts/init-db.js` and add to the `clubs` array, then run:

```bash
npm run db:init
```

### Adding Custom Events

Events can be added through the API or by directly inserting into the database:

```javascript
const event = {
  id: 'unique-id',
  title: 'My Event',
  description: 'Event description',
  start_date: '2026-04-15T09:00:00',
  location: 'Chicago, IL',
  format: 'in-person',
  type: 'conference',
  topics: JSON.stringify(['tech', 'business']),
  cost: 'free',
  source: 'manual'
};
```

### Theming

The app uses CSS variables for theming. Edit `app/globals.css` to customize colors:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... etc */
}
```

## 🔌 API Integration (Future Enhancement)

The app is designed to integrate with real APIs. Placeholder integration points exist for:

- **Eventbrite API** - Event discovery
- **Meetup API** - Meetup groups and events
- **Luma** - Web scraping for popular events

To add live data, implement fetching logic in `app/api/events/route.ts` using the API keys from settings.

## 📱 Mobile Support

NetScope is fully responsive with a mobile-optimized navigation at the bottom on small screens.

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy Options

- **Vercel** (recommended for Next.js)
- **Docker** (bring your own Dockerfile)
- **Self-hosted** (any Node.js environment)

**Note:** When deploying, ensure the SQLite database directory is writable and persisted.

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui patterns
- **Database:** SQLite (better-sqlite3)
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 📝 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🎯 Roadmap

- [ ] Live API integration (Eventbrite, Meetup, Luma)
- [ ] Email digest notifications
- [ ] Export calendar to iCal
- [ ] Event recommendations based on interests
- [ ] Social sharing features
- [ ] Advanced search with natural language
- [ ] Mobile app (React Native)

## 📄 License

MIT

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

---

**Built with ❤️ for Chicago's tech and business community**

For questions or support, open an issue in the repository.
