import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generic email sending function using nodemailer
 */
export const sendEmail = async (toEmail: string, subject: string, htmlContent: string): Promise<void> => {
  // Check if we're in development mode and email is not configured
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Support both SMTP_* and EMAIL_* environment variables
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'; // Default to Gmail
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const fromName = process.env.FROM_NAME || 'Sun Power Services';
  const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_USER;
  
  const hasEmailConfig = smtpUser && smtpPass;
  
  console.log('=== EMAIL CONFIGURATION DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('SMTP_HOST:', smtpHost);
  console.log('SMTP_USER/EMAIL_USER:', smtpUser ? 'SET' : 'NOT SET');
  console.log('SMTP_PASS/EMAIL_PASS:', smtpPass ? 'SET' : 'NOT SET');
  console.log('FROM_NAME:', fromName);
  console.log('FROM_EMAIL:', fromEmail);
  console.log('isDevelopment:', isDevelopment);
  console.log('hasEmailConfig:', hasEmailConfig);
  console.log('=== END DEBUG ===');
  
  // In development, if email is not configured, log the email instead of sending
  if (isDevelopment && !hasEmailConfig) {
    console.log('=== DEVELOPMENT MODE: EMAIL LOGGING ===');
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log('Content Length:', htmlContent.length);
    console.log('HTML Content Preview:', htmlContent.substring(0, 500) + '...');
    console.log('=== END EMAIL LOG ===');
    return; // Exit early, don't try to send via SMTP
  }

  // Validate required environment variables
  if (!hasEmailConfig) {
    throw new Error(`Missing required email environment variables: EMAIL_USER and EMAIL_PASS (or SMTP_USER and SMTP_PASS)`);
  }

  // Validate email parameters
  if (!toEmail || !subject || !htmlContent) {
    throw new Error('Missing required email parameters: toEmail, subject, or htmlContent');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
  });

  console.log("Transporter created with host:", smtpHost);
  console.log("Using email user:", smtpUser);

  // Verify SMTP connection
  try {
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
  } catch (verifyError) {
    console.error('❌ SMTP connection verification failed:', verifyError);
    throw new Error(`SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
  }

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    console.log('📧 Sending email...');
    console.log('From:', `${fromName} <${fromEmail}>`);
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    console.log('Response:', result.response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    if (error instanceof Error) {
      throw new Error(`Email sending failed: ${error.message}`);
    } else {
      throw new Error('Email sending failed with unknown error');
    }
  }
}; 