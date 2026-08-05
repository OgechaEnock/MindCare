-- MindCare Migration 003
-- Adds forum replies/comments and likes/supports features
-- Non-destructive migration

-- Forum Replies/Comments table
CREATE TABLE IF NOT EXISTS forum_replies (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_reply_id INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending', 'rejected')),
    moderation_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Forum Likes/Supports table
CREATE TABLE IF NOT EXISTS forum_likes (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(thread_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_id ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_id ON forum_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_likes_thread_id ON forum_likes(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_user_id ON forum_likes(user_id);

-- Add reply count column to forum_threads for quick access
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create trigger function to update reply count
CREATE OR REPLACE FUNCTION update_forum_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.approval_status = 'approved' THEN
        UPDATE forum_threads SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' AND OLD.approval_status = 'approved' THEN
        UPDATE forum_threads SET reply_count = reply_count - 1 WHERE id = OLD.thread_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.approval_status = 'approved' AND NEW.approval_status != 'approved' THEN
            UPDATE forum_threads SET reply_count = reply_count - 1 WHERE id = NEW.thread_id;
        ELSIF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
            UPDATE forum_threads SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count
DROP TRIGGER IF EXISTS trigger_update_reply_count ON forum_replies;
CREATE TRIGGER trigger_update_reply_count
    AFTER INSERT OR UPDATE OR DELETE ON forum_replies
    FOR EACH ROW EXECUTE FUNCTION update_forum_thread_reply_count();

-- Create trigger function to update like count
CREATE OR REPLACE FUNCTION update_forum_thread_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_threads SET like_count = like_count - 1 WHERE id = OLD.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like count
DROP TRIGGER IF EXISTS trigger_update_like_count ON forum_likes;
CREATE TRIGGER trigger_update_like_count
    AFTER INSERT OR DELETE ON forum_likes
    FOR EACH ROW EXECUTE FUNCTION update_forum_thread_like_count();

-- Initialize existing thread counts
UPDATE forum_threads SET reply_count = (
    SELECT COUNT(*) FROM forum_replies WHERE thread_id = forum_threads.id AND approval_status = 'approved'
) WHERE reply_count = 0;

UPDATE forum_threads SET like_count = (
    SELECT COUNT(*) FROM forum_likes WHERE thread_id = forum_threads.id
) WHERE like_count = 0;

-- Add comments
COMMENT ON TABLE forum_replies IS 'Forum post replies/comments';
COMMENT ON TABLE forum_likes IS 'Forum post likes/supports';
COMMENT ON COLUMN forum_replies.body IS 'Encrypted reply content';
COMMENT ON COLUMN forum_replies.parent_reply_id IS 'For nested replies (optional)';
COMMENT ON COLUMN forum_replies.approval_status IS 'Moderation status: approved | pending | rejected';
COMMENT ON COLUMN forum_threads.reply_count IS 'Cached count of approved replies';
COMMENT ON COLUMN forum_threads.like_count IS 'Cached count of likes';