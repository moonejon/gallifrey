# Gallifrey - Social Feed POC Implementation Plan

## Project Overview
A React Native social feed proof of concept for iPhone with user authentication, post creation (text/emoji/images), feed browsing, and social interactions (reactions/comments).

**Scope:** Polished POC, NOT App Store submission. Runs on physical iPhone via Expo Go or dev build.
**Timeline:** 10-12 hours of focused development.

> **Revision Note:** This plan incorporates fixes from three expert reviews (TypeScript 6/10, React Native 7.5/10, iOS 5/10). All critical issues have been addressed while keeping the POC timeline tight. See `EXPERT_REVIEWS.md` for the full original assessments.

---

## Tech Stack (Optimized for Speed)

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
  - Storage for media files
  - RESTful APIs out of the box

### State Management
- **React Query (TanStack Query)** - Single source of truth for all server state (posts, comments, reactions). Handles fetching, caching, pagination, and optimistic updates.
- **Zustand** - Client-only state (auth session, UI preferences). Minimal footprint.

> **Why not both for server state?** The original plan had a Zustand `feed.store.ts` duplicating what React Query already manages. This creates two sources of truth and bugs when they desync. React Query owns server data; Zustand owns client-only data.

### UI & Design
- **React Native Paper** - Material Design components, customized for iOS-native feel (see iOS section)
- **React Navigation** - Industry standard navigation with native stack navigators

### Media Handling
- **expo-image-picker** - Camera & gallery access (images only for POC)
- **expo-image** - High-performance image display with caching, blurhash placeholders, and transitions (replaces react-native-fast-image, which is incompatible with Expo managed workflow)
- **expo-image-manipulator** - Image compression before upload

### Performance
- **FlashList** (by Shopify) - Superior to FlatList for feed performance
- **Hermes** - JavaScript engine with faster cold-start and lower memory usage

---

## TypeScript Architecture

> **Supabase type generation:** After creating the database schema, generate
> TypeScript types so the client stays in sync with the DB automatically.
> Re-run this whenever you change the schema.
>
> ```bash
> npx supabase gen types typescript \
>   --project-id "$SUPABASE_PROJECT_ID" \
>   --schema public > src/types/supabase.ts
> ```
>
> Then pass the generated `Database` type to the client:
>
> ```typescript
> import { createClient } from '@supabase/supabase-js';
> import type { Database } from '@/types/supabase';
>
> export const supabase = createClient<Database>(
>   SUPABASE_URL,
>   SUPABASE_ANON_KEY
> );
> ```
>
> The hand-written model types below are the *application-layer* shapes
> (with populated relations, computed counts, etc.) that sit on top of
> the generated DB row types. They should stay small and easy to keep
> aligned with the generated file.

### Reaction Constants

```typescript
// src/constants/reactions.ts

// Semantic keys stored in the database — never store raw emoji.
export const REACTIONS = {
  heart: 'heart',
  thumbs_up: 'thumbs_up',
  laugh: 'laugh',
  fire: 'fire',
  surprised: 'surprised',
} as const;

export type ReactionType = (typeof REACTIONS)[keyof typeof REACTIONS];
// → 'heart' | 'thumbs_up' | 'laugh' | 'fire' | 'surprised'

// Display mapping — only used in the UI layer.
export const REACTION_EMOJI: Record<ReactionType, string> = {
  heart: '❤️',
  thumbs_up: '👍',
  laugh: '😂',
  fire: '🔥',
  surprised: '😮',
};
```

**Why:** Emoji literals are multi-byte, platform-dependent, and painful to
compare or index in Postgres. Store the semantic key; render the emoji in
the component via `REACTION_EMOJI[type]`.

### Core Data Models

