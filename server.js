require("dotenv").config(); // Load environment variables

const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");

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

// Hugging Face API Configuration
const HF_API_URL = process.env.HF_API_URL;
const HF_API_KEY = process.env.HF_API_KEY;

// Image upload and predict route
app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded!" });
  }

  try {
    // Read the image file
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);

    // Send image to Hugging Face API
    const response = await axios.post(
      HF_API_URL,
      imageData,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
      }
    );

    // Return prediction result
    res.json({
      message: "Image uploaded and processed!",
      filename: req.file.filename,
      prediction: response.data, // Prediction result
    });
  } catch (error) {
    console.error("❌ Prediction failed:", error);
    res.status(500).json({ error: "Prediction failed!" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});