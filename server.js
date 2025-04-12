require("dotenv").config(); // Load environment variables

const axios = require("axios");
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

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
            {
              text: `Classify this waste material and determine if it's recyclable.
                     Return **only** JSON in the following format (no additional text):

                     {
                       "classification": "Type of Waste",
                       "waste_material": "Material Name",
                       "recyclable": "Yes/No",
                       "guidelines": "Short recycling instructions"
                     }`,
            },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
    });

    let rawPrediction = result.response.candidates[0]?.content?.parts[0]?.text || "{}";
    rawPrediction = rawPrediction.replace(/```json|```/g, "").trim();

    let parsedPrediction;
    try {
      parsedPrediction = JSON.parse(rawPrediction);
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      return res.status(500).json({ error: "Failed to parse AI response." });
    }

    fs.unlink(imagePath, (err) => {
      if (err) console.error("⚠️ Failed to delete file:", err);
    });

    res.json({
      message: "Here is the analysis Result!",
      filename: req.file.filename,
      classification: parsedPrediction.classification || "Unknown",
      waste_material: parsedPrediction.waste_material || "Unknown",
      recyclable: parsedPrediction.recyclable || "Unknown",
      guidelines: parsedPrediction.guidelines || "No guidelines available.",
    });
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

// API to fetch nearby recycle points
app.get("/api/recycle-points", async (req, res) => {
  const { lat, lng } = req.query; // Expect latitude and longitude from the client

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          location: `${lat},${lng}`,
          radius: 5000, // Search within 5km radius
          keyword: "recycling center", // Search for recycling centers
          key: process.env.GOOGLE_PLACES_API_KEY,
        },
      }
    );

    const recyclePoints = response.data.results.map((place, index) => ({
      id: place.place_id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    }));

    res.json(recyclePoints);
  } catch (error) {
    console.error("❌ Failed to fetch recycle points:", error);
    res.status(500).json({ error: "Failed to fetch recycle points." });
  }
});

// carbon api
app.post("/api/carbon", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.magicapi.dev/api/v1/carbonsutra/carbon/api/v1/vehicle_estimate_by_model",
      req.body, // whatever frontend sends will go to API
      {
        headers: {
          "x-magicapi-key": process.env.MAGIC_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Carbon API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Carbon data" });
  }
});

// eco-friendly news api
app.get("/api/eco-news", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.marketapi.com/api/v1/skycraft/world-news-api/search-news",
      {
        params: {
          text: "eco OR environment OR sustainable OR climate OR green",
          categories: "environment",
          language: "en",
        },
        headers: {
          "x-marketapi-key": process.env.MARKET_API_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Eco News API Error:", error?.response?.data || error.message);
    res.status(500).json({
      error: error?.response?.data || error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});