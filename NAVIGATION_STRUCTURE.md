# Gallifrey Navigation Structure

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ROOT STACK NAVIGATOR                     │
│                  (Conditional Auth/Main Flow)                │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────────┐
│    AUTH STACK         │       │    MAIN TAB NAVIGATOR     │
│                       │       │                           │
│  ┌─────────────────┐ │       │  ┌─────────────────────┐  │
│  │  Login Screen   │ │       │  │    Feed Tab         │  │
│  │  (Large Title)  │ │       │  │  (Stack Navigator)  │  │
│  └─────────────────┘ │       │  │                     │  │
│           │           │       │  │  ┌───────────────┐ │  │
│           ▼           │       │  │  │ Feed Screen   │ │  │
│  ┌─────────────────┐ │       │  │  │ (Large Title) │ │  │
│  │  SignUp Screen  │ │       │  │  └───────────────┘ │  │
│  │  (Modal Style)  │ │       │  │         │          │  │
│  └─────────────────┘ │       │  │         ▼          │  │
│                       │       │  │  ┌───────────────┐ │  │
└───────────────────────┘       │  │  │ PostDetail    │ │  │
                                │  │  │ (Pushed)      │ │  │
                                │  │  └───────────────┘ │  │
                                │  └─────────────────────┘  │
                                │                           │
                                │  ┌─────────────────────┐  │
                                │  │  Create Post Tab    │  │
                                │  │                     │  │
                                │  │  ┌───────────────┐  │  │
                                │  │  │ Create Post   │  │  │
                                │  │  │ Screen        │  │  │
                                │  │  └───────────────┘  │  │
                                │  └─────────────────────┘  │
                                │                           │
                                │  ┌─────────────────────┐  │
                                │  │   Profile Tab       │  │
                                │  │ (Stack Navigator)   │  │
                                │  │                     │  │
                                │  │  ┌───────────────┐  │  │
                                │  │  │ Profile       │  │  │
                                │  │  │ (Large Title) │  │  │
                                │  │  └───────────────┘  │  │
                                │  │         │           │  │
                                │  │         ▼           │  │
                                │  │  ┌───────────────┐  │  │
                                │  │  │ Edit Profile  │  │  │
                                │  │  │ (Pushed)      │  │  │
                                │  │  └───────────────┘  │  │
                                │  └─────────────────────┘  │
                                └───────────────────────────┘
```

## Navigation Flow Examples

### 1. First Time User Journey
```
App Launch
  → Root Stack: Auth
    → Auth Stack: Login
      → User taps "Sign Up"
        → Auth Stack: SignUp (modal presentation)
          → User completes signup
            → Root Stack: Main
              → Main Tabs: FeedTab
                → Feed Stack: Feed
```

### 2. Viewing a Post
```
Main Tabs: FeedTab (Feed Stack: Feed)
  → User taps post card
    → Feed Stack: PostDetail (pushed)
      → Tab bar remains visible
      → Native swipe-back gesture works
      → Header shows back button
```

### 3. Creating a Post
```
Main Tabs: Any tab
  → User taps Create tab
    → Main Tabs: CreatePost
      → Create Post Screen (could be modal)
      → After posting, navigate to FeedTab
```

## File Structure

```
/Users/jonathan/github/gallifrey/
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx       # Root navigator with nested structure
│   │   ├── AuthNavigator.tsx      # Authentication flow
│   │   ├── index.ts               # Exports
│   │   └── README.md              # Documentation
│   │
│   └── types/
│       ├── navigation.ts          # Type-safe navigation types
│       ├── models.ts              # Data models (discriminated unions)
│       └── api.ts                 # Result types & error handling
│
├── EXPERT_REVIEWS.md              # Critical fixes reference
├── PLAN.md                        # Implementation plan
└── NAVIGATION_STRUCTURE.md        # This file
```

## Key Implementation Details

### 1. Type Safety

All navigation params are fully typed:

```typescript
// In src/types/navigation.ts
export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
};

// Usage in component
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
navigation.navigate('PostDetail', { postId: '123' }); // ✅ Type-safe
navigation.navigate('PostDetail', { id: '123' });     // ❌ TypeScript error
```

### 2. iOS-Native Configuration

All navigators use iOS-optimized settings:

- **Transitions**: `animation: 'default'` uses native UINavigationController
- **Headers**: Large titles on list screens, regular on details
- **Colors**: iOS system blue (#007AFF) and grays (#8E8E93)
- **Gestures**: Native swipe-back gesture enabled by default
- **Safe Area**: Automatic handling of notch/home indicator

### 3. Critical Architecture Fix

**BEFORE (Incorrect):**
```typescript
// ❌ WRONG - Flat structure breaks tab bar when pushing
Main Tabs
  - Feed Screen
  - PostDetail Screen
  - Create Screen
  - Profile Screen
```

**AFTER (Correct):**
```typescript
// ✅ CORRECT - Nested stacks allow proper push/pop
Main Tabs
  └─ Feed Tab (Stack)
     ├─ Feed Screen
     └─ PostDetail Screen (pushed on stack)
```

**Why This Matters:**
- Flat structure: Pushing PostDetail hides tab bar, breaks UX
- Nested structure: PostDetail pushed on Feed Stack, tab bar stays visible
- iOS-native behavior: Swipe-back gesture works correctly
- Type safety: Each stack has its own param list

## Dependencies

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2"
  }
}
```

## Next Steps

### 1. Create Screen Components

```bash
src/screens/
├── auth/
│   ├── LoginScreen.tsx
│   └── SignUpScreen.tsx
├── feed/
│   ├── FeedScreen.tsx
│   └── PostDetailScreen.tsx
├── create/
│   └── CreatePostScreen.tsx
└── profile/
    ├── ProfileScreen.tsx
    └── EditProfileScreen.tsx
```

### 2. Add Tab Bar Icons

```bash
npx expo install @expo/vector-icons
```

```typescript
// In AppNavigator.tsx
import { Ionicons } from '@expo/vector-icons';

<MainTab.Screen
  name="FeedTab"
  component={FeedNavigator}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  }}
/>
```

### 3. Implement Auth State Management

```typescript
// Example with Zustand
import { useAuthStore } from '@/store/auth.store';

function RootNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <RootStack.Screen name="Main" component={MainNavigator} />
      )}
    </RootStack.Navigator>
  );
}
```

### 4. Test Navigation

- [ ] Test deep linking to PostDetail
- [ ] Test swipe-back gesture on iOS
- [ ] Test tab switching maintains state
- [ ] Test auth flow (Login → Main, Logout → Auth)
- [ ] Test keyboard avoiding behavior
- [ ] Test safe area handling on iPhone with notch

## References

- **EXPERT_REVIEWS.md** (lines 99-122): Navigation Architecture Fix
- **React Navigation Docs**: https://reactnavigation.org/docs/typescript
- **iOS HIG**: https://developer.apple.com/design/human-interface-guidelines/navigation

---

**Status**: ✅ Complete and Ready for Implementation
**Based on**: EXPERT_REVIEWS.md Critical Fix #4
**iOS Compliance**: Native patterns followed
