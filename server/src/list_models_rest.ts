
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const key = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(key);

async function listAllModels() {
    console.log("Listing models for key:", key.substring(0, 10) + "...");
    try {
        // The listModels call is part of the genAI client
        // Note: listModels returns an async iterator or array depending on version
        // In @google/generative-ai, it's models.listModels()
        const result = await genAI.getGenerativeModel({ model: "gemini-pro" }); // placeholder
        // Actually, the SDK has a separate way to list models, or we can use the REST API
        // since the SDK might hide details.

        console.log("Fetching model list via REST for transparency...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data: any = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(", ")})`);
            });
        } else {
            console.log("No models found in response:", JSON.stringify(data, null, 2));
        }
    } catch (err: any) {
        console.error("Error listing models:", err.message);
    }
}

listAllModels();
