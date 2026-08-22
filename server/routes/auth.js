const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const Field = require("../models/Field");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    village: user.village,
    district: user.district,
    state: user.state,
    soilType: user.soilType,
    soilPh: user.soilPh,
    irrigationType: user.irrigationType,
    totalFields: user.totalFields,
    totalLandAcres: user.totalLandAcres,
  };
}

/**
 * POST /api/auth/signup
 * Farmer ka total number of fields YAHIN fix hota hai (as requested).
 * Body: { name, email, phone, password, village, district, state,
 *          soilType, soilPh, irrigationType, totalFields, totalLandAcres }
 */
router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("totalFields").isInt({ min: 1 }).withMessage("Total number of fields must be at least 1"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const {
        name, email, phone, password,
        village, district, state,
        soilType, soilPh, irrigationType,
        totalFields, totalLandAcres,
      } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name, email, phone, password: hashedPassword,
        village, district, state,
        soilType, soilPh, irrigationType,
        totalFields,
        totalLandAcres: totalLandAcres || 0,
      });

      // Auto-create N placeholder field records based on totalFields,
      // splitting totalLandAcres evenly as a starting point.
      const fieldsCount = Number(totalFields);
      const perFieldAcres = totalLandAcres ? Number(totalLandAcres) / fieldsCount : 0;

      const fieldDocs = Array.from({ length: fieldsCount }, (_, i) => ({
        user: user._id,
        fieldName: `Field ${i + 1}`,
        landAreaAcres: Math.round(perFieldAcres * 100) / 100,
      }));
      await Field.insertMany(fieldDocs);

      const token = signToken(user._id);
      res.status(201).json({ token, user: publicUser(user) });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Something went wrong while creating your account." });
    }
  }
);

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(user._id);
      res.json({ token, user: publicUser(user) });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Something went wrong while logging in." });
    }
  }
);

module.exports = router;
