# iSynera Healthcare Mobile App

A comprehensive HIPAA-compliant mobile application for healthcare professionals, built with React Native and Expo.

## Features

### 🏥 Core Healthcare Modules
- **Autonomous Intake Engine** - AI-powered document processing and patient intake automation
- **iSynera Scribe** - Real-time medical transcription with SOAP note generation
- **Referral Summary Generator** - Intelligent clinical overview with risk stratification
- **HOPE Assessment AI** - CMS-compliant homebound status determination
- **Chart Review & Coding** - Medical coding validation and compliance assistance
- **Autonomous AI Agents** - Multi-agent task automation and collaboration

### 📱 Mobile-Optimized Features
- **Field Operations** - Mobile-first interface for field staff
- **Patient Visit Management** - Real-time visit tracking and documentation
- **Clinical Documentation** - Voice notes, photos, and vital signs recording
- **Offline Capability** - Works without internet connection
- **GPS Integration** - Location tracking and navigation
- **Secure Authentication** - HIPAA-compliant user authentication

## 🚀 Implementation Guide

### Prerequisites
1. **Node.js 18+** - JavaScript runtime
2. **Expo CLI** - React Native development platform
3. **iOS/Android Development Environment**
   - Xcode (for iOS development)
   - Android Studio (for Android development)

### Step 1: Install Dependencies
```bash
cd mobile-app
npm install

# Install Expo CLI globally
npm install -g expo-cli
```

### Step 2: Start Development Server
```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

### Step 3: Build for Production

#### iOS Build
```bash
# Build for iOS App Store
expo build:ios --type app-store

# Build for iOS simulator
expo build:ios --type simulator
```

#### Android Build
```bash
# Build APK for testing
expo build:android --type apk

# Build AAB for Google Play Store
expo build:android --type app-bundle
```

## 📱 Platform Support

### iOS Requirements
- iOS 11.0 or later
- iPhone 6s or later
- iPad (6th generation) or later

### Android Requirements
- Android 8.0 (API level 26) or later
- ARM64 or x86_64 architecture
- 2GB RAM minimum, 4GB recommended

## 🔐 Security & Compliance

### HIPAA Compliance Features
- **End-to-end encryption** for all data transmission
- **Secure storage** using device keychain/keystore
- **Audit logging** for all user actions
- **Session management** with automatic timeout
- **Biometric authentication** support (fingerprint/face)

### Data Protection
- Patient data encrypted at rest
- Secure API communication with TLS 1.3
- Local data wiping on logout
- Compliance with healthcare data regulations

## 🏗️ Architecture

### Technology Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation 6
- **State Management**: TanStack Query + Context API
- **UI Components**: React Native Paper
- **Authentication**: JWT with secure storage
- **Database**: Sync with existing PostgreSQL backend

### Project Structure
```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   │   ├── auth/          # Authentication screens
│   │   ├── ai/            # AI module screens
│   │   ├── field/         # Field operations screens
│   │   └── core/          # Core healthcare screens
│   ├── context/           # React Context providers
│   ├── services/          # API services
│   ├── theme/             # Theme and styling
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, icons
├── app.json              # Expo configuration
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables
Create `.env` file in the root directory:
```env
API_BASE_URL=https://your-backend-domain.com
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Backend Integration
The mobile app connects to your existing iSynera web platform backend:
- Same REST API endpoints
- Shared authentication system
- Real-time data synchronization
- Offline data caching

## 📋 Development Workflow

### 1. Local Development
```bash
# Start development server
npm start

# Run on device/simulator
npm run ios
npm run android
```

### 2. Testing
```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

### 3. Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### 4. Build & Deploy
```bash
# Build for production
npm run build:ios
npm run build:android

# Deploy to app stores
npm run deploy:ios
npm run deploy:android
```

## 🔄 Synchronization with Web Platform

### Real-time Features
- **Live data sync** with web platform
- **Push notifications** for critical updates
- **Offline queue** for actions taken without connectivity
- **Conflict resolution** for simultaneous edits

### Shared Functionality
- Same user accounts and permissions
- Identical AI processing capabilities
- Consistent UI/UX across platforms
- Synchronized patient data and records

## 📱 Mobile-Specific Features

### Device Integration
- **Camera** - Document scanning and photo capture
- **Microphone** - Voice transcription and notes
- **GPS** - Location tracking for field visits
- **Biometrics** - Fingerprint/face unlock
- **Notifications** - Real-time alerts and reminders

### Offline Capabilities
- **Data caching** - Essential data stored locally
- **Offline actions** - Queue actions for later sync
- **Automatic sync** - Uploads when connection restored
- **Conflict handling** - Smart merge for data conflicts

## 🎯 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Configure environment** variables
4. **Start development server**: `npm start`
5. **Open on device** using Expo Go app
6. **Build for production** when ready

For detailed setup instructions, see the [Development Setup Guide](./docs/setup.md).