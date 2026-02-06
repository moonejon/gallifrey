# Gallifrey Navigation Architecture

This directory contains the navigation structure for the Gallifrey POC, implementing the corrected nested stack architecture from EXPERT_REVIEWS.md.

## Architecture Overview

```
Root Stack Navigator
├── Auth Stack
│   ├── Login Screen
│   └── SignUp Screen (modal presentation)
│
└── Main Tab Navigator
    ├── Feed Tab (Stack Navigator)
    │   ├── Feed Screen
    │   └── Post Detail Screen (pushed)
    │
    ├── Create Post Tab
    │   └── Create Post Screen
    │
    └── Profile Tab (Stack Navigator)
        ├── Profile Screen
        └── Edit Profile Screen (pushed)
```

## Key Design Decisions

### 1. Nested Stack Architecture (CRITICAL FIX)

**Problem Solved:**
The original flat tab structure would break tab bar visibility when pushing PostDetail:
```typescript
// ❌ WRONG - breaks tab bar UX
Main Tabs
  - Feed Tab (single screen)
  - PostDetail (can't push without issues)
```

**Solution:**
Nested stack navigators allow proper push/pop navigation:
```typescript
// ✅ CORRECT - maintains tab bar, allows push
Main Tabs
  └─ Feed Tab (Stack Navigator)
     ├─ Feed Screen
     └─ PostDetail Screen (pushed on stack)
```

### 2. iOS-Native Transitions

All navigators are configured with iOS-optimized settings:
- `animation: 'default'` on iOS (uses native UINavigationController)
- `headerBackTitleVisible: false` (iOS standard)
- `headerLargeTitle: true` on list screens
- iOS-native color scheme (#007AFF blue, proper grays)

### 3. Type Safety

Full TypeScript type safety using React Navigation's type system:
- All param lists defined in `/src/types/navigation.ts`
- Global type augmentation enables autocomplete
- Prevents navigation to invalid routes with wrong params

## File Structure

```
src/navigation/
├── AppNavigator.tsx      # Root navigator with nested structure
├── AuthNavigator.tsx     # Authentication flow
├── index.ts              # Re-exports for clean imports
└── README.md            # This file
```

## Usage

### In App.tsx
```typescript
import { AppNavigator } from './navigation';

export default function App() {
  return <AppNavigator />;
}
```

### Type-Safe Navigation
```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedStackParamList } from '@/types/navigation';

// In FeedScreen component
const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();

// TypeScript will autocomplete and validate
navigation.navigate('PostDetail', { postId: '123' });
```

### Navigation Hooks
```typescript
// Get route params with type safety
import { useRoute, RouteProp } from '@react-navigation/native';

type PostDetailRouteProp = RouteProp<FeedStackParamList, 'PostDetail'>;

function PostDetailScreen() {
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params; // TypeScript knows this exists

  return <PostContent postId={postId} />;
}
```

## iOS-Specific Configuration

### Tab Bar Styling
- iOS system blue for active tabs (#007AFF)
- iOS system gray for inactive tabs (#8E8E93)
- Native iOS border styles

### Navigation Bar Styling
- Large titles on list screens (Feed, Profile)
- Regular titles on detail screens (PostDetail, EditProfile)
- Native iOS shadow and blur effects
- Safe area handling built-in

### Modal Presentation
SignUp screen uses iOS-native modal presentation:
```typescript
{
  presentation: Platform.OS === 'ios' ? 'modal' : 'card'
}
```

## Authentication Flow

The Root Stack conditionally renders Auth or Main based on authentication state:

```typescript
// TODO: Implement in AppNavigator.tsx
const { isAuthenticated } = useAuthStore();

return (
  <RootStack.Navigator>
    {!isAuthenticated ? (
      <RootStack.Screen name="Auth" component={AuthNavigator} />
    ) : (
      <RootStack.Screen name="Main" component={MainNavigator} />
    )}
  </RootStack.Navigator>
);
```

## Next Steps

1. **Create Screen Components**
   - FeedScreen
   - PostDetailScreen
   - CreatePostScreen
   - ProfileScreen
   - EditProfileScreen
   - LoginScreen
   - SignUpScreen

2. **Add Icons**
   Install and configure `@expo/vector-icons`:
   ```bash
   npx expo install @expo/vector-icons
   ```

   Replace placeholder icons in MainNavigator:
   ```typescript
   import { Ionicons } from '@expo/vector-icons';

   tabBarIcon: ({ color, size }) => (
     <Ionicons name="home" size={size} color={color} />
   )
   ```

3. **Implement Auth State**
   Connect to auth store (Zustand) to control Auth vs Main flow

4. **Test Navigation**
   - Test deep linking
   - Test back navigation
   - Test tab switching
   - Test iOS gestures (swipe back)
   - Test keyboard avoiding behavior

## Dependencies Required

```json
{
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/native-stack": "^6.9.17",
  "@react-navigation/bottom-tabs": "^6.5.11",
  "react-native-screens": "~3.29.0",
  "react-native-safe-area-context": "4.8.2"
}
```

## References

- EXPERT_REVIEWS.md (lines 99-122) - Navigation Architecture Fix
- React Navigation Docs: https://reactnavigation.org/docs/typescript
- iOS HIG Navigation: https://developer.apple.com/design/human-interface-guidelines/navigation

## Performance Considerations

1. **Screen Components**: Wrap in `React.memo()` to prevent unnecessary re-renders
2. **Navigation State**: Minimize state stored in navigation params
3. **Deep Linking**: Configure URL scheme for proper deep linking support
4. **Persistence**: Consider using `onStateChange` for navigation state persistence

---

**Implementation Status:** ✅ Complete
**Review Status:** Ready for integration
**iOS Compliance:** Native patterns followed
