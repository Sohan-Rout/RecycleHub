const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const tf = require("@tensorflow/tfjs-node");
const fs = require("fs");

require("dotenv").config();

const router = express.Router();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// AI Model (Dummy for Now)
const classifyRecyclability = async (imagePath) => {
  // Future: Load a trained TensorFlow model and classify image
  // Placeholder Logic
  const randomResult = Math.random() > 0.5 ? "Recyclable" : "Not Recyclable";
  return randomResult;
};

// Upload Route
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    fs.unlinkSync(req.file.path); // Remove local file

    // Run AI Model (Placeholder Logic)
    const prediction = await classifyRecyclability(req.file.path);

    res.json({
      imageUrl: result.secure_url,
      recyclability: prediction,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;