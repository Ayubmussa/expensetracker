# 💰 Expense Tracker App

A modern, full-stack web application to handle one's own expenses efficiently. Built on React and TypeScript for the client side and Supabase as backend-as-a-service, the application is an independent system to track expenses with safe authentication and real-time data syncing.

## Key Features

- ✅ **Two Operation Modes**:
  - **🌐 Online Mode**: Cloud sync with Supabase backend, live data synchronization, secure sign-in, and device accessibility
  - **📱 Offline Mode**: Full offline functionality using browser storage, delivering expense tracking with no registration or internet, with features for automated syncing when online
  - **🔄 Auto Synchronization**: Auto synchronization from offline to online databases with conflict resolution
  - Real-time status indicators and seamless mode switching

- ✅ **Receipt Scanner**:
  - **📸 AI-powered OCR**: Automatically extract expenses from receipt photos using Tesseract.js
  - **📷 Camera Integration**: Direct camera access for direct receipt capture
  - **📁 File Upload Support**: Upload of multiple images of supported types (JPEG, PNG, GIF, WebP)
  - **🎯 Smart Data Extraction**: Automatized parsing of amounts, dates, vendors, and categories
  - **🧠 Category Intelligence**: Database-merging category matching with keyword fallbacks
  - **✏️ Manual Correction**: Easy data verification and edit interface
  - **💾 Receipt History**: Full receipt storage and management system

- ✅ **Smart Authentication**:
  - Optional authentication with seamless offline/online switching
  - Optional user registration with email confirmation
  - Secure sign in with JWT token management and refresh tokens
  - Password reset with secure email-based recovery
  - Session persistence with automatic token refresh

- ✅ **Expense Management**:
  - **➕ Single Entry**: Plain expense input with smart defaults, category suggestions, and receipt scanner integration
  - **� Bulk Entry**: Multi-expense entry screen with validation and quick actions, dynamic row management, real-time field validation, and batch submission
  - **📈 Analytics Dashboard**: Real-time charts, summaries, and budget monitoring with visual indicators
  - **💰 Budgeting**: Progress monitoring and overspending alerts in budgeting
  - Complete CRUD operations with intelligent categorization

- ✅ **Modern UI/UX**:
  - **🎨 Dark Theme**: Dark color scheme with blue undertone and snappy animation
  - **📱 Responsive Design**: Mobile-first approach optimized for phones, tablets, and desktop
  - **⚡ Performance**: Spectacularly fast build tool with HMR and production build optimization
  - Touch-friendly interface with smooth transitions

- ✅ **Type Safety**:
  - **🔒 Full TypeScript Integration**: Quality development experience with strict type checking
  - Interface definitions for all data structures
  - Compile-time error prevention

## Technical Architecture

### Frontend Technology Stack

- **React 19**: Latest component architecture with modern hooks and concurrent features
- **TypeScript**: Strict type checking for better code quality and dev experience  
- **Vite**: Spectacularly fast build tool with HMR and production build optimization
- **Tesseract.js**: Receipt text processing on the client side using OCR engine
- **Chart.js**: Interactive data visualization of expenses for analytics
- **CSS3**: Responsive design and modern styling using CSS custom properties

### Backend & Database

- **Supabase**: Real-time subscriptions-enabled PostgreSQL database with edge functions
- **Supabase Storage**: Receipt image file storage with CDN delivery and security
- **Row Level Security (RLS)**: Data isolation and access at the database level
- **PostgREST API**: Automatically generated REST API with support for advanced filtering and pagination
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Local Storage**: Offline-first architecture with auto-sync

### Database Schema

The application uses a rich, normalized database schema with enhanced features:

- **expenses**: Core expense data with user isolation, amount, description, category, and timestamp
- **categories**: Dynamic category system with user-defined categories, colors, and icons
- **receipts**: Receipt storage with OCR extracted data, confidence scores, and image references
- **profiles**: Rich user profiles with preferences and settings
- **auth.users**: Integration of Supabase authentication system

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

Create a `.env` file and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Application Features & Functionality

### Dual-Mode Operation

**Online Mode**: End-to-end cloud syncing with Supabase backend, with live data synchronization, secure sign-in, and device accessibility.

**Offline Mode**: Full offline functionality using browser storage, delivering expense tracking with no registration or internet, with features for automated syncing when online.

### Receipt Scanner & OCR

