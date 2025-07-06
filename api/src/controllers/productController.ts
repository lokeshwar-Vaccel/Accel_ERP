import { Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, ProductCategory, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Stock } from '../models/Stock';

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
      sort = '-createdAt', 
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
        { modelNumber: { $regex: search, $options: 'i' } }
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
    const productData = {
      ...req.body,
      createdBy: req.user!.id
    };
  

    const product = await Product.create(productData);

    const populatedProduct = await Product.findById(product._id)
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Product created successfully',
      data: {
        product: populatedProduct
      }
    };

    res.status(201).json(response);
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

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

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