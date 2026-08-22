const express = require("express");
const requireAuth = require("../middleware/auth");
const User = require("../models/User");
const Field = require("../models/Field");
const Recommendation = require("../models/Recommendation");

const router = express.Router();

/**
 * GET /api/dashboard
 * Ek hi call mein: profile + fields + recent recommendations
 * (dashboard.html isi se saara data bharega)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const fields = await Field.find({ user: req.userId }).sort({ fieldName: 1 });
    const recommendations = await Recommendation.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ user, fields, recommendations });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Something went wrong while loading the dashboard." });
  }
});

/**
 * PUT /api/dashboard/profile -> edit profile (from the existing Edit modal)
 */
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const allowed = ["name", "phone", "avatar", "village", "district", "state", "soilType", "soilPh", "irrigationType"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    res.json({ user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Something went wrong while saving your profile." });
  }
});

module.exports = router;
