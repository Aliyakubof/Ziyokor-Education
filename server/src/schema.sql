-- Teachers Table
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
    password TEXT, -- For student dashboard login
    parent_name TEXT, -- 'Otasi', 'Onasi', etc.
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
    questions JSONB NOT NULL
);

-- Student Telegram Subscriptions (Many-to-Many for multiple parents)
CREATE TABLE IF NOT EXISTS student_telegram_subscriptions (
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL,
    PRIMARY KEY (student_id, telegram_chat_id)
);
