import { checkAnswer } from './utils';

const testMatchingLogic = () => {
    console.log("Testing Matching Logic...");

    const acceptedAnswers = ["very interested", "not able to think clearly", "very happy"];

    // Case 1: Student sends joined sequence (standard matching format)
    const studentAns1 = "very interested+not able to think clearly+very happy";
    const isCorrect1 = checkAnswer(studentAns1, acceptedAnswers);
    console.log(`Test 1 (Perfect Match): ${isCorrect1 ? 'PASS' : 'FAIL'}`);

    // Case 2: Normalized match
    const studentAns2 = "Very Interested+Not Able To Think Clearly+Very Happy";
    const isCorrect2 = checkAnswer(studentAns2, acceptedAnswers);
    console.log(`Test 2 (Normalized Match): ${isCorrect2 ? 'PASS' : 'FAIL'}`);

    // Case 3: Wrong Match
    const studentAns3 = "very happy+very interested+not able to think clearly";
    const isCorrect3 = checkAnswer(studentAns3, acceptedAnswers);
    console.log(`Test 3 (Wrong Order): ${isCorrect3 ? 'FAIL (Expected)' : 'PASS (Correctly rejected)'}`);

    // Case 4: Missing one
    const studentAns4 = "very interested++very happy";
    const isCorrect4 = checkAnswer(studentAns4, acceptedAnswers);
    console.log(`Test 4 (Missing one): ${isCorrect4 ? 'FAIL (Expected)' : 'PASS (Correctly rejected)'}`);

    if (isCorrect1 && isCorrect2 && !isCorrect3 && !isCorrect4) {
        console.log("\nMatching Logic Verification: SUCCESS");
        process.exit(0);
    } else {
        console.error("\nMatching Logic Verification: FAILED");
        process.exit(1);
    }
};

testMatchingLogic();
