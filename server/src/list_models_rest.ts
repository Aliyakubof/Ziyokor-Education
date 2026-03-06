import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY || "";

async function listModels() {
    console.log('Fetching model list via REST...');
    if (!apiKey) {
        console.error('API Key is missing');
        return;
    }

    // Try both v1 and v1beta
    const versions = ['v1', 'v1beta'];

    for (const v of versions) {
        const url = `https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`;
        console.log(`\nTrying version: ${v}`);

        try {
            const response = await fetch(url);
            const data: any = await response.json();

            if (response.ok) {
                console.log(`[SUCCESS] Models for ${v}:`, (data.models || []).map((m: any) => m.name).join(', '));
            } else {
                console.log(`[ERROR] ${v}: ${response.status} ${response.statusText}`);
                console.log('Error info:', JSON.stringify(data, null, 2));
            }
        } catch (err: any) {
            console.error(`[FETCH FAIL] ${v}:`, err.message);
        }
    }
}

listModels();
