/**
 * Validation Types for Gallifrey Social Feed POC
 *
 * This file contains all validation-related types:
 * - Branded types for validated data
 * - ValidationResult types
 * - Input interfaces
 * - Validation utility functions
 */

import type { Result } from './api';
import { validationError, type ValidationError } from './api';
import type { ReactionType, UUID } from './models';

// ============================================================================
// Branded Types for Validated Data
// ============================================================================

/**
 * Branded type for validated email addresses
 * Ensures email has been validated before use
 */
export type ValidEmail = string & { readonly __brand: 'ValidEmail' };

/**
 * Branded type for validated usernames
 * Ensures username meets requirements before use
 */
export type ValidUsername = string & { readonly __brand: 'ValidUsername' };

/**
 * Branded type for validated passwords
 * Ensures password meets security requirements
 */
export type ValidPassword = string & { readonly __brand: 'ValidPassword' };

/**
 * Branded type for validated post content
 * Ensures content meets length and quality requirements
 */
export type ValidPostContent = string & { readonly __brand: 'ValidPostContent' };

/**
 * Branded type for validated comment content
 * Ensures comment meets length requirements
 */
export type ValidCommentContent = string & { readonly __brand: 'ValidCommentContent' };

/**
 * Branded type for validated media URLs
 * Ensures URL is valid and properly formatted
 */
export type ValidMediaUrl = string & { readonly __brand: 'ValidMediaUrl' };

/**
 * Branded type for validated bio text
 * Ensures bio meets length requirements
 */
export type ValidBio = string & { readonly __brand: 'ValidBio' };

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Validation constraints for different fields
 */
export const VALIDATION_CONSTRAINTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/, // Alphanumeric and underscore only
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false,
  },
  POST_CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  COMMENT_CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  BIO: {
    MAX_LENGTH: 160,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  MEDIA: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
    MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  },
} as const;

// ============================================================================
// ValidationResult Type
// ============================================================================

/**
 * Result type specifically for validation operations
 * Uses ValidationError for error cases
 */
export type ValidationResult<T> = Result<T, ValidationError>;

// ============================================================================
// Input Interfaces
// ============================================================================

/**
 * Input for creating a new post
 */
export interface CreatePostInput {
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  thumbnail_url?: string; // For video posts
}

/**
 * Validated input for creating a new post
 */
export interface ValidatedCreatePostInput {
  content: ValidPostContent;
  media_url?: ValidMediaUrl;
  media_type?: 'image' | 'video';
  thumbnail_url?: ValidMediaUrl;
}

/**
 * Input for creating a comment
 */
export interface CreateCommentInput {
  post_id: string;
  content: string;
}

/**
 * Validated input for creating a comment
 */
export interface ValidatedCreateCommentInput {
  post_id: UUID;
  content: ValidCommentContent;
}

/**
 * Input for creating a reaction
 */
export interface CreateReactionInput {
  post_id: string;
  type: string;
}

/**
 * Validated input for creating a reaction
 */
export interface ValidatedCreateReactionInput {
  post_id: UUID;
  type: ReactionType;
}

/**
 * Input for user registration
 */
export interface SignupInput {
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
}

/**
 * Validated input for user registration
 */
export interface ValidatedSignupInput {
  email: ValidEmail;
  username: ValidUsername;
  password: ValidPassword;
}

/**
 * Input for user login
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Validated input for user login
 */
export interface ValidatedLoginInput {
  email: ValidEmail;
  password: string; // Don't validate password content on login
}

/**
 * Input for updating user profile
 */
export interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatar_url?: string;
}

/**
 * Validated input for updating user profile
 */
export interface ValidatedUpdateProfileInput {
  username?: ValidUsername;
  bio?: ValidBio;
  avatar_url?: ValidMediaUrl;
}

/**
 * Input for media upload
 */
export interface MediaUploadInput {
  uri: string;
  type: string;
  name: string;
  size: number;
}

/**
 * Validated media upload input
 */
