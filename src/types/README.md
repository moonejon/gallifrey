# TypeScript Type Definitions

This directory contains comprehensive type definitions for the Gallifrey Social Feed POC, implementing all critical fixes from `EXPERT_REVIEWS.md`.

## Overview

The type system is designed with strict TypeScript patterns to prevent runtime errors and ensure type safety throughout the application:

- **Discriminated unions** for Post types (prevents impossible states)
- **Branded types** for semantic validation
- **Result pattern** for type-safe error handling
- **Type guards** for runtime checks
- **Proper navigation types** with global augmentation

## Files

### 1. `models.ts` - Core Data Models

Defines all core data structures for the application.

#### Key Features:

- **Discriminated Union Posts**: Prevents invalid states like having `media_url` without `media_type`
- **Branded Types**: `ISODateString`, `UUID` for semantic type safety
- **Semantic Reactions**: Uses string constants (`'heart'`, `'thumbs_up'`) instead of emoji literals
- **Type Guards**: Runtime checks for all major types

#### Usage Example:

```typescript
import { Post, isPostWithImage, REACTION_TYPES, REACTION_EMOJI_MAP } from '@/types';

function renderPost(post: Post) {
  if (isPostWithImage(post)) {
    // TypeScript knows post.media_url and post.media_type === 'image' exist
    return <Image source={{ uri: post.media_url }} />;
  }
}

// Use semantic reaction types
const reactionType = REACTION_TYPES.HEART;
const emoji = REACTION_EMOJI_MAP[reactionType]; // ❤️
```

#### Post Types:

```typescript
// Impossible states are impossible
type Post = PostWithImage | PostWithVideo | PostWithoutMedia;

// ✅ Valid
const imagePost: PostWithImage = {
  media_url: 'https://...',
  media_type: 'image',
  // ...
};

// ❌ Invalid - TypeScript error
const invalidPost: PostWithoutMedia = {
  media_url: 'https://...', // Error: property doesn't exist
  // ...
};
```

### 2. `api.ts` - API & Error Handling

Implements the Result pattern for type-safe error handling.

#### Key Features:

- **Result<T, E>**: Discriminated union for success/error states
- **Specific Error Types**: ValidationError, NetworkError, AuthError, MediaError, etc.
- **ErrorCode Enum**: Standardized error codes
- **Type Guards**: Check error types at runtime
- **Error Factories**: Convenient error creation functions

#### Usage Example:

```typescript
import { Result, isSuccess, ErrorCode, authError } from '@/types';

async function loginUser(email: string, password: string): AsyncResult<User> {
  try {
    const user = await api.login(email, password);
    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: authError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS, true),
    };
  }
}

// Type-safe usage
const result = await loginUser('user@example.com', 'password');

if (isSuccess(result)) {
  // TypeScript knows result.data is User
  console.log('Welcome', result.data.username);
} else {
  // TypeScript knows result.error is ApiError
  if (isAuthError(result.error)) {
    // Navigate to login
  }
}
```

#### Result Pattern Benefits:

- No try/catch needed at call site
- Forces explicit error handling
- Type-safe error discrimination
- Better than throwing exceptions

### 3. `navigation.ts` - Navigation Types

Provides type-safe navigation with React Navigation.

#### Key Features:

- **Nested Stack Architecture**: FeedStack → MainTabs → RootStack
- **Global Type Augmentation**: `useNavigation()` is automatically typed
- **Screen Props Helpers**: Pre-configured prop types for all screens
- **Route Constants**: Type-safe route name constants
- **Deep Linking Types**: Configuration for URL routing

#### Usage Example:

```typescript
import { useNavigation } from '@react-navigation/native';
import { Routes, FeedTabScreenProps } from '@/types';

// In a component
function FeedScreen() {
  const navigation = useNavigation(); // Automatically typed!

  const handlePostPress = (postId: string) => {
    // Type-safe navigation
    navigation.navigate(Routes.POST_DETAIL, { postId });
  };
}

// With typed screen props
type Props = FeedTabScreenProps<'PostDetail'>;

function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params; // Typed as UUID
  // ...
}
```

#### Navigation Structure:

```
RootStack
├─ Auth Stack
│  ├─ Login
│  ├─ Signup
│  ├─ ForgotPassword
│  └─ ResetPassword
│
└─ Main Tabs
   ├─ Feed Stack
   │  ├─ Feed
   │  └─ PostDetail
   │
   ├─ CreatePost (Tab)
   │
   └─ Profile Stack
      ├─ Profile
      ├─ Settings
      └─ EditProfile
```

### 4. `validation.ts` - Validation Types

Branded types and validation functions for input sanitization.

#### Key Features:

- **Branded Types**: `ValidEmail`, `ValidUsername`, `ValidPassword`, etc.
- **Validation Constraints**: Centralized validation rules
- **ValidationResult<T>**: Specialized Result type for validation
- **Input Interfaces**: Validated and unvalidated input types
- **Composite Validators**: Validate complex inputs

#### Usage Example:

```typescript
import {
  validateEmail,
  validatePassword,
  validateSignupInput,
  isSuccess,
} from '@/types';

// Simple validation
const emailResult = validateEmail('user@example.com');
if (isSuccess(emailResult)) {
  // emailResult.data is ValidEmail (branded type)
  await sendEmail(emailResult.data);
}

// Composite validation
const signupResult = validateSignupInput({
  email: 'user@example.com',
  username: 'john_doe',
  password: 'SecurePass123',
  password_confirmation: 'SecurePass123',
});

if (isSuccess(signupResult)) {
  // All fields are validated
  const { email, username, password } = signupResult.data;
  await createUser({ email, username, password });
} else {
  // Display validation error
  showError(signupResult.error.message);
}
```

