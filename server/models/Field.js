const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fieldName: { type: String, required: true, trim: true }, // e.g. "Field 1", "North Plot"
    landAreaAcres: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Field", FieldSchema);