```typescript
// src/types/models.ts

import type { ReactionType } from '@/constants/reactions';

// ── User ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;   // null matches Postgres nullable semantics
  created_at: string;
}

// ── Post (discriminated union) ────────────────────────────────────
// Makes "media_url without media_type" (and vice-versa) impossible at
// the type level — no runtime check needed.

interface PostBase {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Populated relations / computed fields
  user?: User;
  reactions_count?: Partial<Record<ReactionType, number>>;
  comments_count?: number;
  user_reaction?: ReactionType | null;
}

interface TextPost extends PostBase {
  media_type?: never;
  media_url?: never;
}

interface ImagePost extends PostBase {
  media_type: 'image';
  media_url: string;
}

export type Post = TextPost | ImagePost;

// ── Reaction ──────────────────────────────────────────────────────
export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

// ── Comment ───────────────────────────────────────────────────────
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

// ── Input DTOs ────────────────────────────────────────────────────
// Same discriminated-union approach for creation so callers can't
// submit media_url without media_type.

export type CreatePostInput =
  | { content: string }
  | { content: string; media_type: 'image'; media_url: string };

export interface CreateCommentInput {
  post_id: string;
  content: string;
}
```

### Error & Result Types

```typescript
// src/types/errors.ts

// Coarse error codes — enough to drive UI (toast vs. redirect vs. retry).
export enum ErrorCode {
  NETWORK = 'NETWORK',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  code: ErrorCode;
  message: string;           // human-readable, safe to show in UI
  details?: unknown;         // raw upstream payload for logging
}

// ── Result<T> ─────────────────────────────────────────────────────
// Discriminated union so every call-site is forced to handle the error
// path *before* it can touch the data.
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

// Convenience constructors — keep service code terse.
export const Ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const Err = (
  code: ErrorCode,
  message: string,
  details?: unknown,
): Result<never> => ({
  ok: false,
  error: { code, message, details },
});
```

**Why `Result<T>` instead of the old `ApiResponse<T>`:** The original
`{ data: T | null; error: ApiError | null }` has four possible states but
only two are valid. A discriminated union collapses it to exactly two
branches. Use it in every service function:

```typescript
// Example service usage
async function fetchPost(id: string): Promise<Result<Post>> {
  const { data, error } = await supabase
    .from('posts').select('*').eq('id', id).single();
  if (error) return Err(ErrorCode.UNKNOWN, error.message, error);
  return Ok(data as Post);
}
```

### Paginated Response

```typescript
// src/types/api.ts

export interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;  // cursor-based > page-based for feeds
}
```

**Note:** Switched from `page: number` to `next_cursor?: string`.
Cursor-based pagination (keyed on `created_at`) avoids the classic
"insert shifts every page offset" problem in a live feed.

### State Management Types

```typescript
// src/stores/auth.store.ts
//
// This is the ONLY Zustand store. All server state (posts, comments,
// reactions) is owned by React Query — no FeedState store.

import type { Session } from '@supabase/supabase-js';
import type { User } from '@/types/models';
import type { Result } from '@/types/errors';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;  // true after first session check

  signIn: (email: string, password: string) => Promise<Result<User>>;
  signUp: (email: string, password: string, username: string) => Promise<Result<User>>;
  signOut: () => Promise<void>;
}
```

**Why no `FeedState`:** React Query already manages loading, error,
pagination, caching, and background refresh for server data. Duplicating
that in Zustand creates two sources of truth and doubles the surface area
for cache-invalidation bugs.

### Query Key Factory

```typescript
// src/lib/query-keys.ts

export const queryKeys = {
  posts: {
    all:     ['posts'] as const,
    list:    (cursor?: string) => ['posts', 'list', { cursor }] as const,
    detail:  (id: string)      => ['posts', 'detail', id] as const,
  },
  comments: {
    byPost:  (postId: string)  => ['comments', postId] as const,
  },
  reactions: {
    byPost:  (postId: string)  => ['reactions', postId] as const,
  },
} as const;
```

Usage:
```typescript
// In a hook
const feed = useInfiniteQuery({
  queryKey: queryKeys.posts.list(),
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  getNextPageParam: (last) => last.has_more ? last.next_cursor : undefined,
});

// After creating a comment, invalidate just that post's comments
queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPost(postId) });
```

