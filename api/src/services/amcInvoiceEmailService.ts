import { sendEmail } from '../utils/email';
import { PaymentToken } from '../models/PaymentToken';
import { AMCInvoice, IAMCInvoice } from '../models/AMCInvoice';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
}

// Generate AMC invoice email template
const generateAMCInvoiceEmailTemplate = (
  invoice: IAMCInvoice,
  customer: any,
  paymentLink: string,
  companyName: string = 'Sun Power Services'
): EmailTemplate => {
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('en-IN');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
  const totalAmount = invoice.grandTotal.toLocaleString('en-IN');
  const remainingAmount = invoice.remainingAmount.toLocaleString('en-IN');

  // Generate items HTML from offerItems and sparesItems
  const offerItemsHtml = invoice.offerItems.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">AMC Service - ${item.make} ${item.engineSlNo} (${item.dgRatingKVA || 'N/A'} KVA)</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.amcCostPerDG?.toLocaleString('en-IN') || '0'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.totalAMCAmountPerDG.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const sparesItemsHtml = invoice.sparesItems.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.unitPrice?.toLocaleString('en-IN') || '0'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.totalPrice?.toLocaleString('en-IN') || '0'}</td>
    </tr>
  `).join('');

  const itemsHtml = offerItemsHtml + sparesItemsHtml;

  const subject = `AMC Invoice ${invoice.invoiceNumber} - Payment Request - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AMC Invoice Payment Request</title>
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
          <h1 style="margin: 0; font-size: 28px;">AMC Invoice Payment Request</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Annual Maintenance Contract Invoice</p>
        </div>
        
        <div class="content">
          <p>Dear ${customer?.name || 'Valued Customer'},</p>
          
          <p>Thank you for your business. Please find below the details of your AMC invoice and a secure payment link to complete your payment.</p>
          
          <div class="invoice-details">
            <h2 style="margin: 0 0 15px; color: #1f2937;">AMC Invoice #${invoice.invoiceNumber}</h2>
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
              <span><strong>CGST:</strong></span>
              <span>₹${invoice.cgst.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>SGST:</strong></span>
              <span>₹${invoice.sgst.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>IGST:</strong></span>
              <span>₹${invoice.igst.toLocaleString('en-IN')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
              <span><strong>Total Amount:</strong></span>
              <span style="font-size: 18px; font-weight: bold; color: #1f2937;">₹${totalAmount}</span>
            </div>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #1e40af;">AMC Service Details</h3>
            <p><strong>AMC Type:</strong> ${invoice.amcType}</p>
            <p><strong>Contract Type:</strong> Annual Maintenance Contract</p>
            <p><strong>Service Coverage:</strong> Comprehensive maintenance and support</p>
            <p><strong>Quotation Number:</strong> ${invoice.quotationNumber}</p>
          </div>

          <p>If you have any questions about this invoice or need assistance with payment, please don't hesitate to contact us.</p>
          
          <div class="footer">
            <p>Thank you for choosing ${companyName} for your AMC needs.</p>
            <p>Best regards,<br>${companyName} Team</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

// Main AMC invoice email service class
export class AMCInvoiceEmailService {
  // Helper function to get primary address email
  private static getPrimaryAddressEmail(customer: any): string | null {
    if (!customer) {
      return null;
    }

    // First, try to get email from primary address
    if (customer?.addresses && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
      const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
      if (primaryAddress?.email && primaryAddress.email.trim() !== '') {
        return primaryAddress.email;
      }
    }
    
    // If no primary address email, try customer's main email
    if (customer?.email && customer.email.trim() !== '') {
      return customer.email;
    }
    
    // If still no email found, return null
    return null;
  }

  private static async getCustomerInfo(invoice: IAMCInvoice): Promise<any> {
    try {
      let customer = null;

      // If customer is populated, check if it has the data we need
      if (invoice.customer && typeof invoice.customer === 'object' && 'name' in invoice.customer) {
        customer = invoice.customer;
        
        // If customer has _id but missing addresses or email, fetch full data
        if (customer._id && (!customer.addresses || !(customer as any).email)) {
          const fullCustomer = await Customer.findById(customer._id).lean();
          if (fullCustomer) {
            const fullCustomerObj = fullCustomer as any;
            customer = {
              ...customer,
              email: fullCustomerObj.email || (customer as any).email,
              addresses: fullCustomer.addresses || customer.addresses || []
            };
          }
        }
      } else if (invoice.customer) {
        // If customer is just an ID, fetch full customer data
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any).toString();
        customer = await Customer.findById(customerId).lean();
      }

      return customer;
    } catch (error) {
      console.error('Error getting customer info:', error);
      return null;
    }
  }

  private static async getCompanyInfo(): Promise<{ name: string; email: string; phone: string }> {
    return {
      name: process.env.COMPANY_NAME || 'Sun Power Services',
      email: process.env.COMPANY_EMAIL || 'info@sunpowerservices.com',
      phone: process.env.COMPANY_PHONE || '+91-XXXXXXXXXX'
    };
  }

  // Send AMC invoice email with payment link
  static async sendAMCInvoiceEmail(invoiceId: string): Promise<{ success: boolean; message: string; paymentLink?: string }> {
    try {
      // Get AMC invoice with populated customer
      const invoice = await AMCInvoice.findById(invoiceId).populate({
        path: 'customer',
        select: 'name email phone addresses'
      });
      if (!invoice) {
        return { success: false, message: 'AMC invoice not found' };
      }

      // Check if invoice is valid for email sending
      if (invoice.status === 'cancelled') {
        return { success: false, message: 'Cannot send email for cancelled AMC invoice' };
      }

      if (invoice.paymentStatus === 'paid') {
        return { success: false, message: 'Cannot send email for fully paid AMC invoice' };
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
      const { subject, html } = generateAMCInvoiceEmailTemplate(invoice, customer, paymentLink, companyInfo.name);

      // Send email
      await sendEmail(primaryEmail, subject, html);

      // Update invoice status to 'sent' if it's currently 'draft'
      if (invoice.status === 'draft') {
        invoice.status = 'sent';
        await invoice.save();
      }

      return { 
        success: true, 
        message: 'AMC invoice email sent successfully',
        paymentLink 
      };

    } catch (error) {
      console.error('Error sending AMC invoice email:', error);
      return { 
        success: false, 
        message: 'Failed to send AMC invoice email' 
      };
    }
  }
}
