// apiaiinterview/utils/mailService.js - WITH DETAILED DEBUGGING
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

// ============================================
// TRANSPORTER CONFIGURATION
// ============================================

console.log('🔧 Initializing Email Service...');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'surbhivasoya11@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'hvey iiqt jqfz krxc',
  },
  debug: true, // Enable debug output
  logger: true // Log information to console
});

// Set handlebars options
const handlebarOptions = {
  viewEngine: {
    extname: '.handlebars',
    partialsDir: path.resolve(__dirname, '../templates'),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, '../templates'),
  extName: '.handlebars',
};

transporter.use('compile', hbs(handlebarOptions));

// Test email connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ EMAIL CONFIGURATION ERROR:', error.message);
    console.error('   Error Code:', error.code);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Check Gmail App Password at: https://myaccount.google.com/apppasswords');
    console.log('   2. Make sure 2-Step Verification is enabled');
    console.log('   3. Generate NEW App Password');
    console.log('   4. Update mailService.js line 14');
    console.log('   5. RESTART the server\n');
  } else {
    console.log('✅ Email server is ready to send messages');
    console.log('   Service: Gmail');
    console.log('   User:', process.env.EMAIL_USER || 'surbhivasoya11@gmail.com');
  }
});

// ============================================
// EXISTING FUNCTIONS
// ============================================

