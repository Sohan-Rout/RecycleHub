import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function classifyImage(imagePath) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Read image file and encode it in base64
        const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

        // Short and concise prompt
        const prompt = "Analyze this image and classify the type of waste material in a short and precise manner (e.g., 'Plastic', 'Organic', 'E-waste').";

        // Gemini API call
        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageData } }
        ]);

        const response = await result.response;
        const text = response.text();

        console.log("Short Classification:", text);
        return text;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

export default classifyImage;