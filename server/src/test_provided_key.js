const apiKey = "AIzaSyCn5NAO9CgbT-GKiloIQ38BqtM4DBwNfi8";

async function test() {
    console.log("Testing gemini-1.5-flash with provided key...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = "Reply with 'SUCCESS 1.5 FLASH'";
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (res.ok) {
        console.log(data.candidates[0].content.parts[0].text);
    } else {
        console.error(JSON.stringify(data, null, 2));
    }
}
test();
