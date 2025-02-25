const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: String,
  barcode: String,
  material: String,
  recyclable: Boolean,
  alternative_disposal: String
});

module.exports = mongoose.model("Item", ItemSchema);