---

## React Native Implementation

### Project Structure

```
gallifrey/
├── src/
│   ├── components/
│   │   ├── feed/
│   │   │   ├── PostCard.tsx          # Memoized with custom comparator
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
│   │   ├── AppNavigator.tsx            # Root: auth check → AuthStack or MainTabs
│   │   ├── AuthNavigator.tsx           # Stack: Login, SignUp
│   │   ├── MainTabNavigator.tsx        # Bottom tabs wrapping per-tab stacks
│   │   ├── FeedStackNavigator.tsx      # Stack: Feed → PostDetail (within Feed tab)
│   │   └── ProfileStackNavigator.tsx   # Stack: Profile (within Profile tab)
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── auth.service.ts
│   │   ├── posts.service.ts
│   │   ├── storage.service.ts
│   │   └── media.service.ts           # Image compression
│   ├── stores/
│   │   └── auth.store.ts              # Only Zustand store — client-only state
│   ├── hooks/
│   │   ├── usePosts.ts                # React Query: useInfiniteQuery for feed
│   │   ├── useComments.ts             # React Query: comments by post
│   │   └── useReactions.ts            # React Query: mutations + optimistic updates
│   ├── lib/
│   │   └── query-keys.ts             # Typed query key factory
│   ├── types/
│   │   ├── models.ts
│   │   ├── errors.ts
│   │   ├── api.ts
│   │   ├── navigation.ts
│   │   └── supabase.ts               # Auto-generated via supabase CLI
│   ├── constants/
│   │   ├── reactions.ts               # REACTIONS map + REACTION_EMOJI
│   │   ├── colors.ts
│   │   └── config.ts
│   └── utils/
│       ├── formatDate.ts
│       └── validateInput.ts
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

**Key structural changes from original plan:**
- `stores/` contains only `auth.store.ts` — no `feed.store.ts`. React Query owns all server state.
- `navigation/` has dedicated stack navigators per tab for proper screen pushing.
- `services/media.service.ts` handles image compression before upload.
- `lib/query-keys.ts` centralizes all React Query cache keys.
- `types/errors.ts` houses `Result<T>`, `AppError`, and `ErrorCode`.
- `types/supabase.ts` is auto-generated — never hand-edit.
- `constants/reactions.ts` maps semantic keys to emoji for display.

### Navigation Structure

```typescript
// Root Navigator (AppNavigator.tsx) — switches on auth state
//   ├── Auth Stack (AuthNavigator.tsx)
//   │   ├── LoginScreen
//   │   └── SignUpScreen
//   │
//   └── Main Tabs (MainTabNavigator.tsx)
//       ├── Feed Tab → FeedStackNavigator
//       │   ├── FeedScreen
//       │   └── PostDetailScreen   ← pushed onto stack, tab bar stays visible
//       ├── Create Tab
//       │   └── CreatePostScreen
//       └── Profile Tab → ProfileStackNavigator
//           └── ProfileScreen
```

**Why nested stacks:** A bare tab navigator cannot push screens onto a per-tab history. Wrapping each tab in its own native stack navigator lets PostDetailScreen push on top of FeedScreen while keeping the bottom tab bar visible and the back gesture working correctly.

```typescript
// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type MainTabParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  CreatePost: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Enables useNavigation() type safety globally
declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainTabParamList {}
  }
}
```

### Key Components

#### 1. PostCard Component (Memoized)
```typescript
interface PostCardProps {
  post: Post;
  onPressComment: (postId: string) => void;
  onPressReaction: (postId: string, reaction: ReactionType) => void;
}

