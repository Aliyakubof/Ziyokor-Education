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
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'Beginner',
    has_trophy BOOLEAN DEFAULT FALSE
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
    last_contacted_relative TEXT, -- The relative role that was contacted
    coins INT DEFAULT 0,
    streak_count INT DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    avatar_url TEXT,
    is_hero BOOLEAN DEFAULT FALSE,
    weekly_battle_score INT DEFAULT 0,
    parent_id TEXT UNIQUE
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

-- Student Purchases Table
CREATE TABLE IF NOT EXISTS student_purchases (
    id UUID PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'avatar', 'theme', etc.
    item_id TEXT NOT NULL,
    purchased_at TIMESTAMP DEFAULT NOW()
);

-- Duels Table
CREATE TABLE IF NOT EXISTS duels (
    id UUID PRIMARY KEY,
    player1_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    player2_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES unit_quizzes(id) ON DELETE CASCADE,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    winner_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game Results Table
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    quiz_title TEXT NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    player_results JSONB NOT NULL
);

-- Group Battles Table
CREATE TABLE IF NOT EXISTS group_battles (
    id UUID PRIMARY KEY,
    group_a_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    group_b_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    score_a INT DEFAULT 0,
    score_b INT DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'finished'
    winner_id UUID REFERENCES groups(id),
    mvp_id TEXT REFERENCES students(id),
    created_at TIMESTAMP DEFAULT NOW()
);`;