Groundbreaking receipt processing system with:
- **Camera Integration**: Direct camera access for direct receipt capture
- **File Upload Support**: Upload of multiple images of supported types (JPEG, PNG, GIF, WebP)
- **Client-side OCR**: Tesseract.js powered text scanning with confidence score
- **Smart Data Extraction**: Automatized parsing of amounts, dates, vendors, and categories
- **Category Intelligence**: Database-merging category matching with keyword fallbacks
- **Manual Correction**: Easy data verification and edit interface
- **Receipt History**: Full receipt storage and management system

**Requirements**: Camera access for photo capture, or file system access for uploads. All processing happens in the browser.

### Data Synchronization

Intelligent synchronization system with:
- Automatic detection of offline data for sync
- Duplicate prevention with intelligent conflict resolution
- Real-time sync status indicators with progress feedback
- User-triggered sync with manual sync triggering
- Incremental sync for improved performance

## Project Structure

```
src/
├── components/           # React components
│   ├── ExpenseForm.tsx  # Form for adding expenses (with receipt scanner)
│   ├── ExpenseList.tsx  # List and filter expenses
│   ├── ExpenseSummary.tsx # Summary statistics
│   └── ReceiptScanner.tsx # Receipt scanning and OCR processing
├── config/              # Configuration files
│   └── supabase.ts     # Supabase client setup
├── services/            # Business logic
│   ├── expenseService.ts # Expense CRUD operations
│   └── receiptService.ts # Client-side receipt processing with OCR
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

## Security & Data Protection

### Multi-Layer Security
- **Row Level Security (RLS)**: Database-level user data isolation using policy-based access
- **JWT Authentication**: Secure token-based session refreshing automatically
- **Input Validation**: Client-side and server-side validation of data
- **HTTPS Encryption**: End-to-end encryption of all data transfers
- **File Security**: Receipt images stored securely with access controls
- **XSS Protection**: Content security policies and input sanitization

### Privacy & Data Management
- Isolation of user data without access to other users' data
- Time-bound token-based secure password reset
- Encryption of local storage for offline data protection
- GDPR-level data handling with user control
- Session expiration and safe logout mechanisms automation
- Receipt image metadata removal to ensure privacy

## Performance Optimization

- **Vite-powered Development**: Sub-second reloads with hot module replacement
- **Production Builds**: Tree shaking and minification for optimal performance
- **Image Optimization**: Receipt caching and optimized storage
- **Lazy Loading**: OCR library loaded on-demand for improved initial load times
- **Efficient Data Retrieval**: Advanced caching techniques and incremental sync
- **Progressive Web App**: Offline mode capabilities and PWA features

## Data Synchronization Details

### How Sync Works

The app provides seamless synchronization between offline and online data:

1. **Offline Data Storage**: When using offline mode, all expenses and categories are stored locally in browser storage
2. **Automatic Sync Detection**: When you log in after using offline mode, the app automatically detects and syncs your offline data
3. **Manual Sync Triggers**: You can manually trigger sync at any time using the sync button in the interface
4. **Intelligent Conflict Resolution**: The sync system prevents duplicate entries by checking existing online data
5. **Real-time Feedback**: Visual sync status indicators show progress and results with detailed feedback

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
- **❌ Sync Error**: Shows if sync encounters issues with detailed error messages

### When Sync Occurs

- Automatically when logging in after offline usage
- When coming back online after being offline
- Manually when clicking the "Sync Now" button
- Periodically checks for unsynced data every 30 seconds

## Conclusion

Expense Tracker application is an end-to-end demonstration of modern full-stack web development, showcasing the newest React patterns, TypeScript integration, and Supabase integration. The application effectively runs through the whole expense management cycle with cutting-edge features like AI-driven receipt scanning, dual-mode capability, and wise data synchronization.

### Key Achievements

- **🚀 Innovation**: World-class receipt scanning with client-side OCR handling
- **🔄 Flexibility**: Dual-mode architecture to support both online and offline use
- **💫 User Experience**: Easy-to-use user interface with instant feedback and analytics
- **🔒 Security**: Enterprise-class security with complete data protection
- **⚡ Performance**: Performance-optimized with new build tools and technology
- **🛠️ Maintainability**: TypeScript-based clean architecture with modular design

The project demonstrates expertise in all aspects of frontend development, backend integration, database design, API development, security implementation, and state-of-the-art deployment practices. The receipt scanner functionality, in particular, discusses advanced integration of machine learning capabilities into a web application platform.

The application offers a good foundation for cost tracking with regard to unveiling scalable patterns for enterprise-level applications.
