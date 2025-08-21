import { Response, NextFunction } from 'express';
import { DigitalServiceReport } from '../models/DigitalServiceReport';
import { ServiceTicket } from '../models/ServiceTicket';
import { Stock } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, TicketStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { getFileUrl } from '../middleware/upload';

// @desc    Create digital service report
// @route   POST /api/v1/digital-service-reports
// @access  Private
export const createDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      ticketId,
      workCompleted,
      partsUsed,
      recommendations,
      customerFeedback,
      customerSignature,
      technicianSignature,
      nextVisitRequired,
      nextVisitDate,
      serviceQuality,
      customerSatisfaction,
      photos,
      attachments
    } = req.body;

    // Check if ticket exists and is resolved
    const ticket = await ServiceTicket.findById(ticketId);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    if (ticket.ServiceRequestStatus !== TicketStatus.RESOLVED) {
      return next(new AppError('Service ticket must be resolved to create digital service report', 400));
    }

    // Check if report already exists for this ticket
    const existingReport = await DigitalServiceReport.findOne({ ticketId });
    if (existingReport) {
      return next(new AppError('Digital service report already exists for this ticket', 400));
    }

    // Generate report number
    const count = await DigitalServiceReport.countDocuments();
    const reportNumber = `DSR-${String(count + 1).padStart(6, '0')}`;

    // Update stock for parts used
    if (partsUsed && partsUsed.length > 0) {
      for (const part of partsUsed) {
        const stock = await Stock.findOne({ product: part.product });
        if (stock && stock.availableQuantity >= part.quantity) {
          stock.quantity -= part.quantity;
          stock.availableQuantity = stock.quantity - stock.reservedQuantity;
          stock.lastUpdated = new Date();
          await stock.save();
        }
      }
    }

    const report = new DigitalServiceReport({
      ticketId,
      reportNumber,
      technician: ticket.assignedTo,
      customer: ticket.customer,
      serviceDate: new Date(),
      workCompleted,
      partsUsed,
      recommendations,
      customerFeedback,
      customerSignature,
      technicianSignature,
      nextVisitRequired,
      nextVisitDate: nextVisitRequired ? new Date(nextVisitDate) : undefined,
      serviceQuality,
      customerSatisfaction,
      photos: photos || [],
      attachments: attachments || []
    });

    await report.save();

    const populatedReport = await DigitalServiceReport.findById(report._id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Digital service report created successfully',
      data: { report: populatedReport }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get digital service report by ID
// @route   GET /api/v1/digital-service-reports/:id
// @access  Private
export const getDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await DigitalServiceReport.findById(req.params.id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email phone')
      .populate('customer', 'name email phone address')
      .populate('partsUsed.product', 'name category price')
      .populate('approvedBy', 'firstName lastName email');

    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Digital service report retrieved successfully',
      data: { report }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get digital service report by ticket ID
// @route   GET /api/v1/digital-service-reports/ticket/:ticketId
// @access  Private
export const getDigitalServiceReportByTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await DigitalServiceReport.findOne({ ticketId: req.params.ticketId })
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email phone')
      .populate('customer', 'name email phone address')
      .populate('partsUsed.product', 'name category price')
      .populate('approvedBy', 'firstName lastName email');

    if (!report) {
      return next(new AppError('Digital service report not found for this ticket', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Digital service report retrieved successfully',
      data: { report }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all digital service reports
// @route   GET /api/v1/digital-service-reports
// @access  Private
export const getDigitalServiceReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      technician,
      customer,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (technician) query.technician = technician;
    if (customer) query.customer = customer;
    if (dateFrom || dateTo) {
      query.serviceDate = {};
      if (dateFrom) query.serviceDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.serviceDate.$lte = new Date(dateTo as string);
    }
    if (search) {
      query.$or = [
        { reportNumber: { $regex: search, $options: 'i' } },
        { workCompleted: { $regex: search, $options: 'i' } },
        { recommendations: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await DigitalServiceReport.countDocuments(query);
    const reports = await DigitalServiceReport.find(query)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Digital service reports retrieved successfully',
      data: { reports },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update digital service report
// @route   PUT /api/v1/digital-service-reports/:id
// @access  Private
export const updateDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      workCompleted,
      partsUsed,
      recommendations,
      customerFeedback,
      customerSignature,
      technicianSignature,
      nextVisitRequired,
      nextVisitDate,
      serviceQuality,
      customerSatisfaction,
      photos,
      attachments
    } = req.body;

    const report = await DigitalServiceReport.findById(req.params.id);
    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    // Only allow updates if report is in draft status
    if (report.status !== 'draft') {
      return next(new AppError('Cannot update report that is not in draft status', 400));
    }

    // Update fields
    if (workCompleted !== undefined) report.workCompleted = workCompleted;
    if (partsUsed !== undefined) report.partsUsed = partsUsed;
    if (recommendations !== undefined) report.recommendations = recommendations;
    if (customerFeedback !== undefined) report.customerFeedback = customerFeedback;
    if (customerSignature !== undefined) report.customerSignature = customerSignature;
    if (technicianSignature !== undefined) report.technicianSignature = technicianSignature;
    if (nextVisitRequired !== undefined) report.nextVisitRequired = nextVisitRequired;
    if (nextVisitDate !== undefined) report.nextVisitDate = nextVisitRequired ? new Date(nextVisitDate) : undefined;
    if (serviceQuality !== undefined) report.serviceQuality = serviceQuality;
    if (customerSatisfaction !== undefined) report.customerSatisfaction = customerSatisfaction;
    if (photos !== undefined) report.photos = photos;
    if (attachments !== undefined) report.attachments = attachments;

    await report.save();

    const populatedReport = await DigitalServiceReport.findById(report._id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand modelNumber')
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Digital service report updated successfully',
      data: { report: populatedReport }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve digital service report
// @route   PUT /api/v1/digital-service-reports/:id/approve
// @access  Private
export const approveDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await DigitalServiceReport.findById(req.params.id);
    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    if (report.status !== 'completed') {
      return next(new AppError('Only completed reports can be approved', 400));
    }

    report.status = 'approved';
    report.approvedBy = (req.user as any).id;
    report.approvedAt = new Date();

    await report.save();

    const populatedReport = await DigitalServiceReport.findById(report._id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand modelNumber')
      .populate('partsUsed.product', 'name category price')
      .populate('approvedBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Digital service report approved successfully',
      data: { report: populatedReport }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Reject digital service report
// @route   PUT /api/v1/digital-service-reports/:id/reject
// @access  Private
export const rejectDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rejectionReason } = req.body;

    const report = await DigitalServiceReport.findById(req.params.id);
    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    if (report.status !== 'completed') {
      return next(new AppError('Only completed reports can be rejected', 400));
    }

    report.status = 'rejected';
    report.rejectionReason = rejectionReason;

    await report.save();

    const populatedReport = await DigitalServiceReport.findById(report._id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand modelNumber')
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Digital service report rejected successfully',
      data: { report: populatedReport }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete digital service report
// @route   PUT /api/v1/digital-service-reports/:id/complete
// @access  Private
export const completeDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await DigitalServiceReport.findById(req.params.id);
    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    if (report.status !== 'draft') {
      return next(new AppError('Only draft reports can be completed', 400));
    }

    report.status = 'completed';

    await report.save();

    const populatedReport = await DigitalServiceReport.findById(report._id)
      .populate('ticketId', 'ticketNumber description status')
      .populate('technician', 'firstName lastName email')
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand modelNumber')
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Digital service report completed successfully',
      data: { report: populatedReport }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete digital service report
// @route   DELETE /api/v1/digital-service-reports/:id
// @access  Private
export const deleteDigitalServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const report = await DigitalServiceReport.findById(req.params.id);
    if (!report) {
      return next(new AppError('Digital service report not found', 404));
    }

    // Only allow deletion of draft reports
    if (report.status !== 'draft') {
      return next(new AppError('Cannot delete report that is not in draft status', 400));
    }

    await DigitalServiceReport.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Digital service report deleted successfully',
      data: { deletedReport: { id: req.params.id } }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get digital service report statistics
// @route   GET /api/v1/digital-service-reports/stats
// @access  Private
export const getDigitalServiceReportStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;

    const query: any = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    const [
      totalReports,
      draftReports,
      completedReports,
      approvedReports,
      rejectedReports,
      averageSatisfaction
    ] = await Promise.all([
      DigitalServiceReport.countDocuments(query),
      DigitalServiceReport.countDocuments({ ...query, status: 'draft' }),
      DigitalServiceReport.countDocuments({ ...query, status: 'completed' }),
      DigitalServiceReport.countDocuments({ ...query, status: 'approved' }),
      DigitalServiceReport.countDocuments({ ...query, status: 'rejected' }),
      DigitalServiceReport.aggregate([
        { $match: query },
        { $group: { _id: null, avgSatisfaction: { $avg: '$customerSatisfaction' } } }
      ])
    ]);

    const stats = {
      totalReports,
      draftReports,
      completedReports,
      approvedReports,
      rejectedReports,
      averageSatisfaction: averageSatisfaction[0]?.avgSatisfaction || 0
    };

    const response: APIResponse = {
      success: true,
      message: 'Digital service report statistics retrieved successfully',
      data: { stats }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 