const mongoose = require("mongoose");

const CropSuggestionSchema = new mongoose.Schema(
  {
    name: String,
    suitabilityScore: Number,
    profitCategory: String,
    icon: String,
  },
  { _id: false }
);

const RecommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Inputs the farmer entered
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number,
    temperature: Number,
    humidity: Number,
    ph: Number,
    rainfall: Number,

    // Top-3 suggestions returned by the ML service
    suggestions: [CropSuggestionSchema],

    // What the farmer picked, after choosing from the 3 suggestions
    selectedCrop: { type: String, default: null },

    // How many of the farmer's fields this crop will be planted on
    fieldsUsedCount: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recommendation", RecommendationSchema);
