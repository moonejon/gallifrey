/**
 * Core Data Models for Gallifrey Social Feed POC
 *
 * This file contains all core data models using TypeScript best practices:
 * - Discriminated unions for type safety
 * - Branded types for semantic validation
 * - Type guards for runtime checks
 */

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Branded type for ISO date strings to ensure type safety
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Branded type for UUIDs
 */
export type UUID = string & { readonly __brand: 'UUID' };

// ============================================================================
// Semantic Reaction Types
// ============================================================================

/**
 * Semantic reaction type constants (not emoji literals)
 * This allows for easier database storage and localization
 */
export const REACTION_TYPES = {
  HEART: 'heart',
  THUMBS_UP: 'thumbs_up',
  LAUGH: 'laugh',
  FIRE: 'fire',
  SURPRISED: 'surprised',
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];

/**
 * Mapping from semantic reaction types to emoji display
 */
export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  heart: '❤️',
  thumbs_up: '👍',
  laugh: '😂',
  fire: '🔥',
  surprised: '😮',
};

// ============================================================================
// User Types
// ============================================================================

/**
 * User profile information
 */
export interface User {
  id: UUID;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Lightweight user reference for posts/comments
 */
export interface UserReference {
  id: UUID;
  username: string;
  avatar_url?: string;
}

// ============================================================================
// Post Types (Discriminated Unions)
// ============================================================================

/**
 * Base post interface with common fields
 * Uses discriminated unions to prevent invalid states
 */
interface BasePost {
  id: UUID;
  user_id: UUID;
  user: UserReference;
  content: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  reactions_count: number;
  comments_count: number;
}

/**
 * Post with image media
 */
export interface PostWithImage extends BasePost {
  media_url: string;
  media_type: 'image';
}

/**
 * Post with video media
 */
export interface PostWithVideo extends BasePost {
  media_url: string;
  media_type: 'video';
  thumbnail_url?: string; // Video thumbnail for preview
}

/**
 * Post without any media
 * Uses 'never' type to prevent media_url/media_type from being set
 */
export interface PostWithoutMedia extends BasePost {
  media_url?: never;
  media_type?: never;
}

/**
 * Discriminated union of all post types
 * Ensures impossible states are impossible
 */
export type Post = PostWithImage | PostWithVideo | PostWithoutMedia;

// ============================================================================
// Reaction Types
// ============================================================================

/**
 * User reaction to a post
 */
export interface Reaction {
  id: UUID;
  post_id: UUID;
  user_id: UUID;
  type: ReactionType;
  created_at: ISODateString;
}

/**
 * Aggregated reaction count per type for a post
 */
export interface ReactionCount {
  type: ReactionType;
  count: number;
}

/**
 * User's reaction state for a post
 */
export interface UserReaction {
  has_reacted: boolean;
  reaction_type?: ReactionType;
}

// ============================================================================
// Comment Types
// ============================================================================

/**
 * Comment on a post
 */
export interface Comment {
  id: UUID;
  post_id: UUID;
  user_id: UUID;
  user: UserReference;
  content: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Comment with nested replies (for future expansion)
 */
export interface CommentWithReplies extends Comment {
  replies?: Comment[];
  replies_count: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a post has image media
 */
export function isPostWithImage(post: Post): post is PostWithImage {
  return post.media_type === 'image';
}

/**
 * Type guard to check if a post has video media
 */
export function isPostWithVideo(post: Post): post is PostWithVideo {
  return post.media_type === 'video';
}

/**
 * Type guard to check if a post has no media
 */
export function isPostWithoutMedia(post: Post): post is PostWithoutMedia {
  return !post.media_type && !post.media_url;
}

/**
 * Type guard to check if a post has any media
 */
export function hasMedia(post: Post): post is PostWithImage | PostWithVideo {
  return isPostWithImage(post) || isPostWithVideo(post);
}

/**
 * Type guard to check if a string is a valid reaction type
 */
export function isReactionType(value: string): value is ReactionType {
  return Object.values(REACTION_TYPES).includes(value as ReactionType);
}

/**
 * Type guard to check if a string is a valid ISO date string
 */
export function isISODateString(value: string): value is ISODateString {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoDateRegex.test(value);
}

/**
 * Type guard to check if a string is a valid UUID
 */
export function isUUID(value: string): value is UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  next_cursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Timestamp fields for database entities
 */
export interface Timestamps {
  created_at: ISODateString;
  updated_at: ISODateString;
}
