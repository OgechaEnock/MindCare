-- Run this in PostgreSQL

-- Drop existing tables if needed
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS forum_threads CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS medical_history CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical History table
CREATE TABLE medical_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    diagnosis TEXT,
    conditions TEXT,
    allergies TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medications table
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_times TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    notes TEXT,
    reminder_24h BOOLEAN DEFAULT true,
    reminder_1h BOOLEAN DEFAULT true,
    notified_24h BOOLEAN DEFAULT false,
    notified_1h BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forum threads table (with moderation)
CREATE TABLE forum_threads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    author_name VARCHAR(255),
    approval_status VARCHAR(50) DEFAULT 'approved',
    moderation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL DEFAULT 'general',
    title VARCHAR(255),
    message TEXT,
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_medications_user ON medications(user_id);
CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_forum_threads_user ON forum_threads(user_id);
CREATE INDEX idx_forum_threads_approved ON forum_threads(approval_status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

COMMENT ON TABLE users IS 'Stores user authentication information';
COMMENT ON TABLE medications IS 'Stores encrypted medication data with reminder settings';
COMMENT ON TABLE appointments IS 'Stores encrypted appointment data with reminder tracking';
COMMENT ON TABLE forum_threads IS 'Stores forum threads with AI moderation status';
COMMENT ON TABLE notifications IS 'Stores in-app notifications for users';