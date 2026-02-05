# Gallifrey - Social Feed POC Implementation Plan

## Project Overview
A React Native social feed proof of concept for iPhone with user authentication, post creation (text/emoji/media), feed browsing, and social interactions (reactions/comments).

---

## 🎯 Tech Stack (Optimized for Speed)

### Core Framework
- **React Native** (latest stable) with TypeScript
- **Expo** (managed workflow) - Fastest path to iPhone deployment
  - Built-in camera/gallery APIs
  - OTA updates
  - Simplified build process

### Backend & Authentication
- **Supabase** (recommended for POC speed)
  - Built-in auth (email/password)
  - PostgreSQL database
  - Real-time subscriptions
  - Storage for media files
  - RESTful APIs out of the box

### State Management
- **Zustand** - Minimal boilerplate, TypeScript-friendly
- **React Query (TanStack Query)** - Data fetching, caching, pagination

### UI & Design
- **React Native Paper** - Material Design components, clean & modern
- **React Navigation** - Industry standard navigation

### Media Handling
- **expo-image-picker** - Camera & gallery access
- **expo-av** - Video playback

### Performance
- **FlashList** (by Shopify) - Superior to FlatList for feed performance
- **react-native-fast-image** - Optimized image loading/caching

---

## 📐 TypeScript Architecture

### Core Data Models

```typescript
// src/types/models.ts

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  updated_at: string;
  // Populated relations
  user?: User;
  reactions_count?: Record<ReactionType, number>;
  comments_count?: number;
  user_reaction?: ReactionType | null;
}

export type ReactionType = '❤️' | '👍' | '😂' | '🔥' | '😮';

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Populated relations
  user?: User;
}

export interface CreatePostInput {
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
}

export interface CreateCommentInput {
  post_id: string;
  content: string;
}
```

### API Response Types

```typescript
// src/types/api.ts

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  has_more: boolean;
  total?: number;
}
```

### State Management Types

```typescript
// src/stores/auth.store.ts
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// src/stores/feed.store.ts
export interface FeedState {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
}
```

---

## 🏗️ React Native Implementation

### Project Structure

```
gallifrey/
├── src/
│   ├── components/
│   │   ├── feed/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostActions.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   └── ReactionPicker.tsx
│   │   ├── shared/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Button.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── media/
│   │       ├── MediaPicker.tsx
│   │       └── MediaPreview.tsx
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   ├── CreatePostScreen.tsx
│   │   ├── PostDetailScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── auth.service.ts
│   │   ├── posts.service.ts
│   │   └── storage.service.ts
│   ├── stores/
│   │   ├── auth.store.ts
│   │   └── feed.store.ts
│   ├── hooks/
│   │   ├── usePosts.ts
│   │   ├── useComments.ts
│   │   └── useReactions.ts
│   ├── types/
│   │   ├── models.ts
│   │   ├── api.ts
│   │   └── navigation.ts
│   ├── utils/
│   │   ├── formatDate.ts
│   │   └── validateInput.ts
│   └── constants/
│       ├── colors.ts
│       └── config.ts
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

### Navigation Structure

```typescript
// Auth Stack
- LoginScreen
- SignUpScreen

// Main Stack (Tab Navigator)
- Feed Tab
  - FeedScreen
  - PostDetailScreen
- Create Tab
  - CreatePostScreen
- Profile Tab
  - ProfileScreen
```

### Key Components

#### 1. PostCard Component
```typescript
interface PostCardProps {
  post: Post;
  onPressComment: (postId: string) => void;
  onPressReaction: (postId: string, reaction: ReactionType) => void;
}
```
- User avatar & username
- Post content with emoji support
- Media display (image/video)
- Reaction bar with counts
- Comment count & action
- Timestamp

#### 2. Feed Performance Strategy
- Use **FlashList** instead of FlatList
- Implement pagination (20 posts per page)
- Optimistic UI updates for reactions
- Image lazy loading with placeholders
- Memoize PostCard component
- Virtual keyboard handling

#### 3. Media Upload Flow
```typescript
1. User taps camera/gallery button
2. expo-image-picker opens
3. User selects image/video
4. Show preview with edit option
5. Upload to Supabase Storage on post submit
6. Get public URL and save to post record
```

---

## 📱 iOS-Specific Considerations

### Required Permissions (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to let you capture photos for posts</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to let you share photos in posts</string>

<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record videos</string>
```

### Expo Configuration (app.json)

```json
{
  "expo": {
    "name": "Gallifrey",
    "slug": "gallifrey",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.gallifrey",
      "infoPlist": {
        "NSCameraUsageDescription": "We need access to your camera to let you capture photos for posts",
        "NSPhotoLibraryUsageDescription": "We need access to your photo library to let you share photos in posts",
        "NSMicrophoneUsageDescription": "We need access to your microphone to record videos"
      }
    }
  }
}
```

