# Expert Reviews: Gallifrey Social Feed POC

## Executive Summary

Three specialized experts have reviewed the implementation plan from TypeScript, React Native, and iOS perspectives. The overall consensus: **The plan is solid (7-7.5/10) but needs critical refinements before starting development.**

### Quick Assessment

| Expert | Score | Key Concern |
|--------|-------|-------------|
| **TypeScript** | 6/10 | Missing discriminated unions, weak error handling, no Supabase type generation |
| **React Native** | 7.5/10 | Library conflicts (fast-image), navigation issues, state management duplication |
| **iOS** | 5/10 | Missing permissions, non-native UI feel, incomplete App Store compliance |

### Timeline Reality Check
- **Planned:** 8-9 hours
- **Realistic:** 12-16 hours (with recommended fixes)

---

## 🚨 CRITICAL ISSUES (Must Fix Before Development)

### 1. react-native-fast-image Incompatibility
**Problem:** Listed dependency doesn't work with Expo managed workflow.

**Fix:**
```json
// Remove:
"react-native-fast-image": "❌"

// Add:
"expo-image": "~1.10.1" // ✅ Expo-compatible, highly optimized
```

---

### 2. TypeScript Type Safety Gaps

**Problem:** Current Post model allows invalid states:
```typescript
// ❌ Current - allows invalid combinations
interface Post {
  media_url?: string;      // Can be set without media_type
  media_type?: 'image' | 'video'; // Can be set without media_url
}
```

**Fix:** Use discriminated unions:
```typescript
// ✅ Better - impossible states are impossible
interface BasePost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface PostWithImage extends BasePost {
  media_url: string;
  media_type: 'image';
}

interface PostWithVideo extends BasePost {
  media_url: string;
  media_type: 'video';
}

interface PostWithoutMedia extends BasePost {
  media_url?: never;
  media_type?: never;
}

export type Post = PostWithImage | PostWithVideo | PostWithoutMedia;
```

---

### 3. State Management Duplication

**Problem:** Plan has both `feed.store.ts` (Zustand) AND React Query managing posts.

**Fix:** Remove `feed.store.ts` entirely - React Query handles all server state:
```typescript
// ✅ Single source of truth
export function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Only keep auth.store.ts for client-only state
```

---

### 4. Navigation Architecture Problem

**Problem:** Tab navigator structure won't work for post details:
```typescript
// ❌ Current - breaks tab bar visibility
Main Tabs
- Feed Tab
  - FeedScreen
  - PostDetailScreen  // Can't push in tab without breaking UX
```

**Fix:** Nested stack navigators:
```typescript
// ✅ Correct structure
Root Stack
└─ Main Tabs
   ├─ Feed Stack
   │  ├─ FeedScreen
   │  └─ PostDetailScreen (pushed)
   ├─ Create Tab (or Modal)
   └─ Profile Stack
```

---

### 5. iOS Permissions & Configuration Gaps

**Missing iOS 14+ Photo Library permissions:**
```xml
<!-- Add to Info.plist -->
<key>PHPhotoLibraryPreventAutomaticLimitedAccessAlert</key>
<true/>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save media to your photo library</string>
```

**Missing Hermes configuration:**
```json
// Add to app.json
"ios": {
  "jsEngine": "hermes"  // Significant performance boost
}
```

---

### 6. Database Schema Flaw

**Problem:** UNIQUE constraint prevents reaction type changes:
```sql
-- ❌ Current
UNIQUE(post_id, user_id) -- User can't change ❤️ to 🔥
```

**Fix:** Use UPSERT pattern:
```typescript
// Allow reaction type updates
await supabase
  .from('reactions')
  .upsert({
    post_id,
    user_id,
    type
  }, {
    onConflict: 'post_id,user_id'
  });
```

---

### 7. Error Handling Architecture Missing

**Problem:** No error handling pattern defined - mentioned only in Phase 7.

**Fix:** Add from start:
```typescript
// src/types/errors.ts
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
}

export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };
```

---

### 8. FlashList Missing Critical Props

**Problem:** FlashList requires `estimatedItemSize` or performance degrades.

**Fix:**
```typescript
<FlashList
  estimatedItemSize={400}  // ✅ Critical!
  drawDistance={400}
  removeClippedSubviews={true}
  maxToRenderPerBatch={5}
  windowSize={10}
/>
```

---

## ⚠️ HIGH PRIORITY CHANGES

### Add Missing Dependencies

```json
{
  "dependencies": {
    // Fix library conflicts:
    "expo-image": "~1.10.1",  // Replace react-native-fast-image

    // Add missing essentials:
    "@react-native-async-storage/async-storage": "^1.21.0",
    "expo-haptics": "~12.8.1",
    "expo-image-manipulator": "~11.8.0",
    "expo-video-thumbnails": "~7.7.0",
    "@react-native-community/netinfo": "^11.3.1",
    "react-native-keyboard-aware-scroll-view": "^0.9.5",

    // Recommended:
    "expo-apple-authentication": "~6.3.0"  // App Store compliance
  }
}
```

