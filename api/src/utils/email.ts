import { sendFeedbackEmail as sendFeedbackEmailUtil, sendThankYouEmail } from './nodemailer';

/**
 * Simple email utility for backward compatibility
 */
export const sendEmail = async (toEmail: string, subject: string, htmlContent: string): Promise<void> => {
  // For now, we'll use a simple approach - in the future this can be enhanced
  console.log('Email would be sent to:', toEmail);
  console.log('Subject:', subject);
  console.log('Content length:', htmlContent.length);
  
  // You can implement a generic email function here if needed
  // For now, we'll just log the email details
}; 