export interface ValidatedMediaUploadInput {
  uri: ValidMediaUrl;
  type: string;
  name: string;
  size: number;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult<ValidEmail> {
  if (!email || email.trim().length === 0) {
    return {
      success: false,
      error: validationError('Email is required', 'email'),
    };
  }

  if (!VALIDATION_CONSTRAINTS.EMAIL.PATTERN.test(email)) {
    return {
      success: false,
      error: validationError('Invalid email format', 'email'),
    };
  }

  return {
    success: true,
    data: email as ValidEmail,
  };
}

/**
 * Validate username
 */
export function validateUsername(username: string): ValidationResult<ValidUsername> {
  if (!username || username.trim().length === 0) {
    return {
      success: false,
      error: validationError('Username is required', 'username'),
    };
  }

  if (username.length < VALIDATION_CONSTRAINTS.USERNAME.MIN_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Username must be at least ${VALIDATION_CONSTRAINTS.USERNAME.MIN_LENGTH} characters`,
        'username'
      ),
    };
  }

  if (username.length > VALIDATION_CONSTRAINTS.USERNAME.MAX_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Username must not exceed ${VALIDATION_CONSTRAINTS.USERNAME.MAX_LENGTH} characters`,
        'username'
      ),
    };
  }

  if (!VALIDATION_CONSTRAINTS.USERNAME.PATTERN.test(username)) {
    return {
      success: false,
      error: validationError(
        'Username can only contain letters, numbers, and underscores',
        'username'
      ),
    };
  }

  return {
    success: true,
    data: username as ValidUsername,
  };
}

/**
 * Validate password
 */
export function validatePassword(password: string): ValidationResult<ValidPassword> {
  if (!password || password.length === 0) {
    return {
      success: false,
      error: validationError('Password is required', 'password'),
    };
  }

  if (password.length < VALIDATION_CONSTRAINTS.PASSWORD.MIN_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Password must be at least ${VALIDATION_CONSTRAINTS.PASSWORD.MIN_LENGTH} characters`,
        'password'
      ),
    };
  }

  if (password.length > VALIDATION_CONSTRAINTS.PASSWORD.MAX_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Password must not exceed ${VALIDATION_CONSTRAINTS.PASSWORD.MAX_LENGTH} characters`,
        'password'
      ),
    };
  }

  const errors: string[] = [];

  if (VALIDATION_CONSTRAINTS.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('at least one uppercase letter');
  }

  if (VALIDATION_CONSTRAINTS.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('at least one lowercase letter');
  }

  if (VALIDATION_CONSTRAINTS.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('at least one number');
  }

  if (VALIDATION_CONSTRAINTS.PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('at least one special character');
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: validationError(`Password must contain ${errors.join(', ')}`, 'password'),
    };
  }

  return {
    success: true,
    data: password as ValidPassword,
  };
}

/**
 * Validate post content
 */
export function validatePostContent(content: string): ValidationResult<ValidPostContent> {
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: validationError('Post content is required', 'content'),
    };
  }

  if (content.length < VALIDATION_CONSTRAINTS.POST_CONTENT.MIN_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Post must be at least ${VALIDATION_CONSTRAINTS.POST_CONTENT.MIN_LENGTH} character`,
        'content'
      ),
    };
  }

  if (content.length > VALIDATION_CONSTRAINTS.POST_CONTENT.MAX_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Post must not exceed ${VALIDATION_CONSTRAINTS.POST_CONTENT.MAX_LENGTH} characters`,
        'content'
      ),
    };
  }

  return {
    success: true,
    data: content as ValidPostContent,
  };
}

/**
 * Validate comment content
 */
export function validateCommentContent(content: string): ValidationResult<ValidCommentContent> {
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: validationError('Comment content is required', 'content'),
    };
  }

  if (content.length < VALIDATION_CONSTRAINTS.COMMENT_CONTENT.MIN_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Comment must be at least ${VALIDATION_CONSTRAINTS.COMMENT_CONTENT.MIN_LENGTH} character`,
        'content'
      ),
    };
  }

  if (content.length > VALIDATION_CONSTRAINTS.COMMENT_CONTENT.MAX_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Comment must not exceed ${VALIDATION_CONSTRAINTS.COMMENT_CONTENT.MAX_LENGTH} characters`,
        'content'
      ),
    };
  }

  return {
    success: true,
    data: content as ValidCommentContent,
  };
}

/**
 * Validate bio text
 */
export function validateBio(bio: string): ValidationResult<ValidBio> {
  if (bio.length > VALIDATION_CONSTRAINTS.BIO.MAX_LENGTH) {
    return {
      success: false,
      error: validationError(
        `Bio must not exceed ${VALIDATION_CONSTRAINTS.BIO.MAX_LENGTH} characters`,
        'bio'
      ),
    };
  }

  return {
    success: true,
    data: bio as ValidBio,
  };
}

/**
 * Validate media URL
 */
export function validateMediaUrl(url: string): ValidationResult<ValidMediaUrl> {
  if (!url || url.trim().length === 0) {
    return {
      success: false,
      error: validationError('Media URL is required', 'media_url'),
    };
  }

  try {
    new URL(url);
  } catch {
    return {
      success: false,
      error: validationError('Invalid URL format', 'media_url'),
    };
  }

  return {
    success: true,
    data: url as ValidMediaUrl,
  };
}

