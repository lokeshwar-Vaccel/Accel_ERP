import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// System settings interface
interface SystemSettings {
  id: string;
  category: 'general' | 'email' | 'sms' | 'whatsapp' | 'notifications' | 'security' | 'business';
  key: string;
  value: any;
  displayName: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'password';
  isPublic: boolean;
  updatedBy: string;
  updatedAt: Date;
}

// Email template interface
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: 'ticket' | 'amc' | 'customer' | 'system';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory stores (in production, use MongoDB)
const settingsStore = new Map<string, SystemSettings>();
const emailTemplatesStore = new Map<string, EmailTemplate>();

// Initialize default settings
const initializeDefaultSettings = () => {
  const defaultSettings: Omit<SystemSettings, 'id' | 'updatedBy' | 'updatedAt'>[] = [
    // General Settings
    {
      category: 'general',
      key: 'company_name',
      value: 'Sun Power Services',
      displayName: 'Company Name',
      description: 'Official company name displayed in the system',
      dataType: 'string',
      isPublic: true
    },
    {
      category: 'general',
      key: 'company_address',
      value: '',
      displayName: 'Company Address',
      description: 'Complete company address',
      dataType: 'string',
      isPublic: true
    },
    {
      category: 'general',
      key: 'contact_phone',
      value: '',
      displayName: 'Contact Phone',
      description: 'Primary contact phone number',
      dataType: 'string',
      isPublic: true
    },
    {
      category: 'general',
      key: 'contact_email',
      value: '',
      displayName: 'Contact Email',
      description: 'Primary contact email address',
      dataType: 'string',
      isPublic: true
    },

    // Email Settings
    {
      category: 'email',
      key: 'smtp_host',
      value: '',
      displayName: 'SMTP Host',
      description: 'Email server hostname',
      dataType: 'string',
      isPublic: false
    },
    {
      category: 'email',
      key: 'smtp_port',
      value: 587,
      displayName: 'SMTP Port',
      description: 'Email server port',
      dataType: 'number',
      isPublic: false
    },
    {
      category: 'email',
      key: 'smtp_username',
      value: '',
      displayName: 'SMTP Username',
      description: 'Email authentication username',
      dataType: 'string',
      isPublic: false
    },
    {
      category: 'email',
      key: 'smtp_password',
      value: '',
      displayName: 'SMTP Password',
      description: 'Email authentication password',
      dataType: 'password',
      isPublic: false
    },
    {
      category: 'email',
      key: 'email_from_name',
      value: 'Sun Power Services',
      displayName: 'From Name',
      description: 'Name displayed in outgoing emails',
      dataType: 'string',
      isPublic: false
    },
    {
      category: 'email',
      key: 'email_from_address',
      value: '',
      displayName: 'From Email Address',
      description: 'Email address for outgoing emails',
      dataType: 'string',
      isPublic: false
    },

    // SMS Settings
    {
      category: 'sms',
      key: 'sms_provider',
      value: 'twilio',
      displayName: 'SMS Provider',
      description: 'SMS service provider (twilio, msg91, etc.)',
      dataType: 'string',
      isPublic: false
    },
    {
      category: 'sms',
      key: 'sms_api_key',
      value: '',
      displayName: 'SMS API Key',
      description: 'API key for SMS service',
      dataType: 'password',
      isPublic: false
    },
    {
      category: 'sms',
      key: 'sms_sender_id',
      value: '',
      displayName: 'SMS Sender ID',
      description: 'Sender ID for SMS messages',
      dataType: 'string',
      isPublic: false
    },

    // WhatsApp Settings
    {
      category: 'whatsapp',
      key: 'whatsapp_api_url',
      value: '',
      displayName: 'WhatsApp API URL',
      description: 'WhatsApp Business API endpoint',
      dataType: 'string',
      isPublic: false
    },
    {
      category: 'whatsapp',
      key: 'whatsapp_access_token',
      value: '',
      displayName: 'WhatsApp Access Token',
      description: 'WhatsApp Business API access token',
      dataType: 'password',
      isPublic: false
    },
    {
      category: 'whatsapp',
      key: 'whatsapp_phone_number_id',
      value: '',
      displayName: 'WhatsApp Phone Number ID',
      description: 'WhatsApp Business phone number ID',
      dataType: 'string',
      isPublic: false
    },

    // Notification Settings
    {
      category: 'notifications',
      key: 'sla_breach_notifications',
      value: true,
      displayName: 'SLA Breach Notifications',
      description: 'Send notifications when SLA is breached',
      dataType: 'boolean',
      isPublic: false
    },
    {
      category: 'notifications',
      key: 'amc_expiry_notifications',
      value: true,
      displayName: 'AMC Expiry Notifications',
      description: 'Send notifications for expiring AMC contracts',
      dataType: 'boolean',
      isPublic: false
    },
    {
      category: 'notifications',
      key: 'low_stock_notifications',
      value: true,
      displayName: 'Low Stock Notifications',
      description: 'Send notifications for low stock items',
      dataType: 'boolean',
      isPublic: false
    },

    // Business Settings
    {
      category: 'business',
      key: 'default_sla_hours',
      value: 24,
      displayName: 'Default SLA Hours',
      description: 'Default SLA hours for service tickets',
      dataType: 'number',
      isPublic: true
    },
    {
      category: 'business',
      key: 'amc_reminder_days',
      value: 30,
      displayName: 'AMC Reminder Days',
      description: 'Days before AMC expiry to send reminders',
      dataType: 'number',
      isPublic: true
    },
    {
      category: 'business',
      key: 'low_stock_threshold',
      value: 5,
      displayName: 'Low Stock Threshold',
      description: 'Minimum stock level to trigger low stock alerts',
      dataType: 'number',
      isPublic: true
    }
  ];

  defaultSettings.forEach((setting, index) => {
    const id = `setting-${index + 1}`;
    settingsStore.set(id, {
      ...setting,
      id,
      updatedBy: 'system',
      updatedAt: new Date()
    });
  });

  // Initialize default email templates
  const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Ticket Created',
      subject: 'Service Ticket Created - {{ticketNumber}}',
      body: `
Dear {{customerName}},

Your service ticket has been created successfully.

Ticket Number: {{ticketNumber}}
Description: {{description}}
Priority: {{priority}}
SLA Deadline: {{slaDeadline}}

We will assign a technician and update you shortly.

Best regards,
{{companyName}}
      `.trim(),
      variables: ['customerName', 'ticketNumber', 'description', 'priority', 'slaDeadline', 'companyName'],
      category: 'ticket',
      isActive: true
    },
    {
      name: 'Ticket Assigned',
      subject: 'Technician Assigned - {{ticketNumber}}',
      body: `
Dear {{customerName}},

A technician has been assigned to your service ticket.

Ticket Number: {{ticketNumber}}
Assigned Technician: {{technicianName}}
Scheduled Date: {{scheduledDate}}
Contact: {{technicianPhone}}

Best regards,
{{companyName}}
      `.trim(),
      variables: ['customerName', 'ticketNumber', 'technicianName', 'scheduledDate', 'technicianPhone', 'companyName'],
      category: 'ticket',
      isActive: true
    },
    {
      name: 'AMC Expiring Soon',
      subject: 'AMC Contract Expiring Soon - {{contractNumber}}',
      body: `
Dear {{customerName}},

Your Annual Maintenance Contract is expiring soon.

Contract Number: {{contractNumber}}
Expiry Date: {{expiryDate}}
Days Remaining: {{daysRemaining}}

Please contact us to renew your contract and continue enjoying uninterrupted service.

Best regards,
{{companyName}}
      `.trim(),
      variables: ['customerName', 'contractNumber', 'expiryDate', 'daysRemaining', 'companyName'],
      category: 'amc',
      isActive: true
    },
    {
      name: 'Welcome Customer',
      subject: 'Welcome to {{companyName}}',
      body: `
Dear {{customerName}},

Welcome to {{companyName}}! We're excited to serve you.

Your customer profile has been created and you can now:
- Request service tickets
- Track service history
- Subscribe to AMC contracts

If you have any questions, feel free to contact us at {{contactPhone}} or {{contactEmail}}.

Best regards,
{{companyName}} Team
      `.trim(),
      variables: ['customerName', 'companyName', 'contactPhone', 'contactEmail'],
      category: 'customer',
      isActive: true
    }
  ];

  defaultTemplates.forEach((template, index) => {
    const id = `template-${index + 1}`;
    emailTemplatesStore.set(id, {
      ...template,
      id,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
};

// Initialize default settings
initializeDefaultSettings();

// @desc    Get all system settings
// @route   GET /api/v1/admin/settings
// @access  Private (Admin only)
export const getSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, isPublic } = req.query;

    let settings = Array.from(settingsStore.values());

    // Filter by category if specified
    if (category) {
      settings = settings.filter(setting => setting.category === category);
    }

    // Filter by public visibility if specified
    if (isPublic !== undefined) {
      settings = settings.filter(setting => setting.isPublic === (isPublic === 'true'));
    }

    // Hide sensitive values for password type settings
    const safeSettings = settings.map(setting => ({
      ...setting,
      value: setting.dataType === 'password' ? '***HIDDEN***' : setting.value
    }));

    const response: APIResponse = {
      success: true,
      message: 'System settings retrieved successfully',
      data: { settings: safeSettings }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single setting
// @route   GET /api/v1/admin/settings/:key
// @access  Private (Admin only)
export const getSetting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.params;
    const setting = Array.from(settingsStore.values()).find(s => s.key === key);

    if (!setting) {
      return next(new AppError('Setting not found', 404));
    }

    // Hide sensitive values
    const safeSetting = {
      ...setting,
      value: setting.dataType === 'password' ? '***HIDDEN***' : setting.value
    };

    const response: APIResponse = {
      success: true,
      message: 'Setting retrieved successfully',
      data: { setting: safeSetting }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update system setting
// @route   PUT /api/v1/admin/settings/:key
// @access  Private (Admin only)
export const updateSetting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const existingSetting = Array.from(settingsStore.values()).find(s => s.key === key);

    if (!existingSetting) {
      return next(new AppError('Setting not found', 404));
    }

    // Validate value based on data type
    let validatedValue = value;
    switch (existingSetting.dataType) {
      case 'number':
        validatedValue = Number(value);
        if (isNaN(validatedValue)) {
          return next(new AppError('Invalid number value', 400));
        }
        break;
      case 'boolean':
        validatedValue = Boolean(value);
        break;
      case 'json':
        try {
          validatedValue = typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return next(new AppError('Invalid JSON value', 400));
        }
        break;
    }

    // Update setting
    const updatedSetting = {
      ...existingSetting,
      value: validatedValue,
      updatedBy: req.user!.id,
      updatedAt: new Date()
    };

    settingsStore.set(existingSetting.id, updatedSetting);

    const response: APIResponse = {
      success: true,
      message: 'Setting updated successfully',
      data: {
        setting: {
          ...updatedSetting,
          value: updatedSetting.dataType === 'password' ? '***HIDDEN***' : updatedSetting.value
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get email templates
// @route   GET /api/v1/admin/email-templates
// @access  Private (Admin only)
export const getEmailTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, isActive } = req.query;

    let templates = Array.from(emailTemplatesStore.values());

    if (category) {
      templates = templates.filter(template => template.category === category);
    }

    if (isActive !== undefined) {
      templates = templates.filter(template => template.isActive === (isActive === 'true'));
    }

    templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const response: APIResponse = {
      success: true,
      message: 'Email templates retrieved successfully',
      data: { templates }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create email template
// @route   POST /api/v1/admin/email-templates
// @access  Private (Admin only)
export const createEmailTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, subject, body, variables = [], category, isActive = true } = req.body;

    const templateId = `template-${Date.now()}`;
    const template: EmailTemplate = {
      id: templateId,
      name,
      subject,
      body,
      variables,
      category,
      isActive,
      createdBy: req.user!.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    emailTemplatesStore.set(templateId, template);

    const response: APIResponse = {
      success: true,
      message: 'Email template created successfully',
      data: { template }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update email template
// @route   PUT /api/v1/admin/email-templates/:id
// @access  Private (Admin only)
export const updateEmailTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const template = emailTemplatesStore.get(id);

    if (!template) {
      return next(new AppError('Email template not found', 404));
    }

    const updatedTemplate = {
      ...template,
      ...req.body,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    emailTemplatesStore.set(id, updatedTemplate);

    const response: APIResponse = {
      success: true,
      message: 'Email template updated successfully',
      data: { template: updatedTemplate }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete email template
// @route   DELETE /api/v1/admin/email-templates/:id
// @access  Private (Admin only)
export const deleteEmailTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const template = emailTemplatesStore.get(id);

    if (!template) {
      return next(new AppError('Email template not found', 404));
    }

    emailTemplatesStore.delete(id);

    const response: APIResponse = {
      success: true,
      message: 'Email template deleted successfully',
      data: { id }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Test email configuration
// @route   POST /api/v1/admin/test-email
// @access  Private (Admin only)
export const testEmailConfiguration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return next(new AppError('Test email address is required', 400));
    }

    // Import the nodemailer utility
    const { sendQuotationEmail } = await import('../utils/nodemailer');

    // Create a test email
    const testSubject = 'Test Email - Sun Power Services ERP';
    const testHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email from Sun Power Services ERP</h2>
          <p>This is a test email to verify the email configuration.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            If you received this email, the SMTP configuration is working correctly.
          </p>
        </body>
      </html>
    `;

    try {
      // Attempt to send the test email
      await sendQuotationEmail(testEmail, testSubject, testHtmlContent);
      
      const response: APIResponse = {
        success: true,
        message: 'Test email sent successfully',
        data: {
          testEmail,
          timestamp: new Date(),
          status: 'sent'
        }
      };

      res.status(200).json(response);
    } catch (emailError) {
      console.error('Test email failed:', emailError);
      
      const response: APIResponse = {
        success: false,
        message: 'Test email failed',
        data: {
          testEmail,
          timestamp: new Date(),
          status: 'failed',
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        }
      };

      res.status(500).json(response);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get system information
// @route   GET /api/v1/admin/system-info
// @access  Private (Admin only)
export const getSystemInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date()
    };

    const response: APIResponse = {
      success: true,
      message: 'System information retrieved successfully',
      data: systemInfo
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 