// Wrap in React.memo with a custom comparator to avoid re-renders
// when sibling posts change in the list.
export const PostCard = React.memo(PostCardInner, (prev, next) => {
  return prev.post.id === next.post.id
    && prev.post.user_reaction === next.post.user_reaction
    && prev.post.reactions_count === next.post.reactions_count
    && prev.post.comments_count === next.post.comments_count;
});
```
- User avatar & username
- Post content with emoji support
- Image display via **expo-image** (with blurhash placeholder)
- Reaction bar with counts (semantic keys → emoji via `REACTION_EMOJI`)
- Comment count & action
- Relative timestamp (date-fns `formatDistanceToNow`)

#### 2. Feed Performance Strategy
```typescript
<FlashList
  data={posts}
  renderItem={renderPostCard}
  estimatedItemSize={350}          // REQUIRED — rough px height of a PostCard
  keyExtractor={(item) => item.id}
  onEndReached={fetchNextPage}
  onEndReachedThreshold={0.5}
  drawDistance={250}                // Pre-render 250pt above/below viewport
  removeClippedSubviews={true}     // Detach offscreen views, free GPU memory
  keyboardDismissMode="on-drag"
  keyboardShouldPersistTaps="handled"
/>
```
- **FlashList** with `estimatedItemSize` (required prop — without it FlashList falls back to FlatList performance)
- Cursor-based pagination via React Query `useInfiniteQuery` (20 posts per page)
- Optimistic UI updates for reactions (React Query `onMutate` / `onError` rollback)
- Image caching handled by expo-image (built-in disk + memory cache)
- Memoized PostCard to prevent unnecessary re-renders
- Pull-to-refresh via `RefreshControl` wired to `queryClient.invalidateQueries`

#### 3. Media Upload Flow (Images Only)
```
1. User taps camera/gallery button
2. expo-image-picker opens (mediaTypes: 'images')
3. User selects or captures a photo
4. Compress via expo-image-manipulator (→ ~300KB JPEG)
5. Show inline preview with remove option
6. On post submit: upload compressed image to Supabase Storage
7. Get public URL, save to post record
```
No video support in the POC — keeps scope tight and avoids compression/playback complexity.

---

## iOS-Specific Considerations

### Required Permissions (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>Take photos to share in your posts</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Choose photos from your library to share in posts</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save photos to your library</string>

<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>
<true/>
```

**Changes from original:**
- Removed `NSMicrophoneUsageDescription` — no video in POC.
- Added `NSPhotoLibraryAddUsageDescription` — required on iOS 11+ when writing images to the photo library.
- Added `PHPhotoLibraryPreventAutomaticLimitedAccessAlert` — suppresses the repeated "Select More Photos" system alert on iOS 14+ when user has granted limited photo access.
- Shortened permission strings — Apple reviewers prefer concise descriptions.

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
    "jsEngine": "hermes",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.gallifrey.social",
      "infoPlist": {
        "NSCameraUsageDescription": "Take photos to share in your posts",
        "NSPhotoLibraryUsageDescription": "Choose photos from your library to share in posts",
        "NSPhotoLibraryAddUsageDescription": "Save photos to your library",
        "PHPhotoLibraryPreventAutomaticLimitedAccessAlert": true
      }
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Choose photos from your library to share in posts",
          "cameraPermission": "Take photos to share in your posts"
        }
      ]
    ]
  }
}
```

**Key changes from original:**
- Added `"jsEngine": "hermes"` — dramatically improves cold-start time (1-2s faster) and reduces memory usage.
- Set `"supportsTablet": false` — iPhone-only POC. Avoids broken iPad layout in demo.
- Changed `bundleIdentifier` to a concrete value (placeholder causes EAS Build prompts).
- Added `expo-image-picker` plugin config — ensures permissions are correctly configured for both dev builds and EAS builds.
- Removed microphone permission (no video in POC).

### iOS Performance Optimizations

```typescript
// 1. Image loading — use expo-image (NOT react-native-fast-image)
import { Image } from 'expo-image';

<Image
  source={{ uri: post.media_url }}
  style={styles.postImage}
  contentFit="cover"
  placeholder={blurhash}            // Blurhash placeholder while loading
  transition={200}                  // 200ms crossfade
  cachePolicy="memory-disk"         // Cache in memory, persist to disk
/>

