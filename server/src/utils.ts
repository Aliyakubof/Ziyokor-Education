export const normalizeAnswer = (val: string | number): string => {
    let s = String(val).toLowerCase().trim();
    // Handle various apostrophe and quotation mark variants
    s = s.replace(/[‘’“”]/g, (m) => m === '‘' || m === '’' ? "'" : '"');
    // Remove all basic punctuation throughout the string
    s = s.replace(/[.,!?;:]/g, " ");
    // Normalize multiple spaces and ensure trimmed
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

export const checkAnswer = (studentAns: string | number, acceptedAnswers: string[]): boolean => {
    const normalized = normalizeAnswer(studentAns || "");

    // 1. Synonym Check: Does normalized input match any single accepted answer?
    const isSynonymMatch = acceptedAnswers.some((ans: string) => normalizeAnswer(ans) === normalized);

    // 2. Sequence Check: Does normalized input match the joined sequence of answers?
    // (Relevant for word-box or multiple fill-in-the-blanks)
    const joinedSequence = normalizeAnswer(acceptedAnswers.join(" "));
    const isSequenceMatch = acceptedAnswers.length > 1 && joinedSequence === normalized;

    return isSynonymMatch || isSequenceMatch;
};
