/**
 * Email Service
 * Handles sending emails for various system notifications
 * Uses Nodemailer with SMTP configuration
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter (configure based on environment)
const createTransporter = () => {
    // Check for missing credentials
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_USER.includes('your_email')) {
        logger.warn('[EmailService] SMTP credentials are not configured in .env file. Email sending will fail.');
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// Hospital details from environment
const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'City Hospital';
const HOSPITAL_EMAIL = process.env.HOSPITAL_EMAIL || 'noreply@hospital.com';
const HOSPITAL_PHONE = process.env.HOSPITAL_PHONE || '+91 1234567890';
const HOSPITAL_ADDRESS = process.env.HOSPITAL_ADDRESS || 'Healthcare Avenue, Medical District';

/**
 * Send referral notification email to the referring doctor
 * @param {Object} params - Email parameters
 * @param {string} params.doctorEmail - Referring doctor's email
 * @param {string} params.doctorName - Referring doctor's name
 * @param {string} params.patientName - Patient's full name
 * @param {string} params.patientAge - Patient's age
 * @param {string} params.patientGender - Patient's gender
 * @param {string} params.patientId - OPD/Patient reference number
 * @param {Date} params.registrationTime - Registration timestamp
 * @param {string} params.referralType - INTERNAL or EXTERNAL
 */
exports.sendReferralNotification = async (params) => {
    const {
        doctorEmail,
        doctorName,
        patientName,
        patientAge,
        patientGender,
        patientId,
        registrationTime,
        referralType,
    } = params;

    if (!doctorEmail) {
        logger.warn('[EmailService] No email provided for referral notification');
        return { success: false, error: 'No email provided' };
    }

    try {
        const transporter = createTransporter();

        // Format registration time
        const formattedDate = new Date(registrationTime).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const formattedTime = new Date(registrationTime).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });

        // Email subject
        const subject = `Patient Referred by You Has Registered – ${HOSPITAL_NAME}`;

        // Professional HTML email template
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Patient Registration Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                    ${HOSPITAL_NAME}
                </h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">
                    Patient Referral Notification
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear <strong>Dr. ${doctorName || 'Doctor'}</strong>,
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    We are pleased to inform you that a patient referred by you has successfully registered at our hospital.
                </p>
                
                <!-- Patient Details Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <tr>
                        <td>
                            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                                Patient Details
                            </h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                                <tr>
                                    <td style="color: #64748b; font-size: 14px; width: 140px;">Patient Name</td>
                                    <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${patientName}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748b; font-size: 14px;">Age / Gender</td>
                                    <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${patientAge} years / ${patientGender}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748b; font-size: 14px;">Registration ID</td>
                                    <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${patientId}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748b; font-size: 14px;">Date & Time</td>
                                    <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${formattedDate} at ${formattedTime}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for your continued trust and referral. We are committed to providing the best possible care for your patient.
                </p>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Warm regards,<br>
                    <strong style="color: #374151;">${HOSPITAL_NAME}</strong><br>
                    ${HOSPITAL_PHONE}<br>
                    ${HOSPITAL_ADDRESS}
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    This is an automated notification. Please do not reply to this email.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                    © ${new Date().getFullYear()} ${HOSPITAL_NAME}. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        // Plain text fallback
        const textContent = `
Dear Dr. ${doctorName || 'Doctor'},

We are pleased to inform you that a patient referred by you has successfully registered at ${HOSPITAL_NAME}.

PATIENT DETAILS:
- Patient Name: ${patientName}
- Age / Gender: ${patientAge} years / ${patientGender}
- Registration ID: ${patientId}
- Date & Time: ${formattedDate} at ${formattedTime}

Thank you for your continued trust and referral. We are committed to providing the best possible care for your patient.

Warm regards,
${HOSPITAL_NAME}
${HOSPITAL_PHONE}
${HOSPITAL_ADDRESS}

---
This is an automated notification. Please do not reply to this email.
        `;

        // Send email
        const info = await transporter.sendMail({
            from: `"${HOSPITAL_NAME}" <${HOSPITAL_EMAIL}>`,
            to: doctorEmail,
            subject: subject,
            text: textContent,
            html: htmlContent,
        });

        logger.info(`[EmailService] Referral notification sent to ${doctorEmail} - MessageId: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            sentAt: new Date(),
        };
    } catch (error) {
        logger.error(`[EmailService] Failed to send referral notification to ${doctorEmail}: ${error.message}`);

        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Test email configuration
 * @returns {Promise<Object>} Test result
 */
exports.testEmailConfiguration = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        logger.info('[EmailService] Email configuration verified successfully');
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        logger.error(`[EmailService] Email configuration test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
};

module.exports = exports;
