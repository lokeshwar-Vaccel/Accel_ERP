import { sendEmail } from '../utils/email';
import { PaymentToken } from '../models/PaymentToken';
import { Invoice, IInvoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
}

// Generate invoice email template
const generateInvoiceEmailTemplate = (
  invoice: IInvoice,
  customer: any,
  paymentLink: string,
  companyName: string = 'Sun Power Services'
): EmailTemplate => {
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('en-IN');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
  const totalAmount = invoice.totalAmount.toLocaleString('en-IN');
  const remainingAmount = invoice.remainingAmount.toLocaleString('en-IN');

  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.unitPrice.toLocaleString('en-IN')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.totalPrice.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const subject = `Invoice ${invoice.invoiceNumber} - Payment Request - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice Payment Request</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .payment-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .payment-button:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #e5e7eb; }
        .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .total-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Invoice Payment Request</p>
        </div>
        
        <div class="content">
          <p>Dear ${customer?.name || 'Valued Customer'},</p>
          
          <p>Thank you for your business. Please find below the details of your invoice and a secure payment link to complete your payment.</p>
          
          <div class="invoice-details">
            <h2 style="margin: 0 0 15px; color: #1f2937;">Invoice #${invoice.invoiceNumber}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div>
                <strong>Issue Date:</strong> ${issueDate}<br>
                <strong>Due Date:</strong> ${dueDate}<br>
              </div>
              <div>
                <strong>Total Amount:</strong> ₹${totalAmount}<br>
                <strong>Remaining Amount:</strong> ₹${remainingAmount}<br>
                <strong>Payment Status:</strong> <span style="color: #dc2626; font-weight: bold;">${invoice.paymentStatus.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" class="payment-button" style="color:rgb(255, 255, 255);">
              💳 Pay Now - ₹${remainingAmount}
            </a>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> This payment link will expire in 7 days for security reasons. 
            Please complete your payment before the due date to avoid any late fees.
          </div>

          <h3 style="color: #1f2937; margin: 30px 0 15px;">Invoice Items</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Subtotal:</strong></span>
              <span>₹${invoice.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Tax Amount:</strong></span>
              <span>₹${invoice.taxAmount.toLocaleString('en-IN')}</span>
            </div>
            ${invoice.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #059669;">
              <span><strong>Discount:</strong></span>
              <span>-₹${invoice.discountAmount.toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 2px solid #e5e7eb; padding-top: 10px;">
              <span>Total Amount:</span>
              <span>₹${totalAmount}</span>
            </div>
          </div>

          ${invoice.notes ? `
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Notes:</strong> ${invoice.notes}
          </div>
          ` : ''}

          <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #166534;">Payment Options</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Credit/Debit Cards</li>
              <li>UPI Payments</li>
              <li>Net Banking</li>
              <li>Digital Wallets</li>
            </ul>
          </div>

          <p>If you have any questions about this invoice or need assistance with payment, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>${companyName} Team</strong></p>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

// Generate payment reminder email template
const generatePaymentReminderTemplate = (
  invoice: IInvoice,
  customer: any,
  paymentLink: string,
  daysOverdue: number,
  companyName: string = 'Sun Power Services'
): EmailTemplate => {
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
  const remainingAmount = invoice.remainingAmount.toLocaleString('en-IN');

  const subject = `Payment Reminder - Invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue) - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .urgent { background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .payment-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .payment-button:hover { background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Payment Reminder</p>
        </div>
        
        <div class="content">
          <p>Dear ${customer?.name || 'Valued Customer'},</p>
          
          <div class="urgent">
            <h2 style="margin: 0 0 15px; color: #dc2626;">⚠️ Payment Overdue</h2>
            <p style="margin: 0; font-size: 16px;">
              Your invoice <strong>#${invoice.invoiceNumber}</strong> was due on <strong>${dueDate}</strong> 
              and is now <strong>${daysOverdue} days overdue</strong>.
            </p>
          </div>

          <p>To avoid any late fees or service interruptions, please complete your payment as soon as possible.</p>

          <div style="text-align: center; margin: 30px 0; ">
            <a href="${paymentLink}" class="payment-button" style="color:rgb(255, 255, 255);">
              💳 Pay Now - ₹${remainingAmount}
            </a>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Remaining Amount:</strong> ₹${remainingAmount}<br>
            <strong>Due Date:</strong> ${dueDate}<br>
            <strong>Days Overdue:</strong> ${daysOverdue}
          </div>

          <p>If you have already made the payment, please disregard this reminder. If you're experiencing any issues, please contact our support team immediately.</p>
          
          <p>Best regards,<br>
          <strong>${companyName} Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

// Generate payment confirmation email template
const generatePaymentConfirmationTemplate = (
  invoice: IInvoice,
  customer: any,
  paymentAmount: number,
  paymentMethod: string,
  companyName: string = 'Sun Power Services'
): EmailTemplate => {
  const paymentDate = new Date().toLocaleDateString('en-IN');
  const paymentAmountFormatted = paymentAmount.toLocaleString('en-IN');

  const subject = `Payment Confirmation - Invoice ${invoice.invoiceNumber} - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Payment Confirmation</p>
        </div>
        
        <div class="content">
          <p>Dear ${customer?.name || 'Valued Customer'},</p>
          
          <div class="success">
            <h2 style="margin: 0 0 15px; color: #166534;">✅ Payment Successful!</h2>
            <p style="margin: 0; font-size: 18px;">
              Thank you for your payment. Your transaction has been processed successfully.
            </p>
          </div>

          <div class="receipt">
            <h3 style="margin: 0 0 15px; color: #1f2937;">Payment Receipt</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <strong>Invoice Number:</strong> ${invoice.invoiceNumber}<br>
                <strong>Payment Date:</strong> ${paymentDate}<br>
                <strong>Payment Method:</strong> ${paymentMethod}
              </div>
              <div>
                <strong>Amount Paid:</strong> ₹${paymentAmountFormatted}<br>
                <strong>Remaining Balance:</strong> ₹${invoice.remainingAmount.toLocaleString('en-IN')}<br>
                <strong>Status:</strong> <span style="color: #059669; font-weight: bold;">PAID</span>
              </div>
            </div>
          </div>

          <p>Your payment has been recorded and your invoice has been updated accordingly. You will receive a detailed receipt shortly.</p>
          
          <p>Thank you for your business!</p>
          
          <p>Best regards,<br>
          <strong>${companyName} Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

// Main email service class
export class InvoiceEmailService {
  // Helper function to get primary address email
  private static getPrimaryAddressEmail(customer: any): string | null {
    if (!customer?.addresses || !Array.isArray(customer.addresses)) {
      return null;
    }
    
    // Find primary address
    const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
    if (primaryAddress?.email) {
      return primaryAddress.email;
    }
    
    // If no primary address with email, return null
    return null;
  }

  private static async getCustomerInfo(invoice: IInvoice): Promise<any> {
    
    if (invoice.customer) {
      return await Customer.findById(invoice.customer).select('name email phone addresses').lean();
    }
    
    // If customer is null, create a customer object from supplierEmail
    // if (invoice.supplierEmail) {
    //   return {
    //     name: invoice.supplierName || 'Customer',
    //     email: invoice.supplierEmail,
    //     phone: '',
    //     address: ''
    //   };
    // }
    
    return null;
  }

  private static async getCompanyInfo(): Promise<{ name: string; email: string; phone: string }> {
    // In a real implementation, this would come from system settings
    return {
      name: process.env.COMPANY_NAME || 'Sun Power Services',
      email: process.env.COMPANY_EMAIL || 'support@sunpowerservices.com',
      phone: process.env.COMPANY_PHONE || '+91-XXXXXXXXXX'
    };
  }

  // Send invoice email with payment link
  static async sendInvoiceEmail(invoiceId: string): Promise<{ success: boolean; message: string; paymentLink?: string }> {
    try {
      // Get invoice with populated customer
      const invoice = await Invoice.findById(invoiceId).populate('customer');
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Check if invoice is valid for email sending
      if (invoice.status === 'cancelled') {
        return { success: false, message: 'Cannot send email for cancelled invoice' };
      }

      if (invoice.paymentStatus === 'paid') {
        return { success: false, message: 'Cannot send email for fully paid invoice' };
      }

      // Get customer information
      const customer = await this.getCustomerInfo(invoice);

      // Get primary address email
      const primaryEmail = this.getPrimaryAddressEmail(customer);
      
      if (!primaryEmail) {
        return { success: false, message: 'Customer primary address email not found' };
      }

      // Generate secure payment token
      const token = await PaymentToken.createForInvoice(invoice._id as mongoose.Types.ObjectId, 7); // 7 days expiry
      const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      const paymentLink = `${frontendUrl}/pay/${token}`;

      // Get company information
      const companyInfo = await this.getCompanyInfo();

      // Generate email template
      const { subject, html } = generateInvoiceEmailTemplate(invoice, customer, paymentLink, companyInfo.name);

      // Send email
      await sendEmail(primaryEmail, subject, html);

      // Update invoice status to 'sent' if it's currently 'draft'
      if (invoice.status === 'draft') {
        invoice.status = 'sent';
        await invoice.save();
      }

      return { 
        success: true, 
        message: 'Invoice email sent successfully',
        paymentLink 
      };

    } catch (error) {
      console.error('Error sending invoice email:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send invoice email' 
      };
    }
  }

  // Send payment reminder email
  static async sendPaymentReminder(invoiceId: string): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await Invoice.findById(invoiceId).populate('customer');
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      const customer = await this.getCustomerInfo(invoice);
      
      // Get primary address email
      const primaryEmail = this.getPrimaryAddressEmail(customer);
      
      if (!primaryEmail) {
        return { success: false, message: 'Customer primary address email not found' };
      }

      // Calculate days overdue
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // if (daysOverdue <= 0) {
      //   return { success: false, message: 'Invoice is not overdue yet' };
      // }

      // Generate new payment token
      const token = await PaymentToken.createForInvoice(invoice._id as mongoose.Types.ObjectId, 7);
      const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
      const paymentLink = `${frontendUrl}/pay/${token}`;

      const companyInfo = await this.getCompanyInfo();
      const { subject, html } = generatePaymentReminderTemplate(invoice, customer, paymentLink, daysOverdue, companyInfo.name);

      await sendEmail(primaryEmail, subject, html);

      return { success: true, message: 'Payment reminder sent successfully' };

    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send payment reminder' 
      };
    }
  }

  // Send payment confirmation email
  static async sendPaymentConfirmation(
    invoiceId: string, 
    paymentAmount: number, 
    paymentMethod: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await Invoice.findById(invoiceId).populate('customer');
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      const customer = await this.getCustomerInfo(invoice);
      
      // Get primary address email
      const primaryEmail = this.getPrimaryAddressEmail(customer);
      
      if (!primaryEmail) {
        return { success: false, message: 'Customer primary address email not found' };
      }

      const companyInfo = await this.getCompanyInfo();
      const { subject, html } = generatePaymentConfirmationTemplate(
        invoice, 
        customer, 
        paymentAmount, 
        paymentMethod, 
        companyInfo.name
      );

      await sendEmail(primaryEmail, subject, html);

      return { success: true, message: 'Payment confirmation sent successfully' };

    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send payment confirmation' 
      };
    }
  }

  // Verify payment token (without consuming)
  static async verifyPaymentToken(token: string): Promise<{ 
    success: boolean; 
    invoice?: IInvoice; 
    error?: string 
  }> {
    try {
      const result = await PaymentToken.verify(token);
      
      if (!result.isValid) {
        return { success: false, error: result.error };
      }

      const invoice = await Invoice.findById(result.invoiceId).populate('customer');
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      // Get customer information using the same logic as other methods
      const customer = await this.getCustomerInfo(invoice);
      
      // Set the customer data directly on the invoice object for display purposes
      (invoice as any).customer = customer;

      return { success: true, invoice };

    } catch (error) {
      console.error('Error verifying payment token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify payment token' 
      };
    }
  }

  // Verify and consume payment token (for payment processing)
  static async verifyAndConsumePaymentToken(token: string): Promise<{ 
    success: boolean; 
    invoice?: IInvoice; 
    error?: string 
  }> {
    try {
      const result = await PaymentToken.verifyAndConsume(token);
      
      if (!result.isValid) {
        return { success: false, error: result.error };
      }

      const invoice = await Invoice.findById(result.invoiceId).populate('customer');
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      // Don't modify the customer field - keep it as is (ObjectId or null)
      // The customer data will be populated when needed for display

      return { success: true, invoice };

    } catch (error) {
      console.error('Error verifying and consuming payment token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify payment token' 
      };
    }
  }

  // Cleanup expired tokens (should be called by a cron job)
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      return await PaymentToken.cleanupExpired();
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
} 