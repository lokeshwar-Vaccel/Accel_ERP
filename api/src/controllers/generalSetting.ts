import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import Company from '../models/GenaralSetting';

export const createCompany = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const company = await Company.create(req.body);

    console.log("company",company);
    
    const response: APIResponse = {
      success: true,
      message: 'Company created successfully',
      data: company,
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getCompanies = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query as QueryParams;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const total = await Company.countDocuments();
    const companies = await Company.find()
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const response: APIResponse = {
      success: true,
      message: 'Companies retrieved successfully',
      data: {
        companies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
       res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const response: APIResponse = {
      success: true,
      message: 'Company retrieved successfully',
      data: company,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const updatedCompany = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCompany) {
      res.status(404).json({
        success: false,
        message: 'Company not found',
      });
      return;
    }

    const response: APIResponse = {
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await Company.findByIdAndDelete(req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Company not found',
      });
      return;
    }

    const response: APIResponse = {
      success: true,
      message: 'Company deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
