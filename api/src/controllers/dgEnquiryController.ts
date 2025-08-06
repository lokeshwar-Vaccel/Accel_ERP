import { Request, Response, NextFunction } from 'express';
import { DGEnquiry } from '../models/DGEnquiry';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';
import { createDGEnquirySchema, updateDGEnquirySchema, getDGEnquiriesQuerySchema } from '../schemas/dgEnquirySchemas';

// Create a new DG Enquiry
export const createDGEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createDGEnquirySchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    const enquiryData = {
      ...value,
      createdBy: req.user?.id
    };

    // Check if enquiry number already exists
    if (enquiryData.enquiryNo) {
      const existingEnquiry = await DGEnquiry.findOne({ enquiryNo: enquiryData.enquiryNo });
      if (existingEnquiry) {
        return next(new AppError('Enquiry number already exists', 400));
      }
    }

    const enquiry = await DGEnquiry.create(enquiryData);

    res.status(201).json({
      success: true,
      data: enquiry,
      message: 'DG Enquiry created successfully'
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return next(new AppError('Enquiry number already exists', 400));
    }
    next(error);
  }
};

// Get DG Enquiry by ID
export const getDGEnquiryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const enquiry = await DGEnquiry.findById(id).populate('customer');

    if (!enquiry) {
      return next(new AppError('DG Enquiry not found', 404));
    }

    res.status(200).json({
      success: true,
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

// Update DG Enquiry
export const updateDGEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('Update request for ID:', id, 'Body:', req.body);
    
    // Validate request body
    const { error, value } = updateDGEnquirySchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log('Validation error:', error.details);
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    const updateData = value;
    console.log('Validated update data:', updateData);

    // Check if enquiry number is being updated and if it already exists
    if (updateData.enquiryNo) {
      const existingEnquiry = await DGEnquiry.findOne({ 
        enquiryNo: updateData.enquiryNo,
        _id: { $ne: id } // Exclude current enquiry from check
      });
      if (existingEnquiry) {
        return next(new AppError('Enquiry number already exists', 400));
      }
    }

    const enquiry = await DGEnquiry.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer');

    if (!enquiry) {
      return next(new AppError('DG Enquiry not found', 404));
    }

    console.log('Updated enquiry:', enquiry);

    res.status(200).json({
      success: true,
      data: enquiry,
      message: 'DG Enquiry updated successfully'
    });
  } catch (error: any) {
    console.error('Update error:', error);
    if (error.code === 11000) {
      return next(new AppError('Enquiry number already exists', 400));
    }
    next(error);
  }
};

// Delete DG Enquiry
export const deleteDGEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const enquiry = await DGEnquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return next(new AppError('DG Enquiry not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'DG Enquiry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all DG Enquiries with pagination and filtering
export const getAllDGEnquiries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getDGEnquiriesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    const { page, limit, search, status, customerType, segment } = value;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { enquiryNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { corporateName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.enquiryStatus = status;
    }

    if (customerType) {
      filter.customerType = customerType;
    }

    if (segment) {
      filter.segment = segment;
    }

    // Execute query with pagination
    const enquiries = await DGEnquiry.find(filter)
      .populate('customer')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('enquiries123', enquiries);
    console.log('Sample enquiry pinCode:', enquiries[0]?.pinCode);

    // Get total count for pagination
    const total = await DGEnquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: enquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get DG Enquiry statistics
export const getDGEnquiryStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await DGEnquiry.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStatus', 'Open'] }, 1, 0]
            }
          },
          inProgress: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStatus', 'In Progress'] }, 1, 0]
            }
          },
          closed: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStatus', 'Closed'] }, 1, 0]
            }
          },
          qualified: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStatus', 'Qualified'] }, 1, 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$enquiryStatus', 'Cancelled'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const segmentStats = await DGEnquiry.aggregate([
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const customerTypeStats = await DGEnquiry.aggregate([
      {
        $group: {
          _id: '$customerType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          total: 0,
          open: 0,
          inProgress: 0,
          closed: 0,
          qualified: 0,
          cancelled: 0
        },
        segments: segmentStats,
        customerTypes: customerTypeStats
      }
    });
  } catch (error) {
    next(error);
  }
}; 