/**
 * Validate media file
 */
export function validateMediaFile(input: MediaUploadInput): ValidationResult<ValidatedMediaUploadInput> {
  // Validate file size
  const isVideo = VALIDATION_CONSTRAINTS.MEDIA.ALLOWED_VIDEO_TYPES.includes(input.type);
  const maxSize = isVideo
    ? VALIDATION_CONSTRAINTS.MEDIA.MAX_VIDEO_SIZE
    : VALIDATION_CONSTRAINTS.MEDIA.MAX_FILE_SIZE;

  if (input.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      success: false,
      error: validationError(
        `File size must not exceed ${maxSizeMB}MB`,
        'media',
        undefined
      ),
    };
  }

  // Validate file type
  const allowedTypes = [
    ...VALIDATION_CONSTRAINTS.MEDIA.ALLOWED_IMAGE_TYPES,
    ...VALIDATION_CONSTRAINTS.MEDIA.ALLOWED_VIDEO_TYPES,
  ];

  if (!allowedTypes.includes(input.type)) {
    return {
      success: false,
      error: validationError(
        'Invalid file type. Only images and videos are allowed.',
        'media'
      ),
    };
  }

  // Validate URI
  const uriResult = validateMediaUrl(input.uri);
  if (!uriResult.success) {
    return uriResult as ValidationResult<ValidatedMediaUploadInput>;
  }

  return {
    success: true,
    data: {
      uri: uriResult.data,
      type: input.type,
      name: input.name,
      size: input.size,
    },
  };
}

/**
 * Validate passwords match
 */
export function validatePasswordsMatch(
  password: string,
  confirmation: string
): ValidationResult<true> {
  if (password !== confirmation) {
    return {
      success: false,
      error: validationError('Passwords do not match', 'password_confirmation'),
    };
  }

  return {
    success: true,
    data: true,
  };
}

// ============================================================================
// Composite Validation Functions
// ============================================================================

/**
 * Validate create post input
 */
export function validateCreatePostInput(
  input: CreatePostInput
): ValidationResult<ValidatedCreatePostInput> {
  const contentResult = validatePostContent(input.content);
  if (!contentResult.success) {
    return contentResult as ValidationResult<ValidatedCreatePostInput>;
  }

  const validated: ValidatedCreatePostInput = {
    content: contentResult.data,
  };

  if (input.media_url) {
    const urlResult = validateMediaUrl(input.media_url);
    if (!urlResult.success) {
      return urlResult as ValidationResult<ValidatedCreatePostInput>;
    }
    validated.media_url = urlResult.data;
    validated.media_type = input.media_type;

    if (input.thumbnail_url) {
      const thumbnailResult = validateMediaUrl(input.thumbnail_url);
      if (!thumbnailResult.success) {
        return thumbnailResult as ValidationResult<ValidatedCreatePostInput>;
      }
      validated.thumbnail_url = thumbnailResult.data;
    }
  }

  return {
    success: true,
    data: validated,
  };
}

/**
 * Validate signup input
 */
export function validateSignupInput(
  input: SignupInput
): ValidationResult<ValidatedSignupInput> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.success) {
    return emailResult as ValidationResult<ValidatedSignupInput>;
  }

  const usernameResult = validateUsername(input.username);
  if (!usernameResult.success) {
    return usernameResult as ValidationResult<ValidatedSignupInput>;
  }

  const passwordResult = validatePassword(input.password);
  if (!passwordResult.success) {
    return passwordResult as ValidationResult<ValidatedSignupInput>;
  }

  const matchResult = validatePasswordsMatch(input.password, input.password_confirmation);
  if (!matchResult.success) {
    return matchResult as ValidationResult<ValidatedSignupInput>;
  }

  return {
    success: true,
    data: {
      email: emailResult.data,
      username: usernameResult.data,
      password: passwordResult.data,
    },
  };
}

/**
 * Validate login input
 */
export function validateLoginInput(input: LoginInput): ValidationResult<ValidatedLoginInput> {
  const emailResult = validateEmail(input.email);
  if (!emailResult.success) {
    return emailResult as ValidationResult<ValidatedLoginInput>;
  }

  if (!input.password || input.password.length === 0) {
    return {
      success: false,
      error: validationError('Password is required', 'password'),
    };
  }

  return {
    success: true,
    data: {
      email: emailResult.data,
      password: input.password,
    },
  };
}
