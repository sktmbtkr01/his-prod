require('dotenv').config({ path: '.env' });
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('Testing Email Configuration...');
    console.log('--------------------------------');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP Secure:', process.env.SMTP_SECURE);
    console.log('SMTP User:', process.env.SMTP_USER ? '****' + process.env.SMTP_USER.slice(-4) : 'NOT SET');
    console.log('SMTP Pass:', process.env.SMTP_PASS ? '********' : 'NOT SET');
    console.log('--------------------------------');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection verified successfully!');

        // Optional: Send a test email
        if (process.env.TEST_EMAIL_RECIPIENT) {
            console.log(`Sending test email to ${process.env.TEST_EMAIL_RECIPIENT}...`);
            const info = await transporter.sendMail({
                from: `"${process.env.HOSPITAL_NAME || 'Hospital'}" <${process.env.HOSPITAL_EMAIL || process.env.SMTP_USER}>`,
                to: process.env.TEST_EMAIL_RECIPIENT,
                subject: "Test Email from HIS System",
                text: "This is a test email to verify SMTP configuration.",
            });
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', info.messageId);
        } else {
            console.log('ℹ️ TEST_EMAIL_RECIPIENT not set. Skipping send test.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'EAUTH') {
            console.error('   -> Authentication failed. Check your username and password.');
        } else if (error.code === 'ESOCKET') {
            console.error('   -> Connection failed. Check host and port.');
        }
    }
};

testEmail();
