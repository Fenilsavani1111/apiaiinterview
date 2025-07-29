// db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  }
);

sequelize
  .authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL database via Sequelize"))
  .catch((err) => console.error("❌ Sequelize connection error", err));

module.exports = sequelize;
