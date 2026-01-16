const nodemailer = require('nodemailer');

// ============================================
// CONFIGURATION
// ============================================
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'surbhivasoya11@gmail.com',
    pass: 'hvey iiqt jqfz krxc', // Replace with your App Password
  },
};

// ============================================
// TEST 1: Verify Email Server Connection
// ============================================
async function testConnection() {
  const transporter = nodemailer.createTransport(EMAIL_CONFIG);

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('❌ FAILED: Cannot connect to email server:', error.message);
    return false;
  }
}

// ============================================
// TEST 2: Send Test Email
// ============================================
async function sendTestEmail(toEmail) {
  console.log('\n📧 TEST 2: Sending Test Email...\n');
  console.log(`   To: ${toEmail}`);

  const transporter = nodemailer.createTransport(EMAIL_CONFIG);

  const mailOptions = {
    from: '"AI Interview Test" <surbhivasoya11@gmail.com>',
    to: toEmail,
    subject: 'Test Email - AI Interview System',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #667eea;">🎉 Email System Test</h2>
        <p>If you're reading this, the email system is working correctly!</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> AI Interview System</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is a test email to verify email delivery.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ SUCCESS: Test email sent!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 CHECK YOUR INBOX:');
    console.log(`   1. Check inbox for: ${toEmail}`);
    console.log('   2. Check SPAM/JUNK folder if not in inbox');
    console.log('   3. Look for subject: "Test Email - AI Interview System"\n');
    return true;
  } catch (error) {
    console.error('❌ FAILED: Could not send test email');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);

    if (error.message.includes('535')) {
      console.error('\n🔧 SOLUTION: Invalid credentials');
      console.error(
        '   Generate new App Password at: https://myaccount.google.com/apppasswords\n'
      );
    } else if (error.message.includes('timeout')) {
      console.error('\n🔧 SOLUTION: Network timeout');
      console.error('   Check firewall settings for port 587/465\n');
    } else {
      console.error('\n🔧 SOLUTION: Check error details above\n');
    }
    return false;
  }
}

// ============================================
// TEST 3: Send Student Exam Email (Simulated)
// ============================================
async function sendStudentExamEmail() {
  console.log('\n📧 TEST 3: Sending Student Exam Email (Simulated)...\n');

  const transporter = nodemailer.createTransport(EMAIL_CONFIG);

  const studentEmail = 'sindhu@deepvox.ai'; // Use actual student email
  const studentName = 'Sindhu';
  const jobTitle = 'Software Engineer';
  const company = 'DeepVox';
  const examLink = 'https://aiinterview.deepvox.ai/?token=test123';

  const mailOptions = {
    from: '"AI Interview" <surbhivasoya11@gmail.com>',
    to: studentEmail,
    subject: `Interview Invitation - ${jobTitle} at ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Interview Invitation</h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Dear ${studentName},</p>
            
            <p style="font-size: 16px; color: #333;">
              You have been invited to participate in an interview for the position of <strong>${jobTitle}</strong> at <strong>${company}</strong>.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${examLink}" 
                 style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;">
                Start Interview
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              <strong>Link:</strong> ${examLink}
            </p>
            
            <p style="font-size: 16px; color: #333; margin-top: 25px;">
              Best regards,<br/>
              <strong>${company} HR Team</strong>
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ SUCCESS: Student exam email sent!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', studentEmail);
    console.log('\n📬 CHECK STUDENT INBOX:');
    console.log(`   Email: ${studentEmail}`);
    console.log(
      '   Subject: Interview Invitation - Software Engineer at DeepVox\n'
    );
    return true;
  } catch (error) {
    console.error('❌ FAILED: Could not send student email');
    console.error('   Error:', error.message);
    return false;
  }
}

// ============================================
// TEST 4: Check Gmail Settings
// ============================================
function checkGmailSettings() {
  console.log('\n📧 TEST 4: Gmail Settings Checklist...\n');

  console.log('✓ Required Gmail Settings:');
  console.log('  1. 2-Step Verification: ENABLED');
  console.log('     → https://myaccount.google.com/security');
  console.log('  2. App Password: GENERATED');
  console.log('     → https://myaccount.google.com/apppasswords');
  console.log('  3. Less Secure Apps: NOT NEEDED (use App Password)');
  console.log('  4. IMAP/POP: Enabled (usually default)\n');

  console.log('📋 Current Configuration:');
  console.log('  Email:', EMAIL_CONFIG.auth.user);
  console.log(
    '  Password Length:',
    EMAIL_CONFIG.auth.pass.length,
    'characters'
  );
  console.log(
    '  Expected Length: 16 characters (without spaces) or 19 (with spaces)\n'
  );

  if (EMAIL_CONFIG.auth.pass.length < 16) {
    console.log('⚠️  WARNING: Password seems too short!');
    console.log('   App Passwords are 16 characters long\n');
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  // Test 1: Connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ STOPPING: Fix connection issues first\n');
    return;
  }

  // Test 2: Simple test email (use your own email for testing)
  console.log('Enter recipient email for test (or press Enter to skip):');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('Test email address: ', async (email) => {
    if (email && email.includes('@')) {
      await sendTestEmail(email.trim());
    }

    // Test 3: Student exam email
    await sendStudentExamEmail();

    // Test 4: Settings check
    checkGmailSettings();

    readline.close();
  });
}

// ============================================
// MAIN EXECUTION
// ============================================
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConnection,
  sendTestEmail,
  sendStudentExamEmail,
  checkGmailSettings,
};
