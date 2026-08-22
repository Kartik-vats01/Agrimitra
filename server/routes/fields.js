const express = require("express");
const requireAuth = require("../middleware/auth");
const Field = require("../models/Field");
const User = require("../models/User");

const router = express.Router();

// GET /api/fields  -> list logged-in farmer's fields
router.get("/", requireAuth, async (req, res) => {
  const fields = await Field.find({ user: req.userId }).sort({ fieldName: 1 });
  res.json({ fields });
});

// PUT /api/fields/:id -> update a single field's name/area
router.put("/:id", requireAuth, async (req, res) => {
  const { fieldName, landAreaAcres } = req.body;
  const field = await Field.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { ...(fieldName && { fieldName }), ...(landAreaAcres != null && { landAreaAcres }) },
    { new: true }
  );
  if (!field) return res.status(404).json({ message: "Field not found." });

  // Keep user's totalLandAcres in sync
  const allFields = await Field.find({ user: req.userId });
  const total = allFields.reduce((sum, f) => sum + (f.landAreaAcres || 0), 0);
  await User.findByIdAndUpdate(req.userId, { totalLandAcres: total });

  res.json({ field });
});

module.exports = router;