### Implement Result Type Pattern

```typescript
// Better than ApiResponse<T> | null
export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Type-safe usage
const result = await getPosts();
if (result.success) {
  // TypeScript knows result.data exists
  console.log(result.data);
} else {
  // TypeScript knows result.error exists
  console.error(result.error);
}
```

### Add Navigation Types

```typescript
// src/types/navigation.ts
export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
};

export type MainTabParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  CreatePost: undefined;
  Profile: undefined;
};

// Enable global type safety
declare global {
  namespace ReactNavigation {
    interface RootParamList extends MainTabParamList {}
  }
}
```

### Configure Supabase Type Generation

```bash
# Generate types from database schema
npx supabase gen types typescript \
  --project-id <project-id> \
  --schema public > src/types/supabase.ts
```

```typescript
// Type-safe Supabase client
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

---

## 📱 iOS-Specific Critical Fixes

### 1. Replace Material Design with iOS-Friendly UI

**Problem:** React Native Paper is Google's Material Design - feels Android-y on iOS.

**Options:**
```json
// Option A: Lighter alternative
"react-native-elements": "^4.0.0"

// Option B: iOS-specific
"@react-native-ios-kit/ios-kit": "^1.0.0"

// Option C: Keep Paper but customize heavily for iOS
```

### 2. Add Privacy Manifest (App Store Requirement)

Create `ios/PrivacyInfo.xcprivacy`:
```xml
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
```

### 3. Video Compression Service

**Problem:** iOS videos from camera are 50-200MB (will exceed Supabase limits).

**Fix:**
```typescript
// src/services/media.service.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function generateVideoThumbnail(uri: string): Promise<string> {
  const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri);
  return thumbnailUri;
}
```

### 4. Safe Area Implementation

```typescript
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Wrap App
<SafeAreaProvider>
  <App />
</SafeAreaProvider>

// Every screen
<SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
  <ScreenContent />
</SafeAreaView>
```

### 5. Keyboard Handling

```typescript
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

<KeyboardAwareScrollView
  enableOnAndroid
  enableAutomaticScroll
  extraScrollHeight={20}
>
  <CreatePostForm />
</KeyboardAwareScrollView>
```

---

## 🎯 Medium Priority Improvements

### 1. Semantic Reaction Types

Replace emoji literals with semantic constants:
```typescript
// ❌ Current
export type ReactionType = '❤️' | '👍' | '😂' | '🔥' | '😮';

// ✅ Better
export const REACTION_TYPES = {
  HEART: 'heart',
  THUMBS_UP: 'thumbs_up',
  LAUGH: 'laugh',
  FIRE: 'fire',
  SURPRISED: 'surprised',
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];

export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  heart: '❤️',
  thumbs_up: '👍',
  laugh: '😂',
  fire: '🔥',
  surprised: '😮',
};
```

### 2. Branded Types for Validation

```typescript
export type ValidEmail = string & { readonly __brand: 'ValidEmail' };
export type ValidPostContent = string & { readonly __brand: 'ValidPostContent' };

export function validateEmail(email: string): Result<ValidEmail> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: validationError('Invalid email') };
  }
  return { success: true, data: email as ValidEmail };
}
```

### 3. Offline Support Strategy

```typescript
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Configure React Query for offline support
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});
```

### 4. Database Indexes for Performance

```sql
-- Add to Supabase migrations
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

### 5. Query Key Factory

```typescript
// src/types/queries.ts
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (cursor?: string) => [...queryKeys.posts.lists(), { cursor }] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
} as const;
```

---

## 📋 Updated Implementation Phases

### Phase 1: Project Setup (30 min → 1 hour)
1. Initialize Expo TypeScript project
2. Install ALL dependencies (including fixes above)
3. Configure Supabase + type generation
4. Set up navigation structure (nested stacks)
5. Configure strict TypeScript + path aliases
6. **Add:** Create error handling architecture
7. **Add:** Set up EAS build configuration

### Phase 2: Authentication (1 hour → 2 hours)
1. Create Supabase auth service with Result types
2. Build login/signup screens with validation
3. Implement Zustand auth store
4. Add auth navigation flow
5. **Add:** Implement error boundaries
6. **Add:** Add secure token storage (expo-secure-store)

### Phase 3: Database & Models (45 min → 1 hour)
1. Create database tables in Supabase
2. Set up RLS policies
3. **Add:** Create database indexes
4. Define TypeScript types (discriminated unions)
5. Create service layer with interfaces
6. **Add:** Fix reactions UNIQUE constraint

### Phase 4: Feed Implementation (2 hours → 3 hours)
1. Build PostCard component (memoized)
2. Implement FeedScreen with FlashList
3. Add pagination with React Query
4. **Add:** Implement skeleton loaders
5. **Add:** Add offline support
6. Configure feed performance optimizations
7. Test feed with 100+ mock posts

