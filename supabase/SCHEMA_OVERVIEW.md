# Database Schema Overview

Visual reference for the Gallifrey POC database structure.

## Entity Relationship Diagram (Text Format)

```
┌─────────────────────────┐
│       auth.users        │  (Supabase Auth - managed)
│  (Supabase managed)     │
└───────────┬─────────────┘
            │
            │ 1:1
            │
┌───────────▼─────────────┐
│         users           │
├─────────────────────────┤
│ id (PK, FK)            │◄──────────┐
│ email (unique)          │           │
│ username (unique)       │           │
│ avatar_url              │           │
│ created_at              │           │
│ updated_at              │           │
└─────────────────────────┘           │
            │                          │
            │ 1:N                      │
            │                          │
┌───────────▼─────────────┐           │
│         posts           │           │
├─────────────────────────┤           │
│ id (PK)                 │◄──────┐   │
│ user_id (FK)            │       │   │
│ content                 │       │   │
│ media_url               │       │   │
│ media_type              │       │   │
│ created_at              │       │   │
│ updated_at              │       │   │
└─────────────────────────┘       │   │
            │                      │   │
            ├──────────────────┐   │   │
            │                  │   │   │
            │ 1:N              │ 1:N │ 1:N
            │                  │   │   │
┌───────────▼─────────────┐   │   │   │
│      reactions          │   │   │   │
├─────────────────────────┤   │   │   │
│ post_id (PK, FK) ───────┼───┘   │   │
│ user_id (PK, FK) ───────┼───────┘   │
│ type                    │           │
│ created_at              │           │
│ updated_at              │           │
└─────────────────────────┘           │
                                      │
┌─────────────────────────┐           │
│       comments          │           │
├─────────────────────────┤           │
│ id (PK)                 │           │
│ post_id (FK) ───────────┼───────────┘
│ user_id (FK) ───────────┼───────────┘
│ content                 │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```

## Tables Summary

### 1. users

**Purpose:** User profiles linked to Supabase auth

| Column      | Type        | Constraints                    |
|-------------|-------------|--------------------------------|
| id          | UUID        | PK, FK → auth.users(id)        |
| email       | TEXT        | UNIQUE, NOT NULL               |
| username    | TEXT        | UNIQUE, NOT NULL, 3-30 chars   |
| avatar_url  | TEXT        | NULL                           |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()        |
| updated_at  | TIMESTAMPTZ | NOT NULL, auto-updated         |

**Indexes:**
- `idx_users_username`
- `idx_users_email`

---

### 2. posts

**Purpose:** User posts with optional media

| Column      | Type        | Constraints                           |
|-------------|-------------|---------------------------------------|
| id          | UUID        | PK, DEFAULT uuid_generate_v4()        |
| user_id     | UUID        | FK → users(id), NOT NULL              |
| content     | TEXT        | NOT NULL, 1-5000 chars                |
| media_url   | TEXT        | NULL, must pair with media_type       |
| media_type  | TEXT        | 'image' or 'video', pairs with URL    |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               |
| updated_at  | TIMESTAMPTZ | NOT NULL, auto-updated                |

**Critical Constraint:**
```sql
media_consistency CHECK (
  (media_url IS NULL AND media_type IS NULL) OR
  (media_url IS NOT NULL AND media_type IS NOT NULL)
)
```

**Indexes:**
- `idx_posts_created_at` (DESC) - For feed queries
- `idx_posts_user_id` - For user's posts

---

### 3. reactions

**Purpose:** Post reactions with UPSERT support

| Column      | Type        | Constraints                           |
|-------------|-------------|---------------------------------------|
| post_id     | UUID        | PK (composite), FK → posts(id)        |
| user_id     | UUID        | PK (composite), FK → users(id)        |
| type        | TEXT        | NOT NULL, enum-like constraint        |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               |
| updated_at  | TIMESTAMPTZ | NOT NULL, auto-updated                |

**Primary Key:** `(post_id, user_id)`

**Reaction Types:**
- `heart` → ❤️
- `thumbs_up` → 👍
- `laugh` → 😂
- `fire` → 🔥
- `surprised` → 😮

**CRITICAL FIX:** Uses PRIMARY KEY instead of UNIQUE constraint to allow UPSERT:
```sql
INSERT INTO reactions (post_id, user_id, type)
VALUES ($1, $2, $3)
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;
```

**Indexes:**
- `idx_reactions_post_id` - For post reaction counts
- `idx_reactions_user_id` - For user's reactions

---

### 4. comments

**Purpose:** Comments on posts

| Column      | Type        | Constraints                           |
|-------------|-------------|---------------------------------------|
| id          | UUID        | PK, DEFAULT uuid_generate_v4()        |
| post_id     | UUID        | FK → posts(id), NOT NULL              |
| user_id     | UUID        | FK → users(id), NOT NULL              |
| content     | TEXT        | NOT NULL, 1-2000 chars                |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()               |
| updated_at  | TIMESTAMPTZ | NOT NULL, auto-updated                |

**Indexes:**
- `idx_comments_post_id` - For post comments
- `idx_comments_user_id` - For user's comments
- `idx_comments_created_at` (DESC) - For chronological order

---

## Row Level Security (RLS) Policies

### users

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT    | View all profiles | Anyone |
| INSERT    | Insert own profile | auth.uid() = id |
| UPDATE    | Update own profile | auth.uid() = id |
| DELETE    | Delete own profile | auth.uid() = id |

