import { Response, NextFunction } from 'express';
import { StockLocation,Stock } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all stock locations
// @route   GET /api/v1/stock/locations
// @access  Private
export const getStockLocations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, sort = '-updatedAt', search } = req.query as QueryParams & {
      search?: string;
    };

    // Build query
    const query: any = { isActive: true }; // Only return active locations

    // Handle search by name or address
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const locations = await StockLocation.find(query)
      .sort({"name": 1})
      // .limit(Number(limit))
      // .skip((Number(page) - 1) * Number(limit))
      .select('-__v'); // Exclude __v field

    const total = await StockLocation.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Stock locations retrieved successfully',
      data: { locations },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new stock location
// @route   POST /api/v1/stock/locations
// @access  Private
export const createStockLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, address, type, contactPerson, phone, isPrimary } = req.body;

    // If setting as primary, remove primary status from all other locations
    if (isPrimary) {
      await StockLocation.updateMany(
        { isPrimary: true },
        { isPrimary: false }
      );
    }

    const location = await StockLocation.create({
      name,
      address,
      type,
      contactPerson,
      phone,
      isActive: true,
      isPrimary: isPrimary || false,
    });

    const response: APIResponse = {
      success: true,
      message: 'Stock location created successfully',
      data: { location },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a stock location
// @route   PUT /api/v1/stock/locations/:id
// @access  Private
export const updateStockLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, address, type, contactPerson, phone, isActive, isPrimary } = req.body;

    // If setting as primary, remove primary status from all other locations
    if (isPrimary) {
      await StockLocation.updateMany(
        { isPrimary: true, _id: { $ne: req.params.id } },
        { isPrimary: false }
      );
    }

    const location = await StockLocation.findByIdAndUpdate(
      req.params.id,
      { name, address, type, contactPerson, phone, isActive, isPrimary },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!location) {
      return next(new AppError('Stock location not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Stock location updated successfully',
      data: { location },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a stock location (hard delete)
// @route   DELETE /api/v1/stock/locations/:id
// @access  Private
export const deleteStockLocation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if location is used in Stock records
      const stockCount = await Stock.countDocuments({ location: req.params.id });
      if (stockCount > 0) {
        return next(new AppError('Cannot delete location with active stock', 400));
      }
  
      const location = await StockLocation.findByIdAndDelete(req.params.id);
  
      if (!location) {
        return next(new AppError('Stock location not found', 404));
      }
  
      const response: APIResponse = {
        success: true,
        message: 'Stock location deleted successfully',
        data: null,
      };
  
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

// @desc    Toggle stock location active status
// @route   PATCH /api/v1/stock/locations/:id/activate
// @access  Private
export const toggleStockLocationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const location = await StockLocation.findById(req.params.id).select('-__v');

    if (!location) {
      return next(new AppError('Stock location not found', 404));
    }

    // Prevent activating a location with existing stock records
    if (!location.isActive) {
      const stockCount = await Stock.countDocuments({ location: req.params.id });
      if (stockCount > 0) {
        return next(new AppError('Cannot activate location with existing stock records', 400));
      }
    }

    location.isActive = !location.isActive;
    await location.save();

    const response: APIResponse = {
      success: true,
      message: `Stock location ${location.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { location },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Set a stock location as primary
// @route   PATCH /api/v1/stock/locations/:id/set-primary
// @access  Private
export const setPrimaryLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const locationId = req.params.id;

    // First, remove primary status from all locations
    await StockLocation.updateMany(
      { isPrimary: true },
      { isPrimary: false }
    );

    // Then set the specified location as primary
    const location = await StockLocation.findByIdAndUpdate(
      locationId,
      { isPrimary: true },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!location) {
      return next(new AppError('Stock location not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Primary location updated successfully',
      data: { location },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};