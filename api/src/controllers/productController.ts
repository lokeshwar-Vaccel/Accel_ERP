import { Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, ProductCategory, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Stock, StockLocation } from '../models/Stock';
import mongoose from 'mongoose';

// Helper function to get or create default location/room/rack for automatic stock creation
const getOrCreateDefaultLocation = async () => {
  try {
    // Try to find existing default location
    let defaultLocation = await StockLocation.findOne({ name: 'Default Location' });
    
    if (!defaultLocation) {
      // Create default location if it doesn't exist
      defaultLocation = await StockLocation.create({
        name: 'Default Location',
        address: 'Main Office - General Inventory',
        type: 'main_office',
        contactPerson: 'Inventory Manager',
        isActive: true
      });
    }

    return {
      locationId: defaultLocation._id,
      roomId: null, // Room and rack are optional
      rackId: null
    };
  } catch (error) {
    console.error('Error getting/creating default location:', error);
    // Return null if we can't create default location
    return null;
  }
};

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'name', 
      search, 
      category, 
      brand,
      isActive,
      minPrice,
      maxPrice
    } = req.query as QueryParams & {
      category?: ProductCategory;
      brand?: string;
      isActive?: string | boolean;
      minPrice?: string;
      maxPrice?: string;
    };

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { modelNumber: { $regex: search, $options: 'i' } },
        { partNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === true || isActive === 'true';
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Execute query with pagination
    
    const products = await Product.find(query)
      .populate('createdBy', 'firstName lastName email')
      .collation({ locale: 'en', strength: 2 }) // Case-insensitive sorting
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Products retrieved successfully',
      data: { products },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private
export const getProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Transform empty strings to null for optional ObjectId fields
    const productData = {
      ...req.body,
      createdBy: req.user!.id,
      room: req.body.room && req.body.room.trim() !== '' ? req.body.room : null,
      rack: req.body.rack && req.body.rack.trim() !== '' ? req.body.rack : null
    };
  
    const product = await Product.create(productData);

    // Always create stock entry - use provided location or default location
    let stock = null;
    try {
      let locationId = productData.location;
      let roomId = productData.room || null;
      let rackId = productData.rack || null;

      // If no location provided, get or create default location
      if (!locationId) {
        const defaultLocation = await getOrCreateDefaultLocation();
        if (defaultLocation) {
          locationId = defaultLocation.locationId;
          roomId = defaultLocation.roomId;
          rackId = defaultLocation.rackId;
        }
      }

      // Create stock entry if we have a location
      if (locationId) {
        const stockData = {
          product: product._id,
          location: locationId,
          room: roomId,
          rack: rackId,
          quantity: req.body.quantity || 0,
          availableQuantity: req.body.quantity || 0,
          reservedQuantity: 0,
          lastUpdated: new Date()
        };

        stock = await Stock.create(stockData);
      } else {
        console.warn('Could not create stock entry - no location available');
      }
    } catch (stockError) {
      console.error('Error creating stock entry:', stockError);
      // Don't fail product creation if stock creation fails
      // Just log the error and continue
    }

    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: stock 
        ? 'Product created successfully and added to inventory' 
        : 'Product created successfully (inventory entry failed)',
      data: {
        product: populatedProduct,
        stock: stock
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products for dropdown (no pagination)
// @route   GET /api/v1/products/dropdown
// @access  Private
export const getProductsForDropdown = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      search, 
      category, 
      brand,
      isActive,
      limit = 1000 // Higher limit for dropdown but still capped
    } = req.query as {
      search?: string;
      category?: ProductCategory;
      brand?: string;
      isActive?: string | boolean;
      limit?: string;
    };

    // Build query
    const query: any = { isActive: true }; // Only active products for dropdown
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partNo: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === true || isActive === 'true';
    }

    // Execute query without pagination, optimized for dropdown
    const products = await Product.find(query)
      .select('name partNo hsnNumber category brand price isActive') // Only essential fields
      .collation({ locale: 'en', strength: 2 }) // Case-insensitive sorting
      .sort({ name: 1 }) // Sort by name for better UX
      .limit(Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Products for dropdown retrieved successfully',
      data: products
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private


// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private
export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Transform empty strings to null for optional ObjectId fields
    const updateData = {
      ...req.body,
      room: req.body.room !== undefined ? (req.body.room && req.body.room.trim() !== '' ? req.body.room : null) : undefined,
      rack: req.body.rack !== undefined ? (req.body.rack && req.body.rack.trim() !== '' ? req.body.rack : null) : undefined
    };

    // Check if location fields are being updated
    const locationChanged = updateData.location !== undefined && updateData.location !== product.location;
    const roomChanged = updateData.room !== undefined && updateData.room !== product.room;
    const rackChanged = updateData.rack !== undefined && updateData.rack !== product.rack;

    // Debug: log incoming update payload
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    // If location, room, or rack changed, update the stock entry
    if (locationChanged || roomChanged || rackChanged) {
      try {
        // Find existing stock entry for this product
        const existingStock = await Stock.findOne({ product: req.params.id });
        
        if (existingStock) {
          // Update existing stock entry with new location details
          const stockUpdateData: any = {};
          if (locationChanged) stockUpdateData.location = req.body.location;
          if (roomChanged) stockUpdateData.room = req.body.room;
          if (rackChanged) stockUpdateData.rack = req.body.rack;
          
          await Stock.findByIdAndUpdate(existingStock._id, stockUpdateData);
        } else if (req.body.location) {
          // Create new stock entry if none exists but location is provided
          const stockData = {
            product: req.params.id,
            location: req.body.location,
            room: req.body.room || null,
            rack: req.body.rack || null,
            quantity: req.body.quantity || 0,
            availableQuantity: req.body.quantity || 0,
            reservedQuantity: 0,
            lastUpdated: new Date()
          };
          await Stock.create(stockData);
        }
      } catch (stockError) {
        console.error('Error updating stock entry:', stockError);
        // Don't fail product update if stock update fails
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private
export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    await Product.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Product deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Activate/Deactivate product
// @route   PUT /api/v1/products/:id/activate
// @access  Private
export const toggleProductStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    product.isActive = isActive;
    await product.save();

    const response: APIResponse = {
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { product }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get product categories
// @route   GET /api/v1/products/categories
// @access  Private
export const getProductCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = Object.values(ProductCategory);
    
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Product categories retrieved successfully',
      data: { 
        categories,
        stats: categoryStats
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Private
export const searchProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, category, limit = 10 } = req.query;

    if (!q) {
      return next(new AppError('Search query is required', 400));
    }

    const query: any = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { modelNumber: { $regex: q, $options: 'i' } }
      ]
    };

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .select('name description category brand price')
      .limit(Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Products found',
      data: { 
        products,
        count: products.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Get products with inventory details
// @route   GET /api/v1/products/with-inventory
// @access  Private
export const getProductsWithInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      search, 
      category, 
      brand,
      isActive = true
    } = req.query as {
      search?: string;
      category?: string;
      brand?: string;
      isActive?: string | boolean;
    };

    // Build query for products
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { modelNumber: { $regex: search, $options: 'i' } },
        { partNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === true || isActive === 'true';
    }

    // Optimized: Use aggregation pipeline to get products with inventory in a single query
    const productsWithInventory = await Product.aggregate([
      // Match products based on query
      { $match: query },
      
      // Lookup stock information for each product
      {
        $lookup: {
          from: 'stocks',
          localField: '_id',
          foreignField: 'product',
          as: 'stockDetails'
        }
      },
      
      // Add computed fields for total inventory
      {
        $addFields: {
          stockQuantity: {
            $sum: '$stockDetails.availableQuantity'
          },
          totalQuantity: {
            $sum: '$stockDetails.quantity'
          },
          reservedQuantity: {
            $sum: '$stockDetails.reservedQuantity'
          }
        }
      },
      
      // Populate stock details with location, room, and rack information
      {
        $lookup: {
          from: 'stocklocations',
          localField: 'stockDetails.location',
          foreignField: '_id',
          as: 'stockDetailsWithLocation'
        }
      },
      
      {
        $lookup: {
          from: 'stockrooms',
          localField: 'stockDetails.room',
          foreignField: '_id',
          as: 'stockDetailsWithRoom'
        }
      },
      
      {
        $lookup: {
          from: 'stockracks',
          localField: 'stockDetails.rack',
          foreignField: '_id',
          as: 'stockDetailsWithRack'
        }
      },
      
      // Transform stock details to include populated location, room, and rack
      {
        $addFields: {
          stockDetails: {
            $map: {
              input: '$stockDetails',
              as: 'stock',
              in: {
                location: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$stockDetailsWithLocation',
                        as: 'loc',
                        cond: { $eq: ['$$loc._id', '$$stock.location'] }
                      }
                    },
                    0
                  ]
                },
                room: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$stockDetailsWithRoom',
                        as: 'room',
                        cond: { $eq: ['$$room._id', '$$stock.room'] }
                      }
                    },
                    0
                  ]
                },
                rack: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$stockDetailsWithRack',
                        as: 'rack',
                        cond: { $eq: ['$$rack._id', '$$stock.rack'] }
                      }
                    },
                    0
                  ]
                },
                quantity: '$$stock.quantity',
                reservedQuantity: '$$stock.reservedQuantity',
                availableQuantity: '$$stock.availableQuantity',
                lastUpdated: '$$stock.lastUpdated'
              }
            }
          }
        }
      },
      
      // Remove temporary lookup arrays
      {
        $project: {
          stockDetailsWithLocation: 0,
          stockDetailsWithRoom: 0,
          stockDetailsWithRack: 0
        }
      },
      
      // Sort by product name
      { $sort: { name: 1 } }
    ]);

    // Populate createdBy information (since aggregation doesn't support populate)
    const populatedProducts = await Product.populate(productsWithInventory, {
      path: 'createdBy',
      select: 'firstName lastName email'
    });

    const response: APIResponse = {
      success: true,
      message: 'Products with inventory details retrieved successfully',
      data: { 
        products: populatedProducts,
        totalProducts: populatedProducts.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 