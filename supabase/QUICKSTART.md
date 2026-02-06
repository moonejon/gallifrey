# Quick Start Guide - Gallifrey Database Setup

Get your Supabase database ready in 5 minutes.

## Prerequisites

- Supabase account (free tier works)
- Supabase project created
- Your project URL and anon key

## Step 1: Apply the Migration

### Option A: Supabase Dashboard (Easiest)

1. Open your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/Users/jonathan/github/gallifrey/supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd+Enter)
7. You should see: "Success. No rows returned"

### Option B: Supabase CLI

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

## Step 2: Verify Tables Created

In Supabase dashboard:

1. Go to **Table Editor**
2. You should see 4 tables:
   - users
   - posts
   - reactions
   - comments

## Step 3: Generate TypeScript Types (Optional but Recommended)

```bash
# Generate types from your database
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  --schema public > src/types/supabase.ts
```

Or manually create types using the reference in `TYPESCRIPT_TYPES.md`.

## Step 4: Configure Your App

Create `.env` file in your React Native project:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Get these values from: **Settings** > **API** in Supabase dashboard.

## Step 5: Test the Schema

### Create a Test User

1. Go to **Authentication** > **Users** in Supabase dashboard
2. Click **Add user** > **Create new user**
3. Enter email and password
4. Click **Save**
5. Copy the user's UUID

### Insert Test Data

Go to **SQL Editor** and run:

```sql
-- Insert user profile (replace UUID with your test user's ID)
INSERT INTO users (id, email, username, avatar_url)
VALUES (
  'YOUR_USER_UUID_HERE',
  'test@example.com',
  'test_user',
  'https://i.pravatar.cc/150?img=1'
);

-- Create a test post
INSERT INTO posts (user_id, content)
VALUES (
  'YOUR_USER_UUID_HERE',
  'This is my first post on Gallifrey!'
);

-- Verify it worked
SELECT
  p.*,
  u.username
FROM posts p
JOIN users u ON p.user_id = u.id;
```

### Test Reaction UPSERT

```sql
-- Get your post ID from the previous query
-- Then test the UPSERT functionality

-- Add a reaction
INSERT INTO reactions (post_id, user_id, type)
VALUES (
  'YOUR_POST_UUID_HERE',
  'YOUR_USER_UUID_HERE',
  'heart'
)
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;

-- Change the reaction (this is the critical fix!)
INSERT INTO reactions (post_id, user_id, type)
VALUES (
  'YOUR_POST_UUID_HERE',
  'YOUR_USER_UUID_HERE',
  'fire'  -- Changed from 'heart' to 'fire'
)
ON CONFLICT (post_id, user_id)
DO UPDATE SET type = EXCLUDED.type;

-- Verify the reaction changed
SELECT * FROM reactions
WHERE post_id = 'YOUR_POST_UUID_HERE';
```

You should see the reaction type is now 'fire', not 'heart'. This confirms the UPSERT fix works!

## Step 6: Test RLS Policies

### In Supabase SQL Editor:

```sql
-- Test as authenticated user
-- This uses your session token automatically
SELECT * FROM posts;  -- Should work

-- Test inserting a post (should work if you're authenticated)
INSERT INTO posts (user_id, content)
VALUES (auth.uid(), 'Testing RLS policies!');
```

### In Your App:

```typescript
// This should work after authentication
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);
```

## Common Issues

### "relation does not exist"
- Migration didn't run successfully
- Check for errors in SQL Editor
- Try running migration again

### "permission denied for table"
- RLS policies not applied
- Check that RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'posts';`
- Verify you're authenticated

### "duplicate key value violates unique constraint"
- Trying to insert duplicate username/email
- Use different values or delete existing test data

### Reaction UPSERT not working
- Verify PRIMARY KEY exists: `\d reactions` in psql
- Should show: `PRIMARY KEY, btree (post_id, user_id)`
- Use correct ON CONFLICT clause: `ON CONFLICT (post_id, user_id)`

## Verify Critical Fixes

### 1. Reactions UPSERT Support
```sql
-- Should allow changing reaction types
INSERT INTO reactions (post_id, user_id, type) VALUES (...)
ON CONFLICT (post_id, user_id) DO UPDATE SET type = EXCLUDED.type;
```

### 2. Performance Indexes
```sql
-- Check indexes exist
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Should see:
- idx_posts_created_at
- idx_posts_user_id
- idx_reactions_post_id
- idx_comments_post_id
- etc.

### 3. Media Consistency Constraint
```sql
-- This should FAIL (media_url without media_type)
INSERT INTO posts (user_id, content, media_url)
VALUES ('uuid', 'Test', 'https://example.com/image.jpg');
-- Error: new row violates check constraint "media_consistency"

-- This should SUCCEED
INSERT INTO posts (user_id, content, media_url, media_type)
VALUES ('uuid', 'Test', 'https://example.com/image.jpg', 'image');
```

### 4. Updated_at Triggers
```sql
-- Insert a post
INSERT INTO posts (user_id, content)
VALUES ('uuid', 'Test')
RETURNING created_at, updated_at;
-- created_at and updated_at should be equal

-- Update the post
UPDATE posts SET content = 'Updated'
WHERE id = 'post-uuid'
RETURNING created_at, updated_at;
-- updated_at should be newer than created_at
```

## Next Steps

1. Set up your React Native app
2. Install Supabase client: `npm install @supabase/supabase-js`
3. Implement authentication
4. Create the feed screen
5. Test CRUD operations
6. Deploy!

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)

## Support

If you run into issues:
1. Check Supabase logs: **Database** > **Logs**
2. Review RLS policies: **Authentication** > **Policies**
3. Test queries in SQL Editor with EXPLAIN ANALYZE
4. Check the README.md for detailed documentation
