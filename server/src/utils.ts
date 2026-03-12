export const normalizeAnswer = (val: string | number): string => {
    let s = String(val).toLowerCase().trim();
    // Replace all non-alphanumeric characters with space to ignore symbols in scoring
    s = s.replace(/[^a-z0-9]/g, " ");
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

    // 3. Spaceless Check: Does input (without spaces) match any accepted answer (without spaces)?
    // This handles cases like "apple pie" vs "applepie"
    const spacelessNormalized = normalized.replace(/\s/g, "");
    const isSpacelessMatch = acceptedAnswers.some((ans: string) => normalizeAnswer(ans).replace(/\s/g, "") === spacelessNormalized);

    return isSynonymMatch || isSequenceMatch || isSpacelessMatch;
};

export const countCorrectParts = (studentAns: string | number, acceptedAnswers: string[]): number => {
    if (!studentAns) return 0;
    const sParts = String(studentAns).split('+').map(p => normalizeAnswer(p));
    const aParts = acceptedAnswers.map(p => normalizeAnswer(p));
    let count = 0;
    // Compare each part by index
    for (let i = 0; i < aParts.length; i++) {
        if (sParts[i] === aParts[i]) {
            count++;
        }
    }
    return count;
};
