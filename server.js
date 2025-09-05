// server.js
const express = require("express");
const userRoutes = require("./routes/user");
const sequelize = require("./config/db");
require("./models/User");
const jobPostRoutes = require("./routes/jobPost");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.json({ limit: "200mb" })); // Adjust based on expected size
app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", userRoutes);
app.use("/api/jobposts", jobPostRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log("✅ Database synced");
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});
