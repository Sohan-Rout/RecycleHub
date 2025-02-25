require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function classifyImage(imagePath) {
    try {
        // Read image and prepare FormData
        const form = new FormData();
        form.append("image", fs.createReadStream(imagePath));

        // Send image to Hugging Face API
        const response = await axios.post(
            process.env.HF_API_URL, // Use full URL from .env
            form,
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_KEY}`, // Fix API key name
                    ...form.getHeaders(),
                },
            }
        );

        console.log("✅ Classification Result:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
        return null;
    }
}

module.exports = classifyImage;