#### Validation Constraints:

```typescript
VALIDATION_CONSTRAINTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
  },
  POST_CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  // ... and more
};
```

### 5. `index.ts` - Central Export

Re-exports all types from a single convenient location.

#### Usage:

```typescript
// Import everything from one place
import {
  Post,
  User,
  Result,
  isSuccess,
  validateEmail,
  Routes,
  ErrorCode,
} from '@/types';
```

## Type Safety Patterns

### 1. Discriminated Unions

Prevents impossible states at compile time:

```typescript
// ❌ Old way - allows invalid states
interface Post {
  media_url?: string;
  media_type?: 'image' | 'video';
}

// Can have media_url without media_type!
const badPost: Post = { media_url: 'https://...' };

// ✅ New way - impossible states are impossible
type Post = PostWithImage | PostWithVideo | PostWithoutMedia;

// TypeScript prevents invalid states
```

### 2. Branded Types

Add semantic meaning to primitive types:

```typescript
// ❌ Old way - easy to mix up
function sendEmail(email: string) { }
function setUsername(username: string) { }

sendEmail(username); // Oops! No error

// ✅ New way - type safety
function sendEmail(email: ValidEmail) { }
function setUsername(username: ValidUsername) { }

sendEmail(username); // TypeScript error!
```

### 3. Result Pattern

Explicit error handling without exceptions:

```typescript
// ❌ Old way - easy to forget error handling
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`);
  return response.data; // What about errors?
}

// ✅ New way - forces error handling
async function fetchUser(id: string): AsyncResult<User> {
  try {
    const response = await api.get(`/users/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: toApiError(error) };
  }
}

// Caller MUST handle both cases
const result = await fetchUser('123');
if (isSuccess(result)) {
  // Use result.data
} else {
  // Handle result.error
}
```

### 4. Type Guards

Runtime type checking with compile-time benefits:

```typescript
function processPost(post: Post) {
  if (isPostWithImage(post)) {
    // TypeScript narrows type to PostWithImage
    return <Image source={{ uri: post.media_url }} />;
  }

  if (isPostWithVideo(post)) {
    // TypeScript narrows type to PostWithVideo
    return <Video source={{ uri: post.media_url }} />;
  }

  // TypeScript knows post is PostWithoutMedia here
  return <Text>{post.content}</Text>;
}
```

## Best Practices

### 1. Always Use Type Guards

```typescript
// ✅ Good
if (isSuccess(result)) {
  console.log(result.data);
}

// ❌ Bad - bypasses type safety
if (result.success) {
  console.log(result.data); // Still works but less safe
}
```

### 2. Validate User Input

```typescript
// ✅ Good - validate before using
const emailResult = validateEmail(userInput);
if (isSuccess(emailResult)) {
  await sendEmail(emailResult.data);
}

// ❌ Bad - no validation
await sendEmail(userInput);
```

### 3. Use Semantic Types

```typescript
// ✅ Good - semantic constants
const reaction = REACTION_TYPES.HEART;
await addReaction(postId, reaction);

// ❌ Bad - emoji literals
await addReaction(postId, '❤️');
```

### 4. Prefer Result Pattern Over Throwing

```typescript
// ✅ Good - explicit error handling
async function createPost(input: CreatePostInput): AsyncResult<Post> {
  const validated = validateCreatePostInput(input);
  if (!isSuccess(validated)) {
    return validated; // Return validation error
  }

  try {
    const post = await api.createPost(validated.data);
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: toApiError(error) };
  }
}

// ❌ Bad - throwing forces try/catch everywhere
async function createPost(input: CreatePostInput): Promise<Post> {
  if (!isValidInput(input)) {
    throw new Error('Invalid input');
  }
  return await api.createPost(input);
}
```

## Testing Type Safety

You can test that types are correct using type assertions:

```typescript
import type { Post, PostWithImage } from '@/types';

// This should compile
const imagePost: Post = {
  id: '123' as UUID,
  media_url: 'https://example.com/image.jpg',
  media_type: 'image',
  // ...
} satisfies PostWithImage;

// This should NOT compile
const invalidPost: Post = {
  id: '123' as UUID,
  media_url: 'https://example.com/image.jpg',
  // Missing media_type - TypeScript error!
  // ...
};
```

## Integration with Supabase

After setting up your Supabase database, generate types:

```bash
npx supabase gen types typescript \
  --project-id <project-id> \
  --schema public > src/types/supabase.ts
```

Then merge with these types:

```typescript
import type { Database } from './supabase';
import type { Post } from './models';

// Ensure Supabase types match our models
type SupabasePost = Database['public']['Tables']['posts']['Row'];

// Use in Supabase client
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .returns<Post[]>();
```

## TypeScript Configuration

Ensure your `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/types": ["./src/types"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

## Further Reading

- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Branded Types Pattern](https://egghead.io/blog/using-branded-types-in-typescript)
- [Result Type Pattern](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling/)
- [React Navigation TypeScript](https://reactnavigation.org/docs/typescript/)

## Summary

These type definitions provide:

- **Compile-time safety**: Catch errors before runtime
- **Better IDE support**: Autocomplete and inline documentation
- **Self-documenting code**: Types describe intent
- **Easier refactoring**: Type errors guide changes
- **Runtime validation**: Type guards ensure correctness

All critical fixes from EXPERT_REVIEWS.md have been implemented:

- ✅ Discriminated unions for Post types
- ✅ Result pattern for error handling
- ✅ Semantic reaction types
- ✅ Proper navigation architecture
- ✅ Branded types for validation
- ✅ Comprehensive type guards
