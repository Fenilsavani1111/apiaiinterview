const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/db');
const axios = require('axios');

// IMPORT ROUTES
const userRoutes = require('./routes/user');
const jobPostRoutes = require('./routes/jobPost');
const studentRoutes = require('./routes/student');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// STATIC FILES
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get image base64
app.get('/api/image-base64', async (req, res) => {
  const imageUrl = req.query.url;
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data).toString('base64');
    return res.status(200).json({ success: true, base64: base64 });
  } catch (error) {
    console.error('Error getting image base64:', error);
    return res.status(500).json({ success: false, error: 'Error getting image base64' });
  }
});

// ROUTES
app.use('/api', userRoutes);
app.use('/api/jobposts', jobPostRoutes);
app.use('/api', studentRoutes);

// DATABASE INIT + SERVER START
(async () => {
  try {
    // Safe sync - won't alter existing tables
    await sequelize.sync({ alter: true });
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
