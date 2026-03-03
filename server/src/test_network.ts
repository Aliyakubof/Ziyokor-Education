
async function testNetwork() {
    console.log("Testing network connectivity from Node.js...");
    try {
        const response = await fetch("https://www.google.com");
        console.log("Status:", response.status);
        console.log("Connection to google.com successful.");
    } catch (e: any) {
        console.error("Connection to google.com failed:", e.message);
    }

    try {
        console.log("\nTesting connection to Gemini API endpoint...");
        const response = await fetch("https://generativelanguage.googleapis.com");
        console.log("Status:", response.status);
        console.log("Connection to Gemini API successful.");
    } catch (e: any) {
        console.error("Connection to Gemini API failed:", e.message);
    }
}

testNetwork();