### posts

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT    | View all posts | Anyone |
| INSERT    | Create posts | Authenticated, auth.uid() = user_id |
| UPDATE    | Update own posts | auth.uid() = user_id |
| DELETE    | Delete own posts | auth.uid() = user_id |

### reactions

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT    | View all reactions | Anyone |
| INSERT    | Create reactions | Authenticated, auth.uid() = user_id |
| UPDATE    | Update own reactions | auth.uid() = user_id |
| DELETE    | Delete own reactions | auth.uid() = user_id |

### comments

| Operation | Policy | Rule |
|-----------|--------|------|
| SELECT    | View all comments | Anyone |
| INSERT    | Create comments | Authenticated, auth.uid() = user_id |
| UPDATE    | Update own comments | auth.uid() = user_id |
| DELETE    | Delete own comments | auth.uid() = user_id |

---

## Helper Functions

### get_post_with_counts(post_uuid)

Returns a post with aggregated reaction and comment counts.

**Returns:**
```typescript
{
  id: UUID,
  user_id: UUID,
  content: TEXT,
  media_url: TEXT,
  media_type: TEXT,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ,
  reaction_count: BIGINT,
  comment_count: BIGINT
}
```

**Usage:**
```sql
SELECT * FROM get_post_with_counts('post-uuid');
```

### get_user_reaction(post_uuid, user_uuid)

Returns the user's reaction type on a post, or NULL if no reaction.

**Returns:** TEXT (reaction type) or NULL

**Usage:**
```sql
SELECT get_user_reaction('post-uuid', auth.uid());
```

---

## Triggers

All tables have `updated_at` triggers that automatically update the timestamp on row modification.

**Implementation:**
```sql
CREATE TRIGGER update_[table]_updated_at
BEFORE UPDATE ON [table]
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Data Flow Examples

### Creating a Post with Image

```sql
-- 1. Upload image to Supabase Storage (app logic)
-- 2. Insert post with media
INSERT INTO posts (user_id, content, media_url, media_type)
VALUES (
  auth.uid(),
  'Check out this amazing sunset!',
  'https://your-project.supabase.co/storage/v1/object/public/posts/image.jpg',
  'image'
);
```

### Adding/Changing a Reaction

```sql
-- User clicks ❤️ (heart)
INSERT INTO reactions (post_id, user_id, type)
VALUES ('post-uuid', auth.uid(), 'heart')
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;

-- User changes to 🔥 (fire)
INSERT INTO reactions (post_id, user_id, type)
VALUES ('post-uuid', auth.uid(), 'fire')
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;
-- Previous 'heart' is replaced with 'fire'
```

### Fetching Feed with Counts

```sql
SELECT
  p.*,
  u.username,
  u.avatar_url,
  COUNT(DISTINCT r.user_id) as reaction_count,
  COUNT(DISTINCT c.id) as comment_count,
  (
    SELECT type FROM reactions
    WHERE post_id = p.id AND user_id = auth.uid()
  ) as user_reaction
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, u.username, u.avatar_url
ORDER BY p.created_at DESC
LIMIT 20;
```

---

## Performance Considerations

### Indexes Applied

All critical foreign keys and query columns are indexed:

1. **Feed queries** - `idx_posts_created_at` (DESC)
2. **User posts** - `idx_posts_user_id`
3. **Post reactions** - `idx_reactions_post_id`
4. **Post comments** - `idx_comments_post_id`
5. **User lookups** - `idx_users_username`, `idx_users_email`

### Query Optimization Tips

1. **Use indexes** - All provided indexes are on frequently queried columns
2. **Limit results** - Always use LIMIT for feed queries
3. **Batch queries** - Fetch reactions/comments for multiple posts in one query
4. **Use helper functions** - `get_post_with_counts()` is optimized
5. **Monitor slow queries** - Use Supabase dashboard metrics

### Expected Query Performance

| Query Type | Expected Time | Notes |
|------------|---------------|-------|
| Feed (20 posts) | < 50ms | With proper indexes |
| Post detail | < 30ms | Single post with joins |
| UPSERT reaction | < 20ms | Primary key lookup |
| Insert comment | < 15ms | Simple insert |

---

## Migration Version History

| Version | Date | Description |
|---------|------|-------------|
| 001 | 2026-02-06 | Initial schema with critical fixes from EXPERT_REVIEWS.md |

---

## Critical Fixes Implemented

1. **Reactions UPSERT** - PRIMARY KEY instead of UNIQUE constraint
2. **Performance Indexes** - All recommended indexes from expert review
3. **Media Consistency** - CHECK constraint ensures valid media pairs
4. **Semantic Reaction Types** - String types instead of emoji literals
5. **Comprehensive RLS** - Secure policies on all tables
6. **Auto Timestamps** - Triggers for updated_at columns
7. **Helper Functions** - Optimized common queries

---

## TypeScript Integration

See `TYPESCRIPT_TYPES.md` for:
- Discriminated union types for posts
- Result types for error handling
- Type guards for media detection
- Validation types
- Service layer examples
- React Query integration

---

## References

- Full migration: `001_initial_schema.sql`
- TypeScript types: `TYPESCRIPT_TYPES.md`
- Quick start: `QUICKSTART.md`
- Detailed docs: `README.md`
