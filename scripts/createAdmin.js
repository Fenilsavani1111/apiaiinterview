require('dotenv').config();
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/User');
const sequelize = require('../config/db');

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to database...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    console.log('✅ Using existing database schema\n');

    // Admin credentials
    const adminData = {
      username: 'admin',
      email: 'admin@gmail.com',
      password: 'Admin123!',
      name: 'System Administrator',
      phoneNumber: '9999999999',
    };

    console.log(`🔄 Checking for admin user: ${adminData.username}`);

    // Check if admin already exists (by username OR email)
    const existingAdmin = await User.findOne({
      where: {
        [Op.or]: [{ username: adminData.username }, { email: adminData.email }],
      },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists - Updating...\n');

      // Update existing user using Sequelize update method
      await User.update(
        {
          password: hashedPassword,
          isAdmin: true,
          email: adminData.email,
          name: adminData.name,
          phoneNumber: adminData.phoneNumber,
        },
        {
          where: { id: existingAdmin.id },
        }
      );

      // Fetch updated user
      const updatedAdmin = await User.findByPk(existingAdmin.id, {
        attributes: ['id', 'username', 'email', 'name', 'isAdmin'],
      });

      console.log('✅ Admin user updated successfully!');
      console.log('\n📋 Admin Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   User ID:  ${updatedAdmin.id}`);
      console.log(`   Username: ${adminData.username}`);
      console.log(`   Email:    ${adminData.email}`);
      console.log(`   Password: ${adminData.password}`);
      console.log(`   Is Admin: ${updatedAdmin.isAdmin}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      process.exit(0);
    }

    // Create new admin user
    console.log('🔄 Creating new admin user...\n');

    const adminUser = await User.create({
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      name: adminData.name,
      phoneNumber: adminData.phoneNumber,
      isAdmin: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User ID:  ${adminUser.id}`);
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email:    ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(`   Is Admin: ${adminUser.isAdmin}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    console.log('🔐 Login Options:');
    console.log(`   Option 1: Username = "${adminData.username}"`);
    console.log(`   Option 2: Email    = "${adminData.email}"`);
    console.log(`   Password = "${adminData.password}"\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    console.error('\nError Details:', error.message);

    if (error.name === 'SequelizeConnectionError') {
      console.error('\n💡 Database connection failed. Please check:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. Database credentials in .env are correct');
      console.error('   3. Database "aiinterview" exists');
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('\n💡 Username or email already exists in database');
      console.error('   Try using a different username or email');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('\n💡 Database error - column might not exist or mismatch');
      console.error('   Error:', error.parent?.message || error.message);
      console.error('\n   Check that all columns exist in your database table');
      console.error('   Run this SQL to verify:');
      console.error(
        "   SELECT column_name FROM information_schema.columns WHERE table_name = 'users';"
      );
    }

    console.error('\nFull Error Stack:');
    console.error(error.stack);

    process.exit(1);
  }
}

// Run the function
createAdminUser();
