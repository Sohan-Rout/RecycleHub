require("dotenv").config(); // Load environment variables

const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Gemini API

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("uploads")); // Serve uploaded files

// Multer setup for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save files in 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storage });

// Google Gemini API Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to clean the prediction text
function formatPrediction(prediction) {
  // Remove unwanted characters like \n, *, and extra spaces
  let cleanedText = prediction
    .replace(/\n/g, " ") // Replace newlines with spaces
    .replace(/\*/g, "") // Remove asterisks
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim(); // Remove leading/trailing spaces

  return cleanedText;
}

// Image upload and predict route
app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded!" });
  }

  const imagePath = path.join(__dirname, "uploads", req.file.filename);
  const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

  try {
    // Call Gemini Vision API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use Gemini 1.5
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Classify this waste material and determine if it's recyclable." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
    });

    const rawPrediction = result.response.candidates[0]?.content?.parts[0]?.text || "No prediction available.";

    // Clean the prediction text
    const cleanedPrediction = formatPrediction(rawPrediction);

    // Delete the uploaded image after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error("⚠️ Failed to delete file:", err);
    });

    res.json({
      message: "Here is the analysis Result!",
      filename: req.file.filename,
      prediction: cleanedPrediction, // Send the cleaned prediction
    });
  } catch (error) {
    console.error("❌ Prediction failed:", error);

    fs.unlink(imagePath, (err) => {
      if (err) console.error("⚠️ Failed to delete file after error:", err);
    });

    res.status(500).json({ error: "Prediction failed!" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});