// 2. Animations — always use native driver (keeps animations on UI thread at 60fps)
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 200,
  useNativeDriver: true,
}).start();

// 3. Memoize PostCard (see Key Components section above)
```

- Hermes engine enabled via `app.json` — no additional config needed.
- `expo-image` uses `SDWebImage` under the hood on iOS for aggressive disk and memory caching.
- `removeClippedSubviews` on FlashList detaches offscreen views from native hierarchy, freeing GPU memory.

### Image Compression

iOS camera photos are typically 3-8 MB. Without compression, uploads are slow on cellular and burn through Supabase storage quotas.

```typescript
// src/services/media.service.ts
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_IMAGE_DIMENSION = 1080;  // Instagram-quality max width
const JPEG_QUALITY = 0.8;          // ~200-400KB output

export async function compressImageForUpload(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}
```

Call after `expo-image-picker` returns, before uploading to Supabase Storage:
```typescript
const pickerResult = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 1,          // Full quality from picker — we compress ourselves
  allowsEditing: true,
  aspect: [4, 3],
});

if (!pickerResult.canceled) {
  const compressedUri = await compressImageForUpload(pickerResult.assets[0].uri);
  // Upload compressedUri to Supabase Storage
}
```

### Safe Area Implementation

```typescript
// App.tsx — wrap once at root
import { SafeAreaProvider } from 'react-native-safe-area-context';

<SafeAreaProvider>
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
</SafeAreaProvider>
```

Per-screen usage:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

// Screens WITH navigation header: only guard bottom (header handles top)
<SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
  <FlashList ... />
</SafeAreaView>

// Screens WITHOUT header (auth, modals): guard top and bottom
<SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
  <AuthForm />
</SafeAreaView>
```

**Important:** Use `SafeAreaView` from `react-native-safe-area-context`, NOT from `react-native` core (deprecated). Always set `style={{ flex: 1 }}` — without it FlashList gets a 0-height container and renders nothing.

### Keyboard Handling

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

// Wrap screens with text inputs:
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={90}  // Adjust for nav header height
>
  {/* Screen content */}
</KeyboardAvoidingView>
```

For the comment input on PostDetailScreen (pinned to bottom, above keyboard):
```typescript
<KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={90}>
  <FlashList data={comments} renderItem={renderComment} estimatedItemSize={80} />
  <View style={styles.commentInputBar}>
    <TextInput
      placeholder="Add a comment..."
      returnKeyType="send"
      onSubmitEditing={handleSubmitComment}
    />
  </View>
</KeyboardAvoidingView>
```

Dismiss keyboard on scroll (standard iOS behavior):
```typescript
<FlashList
  keyboardDismissMode="on-drag"
  keyboardShouldPersistTaps="handled"
/>
```

### UI/UX: iOS-Native Feel with React Native Paper

Since switching UI libraries mid-POC is too costly, customize Paper to feel native on iOS:

**Navigation headers — use iOS large titles:**
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

<FeedStack.Navigator screenOptions={{
  headerLargeTitle: true,              // iOS large title (collapses on scroll)
  headerBlurEffect: 'regular',         // Frosted glass effect
  headerShadowVisible: false,          // Clean, no bottom border
}}>
  <FeedStack.Screen name="Feed" component={FeedScreen} options={{ title: 'Gallifrey' }} />
  <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
</FeedStack.Navigator>
```

**iOS-specific patterns:**
- Use header buttons for "Create Post", NOT a Material FAB (FABs look Android-y on iOS)
- Use `ActionSheetIOS` for contextual menus, NOT Material bottom sheets
- Use `Alert.alert()` for confirmations, NOT Paper's `Dialog`
- Use `@react-navigation/bottom-tabs` for tab bar (auto iOS styling)

**Paper components that work well on iOS:** `TextInput`, `Card`, `Avatar`, `Divider`, `ActivityIndicator`, `Snackbar`, `Chip`
**Paper components to avoid:** `FAB`, `BottomNavigation`, `Dialog`, `Menu`

