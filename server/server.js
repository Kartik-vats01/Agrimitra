require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const fieldsRoutes = require("./routes/fields");
const recommendRoutes = require("./routes/recommend");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "AgriMitra API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldsRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 AgriMitra server running on http://localhost:${PORT}`));
});