### iOS Performance Optimizations
- Use `removeClippedSubviews={true}` on FlashList
- Implement proper image caching
- Use native driver for animations
- Optimize bundle size (exclude unused modules)
- Enable Hermes JavaScript engine

### UI/UX Considerations
- Safe area handling (notch/home indicator)
- Haptic feedback on interactions
- Pull-to-refresh gesture
- Swipe gestures for actions
- iOS keyboard behavior (dismissal)
- Native-looking navigation transitions

---

## 🗄️ Database Schema (Supabase)

### Tables

**users** (extends Supabase auth.users)
```sql
- id (uuid, primary key, references auth.users)
- username (text, unique)
- avatar_url (text, nullable)
- created_at (timestamp)
```

**posts**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users.id)
- content (text)
- media_url (text, nullable)
- media_type (text, nullable) -- 'image' | 'video'
- created_at (timestamp)
- updated_at (timestamp)
```

**reactions**
```sql
- id (uuid, primary key)
- post_id (uuid, foreign key → posts.id)
- user_id (uuid, foreign key → users.id)
- type (text) -- emoji string
- created_at (timestamp)
- UNIQUE(post_id, user_id) -- one reaction per user per post
```

**comments**
```sql
- id (uuid, primary key)
- post_id (uuid, foreign key → posts.id)
- user_id (uuid, foreign key → users.id)
- content (text)
- created_at (timestamp)
```

### Row Level Security (RLS) Policies
- Users can read all posts/comments/reactions
- Users can only create/update/delete their own posts/comments/reactions
- Enable real-time subscriptions for feed updates

---

## 🚀 Implementation Phases

### Phase 1: Project Setup (30 min)
1. Initialize Expo TypeScript project
2. Install dependencies
3. Configure Supabase project & credentials
4. Set up navigation structure
5. Configure TypeScript strict mode

### Phase 2: Authentication (1 hour)
1. Create Supabase auth service
2. Build login/signup screens
3. Implement Zustand auth store
4. Add auth navigation flow
5. Test authentication

### Phase 3: Database & Models (45 min)
1. Create database tables in Supabase
2. Set up RLS policies
3. Define TypeScript types
4. Create service layer functions
5. Test CRUD operations

### Phase 4: Feed Implementation (2 hours)
1. Build PostCard component
2. Implement FeedScreen with FlashList
3. Add pagination with React Query
4. Implement pull-to-refresh
5. Add loading states
6. Test feed performance

### Phase 5: Post Creation (1.5 hours)
1. Build CreatePostScreen
2. Implement media picker
3. Add media preview
4. Create upload service
5. Implement optimistic updates
6. Test post creation flow

### Phase 6: Social Features (2 hours)
1. Build reaction system
2. Implement reaction picker UI
3. Create comment system
4. Build PostDetailScreen
5. Add comment creation
6. Test all interactions

### Phase 7: Polish & Testing (1.5 hours)
1. Add error handling
2. Implement loading states
3. Test on physical iPhone
4. Fix UI issues
5. Add haptic feedback
6. Optimize performance

**Total Estimated Time: 8-9 hours of focused development**

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-image-picker": "~14.7.1",
    "expo-av": "~13.10.4",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-paper": "^5.11.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "@shopify/flash-list": "1.6.3",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "typescript": "^5.3.0"
  }
}
```

---

## 🎨 Design Principles

### Modern & Clean UI
- Use React Native Paper's Material Design 3
- Consistent spacing (8px grid)
- Subtle shadows and elevation
- Smooth animations (native driver)
- Clean typography hierarchy
- Minimalist color palette

### Color Scheme (Material You approach)
```typescript
const theme = {
  primary: '#6750A4',      // Purple (Doctor Who themed)
  secondary: '#625B71',
  background: '#FFFBFE',
  surface: '#FFFBFE',
  error: '#B3261E',
  onPrimary: '#FFFFFF',
  onBackground: '#1C1B1F',
}
```

---

## ✅ Success Criteria

- [ ] Users can sign up and log in
- [ ] Users can create posts with text and emoji
- [ ] Users can upload photos/videos to posts
- [ ] Feed displays posts in reverse chronological order
- [ ] Feed scrolls smoothly (60fps) with 100+ posts
- [ ] Users can react to posts (5 reaction types)
- [ ] Users can comment on posts
- [ ] Post detail view shows all comments
- [ ] App runs on physical iPhone without crashes
- [ ] UI looks modern and clean
- [ ] All interactions have immediate visual feedback

---

## 🔄 Next Steps After POC

If POC is successful, consider:
- Push notifications
- User profiles & bios
- Follow/follower system
- Direct messaging
- Search functionality
- Post editing/deletion
- Video autoplay in feed
- Stories/temporary posts
- Analytics dashboard
- App Store deployment

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on physical iPhone (via Expo Go app)
# Scan QR code with camera

# Build for iOS
eas build --platform ios

# TypeScript check
npx tsc --noEmit
```

---

**This plan prioritizes speed and simplicity while ensuring a production-quality POC that can be built in a focused day of development.**
