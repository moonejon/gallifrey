# Supabase Setup Guide

This guide will walk you through setting up Supabase for the Gallifrey social feed app.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: `gallifrey` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Free tier is perfect for POC

## 2. Get Your API Credentials

Once your project is created:

1. Go to **Project Settings** → **API**
2. Copy the following values:

```bash
# Project URL
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon/Public Key (safe to use in mobile app)
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Project ID (from the URL or Settings)
SUPABASE_PROJECT_ID=xxxxxxxxxxxxx
```

## 3. Configure Environment Variables

1. Open `.env` in the root of the project
2. Paste your values:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_PROJECT_ID=your-actual-project-id
```

**⚠️ Important**: Never commit the `.env` file! It's already in `.gitignore`.

## 4. Run Database Migrations

### Option A: Using Supabase SQL Editor (Recommended for POC)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## 5. Generate TypeScript Types

After running migrations, generate TypeScript types:

```bash
npm run supabase:types
```

This creates `src/types/supabase.ts` with auto-generated types from your database schema.

## 6. Verify Setup

Test that everything works:

```bash
# Type check
npm run type-check

# Start the app
npm start
```

## 7. Enable Row Level Security (RLS)

The migration already sets up RLS policies, but verify in Supabase dashboard:

1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `users` - Users can read all, update own
   - `posts` - Users can read all, create/update/delete own
   - `reactions` - Users can read all, create/update/delete own
   - `comments` - Users can read all, create/update/delete own

## 8. Enable Realtime (Optional)

For real-time feed updates:

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `posts`
   - `reactions`
   - `comments`

## 9. Set Up Storage for Media

1. Go to **Storage**
2. Create a new bucket:
   - **Name**: `media`
   - **Public**: Yes (for easy media access)
3. Set up policies:
   - **Upload**: Authenticated users only
   - **Read**: Public
   - **Update/Delete**: Owner only

### Storage Policy SQL:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public to view media
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 10. Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure:
   - **Enable email confirmations**: Off (for POC - turn on for production)
   - **Enable email change confirmations**: Off (for POC)

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists in the root directory
- Check that variables are prefixed with `EXPO_PUBLIC_`
- Restart the Expo dev server after changing `.env`

### "Invalid API key"
- Double-check you copied the **anon/public** key, not the service role key
- Ensure there are no extra spaces or line breaks

### "Failed to fetch"
- Check your internet connection
- Verify the Supabase URL is correct
- Check if Supabase project is paused (free tier pauses after inactivity)

### Type generation fails
- Ensure `SUPABASE_PROJECT_ID` is set in `.env`
- Make sure migrations have been run
- Try: `npx supabase gen types typescript --project-id YOUR_ID --schema public > src/types/supabase.ts`

## Next Steps

Once Supabase is set up:

1. ✅ Test authentication flow (sign up, log in)
2. ✅ Create test posts
3. ✅ Test reactions and comments
4. ✅ Upload test media

Your Supabase backend is now ready for development! 🚀
