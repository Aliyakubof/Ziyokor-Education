export const schema = `-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    telegram_chat_id TEXT
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY, -- 7-digit ID
    name TEXT NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    phone TEXT,
    password TEXT,
    parent_name TEXT, -- 'Otasi', 'Onasi', etc.
    parent_phone TEXT,
    last_contacted_at TIMESTAMP,
    last_contacted_relative TEXT -- The relative role that was contacted
);

-- Quizzes Table (Regular)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    questions JSONB NOT NULL
);

-- Unit Quizzes Table
CREATE TABLE IF NOT EXISTS unit_quizzes (
    id UUID PRIMARY KEY,
    level TEXT NOT NULL,
    unit TEXT NOT NULL,
    title TEXT NOT NULL,
    time_limit INT DEFAULT 30, -- In minutes
    questions JSONB NOT NULL
);

-- Student Telegram Subscriptions
CREATE TABLE IF NOT EXISTS student_telegram_subscriptions (
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL,
    PRIMARY KEY (student_id, telegram_chat_id)
);

-- Contact Logs Table
CREATE TABLE IF NOT EXISTS contact_logs (
    id UUID PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    relative TEXT NOT NULL, -- 'Otasi', 'Onasi', etc.
    contacted_at TIMESTAMP DEFAULT NOW()
);

-- Game Results Table
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    quiz_title TEXT NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    player_results JSONB NOT NULL
);`;
