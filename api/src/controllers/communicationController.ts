import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// Communication interfaces
interface EmailMessage {
  id: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  templateId?: string;
  variables?: { [key: string]: any };
  attachments?: string[];
  sentAt?: Date;
  sentBy: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  error?: string;
  priority: 'low' | 'medium' | 'high';
  relatedEntity?: {
    type: 'ticket' | 'customer' | 'amc' | 'purchase_order';
    id: string;
  };
}

interface SMSMessage {
  id: string;
  to: string | string[];
  message: string;
  templateId?: string;
  variables?: { [key: string]: any };
  sentAt?: Date;
  sentBy: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  error?: string;
  priority: 'low' | 'medium' | 'high';
  relatedEntity?: {
    type: 'ticket' | 'customer' | 'amc' | 'purchase_order';
    id: string;
  };
}

interface WhatsAppMessage {
  id: string;
  to: string | string[];
  message: string;
  messageType: 'text' | 'image' | 'document' | 'template';
  templateId?: string;
  variables?: { [key: string]: any };
  mediaUrl?: string;
  sentAt?: Date;
  sentBy: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  error?: string;
  priority: 'low' | 'medium' | 'high';
  relatedEntity?: {
    type: 'ticket' | 'customer' | 'amc' | 'purchase_order';
    id: string;
  };
}

// In-memory stores (in production, use MongoDB)
const emailStore = new Map<string, EmailMessage>();
const smsStore = new Map<string, SMSMessage>();
const whatsappStore = new Map<string, WhatsAppMessage>();