**Haptic feedback:**
```typescript
import * as Haptics from 'expo-haptics';

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);    // On reaction tap
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // On post created
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);   // On pull-to-refresh
```

**iOS styling tips:**
- Let `fontFamily` default to San Francisco (the iOS system font)
- Use `fontWeight: '600'` (semibold) for headings — iOS favors lighter weights
- Use `borderRadius: 12` on cards (iOS standard)
- Use subtle shadows instead of Material elevation:
```typescript
const iosCardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
};
```

---

## Database Schema (Supabase)

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
- media_type (text, nullable) -- 'image' (images only for POC)
- created_at (timestamp)
- updated_at (timestamp)
```

**reactions**
```sql
- id (uuid, primary key)
- post_id (uuid, foreign key → posts.id)
- user_id (uuid, foreign key → users.id)
- type (text) -- semantic key: 'heart', 'thumbs_up', 'laugh', 'fire', 'surprised'
- created_at (timestamp)
- UNIQUE(post_id, user_id) -- one reaction per user per post (use UPSERT to change type)
```

> **UPSERT for reaction changes:** The UNIQUE constraint is correct — use `supabase.from('reactions').upsert({ post_id, user_id, type }, { onConflict: 'post_id,user_id' })` to let users change their reaction type (e.g., heart → fire) without deleting first.

**comments**
```sql
- id (uuid, primary key)
- post_id (uuid, foreign key → posts.id)
- user_id (uuid, foreign key → users.id)
- content (text)
- created_at (timestamp)
```

### Performance Indexes

```sql
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

### Row Level Security (RLS) Policies
- Users can read all posts/comments/reactions
- Users can only create/update/delete their own posts/comments/reactions

---

## Implementation Phases

### Phase 1: Project Setup (45 min)
1. Initialize Expo TypeScript project
2. Install all dependencies (see corrected list below)
3. Configure Supabase project & credentials
4. Set up navigation structure (nested stacks within tabs)
5. Configure TypeScript strict mode + path aliases
6. Create error handling architecture (`Result` type, `ErrorCode` enum)
7. Set up reaction constants

### Phase 2: Authentication (1.5 hours)
1. Create Supabase auth service with `Result` return types
2. Build login/signup screens with validation
3. Implement Zustand auth store (the only Zustand store)
4. Add auth navigation flow with safe area handling
5. Test authentication on device

### Phase 3: Database & Models (1 hour)
1. Create database tables in Supabase
2. Set up RLS policies
3. Create performance indexes
4. Run `supabase gen types` to generate `src/types/supabase.ts`
5. Define application-layer types (discriminated unions)
6. Create service layer with `Result` returns
7. Test CRUD operations

### Phase 4: Feed Implementation (2 hours)
1. Build memoized PostCard component with iOS styling
2. Implement FeedScreen with FlashList (`estimatedItemSize` set)
3. Add cursor-based pagination with React Query `useInfiniteQuery`
4. Implement pull-to-refresh
5. Add loading states
6. Test feed performance with 100+ posts
7. Implement safe area + keyboard dismiss on scroll

### Phase 5: Post Creation (1.5 hours)
1. Build CreatePostScreen with `KeyboardAvoidingView`
2. Implement image picker (expo-image-picker)
3. Add image compression (expo-image-manipulator → ~300KB JPEG)
4. Create upload service with error handling
5. Show image preview
6. Implement optimistic updates
7. Test post creation flow end-to-end

### Phase 6: Social Features (2 hours)
1. Build reaction system with UPSERT pattern and semantic keys
2. Implement reaction picker UI with haptic feedback
3. Create comment system
4. Build PostDetailScreen with keyboard-pinned comment input
5. Add comment creation
6. Test all interactions

### Phase 7: Polish & Testing (1.5 hours)
1. Test on physical iPhone
2. Fix iOS-specific UI issues (safe areas, shadows, typography)
3. Add haptic feedback throughout
4. Apply iOS-native navigation (large titles, blur headers)
5. Verify image compression and upload flow
6. Test error states (offline, invalid input, auth expiry)
7. Performance check (smooth 60fps scrolling)

