const normalizeAnswer = (val: string | number): string => {
    let s = String(val).toLowerCase().trim();
    // Replace curly apostrophes with straight ones
    s = s.replace(/[‘’]/g, "'");
    // Remove trailing punctuation: . , ! ?
    s = s.replace(/[.,!?]+$/, "");
    // Normalize multiple spaces to single space
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const testCases = [
    { input: "Hello.", expected: "hello" },
    { input: "hello", expected: "hello" },
    { input: "Has!", expected: "has" },
    { input: "Is it correct?", expected: "is it correct" },
    { input: "Uncle’s", expected: "uncle's" },
    { input: "  multiple   spaces  ", expected: "multiple spaces" },
    { input: "End with period.", expected: "end with period" },
    { input: "What about question mark?", expected: "what about question mark" },
    { input: "Comma at end,", expected: "comma at end" },
    { input: "Mixed case and Punctuation!", expected: "mixed case and punctuation" },
];

let passed = 0;
testCases.forEach((tc, i) => {
    const result = normalizeAnswer(tc.input);
    if (result === tc.expected) {
        console.log(`[PASS] Test ${i + 1}: "${tc.input}" -> "${result}"`);
        passed++;
    } else {
        console.error(`[FAIL] Test ${i + 1}: "${tc.input}" -> "${result}" (Expected: "${tc.expected}")`);
    }
});

console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
    process.exit(0);
} else {
    process.exit(1);
}
