const normalizeAnswer = (val) => {
    let s = String(val).toLowerCase().trim();
    s = s.replace(/[’‘‛ʻ´'`]/g, "");
    s = s.replace(/[“”]/g, '"');
    s = s.replace(/[.,!?;:]/g, " ");
    s = s.replace(/\+/g, " ");
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const countCorrectParts = (studentAns, acceptedAnswers) => {
    if (!studentAns) return 0;
    const sParts = String(studentAns).split('+').map(p => normalizeAnswer(p));
    const aParts = acceptedAnswers.map(p => normalizeAnswer(p));
    let count = 0;
    for (let i = 0; i < aParts.length; i++) {
        if (sParts[i] === aParts[i]) count++;
    }
    return count;
};

const testPartialScoring = () => {
    console.log("Testing Partial Scoring Logic...");

    const acceptedAnswers = ["apple", "banana", "cherry", "date", "elderberry"];

    // Test 1: 5/5
    const ans1 = "apple+banana+cherry+date+elderberry";
    const score1 = countCorrectParts(ans1, acceptedAnswers);
    console.log(`Test 1 (5/5): Score = ${score1} ${score1 === 5 ? 'PASS' : 'FAIL'}`);

    // Test 2: 3/5
    const ans2 = "apple+WRONG+cherry+date+WRONG";
    const score2 = countCorrectParts(ans2, acceptedAnswers);
    console.log(`Test 2 (3/5): Score = ${score2} ${score2 === 3 ? 'PASS' : 'FAIL'}`);

    // Test 3: 0/5
    const ans3 = "x+y+z+w+q";
    const score3 = countCorrectParts(ans3, acceptedAnswers);
    console.log(`Test 3 (0/5): Score = ${score3} ${score3 === 0 ? 'PASS' : 'FAIL'}`);

    if (score1 === 5 && score2 === 3 && score3 === 0) {
        console.log("\nPartial Scoring Verification: SUCCESS");
        process.exit(0);
    } else {
        console.error("\nPartial Scoring Verification: FAILED");
        process.exit(1);
    }
};

testPartialScoring();
