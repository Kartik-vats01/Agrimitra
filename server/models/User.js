const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true }, // bcrypt hashed

    // Profile info (matches dashboard "Farmer Profile" card)
    avatar: { type: String, default: "👨‍🌾" },
    village: { type: String, default: "" },
    district: { type: String, default: "" },
    state: { type: String, default: "" },
    soilType: { type: String, default: "Loam" },
    soilPh: { type: Number, default: 6.5 },
    irrigationType: { type: String, default: "Rainfed" },

    // Fixed at signup, as requested: total number of fields farmer owns
    totalFields: { type: Number, required: true, min: 1 },
    totalLandAcres: { type: Number, default: 0 }, // auto-computed from Field docs
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
