export const schema = `-- Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
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
    status TEXT DEFAULT 'Offline'
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
);`;
