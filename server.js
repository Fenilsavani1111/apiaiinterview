// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const sequelize = require("./config/db");

// 🔥 IMPORTANT: Register models BEFORE sync
require("./models/User");
require("./models/JobPost"); // keep if exists

const userRoutes = require("./routes/user");
const jobPostRoutes = require("./routes/jobPost");

const app = express();

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// ---------- STATIC FILES ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- ROUTES ----------
app.use("/api", userRoutes);
app.use("/api/jobposts", jobPostRoutes);

// ---------- DB INIT + SERVER START ----------
(async () => {
  try {
    // ✅ SAFE SYNC (NO alter, NO force)
    await sequelize.sync();
    console.log("✅ Database synced successfully");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
})();
