const normalizeAnswer = (val) => {
    let s = String(val).toLowerCase().trim();
    s = s.replace(/[’‘‛ʻ´'`]/g, "");
    s = s.replace(/[“”]/g, '"');
    s = s.replace(/[.,!?;:]/g, " ");
    s = s.replace(/\+/g, " ");
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const checkAnswer = (studentAns, acceptedAnswers) => {
    const normalized = normalizeAnswer(studentAns || "");
    const isSynonymMatch = acceptedAnswers.some((ans) => normalizeAnswer(ans) === normalized);
    const joinedSequence = normalizeAnswer(acceptedAnswers.join(" "));
    const isSequenceMatch = acceptedAnswers.length > 1 && joinedSequence === normalized;
    return isSynonymMatch || isSequenceMatch;
};

const testMatchingLogic = () => {
    console.log("Testing Matching Logic...");

    const acceptedAnswers = ["very interested", "not able to think clearly", "very happy"];

    const studentAns1 = "very interested+not able to think clearly+very happy";
    const isCorrect1 = checkAnswer(studentAns1, acceptedAnswers);
    console.log(`Test 1 (Perfect Match): ${isCorrect1 ? 'PASS' : 'FAIL'}`);

    const studentAns2 = "Very Interested+Not Able To Think Clearly+Very Happy";
    const isCorrect2 = checkAnswer(studentAns2, acceptedAnswers);
    console.log(`Test 2 (Normalized Match): ${isCorrect2 ? 'PASS' : 'FAIL'}`);

    const studentAns3 = "very happy+very interested+not able to think clearly";
    const isCorrect3 = checkAnswer(studentAns3, acceptedAnswers);
    console.log(`Test 3 (Wrong Order): ${isCorrect3 ? 'FAIL (Expected)' : 'PASS (Correctly rejected)'}`);

    if (isCorrect1 && isCorrect2 && !isCorrect3) {
        console.log("\nMatching Logic Verification: SUCCESS");
        process.exit(0);
    } else {
        console.error("\nMatching Logic Verification: FAILED");
        process.exit(1);
    }
};

testMatchingLogic();
