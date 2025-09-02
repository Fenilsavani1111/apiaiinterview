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
      max: 20, // limit per app instance
      min: 0,
      acquire: 60000, // wait 60s before timeout
      idle: 10000, // release idle conn after 10s
    },
    dialectOptions: {
      connectTimeout: 60000, // optional for MySQL
    },
  }
);

sequelize
  .authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL database via Sequelize"))
  .catch((err) => console.error("❌ Sequelize connection error", err));

module.exports = sequelize;
