const normalizeAnswer = (val: any) => {
    let s = String(val).toLowerCase().trim();
    // Remove all apostrophe variants entirely to allow matching even if omitted
    s = s.replace(/[’‘‛ʻ´'`]/g, "");
    // Remove punctuation
    s = s.replace(/[.,!?;:]/g, " ");
    // Normalize multiple spaces to single space
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const testCases = [
    { input: "Hello.", expected: "hello" },
    { input: "qoʻshilmoq", expected: "qoshilmoq" }, // Uzbek ʻ stripped
    { input: "o’qimoq", expected: "oqimoq" },      // Smart quote stripped
    { input: "g‘alaba", expected: "galaba" },      // Different variant stripped
    { input: "O'zbekiston", expected: "ozbekiston" },
    { input: "oqimoq", expected: "oqimoq" },       // Omitted apostrophe matches
    { input: "  multiple   spaces  ", expected: "multiple spaces" },
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
