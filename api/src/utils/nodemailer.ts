import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();


/**
 * Sends a feedback request email to customers
 * @param toEmail - The customer's email address
 * @param customerName - The customer's name
 * @param ticketNumber - The service ticket number
 * @param feedbackUrl - The feedback form URL
 * @param ticketDetails - Additional ticket details
 */
export async function sendFeedbackEmail(
  toEmail: string, 
  customerName: string, 
  ticketNumber: string, 
  feedbackUrl: string, 
  ticketDetails: any
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: `Service Ticket #${ticketNumber} - Feedback Request`,
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Service Ticket Feedback Request</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 0;">
    <table width="100%" bgcolor="#f6f6f6" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <table style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 32px;" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Service Ticket Resolved</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Your service request has been completed successfully!</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Ticket Details</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                  <p><strong>Service Type:</strong> ${ticketDetails.serviceRequestType || 'N/A'}</p>
                  <p><strong>Description:</strong> ${ticketDetails.description}</p>
                  <p><strong>Completed Date:</strong> ${new Date(ticketDetails.completedDate || Date.now()).toLocaleDateString()}</p>
                  ${ticketDetails.product ? `<p><strong>Product:</strong> ${ticketDetails.product.name}</p>` : ''}
                  ${ticketDetails.assignedTo ? `<p><strong>Technician:</strong> ${ticketDetails.assignedTo.firstName} ${ticketDetails.assignedTo.lastName}</p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #666; margin-bottom: 20px;">We value your feedback! Please take a moment to rate our service.</p>
                  <a href="${feedbackUrl}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Provide Feedback
                  </a>
                </div>
                
                <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px;">
                  <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                    <strong>Note:</strong> This feedback link will expire in 7 days for security purposes.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                <p style="margin: 0;">Thank you for choosing our services!</p>
                <p style="margin: 5px 0 0 0;">If you have any questions, please contact our support team.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Feedback email sent successfully:', result);
  } catch (error) {
    console.error('Error sending feedback email:', error);
    throw error;
  }
}

/**
 * Sends a thank you email after feedback submission
 * @param toEmail - The customer's email address
 */
export async function sendThankYouEmail(toEmail: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Thank You for Your Feedback',
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Thank You for Your Feedback</title>
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 0;">
    <table width="100%" bgcolor="#f6f6f6" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <table style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 32px;" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">Thank You!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Your feedback has been received</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Feedback Submitted Successfully</h2>
                <div style="background: white; padding: 20px; border-radius: 8px;">
                  <p>Thank you for taking the time to provide your feedback. Your input helps us improve our services and provide better customer experiences.</p>
                  <p>We appreciate your business and look forward to serving you again!</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                <p style="margin: 0;">Thank you for choosing our services!</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };

  const result = await transporter.sendMail(mailOptions);
  console.log('Thank you email sent:', result);
}

/**
 * Sends a quotation email to customers
 * @param toEmail - The customer's email address
 * @param subject - The email subject
 * @param htmlContent - The HTML email content
 */
export async function sendQuotationEmail(
  toEmail: string, 
  subject: string, 
  htmlContent: string
): Promise<void> {
  // Check if we're in development mode and SMTP is not configured
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasSMTPConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM_NAME && process.env.EMAIL_FROM_ADDRESS;
  
  console.log('=== EMAIL CONFIGURATION DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'SET' : 'NOT SET');
  console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
  console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME ? 'SET' : 'NOT SET');
  console.log('EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS ? 'SET' : 'NOT SET');
  console.log('isDevelopment:', isDevelopment);
  console.log('hasSMTPConfig:', hasSMTPConfig);
  console.log('=== END DEBUG ===');
  
  // In development, if SMTP is not configured, log the email instead of sending
  if (isDevelopment && !hasSMTPConfig) {
    console.log('=== DEVELOPMENT MODE: EMAIL LOGGING ===');
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log('Content Length:', htmlContent.length);
    console.log('HTML Content Preview:', htmlContent.substring(0, 500) + '...');
    console.log('=== END EMAIL LOG ===');
    return; // Exit early, don't try to send via SMTP
  }

  // Validate required environment variables for production
  if (!hasSMTPConfig) {
    throw new Error(`Missing required SMTP environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM_NAME, EMAIL_FROM_ADDRESS`);
  }

  // Validate email parameters
  if (!toEmail || !subject || !htmlContent) {
    throw new Error('Missing required email parameters: toEmail, subject, or htmlContent');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Add additional options for Gmail
    tls: {
      rejectUnauthorized: false
    },
    // Gmail-specific settings
    service: process.env.SMTP_HOST === 'smtp.gmail.com' ? 'gmail' : undefined,
    debug: true, // Enable debug output
    logger: true // Log to console
  });

  // Verify SMTP connection
  try {
    console.log('Attempting to verify SMTP connection...');
    console.log('SMTP Configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? '***SET***' : 'NOT SET'
    });
    
    await transporter.verify();
    console.log('SMTP connection verified successfully');
  } catch (verifyError) {
    console.error('SMTP connection verification failed:', verifyError);
    console.error('Full error details:', JSON.stringify(verifyError, null, 2));
    throw new Error(`SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
  }

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    console.log('Attempting to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length
    });
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Quotation email sent successfully:', result);
  } catch (error) {
    console.error('Error sending quotation email:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    
    // Handle common Gmail SMTP errors
    if (error instanceof Error) {
      let errorMessage = error.message;
      
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Gmail authentication failed. Please check your email and App Password.';
      } else if (error.message.includes('Username and Password not accepted')) {
        errorMessage = 'Gmail credentials rejected. Please verify your App Password is correct.';
      } else if (error.message.includes('Connection timeout')) {
        errorMessage = 'Gmail connection timeout. Please check your internet connection and try again.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Gmail SMTP server not found. Please check your SMTP configuration.';
      }
      
      throw new Error(`Email sending failed: ${errorMessage}`);
    } else {
      throw new Error('Email sending failed with unknown error');
    }
  }
}