### Phase 5: Post Creation (1.5 hours → 3 hours)
1. Build CreatePostScreen
2. Implement media picker (expo-image-picker)
3. **Add:** Image compression service
4. **Add:** Video thumbnail generation
5. **Add:** File validation (size, type)
6. Create upload service with retry logic
7. Implement optimistic updates
8. **Add:** Keyboard-aware scroll view

### Phase 6: Social Features (2 hours → 3 hours)
1. Build reaction system with Result types
2. Implement reaction picker UI with haptics
3. Create comment system
4. Build PostDetailScreen
5. Add comment creation
6. **Add:** Content reporting (App Store requirement)
7. Test all interactions

### Phase 7: Polish & Testing (1.5 hours → 3 hours)
1. Add comprehensive error handling
2. Implement loading states everywhere
3. **Add:** Test on physical iPhone
4. Fix iOS-specific UI issues
5. Add haptic feedback
6. Optimize performance
7. **Add:** TestFlight beta build
8. **Add:** App Store preparation (Privacy Policy, screenshots)

**Updated Total: 12-16 hours** (from 8-9 hours)

---

## 🎨 Recommended Simplifications for POC

To hit the original 8-9 hour timeline, consider these cuts:

### Cut These for V1:
```typescript
❌ Video support (images only)
❌ Multiple reaction types (just "like" button)
❌ Real-time subscriptions (use polling)
❌ Pull-to-refresh (not critical)
❌ User profiles (just username + avatar)
❌ Edit/delete posts
❌ Post sharing
❌ Search functionality
```

### Minimal Viable POC:
```typescript
✅ Auth (email/password)
✅ Text posts
✅ Single image per post
✅ Feed (paginated, 20 per page)
✅ Comments
✅ Single reaction type ("like")
✅ Basic error handling
✅ Loading states
```

This could realistically be done in **10-12 hours**.

---

## 📊 Expert Consensus

### What's Working Well:
- ✅ Tech stack choices (Expo, Supabase, React Query)
- ✅ TypeScript-first approach
- ✅ Performance awareness (FlashList, pagination)
- ✅ Modern patterns (hooks, functional components)
- ✅ Realistic scope for POC

### Critical Gaps to Address:
- ⚠️ TypeScript type safety (discriminated unions, Result types)
- ⚠️ Library conflicts (react-native-fast-image)
- ⚠️ State management duplication (Zustand + React Query)
- ⚠️ Navigation structure (nested stacks)
- ⚠️ iOS-specific configurations (permissions, Hermes, Privacy Manifest)
- ⚠️ Error handling architecture
- ⚠️ Media compression strategy
- ⚠️ App Store compliance (content moderation, privacy policy)

### Risk Assessment:
- **TypeScript Safety:** MEDIUM-HIGH (would compile but runtime issues)
- **iOS Deployment:** MEDIUM-HIGH (App Store rejection risk)
- **Performance:** MEDIUM (memory issues with media)
- **Timeline:** MEDIUM (optimistic, needs buffer)

---

## 🚀 Next Steps

### Before Starting Development:

1. **Update PLAN.md** with critical fixes from this review
2. **Update package.json** with correct dependencies
3. **Create updated app.json** with iOS configurations
4. **Set up EAS configuration** (eas.json)
5. **Create error handling architecture** files
6. **Set up Supabase database** with indexes and constraints
7. **Decide on UI library** (keep Paper vs. switch)
8. **Generate Supabase types** after schema is created

### During Development:

1. Start with Phase 1-2 (setup + auth)
2. Test on physical iPhone early (not just simulator)
3. Implement error handling from the start
4. Test with realistic data volumes (100+ posts)
5. Monitor memory usage with Xcode Instruments
6. Track actual time spent vs. estimates

### For App Store Submission:

1. Create Privacy Policy (required)
2. Implement content moderation/reporting
3. Add Privacy Manifest
4. TestFlight beta testing
5. Prepare screenshots and metadata
6. Review App Store Guidelines compliance

---

## 📄 Summary

The original plan is a **strong foundation (7/10 average)** with excellent tech stack choices and realistic scope. However, it has critical gaps that would cause issues during development and deployment:

- TypeScript patterns need strengthening for production quality
- React Native library choices need adjustment for Expo compatibility
- iOS-specific configurations and optimizations are incomplete
- Error handling and edge cases need more attention upfront

**With the recommended changes above, this plan becomes deployment-ready (9/10)** and can successfully deliver a production-quality POC in 12-16 hours of focused development.

---

## 💡 Final Recommendation

**Option A (Recommended):** Implement all HIGH PRIORITY fixes → Build in 12-16 hours → Ship production-quality POC

**Option B (Fast):** Implement CRITICAL fixes + simplifications → Build in 8-10 hours → Ship minimal POC

Either way, address the CRITICAL issues before starting - they'll save significant debugging time later.