exports.sendJobLinkEmail = async (to, token) => {
  try {
    console.log('📧 Sending job link email to:', to);
    const link = `https://aiinterview.deepvox.ai/?token=${token}`;
    
    await transporter.sendMail({
      from: '"AI Interview" <surbhivasoya11@gmail.com>',
      to,
      subject: 'Your AI Interview Link',
      template: 'jobLink',
      context: { link },
    });
    
    console.log('✅ Job link email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('❌ Error sending job link email to:', to);
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    throw error;
  }
};

// ============================================
// STUDENT EXAM EMAIL WITH DETAILED LOGGING
// ============================================

exports.sendStudentExamEmail = async (emailData) => {
  try {
    const { jobTitle, company, location, examLink, messageTemplate, students } = emailData;

    console.log('\n📧 ================================================');
    console.log('   SENDING STUDENT EXAM EMAILS');
    console.log('   ================================================');
    console.log('   Job:', jobTitle, 'at', company);
    console.log('   Total Students:', students.length);
    console.log('   Exam Link:', examLink);
    console.log('   ================================================\n');

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Send emails one by one with detailed logging
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      console.log(`\n[${i + 1}/${students.length}] Processing: ${student.name} (${student.email})`);
      
      try {
        // Replace {studentName} placeholder
        let personalizedMessage = messageTemplate;
        if (messageTemplate) {
          personalizedMessage = messageTemplate.replace(/{studentName}/g, student.name);
          console.log('   ✓ Message personalized');
        } else {
          personalizedMessage = `Dear ${student.name},

You have been invited to participate in an interview for the position of ${jobTitle} at ${company}.

Please use the examination link provided to access the interview. This link is unique to you and should not be shared with others.

Interview Link: ${examLink}

Please complete the interview at your earliest convenience. If you have any questions, please contact the HR department.

Best regards,
HR Team`;
          console.log('   ✓ Using default message template');
        }

        // Create email
        const mailOptions = {
          from: '"AI Interview" <surbhivasoya11@gmail.com>',
          to: student.email,
          subject: `Interview Invitation - ${jobTitle} at ${company}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Interview Invitation</h1>
                </div>
                
                <div style="padding: 30px;">
                  <div style="white-space: pre-wrap; font-size: 16px; color: #333; line-height: 1.6;">
${personalizedMessage}
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${examLink}" 
                       style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      Start Interview
                    </a>
                  </div>
                  
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                      <strong>Alternatively, copy and paste this link:</strong>
                    </p>
                    <code style="display: block; background: white; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; color: #495057; font-size: 12px; word-break: break-all; font-family: 'Courier New', monospace;">
                      ${examLink}
                    </code>
                  </div>
                  
                  <div style="margin: 25px 0;">
                    <h3 style="color: #333; font-size: 18px; margin-bottom: 15px; font-weight: bold;">Instructions:</h3>
                    <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">Please complete the interview at your earliest convenience</li>
                      <li style="margin-bottom: 8px;">Ensure you have a stable internet connection</li>
                      <li style="margin-bottom: 8px;">Use a computer or laptop with a working camera and microphone</li>
                      <li style="margin-bottom: 8px;">Find a quiet place with good lighting</li>
                      <li style="margin-bottom: 8px;">The interview will take approximately 30-45 minutes</li>
                      <li style="margin-bottom: 8px;">Make sure to use your registered email address to join</li>
                    </ul>
                  </div>
                  
                  <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #0d47a1; font-size: 14px; line-height: 1.6;">
                      <strong>Need Help?</strong><br/>
                      If you have any questions or technical difficulties, please contact our HR department.
                    </p>
                  </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.6;">
                    This is an automated message. Please do not reply to this email.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                    © ${new Date().getFullYear()} ${company}. All rights reserved.
                  </p>
                </div>
                
              </div>
            </body>
            </html>
          `
        };

        console.log('   ✓ Email template created');
        console.log('   → Sending email...');

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('   ✅ SUCCESS!');
        console.log('   → Message ID:', info.messageId);
        console.log('   → Response:', info.response);
        
        successCount++;
        results.push({
          success: true,
          email: student.email,
          name: student.name,
          messageId: info.messageId
        });

      } catch (error) {
        console.error('   ❌ FAILED!');
        console.error('   → Error:', error.message);
        console.error('   → Code:', error.code);
        
        if (error.message.includes('535')) {
          console.error('   → REASON: Invalid Gmail credentials');
          console.error('   → FIX: Generate new App Password');
        } else if (error.message.includes('timeout')) {
          console.error('   → REASON: Network timeout');
          console.error('   → FIX: Check firewall/network settings');
        }
        
        failCount++;
        results.push({
          success: false,
          email: student.email,
          name: student.name,
          error: error.message,
          code: error.code
        });
      }

      // Small delay between emails to avoid rate limiting
      if (i < students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n📊 ================================================');
    console.log('   EMAIL SENDING SUMMARY');
    console.log('   ================================================');
    console.log('   Total:', students.length);
    console.log('   ✅ Successful:', successCount);
    console.log('   ❌ Failed:', failCount);
    console.log('   ================================================\n');

    if (failCount > 0) {
      console.log('⚠️  FAILED EMAILS:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.name} (${r.email}): ${r.error}`);
      });
      console.log('\n🔧 TROUBLESHOOTING:');
      console.log('   1. Check Gmail App Password');
      console.log('   2. Verify email addresses are correct');
      console.log('   3. Check SPAM folders for recipients');
      console.log('   4. Look for Gmail security alerts\n');
    }

    if (successCount > 0) {
      console.log('📬 CHECK INBOXES:');
      results.filter(r => r.success).forEach(r => {
        console.log(`   ✓ ${r.name}: ${r.email}`);
      });
      console.log('\n💡 TIP: Emails may take 1-2 minutes to arrive');
      console.log('💡 TIP: Check SPAM/Junk folders if not in inbox\n');
    }

    return {
      success: true,
      sent: successCount,
      failed: failCount,
      total: students.length,
      details: results
    };

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR in sendStudentExamEmail:');
    console.error('   ', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

exports.sendIndividualStudentExamEmail = async (studentData) => {
  try {
    const { studentName, studentEmail, jobTitle, company, location, examLink } = studentData;

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
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Interview Invitation</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; line-height: 1.6;">Dear ${studentName},</p>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                You have been invited to participate in an interview for <strong>${jobTitle}</strong> at <strong>${company}</strong>.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${examLink}" 
                   style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;">
                  Start Interview
                </a>
              </div>
              <p style="font-size: 14px; color: #666; line-height: 1.6;">
                Interview Link: <br/>
                <code style="background: #f4f4f4; padding: 8px; display: inline-block; margin-top: 5px; border-radius: 4px; word-break: break-all;">${examLink}</code>
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
                Best regards,<br/>
                <strong>${company} HR Team</strong>
              </p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} ${company}. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Individual exam email sent to: ${studentName} (${studentEmail})`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error sending individual exam email to ${studentEmail}:`, error);
    throw error;
  }
};

exports.testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    throw error;
  }
};

module.exports.transporter = transporter;