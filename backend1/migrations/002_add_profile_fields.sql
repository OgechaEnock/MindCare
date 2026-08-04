-- MindCare Migration 002
-- Adds personal information and emergency contact fields to the users table
-- Non-destructive: uses ALTER TABLE with IF NOT EXISTS checks

-- Personal Information fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Emergency Contact fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_alt_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_email VARCHAR(255);

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comments
COMMENT ON COLUMN users.phone IS 'Contact phone number';
COMMENT ON COLUMN users.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN users.gender IS 'Gender: male | female | other | prefer-not-to-say';
COMMENT ON COLUMN users.address IS 'Home address';
COMMENT ON COLUMN users.bio IS 'Short biography or about me';
COMMENT ON COLUMN users.avatar_url IS 'URL to profile avatar image';
COMMENT ON COLUMN users.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN users.emergency_contact_relationship IS 'Relationship to user';
COMMENT ON COLUMN users.emergency_contact_phone IS 'Emergency contact phone';
COMMENT ON COLUMN users.emergency_contact_alt_phone IS 'Alternative emergency contact phone';
COMMENT ON COLUMN users.emergency_contact_email IS 'Emergency contact email';