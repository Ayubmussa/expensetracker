# 💰 ExpenseTracker

A modern React TypeScript expense tracking application with **dual-mode operation**: full cloud sync with Supabase backend OR complete offline functionality with local storage.

## Features

- ✅ **Dual Operation Modes**:
  - **🌐 Online Mode**: Secure cloud sync with Supabase backend
  - **📱 Offline Mode**: Complete local functionality without registration
  - **🔄 Automatic Data Sync**: Seamless synchronization when switching from offline to online
  - Automatic mode detection and switching
  - Real-time status indicators

- ✅ **Smart Data Synchronization**:
  - Automatic sync when going from offline to online mode
  - Manual sync trigger for user-initiated data synchronization
  - Duplicate detection to prevent data conflicts
  - Visual sync status indicators and progress feedback
  - Offline data persistence until successfully synced

- ✅ **Multi-Page Interface**:
  - **📊 Budget Overview**: Budget status with visual pie chart
  - **➕ Expense Entry**: Forms for adding single or multiple expenses
  - **📈 Analytics**: Expense summaries, lists, and trend charts
  - Smooth navigation between pages with state preservation

- ✅ **Optional Authentication**: 
  - Choose between online (with account) or offline (anonymous) usage
  - Secure login, registration, and password reset for online mode
  - No signup required for offline mode

- ✅ **Complete Expense Management**: 
  - Add, edit, and delete expenses in both modes
  - Bulk expense entry for adding multiple expenses at once
  - Category-based organization with color coding
  - Real-time spending summaries and breakdowns

- ✅ **Modern UI/UX**:
  - Dark theme with black background and blue accents
  - Responsive design for mobile, tablet, and desktop
  - Modal interfaces for bulk operations and password updates
  - Real-time mode status and switching options

- ✅ **Data & Privacy**:
  - User-specific data isolation in online mode
  - Local-only storage in offline mode
  - Automatic fallback when connection fails
  - Type-safe TypeScript implementation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Modern CSS with custom components
- **State Management**: React Hooks
- **Build Tool**: Vite
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ayubmussa/expensetracker.git
cd expensetracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Edit `.env` and add your Supabase credentials:


4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/           # React components
│   ├── ExpenseForm.tsx  # Form for adding expenses
│   ├── ExpenseList.tsx  # List and filter expenses
│   └── ExpenseSummary.tsx # Summary statistics
├── config/              # Configuration files
│   └── supabase.ts     # Supabase client setup
├── services/            # Business logic
│   └── expenseService.ts # Expense CRUD operations
├── types/               # TypeScript type definitions
│   └── index.ts        # Application types
├── utils/               # Utility functions
│   └── localStorage.ts  # Local storage operations
└── App.tsx             # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint


### Local Storage Fallback
The app automatically falls back to local storage when:
- No internet connection
- Supabase is unavailable
- Initial setup before Supabase configuration

### Responsive Design
- Mobile-first approach
- Optimized for phones, tablets, and desktop
- Touch-friendly interface

### Type Safety
- Full TypeScript implementation
- Strict type checking
- Interface definitions for all data structures

## Data Synchronization

### How Sync Works

The app provides seamless synchronization between offline and online data:

1. **Offline Data Storage**: When using offline mode, all expenses and categories are stored locally in browser storage
2. **Automatic Sync on Login**: When you log in after using offline mode, the app automatically detects and syncs your offline data
3. **Manual Sync**: You can manually trigger sync at any time using the sync button in the interface
4. **Duplicate Prevention**: The sync system prevents duplicate entries by checking existing online data
5. **Visual Feedback**: Real-time sync status indicators show progress and results

### Sync Process

1. **Detection**: App checks for unsynced offline data when user authenticates
2. **Filtering**: Only new data (not already in the cloud) is selected for sync
3. **Upload**: Expenses and custom categories are uploaded to the cloud database
4. **Verification**: Sync results are displayed with success/error feedback
5. **Cleanup**: Local data is preserved as backup, with sync timestamp recorded

### Sync Indicators

- **⏳ Unsynced Data**: Shows when offline data is waiting to be synced
- **🔄 Syncing**: Displays during active sync operations
- **✅ Sync Complete**: Confirms successful data synchronization
- **❌ Sync Error**: Shows if sync encounters issues

### When Sync Occurs

- Automatically when logging in after offline usage
- When coming back online after being offline
- Manually when clicking the "Sync Now" button
- Periodically checks for unsynced data every 30 seconds
