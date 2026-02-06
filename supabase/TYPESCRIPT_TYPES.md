# TypeScript Types Reference

These are the recommended TypeScript types to use with the database schema. These implement the best practices from EXPERT_REVIEWS.md.

## Core Database Types

```typescript
// src/types/database.ts

// =====================================================
// REACTION TYPES (Semantic, not emoji literals)
// =====================================================

export const REACTION_TYPES = {
  HEART: 'heart',
  THUMBS_UP: 'thumbs_up',
  LAUGH: 'laugh',
  FIRE: 'fire',
  SURPRISED: 'surprised',
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];

// Map semantic types to emoji for display
export const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  heart: '❤️',
  thumbs_up: '👍',
  laugh: '😂',
  fire: '🔥',
  surprised: '😮',
};

// =====================================================
// USER TYPES
// =====================================================

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

// =====================================================
// POST TYPES (Discriminated Unions)
// =====================================================
// CRITICAL: Uses discriminated unions to prevent invalid states

interface BasePost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PostWithImage extends BasePost {
  media_url: string;
  media_type: 'image';
}

export interface PostWithVideo extends BasePost {
  media_url: string;
  media_type: 'video';
}

export interface PostWithoutMedia extends BasePost {
  media_url: null;
  media_type: null;
}

// Union type - TypeScript enforces valid combinations
export type Post = PostWithImage | PostWithVideo | PostWithoutMedia;

// =====================================================
// POST WITH RELATIONS (for Feed/Detail views)
// =====================================================

export interface PostWithUser extends Post {
  user: UserProfile;
}

export interface PostWithCounts extends PostWithUser {
  reaction_count: number;
  comment_count: number;
  user_reaction?: ReactionType; // Current user's reaction if any
}

// =====================================================
// REACTION TYPES
// =====================================================

export interface Reaction {
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
  updated_at: string;
}

export interface ReactionWithUser extends Reaction {
  user: UserProfile;
}

// Aggregated reaction counts by type
export interface ReactionCounts {
  heart: number;
  thumbs_up: number;
  laugh: number;
  fire: number;
  surprised: number;
  total: number;
}

// =====================================================
// COMMENT TYPES
// =====================================================

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  user: UserProfile;
}

// =====================================================
// INPUT TYPES (for mutations)
// =====================================================

export interface CreatePostInput {
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
}

export interface UpdatePostInput {
  content?: string;
}

export interface CreateCommentInput {
  post_id: string;
  content: string;
}

export interface UpsertReactionInput {
  post_id: string;
  type: ReactionType;
}

// =====================================================
// RESULT TYPE (for error handling)
// =====================================================

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// =====================================================
// PAGINATION TYPES
// =====================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// For cursor-based pagination (React Query infinite queries)
export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
```

## Type Guards

```typescript
// src/types/guards.ts

import type { Post, PostWithImage, PostWithVideo, PostWithoutMedia } from './database';

export function hasImage(post: Post): post is PostWithImage {
  return post.media_type === 'image';
}

export function hasVideo(post: Post): post is PostWithVideo {
  return post.media_type === 'video';
}

export function hasMedia(post: Post): post is PostWithImage | PostWithVideo {
  return post.media_url !== null && post.media_type !== null;
}

export function hasNoMedia(post: Post): post is PostWithoutMedia {
  return post.media_url === null && post.media_type === null;
}

// Usage example:
// if (hasImage(post)) {
//   // TypeScript knows post.media_url and post.media_type are defined
//   return <Image source={{ uri: post.media_url }} />;
// }
```

## Validation Types

```typescript
// src/types/validation.ts

// Branded types for validated data
export type ValidEmail = string & { readonly __brand: 'ValidEmail' };
export type ValidUsername = string & { readonly __brand: 'ValidUsername' };
export type ValidPostContent = string & { readonly __brand: 'ValidPostContent' };
export type ValidCommentContent = string & { readonly __brand: 'ValidCommentContent' };

// Validation functions
export function validateEmail(email: string): Result<ValidEmail> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid email format',
      },
    };
  }
  return { success: true, data: email as ValidEmail };
}

export function validateUsername(username: string): Result<ValidUsername> {
  if (username.length < 3 || username.length > 30) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Username must be 3-30 characters',
      },
    };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Username can only contain letters, numbers, and underscores',
      },
    };
  }
  return { success: true, data: username as ValidUsername };
}

export function validatePostContent(content: string): Result<ValidPostContent> {
  if (content.length < 1 || content.length > 5000) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Post content must be 1-5000 characters',
      },
    };
  }
  return { success: true, data: content as ValidPostContent };
}

export function validateCommentContent(content: string): Result<ValidCommentContent> {
  if (content.length < 1 || content.length > 2000) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Comment must be 1-2000 characters',
      },
    };
  }
  return { success: true, data: content as ValidCommentContent };
}
```

