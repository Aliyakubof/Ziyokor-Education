export const schema = `-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    plain_password TEXT,
    telegram_chat_id TEXT
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    level TEXT NOT NULL DEFAULT 'Beginner',
    has_trophy BOOLEAN DEFAULT FALSE,
    extra_class_days TEXT[],
    extra_class_times TEXT[]
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY, -- 7-digit ID
    name TEXT NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    phone TEXT,
    password TEXT,
    plain_password TEXT,
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
    parent_id TEXT UNIQUE,
    active_theme_id UUID REFERENCES shop_items(id)
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

-- Solo Quizzes Table (Practice)
CREATE TABLE IF NOT EXISTS solo_quizzes (
    id UUID PRIMARY KEY,
    level TEXT NOT NULL,
    unit TEXT, -- Practice set or variant
    title TEXT NOT NULL,
    time_limit INT DEFAULT 30,
    questions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vocabulary Battles Table
CREATE TABLE IF NOT EXISTS vocabulary_battles (
    id UUID PRIMARY KEY,
    daraja TEXT NOT NULL, -- e.g., 'Beginner', 'Elementary'
    level INT NOT NULL, -- 1 to 30
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    questions JSONB NOT NULL
);

-- Student Telegram Subscriptions
CREATE TABLE IF NOT EXISTS student_telegram_subscriptions (
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL,
    role TEXT, -- 'student' or 'parent'
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

-- Shop Items Table
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'avatar', 'theme', 'unlock'
    price INT NOT NULL DEFAULT 100,
    url TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_one_time BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Duel Quizzes Table
CREATE TABLE IF NOT EXISTS duel_quizzes (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    questions JSONB NOT NULL,
    daraja TEXT NOT NULL, -- Using 'daraja' for level in duels
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
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
);

-- Telegram Group Chats Table
CREATE TABLE IF NOT EXISTS telegram_group_chats (
    chat_id TEXT PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Telegram Bot Questions Table
CREATE TABLE IF NOT EXISTS telegram_questions (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INT NOT NULL,
    level TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_coins ON students(coins DESC);
CREATE INDEX IF NOT EXISTS idx_students_streak ON students(streak_count DESC);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_battles_active ON group_battles(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_group_battles_groups ON group_battles(group_a_id, group_b_id);
CREATE INDEX IF NOT EXISTS idx_game_results_group ON game_results(group_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created ON game_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_last_activity ON students(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_player_gin ON game_results USING GIN (player_results);

-- Carousel Slides Table
CREATE TABLE IF NOT EXISTS carousel_slides (
    id UUID PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Extra Class Bookings Table
CREATE TABLE IF NOT EXISTS extra_class_bookings (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    time_slot TEXT NOT NULL,
    topic TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Level Topics Table (Manual entry)
CREATE TABLE IF NOT EXISTS level_topics (
    id UUID PRIMARY KEY,
    level TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
` ;
