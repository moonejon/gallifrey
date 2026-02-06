# Gallifrey Supabase Migrations

This directory contains database migrations for the Gallifrey Social Feed POC.

## Migrations

### 001_initial_schema.sql

Complete database schema with critical fixes from EXPERT_REVIEWS.md:

#### Tables Created
- **users** - User profiles linked to Supabase auth
- **posts** - User posts with optional media (image/video)
- **reactions** - Post reactions with UPSERT support
- **comments** - Comments on posts

#### Critical Features

##### 1. UPSERT-Compatible Reactions Table
**Problem Fixed:** Original plan used `UNIQUE(post_id, user_id)` which prevented users from changing their reaction type.

**Solution:** Uses composite PRIMARY KEY instead:
```sql
PRIMARY KEY (post_id, user_id)
```

This allows the UPSERT pattern:
```sql
INSERT INTO reactions (post_id, user_id, type)
VALUES ('post-uuid', 'user-uuid', 'fire')
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;
```

##### 2. Performance Indexes
All critical indexes from expert reviews:
- `idx_posts_created_at` - Feed queries (DESC order)
- `idx_posts_user_id` - User's posts
- `idx_reactions_post_id` - Post reaction counts
- `idx_comments_post_id` - Post comment counts
- And more...

##### 3. Media Consistency Constraint
Ensures `media_url` and `media_type` are both set or both NULL:
```sql
CONSTRAINT media_consistency CHECK (
    (media_url IS NULL AND media_type IS NULL) OR
    (media_url IS NOT NULL AND media_type IS NOT NULL)
)
```

##### 4. Semantic Reaction Types
Uses semantic strings instead of emoji literals:
- `heart` → ❤️
- `thumbs_up` → 👍
- `laugh` → 😂
- `fire` → 🔥
- `surprised` → 😮

Map these to emojis in your TypeScript code.

##### 5. Comprehensive RLS Policies
Row Level Security for all tables:
- Public read access (SELECT)
- Authenticated write access (INSERT/UPDATE/DELETE)
- Users can only modify their own data

##### 6. Auto-Updated Timestamps
`updated_at` columns automatically update via triggers.

#### Helper Functions

**get_post_with_counts(post_uuid)** - Get post with reaction/comment counts:
```sql
SELECT * FROM get_post_with_counts('post-uuid');
```

**get_user_reaction(post_uuid, user_uuid)** - Get user's reaction on a post:
```sql
SELECT get_user_reaction('post-uuid', auth.uid());
```

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for POC)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```

### Option 3: Direct Database Connection

If you have the database connection string:

```bash
psql "your-connection-string" -f supabase/migrations/001_initial_schema.sql
```

## Generating TypeScript Types

After applying the migration, generate TypeScript types for type-safe Supabase client:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Generate types
supabase gen types typescript \
  --project-id your-project-id \
  --schema public > src/types/supabase.ts
```

Then use in your code:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
```

## Common Queries

### Feed Query (Paginated)
```sql
SELECT
    p.*,
    u.username,
    u.avatar_url,
    COUNT(DISTINCT r.user_id) as reaction_count,
    COUNT(DISTINCT c.id) as comment_count
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, u.username, u.avatar_url
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;
```

### Get Post Detail with All Data
```sql
SELECT
    p.*,
    u.username,
    u.avatar_url,
    json_agg(DISTINCT jsonb_build_object(
        'type', r.type,
        'user_id', r.user_id
    )) FILTER (WHERE r.type IS NOT NULL) as reactions,
    json_agg(DISTINCT jsonb_build_object(
        'id', c.id,
        'content', c.content,
        'user_id', c.user_id,
        'created_at', c.created_at
    )) FILTER (WHERE c.id IS NOT NULL) as comments
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.id = 'post-uuid'
GROUP BY p.id, u.username, u.avatar_url;
```

### Toggle Reaction (UPSERT)
```sql
-- Add or change reaction
INSERT INTO reactions (post_id, user_id, type)
VALUES ('post-uuid', auth.uid(), 'fire')
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;

-- Remove reaction
DELETE FROM reactions
WHERE post_id = 'post-uuid' AND user_id = auth.uid();
```

## Testing the Schema

### Sample Data

The migration includes commented-out sample data. To use it:

1. First create test users via Supabase Auth
2. Uncomment the sample data section in the migration
3. Replace the UUIDs with your actual auth user IDs
4. Run the migration

### Verify Tables

```sql
-- List all tables
\dt

-- Check table structure
\d users
\d posts
\d reactions
\d comments

-- Verify indexes
\di

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('users', 'posts', 'reactions', 'comments');
```

## Database Performance Tips

1. **Indexes are applied automatically** - No need to add them manually
2. **Use `get_post_with_counts()` function** for efficient aggregation
3. **Batch reactions/comments queries** when displaying multiple posts
4. **Use Supabase's built-in caching** with React Query
5. **Monitor slow queries** in Supabase dashboard

## Troubleshooting

### Migration fails with "relation already exists"
- Tables already exist. Drop them first or create a new migration.

### RLS blocks all queries
- Make sure you're authenticated: `supabase.auth.getSession()`
- Check your RLS policies in Supabase dashboard

### UPSERT not working
- Verify the PRIMARY KEY constraint exists on reactions table
- Use correct ON CONFLICT clause: `ON CONFLICT (post_id, user_id)`

### Performance issues
- Check EXPLAIN ANALYZE output for your queries
- Verify indexes are being used
- Monitor with Supabase dashboard metrics

## Next Steps

1. Apply this migration to your Supabase project
2. Generate TypeScript types
3. Implement the React Native app using these types
4. Test UPSERT functionality for reactions
5. Monitor query performance in production

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL UPSERT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
