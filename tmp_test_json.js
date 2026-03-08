const questions = [{ text: "Hello" }];
console.log("Original:", questions);
console.log("Stringified:", JSON.stringify(questions));
console.log("Type of Stringified:", typeof JSON.stringify(questions));

// Simulate what happens when we parse it back
const retrieved = JSON.stringify(questions); // This is what goes into DB string column or JSONB if passed as string
const parsed = JSON.parse(retrieved); // This is what comes out if pg parses JSONB, OR what we get if we JSON.parse a string
console.log("Parsed once:", parsed, "Type:", Array.isArray(parsed) ? "Array" : typeof parsed);

// BUT! If we passed a string to JSONB column that was already stringified:
// DB stores: "[{\"text\":\"Hello\"}]" (as a JSON string scalar if pg thinks it's a string)
// OR it stores it as the array if pg is smart enough.

// Let's check how app.ts handles it when reading:
// app.get('/api/unit-quizzes/:id', async (req, res) => {
//    const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [req.params.id]);
//    res.json(result.rows[0]);
// });

// If result.rows[0].questions is a string, then res.json() sends a string.
// Then client does:
// const parsedQuestions = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;

// This client code suggests it expects either an object/array OR a string that needs parsing.
