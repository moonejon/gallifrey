-- Gallifrey Social Feed POC - Initial Database Schema
-- This migration implements the complete schema with critical fixes from EXPERT_REVIEWS.md
-- Created: 2026-02-06

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Stores user profile information
-- Linked to Supabase auth.users via foreign key

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- =====================================================
-- POSTS TABLE
-- =====================================================
-- Stores user posts with optional media (image or video)
-- media_url and media_type work together: both set or both NULL

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
    -- Ensure media_url and media_type are both set or both NULL
    CONSTRAINT media_consistency CHECK (
        (media_url IS NULL AND media_type IS NULL) OR
        (media_url IS NOT NULL AND media_type IS NOT NULL)
    )
);

-- =====================================================
-- REACTIONS TABLE
-- =====================================================
-- CRITICAL FIX: Uses composite PRIMARY KEY instead of UNIQUE constraint
-- This allows UPSERT operations so users can change their reaction type
-- (e.g., change from ❤️ to 🔥 on the same post)

CREATE TABLE reactions (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('heart', 'thumbs_up', 'laugh', 'fire', 'surprised')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- PRIMARY KEY instead of UNIQUE - this is the critical fix
    -- Allows: INSERT ... ON CONFLICT (post_id, user_id) DO UPDATE SET type = ...
    PRIMARY KEY (post_id, user_id)
);

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
-- Stores comments on posts

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================
-- Critical indexes from EXPERT_REVIEWS.md for optimal query performance

-- Posts indexes
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Reactions indexes
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
-- Automatically update updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- USERS POLICIES
-- -----------------------------------------------------

-- Users can view all profiles
CREATE POLICY "Users can view all profiles"
    ON users FOR SELECT
    USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
    ON users FOR DELETE
    USING (auth.uid() = id);

-- -----------------------------------------------------
-- POSTS POLICIES
-- -----------------------------------------------------

-- Anyone can view posts
CREATE POLICY "Anyone can view posts"
    ON posts FOR SELECT
    USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- REACTIONS POLICIES
-- -----------------------------------------------------

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
    ON reactions FOR SELECT
    USING (true);

-- Authenticated users can create reactions
CREATE POLICY "Authenticated users can create reactions"
    ON reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions (for UPSERT pattern)
CREATE POLICY "Users can update their own reactions"
    ON reactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
    ON reactions FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- COMMENTS POLICIES
-- -----------------------------------------------------

-- Anyone can view comments
CREATE POLICY "Anyone can view comments"
    ON comments FOR SELECT
    USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get post with aggregated counts (reactions, comments)
CREATE OR REPLACE FUNCTION get_post_with_counts(post_uuid UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    reaction_count BIGINT,
    comment_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.content,
        p.media_url,
        p.media_type,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT r.user_id) AS reaction_count,
        COUNT(DISTINCT c.id) AS comment_count
    FROM posts p
    LEFT JOIN reactions r ON p.id = r.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    WHERE p.id = post_uuid
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's reaction on a post (for UI state)
CREATE OR REPLACE FUNCTION get_user_reaction(post_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
    SELECT type FROM reactions
    WHERE post_id = post_uuid AND user_id = user_uuid;
$$ LANGUAGE sql;

-- =====================================================
-- SAMPLE DATA (for development/testing)
-- =====================================================
-- Uncomment to populate with sample data

/*
-- Note: You'll need to manually create auth.users first via Supabase Auth
-- Then insert corresponding user profiles here

-- Sample user profiles (replace UUIDs with actual auth.users IDs)
INSERT INTO users (id, email, username, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'alice_smith', 'https://i.pravatar.cc/150?img=1'),
('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'bob_jones', 'https://i.pravatar.cc/150?img=2'),
('00000000-0000-0000-0000-000000000003', 'carol@example.com', 'carol_dev', 'https://i.pravatar.cc/150?img=3');

-- Sample posts
INSERT INTO posts (user_id, content, media_url, media_type) VALUES
('00000000-0000-0000-0000-000000000001', 'Just shipped a new feature! 🚀', NULL, NULL),
('00000000-0000-0000-0000-000000000002', 'Beautiful sunset today', 'https://picsum.photos/800/600?random=1', 'image'),
('00000000-0000-0000-0000-000000000003', 'Working on the Gallifrey POC. Looking good so far!', NULL, NULL);

-- Sample reactions (demonstrating UPSERT capability)
INSERT INTO reactions (post_id, user_id, type)
SELECT id, '00000000-0000-0000-0000-000000000002', 'heart' FROM posts LIMIT 1
ON CONFLICT (post_id, user_id) DO UPDATE SET type = EXCLUDED.type;

-- Sample comments
INSERT INTO comments (post_id, user_id, content)
SELECT id, '00000000-0000-0000-0000-000000000003', 'Looks amazing! Great work!' FROM posts LIMIT 1;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
--
-- CRITICAL FEATURES IMPLEMENTED:
-- ✅ Reactions table with PRIMARY KEY (allows UPSERT for changing reaction types)
-- ✅ Performance indexes on all foreign keys and frequently queried columns
-- ✅ media_consistency constraint ensures media_url and media_type are both set or both NULL
-- ✅ Comprehensive RLS policies for secure data access
-- ✅ Automatic updated_at triggers
-- ✅ Helper functions for common queries
-- ✅ Semantic reaction types (not emoji literals in DB)
--
-- USAGE EXAMPLES:
--
-- UPSERT a reaction (allows changing from 'heart' to 'fire'):
-- INSERT INTO reactions (post_id, user_id, type)
-- VALUES ('post-uuid', 'user-uuid', 'fire')
-- ON CONFLICT (post_id, user_id)
-- DO UPDATE SET type = EXCLUDED.type;
--
-- Get posts with counts (feed query):
-- SELECT p.*, COUNT(DISTINCT r.user_id) as reaction_count, COUNT(DISTINCT c.id) as comment_count
-- FROM posts p
-- LEFT JOIN reactions r ON p.id = r.post_id
-- LEFT JOIN comments c ON p.id = c.post_id
-- GROUP BY p.id
-- ORDER BY p.created_at DESC
-- LIMIT 20;
--
-- Get user's reaction on a post:
-- SELECT get_user_reaction('post-uuid', auth.uid());
