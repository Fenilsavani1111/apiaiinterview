// apiaiinterview/server.js - COMPLETE WITH STUDENT ROUTES
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/db');

// ============================================
// REGISTER MODELS
// ============================================
// require('./models/User');
// require('./models/JobPost');
// require('./models/StudentsWithJobPost'); // ✅ Student model

// ============================================
// IMPORT ROUTES
// ============================================
const userRoutes = require('./routes/user');
const jobPostRoutes = require('./routes/jobPost');
const studentRoutes = require('./routes/student'); // ✅ Student routes

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// ============================================
// STATIC FILES
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ROUTES
// ============================================
app.use('/api', userRoutes);
app.use('/api/jobposts', jobPostRoutes);
app.use('/api', studentRoutes); // ✅ Student routes at /api/students

// ============================================
// DATABASE INIT + SERVER START
// ============================================
(async () => {
  try {
    // Safe sync - won't alter existing tables
    await sequelize.sync();
    console.log('✅ Database synced successfully');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📍 Student API: http://localhost:${PORT}/api/students`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
})();

module.exports = app;
