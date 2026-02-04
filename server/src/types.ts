export interface Player {
    id: string; // socket id
    name: string;
    score: number;
    answers: Record<string, number>; // questionIndex -> answerIndex
    status?: 'Online' | 'Offline' | 'Cheating';
}

export interface Teacher {
    id: string;
    name: string;
    phone: string;
    password: string; // last 4 digits of phone
}

export interface Student {
    id: string; // 7-digit 
    name: string;
    groupId: string;
    status: 'Online' | 'Offline' | 'Cheating';
}

export interface Group {
    id: string;
    name: string;
    teacherId: string;
}

export interface UnitQuiz {
    id: string;
    level: string;
    unit: string;
    title: string;
    questions: Question[];
}

export interface Quiz {
    id: string;
    title: string;
    questions: Question[];
}

export interface Question {
    text: string;
    options: string[];
    correctIndex: number;
    timeLimit: number;
}

export interface GameSession {
    pin: string;
    quiz: Quiz | UnitQuiz;
    hostId: string;
    players: Player[];
    status: 'LOBBY' | 'ACTIVE' | 'FINISHED';
    currentQuestionIndex: number;
    startTime?: number; // When the current question started
    isUnitQuiz?: boolean;
    groupId?: string;
}
