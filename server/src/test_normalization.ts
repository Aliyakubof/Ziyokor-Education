const normalizeAnswer = (val: any) => {
    let s = String(val).toLowerCase().trim();
    // Mapping all apostrophe variants (including Uzbek ʻ) to standard '
    s = s.replace(/[’‘‛ʻ´]/g, "'");
    // Remove punctuation
    s = s.replace(/[.,!?;:]/g, " ");
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
    { input: "qoʻshilmoq", expected: "qo'shilmoq" }, // Uzbek ʻ
    { input: "o’qimoq", expected: "o'qimoq" },      // Smart quote
    { input: "g‘alaba", expected: "g'alaba" },      // Different variant
    { input: "O'zbekiston", expected: "o'zbekiston" },
    { input: "  multiple   spaces  ", expected: "multiple spaces" },
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
