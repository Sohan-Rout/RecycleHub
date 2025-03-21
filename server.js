require("dotenv").config(); // Load environment variables

const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Gemini API

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("uploads")); // Serve uploaded files

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "❌ MongoDB connection error:"));
db.once("open", () => console.log("✅ Connected to MongoDB"));

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,
});
const Product = mongoose.model("Product", productSchema);

// Multer setup for image storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Google Gemini API Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to clean the prediction text
function formatPrediction(prediction) {
  return prediction.replace(/\n/g, " ").replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

// Image upload and predict route
app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded!" });
  }
  const imagePath = path.join(__dirname, "uploads", req.file.filename);
  const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
    const cleanedPrediction = formatPrediction(rawPrediction);
    fs.unlink(imagePath, (err) => {
      if (err) console.error("⚠️ Failed to delete file:", err);
    });
    res.json({ message: "Here is the analysis Result!", filename: req.file.filename, cleanedPrediction });
  } catch (error) {
    console.error("❌ Prediction failed:", error);
    fs.unlink(imagePath, (err) => {
      if (err) console.error("⚠️ Failed to delete file after error:", err);
    });
    res.status(500).json({ error: "Prediction failed!" });
  }
});

// API for sellers to upload products
app.post("/api/add-product", upload.single("image"), async (req, res) => {
  if (!req.file || !req.body.name || !req.body.price) {
    return res.status(400).json({ error: "Missing product details!" });
  }
  try {
    const newProduct = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      image: req.file.filename,
    });
    await newProduct.save();
    res.json({ message: "Product added successfully!", product: newProduct });
  } catch (error) {
    console.error("❌ Failed to add product:", error);
    res.status(500).json({ error: "Failed to add product." });
  }
});

// API for users to fetch products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
