const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// Get item by barcode
router.get("/recycle/:barcode", async (req, res) => {
  try {
    const item = await Item.findOne({ barcode: req.params.barcode });
    if (!item) return res.status(404).json({ message: "Item not found" });

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add a new recyclable item
router.post("/add", async (req, res) => {
  try {
    const { name, barcode, material, recyclable, alternative_disposal } = req.body;
    const newItem = new Item({ name, barcode, material, recyclable, alternative_disposal });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

module.exports = router;