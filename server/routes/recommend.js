const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth");
const Recommendation = require("../models/Recommendation");
const User = require("../models/User");

const router = express.Router();

/**
 * POST /api/recommend
 * Step 1: farmer submits soil/climate values -> we call the Python ML
 * microservice -> get top-3 crops -> save as a pending Recommendation
 * (no crop selected yet) -> return it to the frontend.
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall } = req.body;

    const required = { nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall };
    for (const [key, val] of Object.entries(required)) {
      if (val === undefined || val === null || val === "") {
        return res.status(400).json({ message: `Please fill in "${key}" before requesting a recommendation.` });
      }
    }

    const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      temperature: Number(temperature),
      humidity: Number(humidity),
      ph: Number(ph),
      rainfall: Number(rainfall),
    });

    const suggestions = mlResponse.data; // top-3 crops from FastAPI

    const recommendation = await Recommendation.create({
      user: req.userId,
      nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall,
      suggestions,
    });

    res.status(201).json({ recommendation });
  } catch (err) {
    console.error("Recommend error:", err.message);
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "ML service is not running. Please start the FastAPI service (ml-service)." });
    }
    res.status(500).json({ message: "Something went wrong while generating the recommendation." });
  }
});

/**
 * POST /api/recommend/:id/select
 * Step 2: farmer picks ONE of the 3 suggested crops and says how many
 * of their fields it will go on. We validate that count against the
 * farmer's total registered fields (set at signup).
 * Body: { selectedCrop, fieldsUsedCount }
 */
router.post("/:id/select", requireAuth, async (req, res) => {
  try {
    const { selectedCrop, fieldsUsedCount } = req.body;

    if (!selectedCrop) {
      return res.status(400).json({ message: "Please select one of the 3 recommended crops." });
    }
    const count = Number(fieldsUsedCount);
    if (!count || count < 1) {
      return res.status(400).json({ message: "Please enter how many fields this crop will be planted on." });
    }

    const user = await User.findById(req.userId);
    if (count > user.totalFields) {
      // ⭐ The exact validation requested: agar entered fields > farmer ke total fields
      return res.status(400).json({
        message: `You only have ${user.totalFields} registered field(s). Please recheck the number and try again.`,
      });
    }

    const recommendation = await Recommendation.findOne({ _id: req.params.id, user: req.userId });
    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found." });
    }

    const validCrop = recommendation.suggestions.some((s) => s.name === selectedCrop);
    if (!validCrop) {
      return res.status(400).json({ message: "Selected crop must be one of the 3 suggested crops." });
    }

    recommendation.selectedCrop = selectedCrop;
    recommendation.fieldsUsedCount = count;
    await recommendation.save();

    res.json({ recommendation });
  } catch (err) {
    console.error("Select crop error:", err);
    res.status(500).json({ message: "Something went wrong while saving your selection." });
  }
});

/**
 * GET /api/recommend/history -> for dashboard "Recommendation History"
 */
router.get("/history", requireAuth, async (req, res) => {
  const history = await Recommendation.find({ user: req.userId }).sort({ createdAt: -1 }).limit(20);
  res.json({ history });
});

module.exports = router;
