/**
 * Central export file for all TypeScript types in Gallifrey Social Feed POC
 *
 * This file re-exports all types from their respective modules for convenient importing.
 * Usage: import { Post, User, Result, validateEmail } from '@/types'
 */

// ============================================================================
// Model Types
// ============================================================================

export type {
  // Branded types
  ISODateString,
  UUID,

  // Reaction types
  ReactionType,

  // User types
  User,
  UserReference,

  // Post types (discriminated unions)
  Post,
  PostWithImage,
  PostWithVideo,
  PostWithoutMedia,

  // Reaction types
  Reaction,
  ReactionCount,
  UserReaction,

  // Comment types
  Comment,
  CommentWithReplies,

  // Utility types
  PaginationMeta,
  PaginatedResponse,
  Timestamps,
} from './models';

export {
  // Constants
  REACTION_TYPES,
  REACTION_EMOJI_MAP,

  // Type guards
  isPostWithImage,
  isPostWithVideo,
  isPostWithoutMedia,
  hasMedia,
  isReactionType,
  isISODateString,
  isUUID,
} from './models';

// ============================================================================
// API Types
// ============================================================================

export type {
  // Result type
  Result,
  AsyncResult,

  // Error types
  ApiError,
  BaseError,
  ValidationError,
  NetworkError,
  AuthError,
  MediaError,
  DatabaseError,
  RateLimitError,
  GenericError,

  // API response types
  ApiResponse,
  PaginatedApiResponse,
} from './api';

export {
  // Error codes
  ErrorCode,

  // Type guards
  isSuccess,
  isError,
  isValidationError,
  isNetworkError,
  isAuthError,
  isMediaError,
  isDatabaseError,
  isRateLimitError,
  isRetryableError,

  // Error factory functions
  validationError,
  networkError,
  authError,
  mediaError,
  databaseError,
  rateLimitError,
  genericError,

  // Utility functions
  toApiError,
  getErrorMessage,
} from './api';

// ============================================================================
// Navigation Types
// ============================================================================

export type {
  // Stack param lists
  FeedStackParamList,
  ProfileStackParamList,
  MainTabParamList,
  AuthStackParamList,
  RootStackParamList,

  // Screen props
  FeedStackScreenProps,
  ProfileStackScreenProps,
  MainTabScreenProps,
  AuthStackScreenProps,
  RootStackScreenProps,
  FeedTabScreenProps,
  ProfileTabScreenProps,

  // Route names
  RouteName,

  // Navigation state types
  ScreenOptions,
  TabBarIconProps,
  NavigationEvent,

  // Deep linking types
  DeepLinkConfig,
  DeepLinkParams,
} from './navigation';

export {
  // Route constants
  Routes,

  // Type guards
  isRouteName,
} from './navigation';

// ============================================================================
// Validation Types
// ============================================================================

export type {
  // Branded types for validated data
  ValidEmail,
  ValidUsername,
  ValidPassword,
  ValidPostContent,
  ValidCommentContent,
  ValidMediaUrl,
  ValidBio,

  // ValidationResult type
  ValidationResult,

  // Input interfaces
  CreatePostInput,
  ValidatedCreatePostInput,
  CreateCommentInput,
  ValidatedCreateCommentInput,
  CreateReactionInput,
  ValidatedCreateReactionInput,
  SignupInput,
  ValidatedSignupInput,
  LoginInput,
  ValidatedLoginInput,
  UpdateProfileInput,
  ValidatedUpdateProfileInput,
  MediaUploadInput,
  ValidatedMediaUploadInput,
} from './validation';

export {
  // Validation constants
  VALIDATION_CONSTRAINTS,

  // Validation functions
  validateEmail,
  validateUsername,
  validatePassword,
  validatePostContent,
  validateCommentContent,
  validateBio,
  validateMediaUrl,
  validateMediaFile,
  validatePasswordsMatch,
  validateCreatePostInput,
  validateSignupInput,
  validateLoginInput,
} from './validation';