**Total Estimated Time: 10-12 hours of focused development**

---

## Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-image": "~1.10.1",
    "expo-image-picker": "~14.7.1",
    "expo-image-manipulator": "~12.0.1",
    "expo-haptics": "~13.0.1",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-paper": "^5.11.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@supabase/supabase-js": "^2.39.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "@shopify/flash-list": "1.6.3",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "typescript": "^5.3.0",
    "supabase": "^1.131.0"
  }
}
```

**Dependency changes from original plan:**

| Change | Reason |
|--------|--------|
| Removed `react-native-fast-image` | Incompatible with Expo managed workflow |
| Added `expo-image` | Expo-native replacement with caching, blurhash, transitions |
| Removed `expo-av` | No video in POC — images only |
| Removed `@react-navigation/stack` | JS-based, slower transitions |
| Added `@react-navigation/native-stack` | Uses native iOS UINavigationController |
| Added `expo-image-manipulator` | Image compression before upload |
| Added `expo-haptics` | Tactile feedback on reactions and actions |
| Added `@react-native-async-storage/async-storage` | Required by Supabase auth for session persistence |
| Added `supabase` (dev) | CLI for type generation |

---

## Design Principles

### Color Scheme
```typescript
// src/constants/colors.ts
const theme = {
  primary: '#6750A4',      // Purple (Doctor Who themed)
  secondary: '#625B71',
  background: '#FFFBFE',   // Warm white
  surface: '#FFFBFE',
  error: '#B3261E',
  onPrimary: '#FFFFFF',
  onBackground: '#1C1B1F',
};
```

### iOS Design Notes
- Default to San Francisco font (omit `fontFamily`)
- Use `fontWeight: '600'` for headings
- `borderRadius: 12` on cards
- Subtle shadows (see iOS section) instead of Material elevation
- Consistent 8px spacing grid

---

## Success Criteria

- [ ] Users can sign up and log in
- [ ] Users can create posts with text and emoji
- [ ] Users can upload photos to posts (compressed before upload)
- [ ] Feed displays posts in reverse chronological order
- [ ] Feed scrolls smoothly (60fps) with 100+ posts
- [ ] Users can react to posts (5 reaction types)
- [ ] Users can comment on posts
- [ ] Post detail view shows all comments
- [ ] App runs on physical iPhone without crashes
- [ ] UI feels iOS-native (large titles, haptics, proper shadows)
- [ ] All interactions have immediate visual feedback

---

## What We're Explicitly Skipping for POC

These items were flagged in expert reviews but are NOT needed for a polished demo:

- **Video support** — Images only. Saves ~2 hours and avoids compression complexity.
- **Privacy Manifest** — Only required for App Store submission.
- **Apple Authentication** — Only required when offering third-party social login.
- **Content moderation/reporting** — App Store Review requirement, not needed for demo.
- **Offline support** — If no connection, showing an error is fine.
- **Real-time subscriptions** — Pull-to-refresh is sufficient for POC.
- **Branded types** — Over-engineering for a POC.
- **Post editing/deletion** — Post-POC feature.

---

## Next Steps After POC

If POC is successful, consider:
- Video support (with compression)
- Push notifications
- User profiles & bios
- Follow/follower system
- Direct messaging
- Search functionality
- Post editing/deletion
- Real-time feed updates
- Offline support
- App Store deployment (Privacy Manifest, Apple Auth, content moderation)

---

## Development Commands

```bash
# Install dependencies
npm install

# Generate Supabase types (run after any schema change)
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public > src/types/supabase.ts

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on physical iPhone (via Expo Go app)
# Scan QR code with camera

# Build for iOS (when ready for TestFlight)
eas build --platform ios

# TypeScript check
npx tsc --noEmit
```

---

**This plan incorporates all critical expert feedback while keeping the POC timeline at 10-12 hours. Ship a polished, iOS-native-feeling social feed demo.**