// Helper function to generate message ID
const generateMessageId = (type: 'email' | 'sms' | 'whatsapp'): string => {
  return `${type}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
};

// Helper function to process template variables
const processTemplate = (template: string, variables: { [key: string]: any }): string => {
  let processed = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, variables[key] || '');
  });
  return processed;
};

// @desc    Send email
// @route   POST /api/v1/communications/email/send
// @access  Private
export const sendEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      templateId,
      variables = {},
      attachments = [],
      priority = 'medium',
      relatedEntity
    } = req.body;

    const messageId = generateMessageId('email');
    
    // Process template if templateId is provided
    let processedSubject = subject;
    let processedBody = body;
    
    if (templateId) {
      // In real implementation, fetch template from database
      // For now, use the body and subject as templates
      processedSubject = processTemplate(subject, variables);
      processedBody = processTemplate(body, variables);
    }

    const emailMessage: EmailMessage = {
      id: messageId,
      to: Array.isArray(to) ? to : [to],
      cc,
      bcc,
      subject: processedSubject,
      body: processedBody,
      templateId,
      variables,
      attachments,
      sentBy: req.user!.id,
      status: 'pending',
      priority,
      relatedEntity
    };

    // In a real implementation, integrate with email service (Nodemailer, SendGrid, etc.)
    // For now, simulate sending
    setTimeout(() => {
      emailMessage.status = Math.random() > 0.1 ? 'sent' : 'failed';
      emailMessage.sentAt = new Date();
      if (emailMessage.status === 'failed') {
        emailMessage.error = 'Simulated email sending failure';
      }
      emailStore.set(messageId, emailMessage);
    }, 1000);

    emailMessage.status = 'queued';
    emailStore.set(messageId, emailMessage);

    const response: APIResponse = {
      success: true,
      message: 'Email queued for sending',
      data: {
        messageId,
        status: emailMessage.status,
        to: emailMessage.to,
        subject: emailMessage.subject
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Send SMS
// @route   POST /api/v1/communications/sms/send
// @access  Private
export const sendSMS = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      to,
      message,
      templateId,
      variables = {},
      priority = 'medium',
      relatedEntity
    } = req.body;

    const messageId = generateMessageId('sms');
    
    // Process template if templateId is provided
    let processedMessage = message;
    if (templateId) {
      processedMessage = processTemplate(message, variables);
    }

    const smsMessage: SMSMessage = {
      id: messageId,
      to: Array.isArray(to) ? to : [to],
      message: processedMessage,
      templateId,
      variables,
      sentBy: req.user!.id,
      status: 'pending',
      priority,
      relatedEntity
    };

    // In a real implementation, integrate with SMS service (Twilio, MSG91, etc.)
    // For now, simulate sending
    setTimeout(() => {
      smsMessage.status = Math.random() > 0.1 ? 'sent' : 'failed';
      smsMessage.sentAt = new Date();
      if (smsMessage.status === 'failed') {
        smsMessage.error = 'Simulated SMS sending failure';
      }
      smsStore.set(messageId, smsMessage);
    }, 500);

    smsMessage.status = 'queued';
    smsStore.set(messageId, smsMessage);

    const response: APIResponse = {
      success: true,
      message: 'SMS queued for sending',
      data: {
        messageId,
        status: smsMessage.status,
        to: smsMessage.to,
        message: processedMessage
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Send WhatsApp message
// @route   POST /api/v1/communications/whatsapp/send
// @access  Private
export const sendWhatsApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      to,
      message,
      messageType = 'text',
      templateId,
      variables = {},
      mediaUrl,
      priority = 'medium',
      relatedEntity
    } = req.body;

    const messageId = generateMessageId('whatsapp');
    
    // Process template if templateId is provided
    let processedMessage = message;
    if (templateId) {
      processedMessage = processTemplate(message, variables);
    }

    const whatsappMessage: WhatsAppMessage = {
      id: messageId,
      to: Array.isArray(to) ? to : [to],
      message: processedMessage,
      messageType,
      templateId,
      variables,
      mediaUrl,
      sentBy: req.user!.id,
      status: 'pending',
      priority,
      relatedEntity
    };

    // In a real implementation, integrate with WhatsApp Business API
    // For now, simulate sending
    setTimeout(() => {
      whatsappMessage.status = Math.random() > 0.1 ? 'sent' : 'failed';
      whatsappMessage.sentAt = new Date();
      if (whatsappMessage.status === 'failed') {
        whatsappMessage.error = 'Simulated WhatsApp sending failure';
      }
      whatsappStore.set(messageId, whatsappMessage);
    }, 750);

    whatsappMessage.status = 'queued';
    whatsappStore.set(messageId, whatsappMessage);

    const response: APIResponse = {
      success: true,
      message: 'WhatsApp message queued for sending',
      data: {
        messageId,
        status: whatsappMessage.status,
        to: whatsappMessage.to,
        messageType: whatsappMessage.messageType
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get message status
// @route   GET /api/v1/communications/:type/:messageId/status
// @access  Private
export const getMessageStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, messageId } = req.params;
    let message: EmailMessage | SMSMessage | WhatsAppMessage | undefined;

    switch (type) {
      case 'email':
        message = emailStore.get(messageId);
        break;
      case 'sms':
        message = smsStore.get(messageId);
        break;
      case 'whatsapp':
        message = whatsappStore.get(messageId);
        break;
      default:
        return next(new AppError('Invalid message type', 400));
    }

    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Message status retrieved successfully',
      data: {
        messageId: message.id,
        status: message.status,
        sentAt: message.sentAt,
        error: message.error
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get message history
// @route   GET /api/v1/communications/history
// @access  Private
export const getMessageHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      type, 
      status, 
      relatedEntityType, 
      relatedEntityId,
      page = 1, 
      limit = 20 
    } = req.query;

    let messages: (EmailMessage | SMSMessage | WhatsAppMessage)[] = [];

    // Collect messages based on type filter
    if (!type || type === 'email') {
      messages.push(...Array.from(emailStore.values()).map(msg => ({ ...msg, type: 'email' as const })));
    }
    if (!type || type === 'sms') {
      messages.push(...Array.from(smsStore.values()).map(msg => ({ ...msg, type: 'sms' as const })));
    }
    if (!type || type === 'whatsapp') {
      messages.push(...Array.from(whatsappStore.values()).map(msg => ({ ...msg, type: 'whatsapp' as const })));
    }

    // Apply filters
    if (status) {
      messages = messages.filter(msg => msg.status === status);
    }

    if (relatedEntityType && relatedEntityId) {
      messages = messages.filter(msg => 
        msg.relatedEntity?.type === relatedEntityType &&
        msg.relatedEntity?.id === relatedEntityId
      );
    }

    // Sort by creation time (newest first)
    messages.sort((a, b) => {
      const aTime = a.sentAt?.getTime() || 0;
      const bTime = b.sentAt?.getTime() || 0;
      return bTime - aTime;
    });

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedMessages = messages.slice(startIndex, endIndex);

    const response: APIResponse = {
      success: true,
      message: 'Message history retrieved successfully',
      data: { messages: paginatedMessages },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: messages.length,
        pages: Math.ceil(messages.length / Number(limit))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk send notifications
// @route   POST /api/v1/communications/bulk-send
// @access  Private
export const bulkSendNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      type, 
      recipients, 
      message, 
      subject, 
      templateId, 
      variables = {},
      priority = 'medium'
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return next(new AppError('Recipients list is required', 400));
    }

    const results = [];

    for (const recipient of recipients) {
      const messageId = generateMessageId(type);
      let messageData: EmailMessage | SMSMessage | WhatsAppMessage;

      switch (type) {
        case 'email':
          messageData = {
            id: messageId,
            to: [recipient.email],
            subject: processTemplate(subject, { ...variables, ...recipient }),
            body: processTemplate(message, { ...variables, ...recipient }),
            templateId,
            variables: { ...variables, ...recipient },
            sentBy: req.user!.id,
            status: 'queued',
            priority
          };
          emailStore.set(messageId, messageData);
          break;

        case 'sms':
          messageData = {
            id: messageId,
            to: [recipient.phone],
            message: processTemplate(message, { ...variables, ...recipient }),
            templateId,
            variables: { ...variables, ...recipient },
            sentBy: req.user!.id,
            status: 'queued',
            priority
          };
          smsStore.set(messageId, messageData);
          break;

        case 'whatsapp':
          messageData = {
            id: messageId,
            to: [recipient.phone],
            message: processTemplate(message, { ...variables, ...recipient }),
            messageType: 'text',
            templateId,
            variables: { ...variables, ...recipient },
            sentBy: req.user!.id,
            status: 'queued',
            priority
          };
          whatsappStore.set(messageId, messageData);
          break;

        default:
          continue;
      }

      results.push({
        messageId,
        recipient: recipient.email || recipient.phone,
        status: 'queued'
      });
    }

    const response: APIResponse = {
      success: true,
      message: `${results.length} ${type} messages queued for sending`,
      data: { results, totalQueued: results.length }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get communication statistics
// @route   GET /api/v1/communications/stats
// @access  Private
export const getCommunicationStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const emailMessages = Array.from(emailStore.values());
    const smsMessages = Array.from(smsStore.values());
    const whatsappMessages = Array.from(whatsappStore.values());

    const emailStats = {
      total: emailMessages.length,
      sent: emailMessages.filter(m => m.status === 'sent').length,
      pending: emailMessages.filter(m => m.status === 'pending').length,
      failed: emailMessages.filter(m => m.status === 'failed').length,
      queued: emailMessages.filter(m => m.status === 'queued').length
    };

    const smsStats = {
      total: smsMessages.length,
      sent: smsMessages.filter(m => m.status === 'sent').length,
      pending: smsMessages.filter(m => m.status === 'pending').length,
      failed: smsMessages.filter(m => m.status === 'failed').length,
      queued: smsMessages.filter(m => m.status === 'queued').length
    };

    const whatsappStats = {
      total: whatsappMessages.length,
      sent: whatsappMessages.filter(m => m.status === 'sent').length,
      pending: whatsappMessages.filter(m => m.status === 'pending').length,
      failed: whatsappMessages.filter(m => m.status === 'failed').length,
      queued: whatsappMessages.filter(m => m.status === 'queued').length
    };

    const response: APIResponse = {
      success: true,
      message: 'Communication statistics retrieved successfully',
      data: {
        email: emailStats,
        sms: smsStats,
        whatsapp: whatsappStats,
        overall: {
          total: emailStats.total + smsStats.total + whatsappStats.total,
          sent: emailStats.sent + smsStats.sent + whatsappStats.sent,
          failed: emailStats.failed + smsStats.failed + whatsappStats.failed
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 