## Supabase Service Types

```typescript
// src/services/posts.service.ts (example)

import { supabase } from '@/lib/supabase';
import type {
  Post,
  PostWithCounts,
  CreatePostInput,
  Result,
  PaginatedResponse,
} from '@/types/database';

export async function createPost(input: CreatePostInput): Promise<Result<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        content: input.content,
        media_url: input.media_url ?? null,
        media_type: input.media_type ?? null,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.DATABASE_ERROR,
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to create post',
        details: err,
      },
    };
  }
}

export async function getPosts(
  limit = 20,
  offset = 0
): Promise<Result<PaginatedResponse<PostWithCounts>>> {
  try {
    const user = await supabase.auth.getUser();

    // Get posts with counts and user info
    const { data, error, count } = await supabase
      .from('posts')
      .select(
        `
        *,
        user:users!posts_user_id_fkey(id, username, avatar_url),
        reactions(count),
        comments(count)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.DATABASE_ERROR,
          message: error.message,
          details: error,
        },
      };
    }

    // Get user's reactions for these posts
    const postIds = data.map((p) => p.id);
    const { data: userReactions } = await supabase
      .from('reactions')
      .select('post_id, type')
      .in('post_id', postIds)
      .eq('user_id', user.data.user?.id);

    const reactionMap = new Map(userReactions?.map((r) => [r.post_id, r.type]));

    // Transform data
    const posts: PostWithCounts[] = data.map((post) => ({
      ...post,
      user: post.user,
      reaction_count: post.reactions[0]?.count || 0,
      comment_count: post.comments[0]?.count || 0,
      user_reaction: reactionMap.get(post.id),
    }));

    return {
      success: true,
      data: {
        data: posts,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: offset + limit < (count || 0),
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to fetch posts',
        details: err,
      },
    };
  }
}
```

## Reaction Service (UPSERT Example)

```typescript
// src/services/reactions.service.ts

import { supabase } from '@/lib/supabase';
import type { ReactionType, Result } from '@/types/database';

export async function upsertReaction(
  postId: string,
  type: ReactionType
): Promise<Result<void>> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      return {
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Must be logged in to react',
        },
      };
    }

    // UPSERT pattern - works because of PRIMARY KEY in migration
    const { error } = await supabase.from('reactions').upsert(
      {
        post_id: postId,
        user_id: user.data.user.id,
        type: type,
      },
      {
        onConflict: 'post_id,user_id', // Critical: matches PRIMARY KEY
      }
    );

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.DATABASE_ERROR,
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to update reaction',
        details: err,
      },
    };
  }
}

export async function removeReaction(postId: string): Promise<Result<void>> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      return {
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Must be logged in to remove reaction',
        },
      };
    }

    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.data.user.id);

    if (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.DATABASE_ERROR,
          message: error.message,
          details: error,
        },
      };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to remove reaction',
        details: err,
      },
    };
  }
}
```

## React Query Integration

```typescript
// src/hooks/usePosts.ts

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPosts, createPost } from '@/services/posts.service';
import type { CreatePostInput } from '@/types/database';

export function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 0 }) => getPosts(20, pageParam),
    getNextPageParam: (lastPage) => {
      if (!lastPage.success) return undefined;
      const { pagination } = lastPage.data;
      return pagination.hasMore ? pagination.offset + pagination.limit : undefined;
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

## Key Takeaways

1. **Discriminated Unions** prevent impossible states (media_url without media_type)
2. **Result Types** provide type-safe error handling
3. **Branded Types** ensure validation at compile time
4. **Semantic Reaction Types** (not emoji literals) in database
5. **UPSERT Support** via PRIMARY KEY constraint
6. **Type Guards** for narrowing union types safely

These types align perfectly with the database schema in `001_initial_schema.sql`.
