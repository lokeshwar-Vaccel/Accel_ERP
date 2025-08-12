import { Request, Response, NextFunction } from 'express';
import { CustomerFeedback, ICustomerFeedback } from '../models/CustomerFeedback';
import { ServiceTicket } from '../models/ServiceTicket';
import { Customer } from '../models/Customer';
import { sendFeedbackEmail as sendFeedbackEmailUtil, sendThankYouEmail } from '../utils/nodemailer';
import { AppError } from '../errors/AppError';
import { APIResponse } from '../types';
import crypto from 'crypto';

// @desc    Send feedback email to customer when ticket is resolved
// @route   POST /api/v1/feedback/send-email
// @access  Private
export const sendFeedbackEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ticketId } = req.body;

    const ticket = await ServiceTicket.findById(ticketId)
      .populate('customer', 'name email phone')
      .populate('product', 'name category')
      .populate('assignedTo', 'firstName lastName');

    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    const customer = ticket.customer as any;
    if (!customer || !customer.email) {
      return next(new AppError('Customer email not found', 400));
    }

    if (!customer.name) {
      return next(new AppError('Customer name not found', 400));
    }

    // At this point, we know both email and name exist
    const customerEmail = customer.email as string;
    const customerName = customer.name as string;

    // Generate unique token for feedback form
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    // Create feedback record
    const feedback = new CustomerFeedback({
      ticketId: ticket._id,
      customerEmail: customerEmail,
      customerName: customerName,
      rating: 0,
      serviceQuality: 'good',
      technicianRating: 0,
      timelinessRating: 0,
      qualityRating: 0,
      wouldRecommend: false,
      token,
      expiresAt
    });

    await feedback.save();

    // Create feedback URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const feedbackUrl = `${baseUrl}/feedback/${token}`;

    console.log("feedbackUrl==>",feedbackUrl); 
    console.log("customerEmail==>",customerEmail);
    console.log("customerName==>",customerName);
    console.log("ticket.ticketNumber==>",ticket.ticketNumber);
    console.log("ticket==>",ticket);

    // Send email using nodemailer
    await sendFeedbackEmailUtil(
      customerEmail,
      customerName,
      ticket.ticketNumber || '',
      feedbackUrl,
      ticket
    );

    const response: APIResponse = {
      success: true,
      message: 'Feedback email sent successfully',
      data: { feedbackId: feedback._id }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback form data by token
// @route   GET /api/v1/feedback/:token
// @access  Public
export const getFeedbackForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const feedback = await CustomerFeedback.findOne({ token })
      .populate({
        path: 'ticketId',
        populate: [
          { path: 'customer', select: 'name email phone' },
          { path: 'product', select: 'name category' },
          { path: 'assignedTo', select: 'firstName lastName' }
        ]
      });

    if (!feedback) {
      return next(new AppError('Feedback form not found or expired', 404));
    }

    if (feedback.isSubmitted) {
      return next(new AppError('Feedback already submitted', 400));
    }

    if (new Date() > feedback.expiresAt) {
      return next(new AppError('Feedback link has expired', 400));
    }

    const response: APIResponse = {
      success: true,
      message: 'Feedback form data retrieved successfully',
      data: { feedback }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Submit customer feedback
// @route   POST /api/v1/feedback/:token
// @access  Public
export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const {
      rating,
      comments,
      serviceQuality,
      technicianRating,
      timelinessRating,
      qualityRating,
      wouldRecommend,
      improvementSuggestions
    } = req.body;

    const feedback = await CustomerFeedback.findOne({ token });

    if (!feedback) {
      return next(new AppError('Feedback form not found or expired', 404));
    }

    if (feedback.isSubmitted) {
      return next(new AppError('Feedback already submitted', 400));
    }

    if (new Date() > feedback.expiresAt) {
      return next(new AppError('Feedback link has expired', 400));
    }

    // Update feedback with submitted data
    feedback.rating = rating;
    feedback.comments = comments;
    feedback.serviceQuality = serviceQuality;
    feedback.technicianRating = technicianRating;
    feedback.timelinessRating = timelinessRating;
    feedback.qualityRating = qualityRating;
    feedback.wouldRecommend = wouldRecommend;
    feedback.improvementSuggestions = improvementSuggestions;
    feedback.isSubmitted = true;
    feedback.feedbackDate = new Date();

    await feedback.save();

    // Send thank you email to customer
    const thankYouHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Thank You!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your feedback has been received</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">Feedback Submitted Successfully</h2>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <p>Thank you for taking the time to provide your feedback. Your input helps us improve our services and provide better customer experiences.</p>
            <p>We appreciate your business and look forward to serving you again!</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Thank you for choosing our services!</p>
        </div>
      </div>
    `;

    await sendThankYouEmail(feedback.customerEmail);

    const response: APIResponse = {
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedbackId: feedback._id }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback statistics
// @route   GET /api/v1/feedback/stats
// @access  Private
export const getFeedbackStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await CustomerFeedback.aggregate([
      {
        $match: { isSubmitted: true }
      },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageTechnicianRating: { $avg: '$technicianRating' },
          averageTimelinessRating: { $avg: '$timelinessRating' },
          averageQualityRating: { $avg: '$qualityRating' },
          wouldRecommendCount: {
            $sum: { $cond: ['$wouldRecommend', 1, 0] }
          },
          serviceQualityBreakdown: {
            $push: '$serviceQuality'
          }
        }
      }
    ]);

    const serviceQualityStats = await CustomerFeedback.aggregate([
      {
        $match: { isSubmitted: true }
      },
      {
        $group: {
          _id: '$serviceQuality',
          count: { $sum: 1 }
        }
      }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Feedback statistics retrieved successfully',
      data: {
        stats: stats[0] || {},
        serviceQualityStats
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Get all feedback data for analytics
// @route   GET /api/v1/feedback/all
// @access  Private
export const getAllFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dateFrom, dateTo, limit = 100 } = req.query;

    let matchQuery: any = {};
    
    // Add date range filter if provided
    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) {
        matchQuery.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        matchQuery.createdAt.$lte = new Date(dateTo as string);
      }
    }

    const feedback = await CustomerFeedback.find(matchQuery)
      .populate({
        path: 'ticketId',
        populate: [
          { path: 'customer', select: 'name email phone' },
          { path: 'product', select: 'name category' },
          { path: 'assignedTo', select: 'firstName lastName' }
        ]
      })
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const response: APIResponse = {
      success: true,
      message: 'Feedback data retrieved successfully',
      data: { feedback }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback by ticket ID
// @route   GET /api/v1/feedback/ticket/:ticketId
// @access  Private
export const getFeedbackByTicketId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ticketId } = req.params;

    const feedback = await CustomerFeedback.findOne({ ticketId })
      .populate('ticketId', 'ticketNumber customerName serviceRequestNumber');

    if (!feedback) {
      const response: APIResponse = {
        success: false,
        message: 'No feedback found for this ticket',
        data: null
      };
      res.status(404).json(response);
      return;
    }

    const response: APIResponse = {
      success: true,
      message: 'Feedback retrieved successfully',
      data: feedback
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 