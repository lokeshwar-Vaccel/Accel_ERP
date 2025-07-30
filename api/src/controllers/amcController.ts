import { Response, NextFunction } from 'express';
import { AMC } from '../models/AMC';
import { AuthenticatedRequest, APIResponse, AMCStatus, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all AMC contracts
// @route   GET /api/v1/amc
// @access  Private
export const getAMCContracts = async (
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
      status,
      customer,
      dateFrom,
      dateTo,
      expiringIn
    } = req.query as QueryParams & {
      status?: AMCStatus;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      expiringIn?: string;
    };

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { terms: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Handle expiring contracts filter
    if (expiringIn) {
      const days = parseInt(expiringIn);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      query.endDate = { $lte: expiryDate };
      query.status = AMCStatus.ACTIVE;
    }

    // Execute query with pagination
    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AMC.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'AMC contracts retrieved successfully',
      data: { contracts },
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

// @desc    Get single AMC contract
// @route   GET /api/v1/amc/:id
// @access  Private
export const getAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id)
      .populate('customer', 'name email phone address customerType')
      .populate('products', 'name category brand modelNumber specifications')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email phone');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC contract retrieved successfully',
      data: { contract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new AMC contract
// @route   POST /api/v1/amc
// @access  Private
export const createAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate contract number
    const contractCount = await AMC.countDocuments();
    const contractNumber = `AMC-${new Date().getFullYear()}-${String(contractCount + 1).padStart(4, '0')}`;

    // Calculate next visit date (30 days from start)
    const nextVisitDate = new Date(req.body.startDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 30);

    const contractData = {
      ...req.body,
      contractNumber,
      nextVisitDate,
      completedVisits: 0,
      createdBy: req.user!.id
    };

    const contract = await AMC.create(contractData);

    const populatedContract = await AMC.findById(contract._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract created successfully',
      data: { contract: populatedContract }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract
// @route   PUT /api/v1/amc/:id
// @access  Private
export const updateAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const updatedContract = await AMC.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract updated successfully',
      data: { contract: updatedContract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule AMC visit
// @route   POST /api/v1/amc/:id/schedule-visit
// @access  Private
export const scheduleAMCVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scheduledDate, assignedTo, visitType, estimatedDuration, notes } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const visitData = {
      scheduledDate: new Date(scheduledDate),
      assignedTo,
      status: 'pending' as const,
      notes
    };

    contract.visitSchedule.push(visitData);
    
    // Update next visit date
    const nextVisit = new Date(scheduledDate);
    nextVisit.setDate(nextVisit.getDate() + 30); // Next visit in 30 days
    contract.nextVisitDate = nextVisit;

    await contract.save();

    const populatedContract = await AMC.findById(contract._id)
      .populate('visitSchedule.assignedTo', 'firstName lastName email phone');

    const response: APIResponse = {
      success: true,
      message: 'AMC visit scheduled successfully',
      data: { 
        contract: populatedContract,
        newVisit: visitData
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete AMC visit
// @route   PUT /api/v1/amc/:id/visits/:visitId
// @access  Private
export const completeAMCVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { notes, workCompleted, partsUsed } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const visit = (contract.visitSchedule as any).id(req.params.visitId);
    if (!visit) {
      return next(new AppError('Visit not found', 404));
    }

    visit.completedDate = new Date();
    visit.status = 'completed';
    visit.notes = notes;

    // Increment completed visits count
    contract.completedVisits += 1;

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC visit completed successfully',
      data: { 
        contract,
        completedVisit: visit
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Renew AMC contract
// @route   POST /api/v1/amc/:id/renew
// @access  Private
export const renewAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      newStartDate, 
      newEndDate, 
      newContractValue, 
      newScheduledVisits, 
      priceAdjustment, 
      updatedTerms, 
      addProducts, 
      removeProducts
    } = req.body;

    const contract = await AMC.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Apply price adjustment if specified
    let finalContractValue = newContractValue;
    if (priceAdjustment) {
      if (priceAdjustment.type === 'percentage') {
        finalContractValue = contract.contractValue * (1 + priceAdjustment.value / 100);
      } else if (priceAdjustment.type === 'fixed') {
        finalContractValue = contract.contractValue + priceAdjustment.value;
      }
    }

    // Calculate next visit date (30 days from start)
    const nextVisitDate = new Date(newStartDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 30);

    // Update existing contract with new details
    contract.startDate = new Date(newStartDate);
    contract.endDate = new Date(newEndDate);
    contract.contractValue = finalContractValue;
    contract.scheduledVisits = newScheduledVisits;
    contract.status = AMCStatus.ACTIVE;
    contract.terms = updatedTerms || contract.terms;
    contract.nextVisitDate = nextVisitDate;
    contract.completedVisits = 0; // Reset completed visits

    // Update products if specified
    if (addProducts && addProducts.length > 0) {
      contract.products = [...contract.products, ...addProducts];
    }
    if (removeProducts && removeProducts.length > 0) {
      contract.products = contract.products.filter(product => 
        !removeProducts.includes(product.toString())
      );
    }

    await contract.save();

    // Populate the updated contract for response
    const populatedContract = await AMC.findById(contract._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract renewed successfully',
      data: { 
        contract: populatedContract,
        priceAdjustment: priceAdjustment ? {
          type: priceAdjustment.type,
          value: priceAdjustment.value,
          reason: priceAdjustment.reason
        } : null
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiring contracts
// @route   GET /api/v1/amc/expiring
// @access  Private
export const getExpiringContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const expiringContracts = await AMC.find({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category')
      .sort({ endDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts expiring in ${days} days retrieved successfully`,
      data: { 
        contracts: expiringContracts,
        count: expiringContracts.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC statistics
// @route   GET /api/v1/amc/stats
// @access  Private
export const getAMCStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalContracts = await AMC.countDocuments();
    const activeContracts = await AMC.countDocuments({ status: AMCStatus.ACTIVE });
    const expiredContracts = await AMC.countDocuments({ status: AMCStatus.EXPIRED });
    const cancelledContracts = await AMC.countDocuments({ status: AMCStatus.CANCELLED });

    // Contracts expiring in next 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiringContracts = await AMC.countDocuments({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    });

    // Total contract value
    const contractValueStats = await AMC.aggregate([
      { $match: { status: AMCStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$contractValue' },
          avgValue: { $avg: '$contractValue' }
        }
      }
    ]);

    // Visit completion rate
    const visitStats = await AMC.aggregate([
      { $match: { status: AMCStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          totalScheduled: { $sum: '$scheduledVisits' },
          totalCompleted: { $sum: '$completedVisits' }
        }
      }
    ]);

    const visitCompletionRate = visitStats[0] ? 
      (visitStats[0].totalCompleted / visitStats[0].totalScheduled * 100) : 0;

    const response: APIResponse = {
      success: true,
      message: 'AMC statistics retrieved successfully',
      data: {
        totalContracts,
        activeContracts,
        expiredContracts,
        cancelledContracts,
        expiringContracts,
        totalContractValue: contractValueStats[0]?.totalValue || 0,
        avgContractValue: contractValueStats[0]?.avgValue || 0,
        visitCompletionRate: Math.round(visitCompletionRate)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Generate AMC reports
// @route   GET /api/v1/amc/reports/:type
// @access  Private
export const generateAMCReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type } = req.params;
    const { dateFrom, dateTo, customer, status, format = 'json' } = req.query as {
      dateFrom?: string;
      dateTo?: string;
      customer?: string;
      status?: AMCStatus;
      format?: 'json' | 'csv' | 'pdf';
    };

    const query: any = {};
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (status) {
      query.status = status;
    }

    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email');

    let reportData: any = {};

    switch (type) {
      case 'contract_summary':
        reportData = {
          totalContracts: contracts.length,
          activeContracts: contracts.filter(c => c.status === AMCStatus.ACTIVE).length,
          expiredContracts: contracts.filter(c => c.status === AMCStatus.EXPIRED).length,
          totalValue: contracts.reduce((sum, c) => sum + c.contractValue, 0),
          averageContractValue: contracts.length > 0 ? contracts.reduce((sum, c) => sum + c.contractValue, 0) / contracts.length : 0,
          contractsByStatus: contracts.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          contracts: contracts
        };
        break;

      case 'revenue_analysis':
        const monthlyRevenue = contracts.reduce((acc, c) => {
          const month = new Date(c.createdAt).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + c.contractValue;
          return acc;
        }, {} as Record<string, number>);

        reportData = {
          totalRevenue: contracts.reduce((sum, c) => sum + c.contractValue, 0),
          monthlyRevenue,
          averageRevenuePerContract: contracts.length > 0 ? contracts.reduce((sum, c) => sum + c.contractValue, 0) / contracts.length : 0,
          revenueByStatus: contracts.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + c.contractValue;
            return acc;
          }, {} as Record<string, number>)
        };
        break;

             case 'visit_completion':
         const visitStats = contracts.reduce((acc, c) => {
           acc.totalScheduled += c.scheduledVisits;
           acc.totalCompleted += c.completedVisits;
           acc.overdueVisits += Math.max(0, c.scheduledVisits - c.completedVisits);
           return acc;
         }, { totalScheduled: 0, totalCompleted: 0, overdueVisits: 0 });

         reportData = {
           ...visitStats,
           completionRate: visitStats.totalScheduled > 0 ? (visitStats.totalCompleted / visitStats.totalScheduled) * 100 : 0,
           contracts: contracts.map(c => ({
             contractNumber: c.contractNumber,
             customer: (c.customer as any)?.name || 'Unknown',
             scheduledVisits: c.scheduledVisits,
             completedVisits: c.completedVisits,
             completionRate: c.scheduledVisits > 0 ? (c.completedVisits / c.scheduledVisits) * 100 : 0
           }))
         };
         break;

       case 'customer_satisfaction':
         const customerStats = contracts.reduce((acc, c) => {
           const customerName = (c.customer as any)?.name || 'Unknown';
           if (!acc[customerName]) {
             acc[customerName] = {
               totalContracts: 0,
               totalValue: 0,
               averageSatisfaction: 0,
               contracts: []
             };
           }
           acc[customerName].totalContracts++;
           acc[customerName].totalValue += c.contractValue;
           acc[customerName].contracts.push(c);
           return acc;
         }, {} as Record<string, any>);

         reportData = {
           customerStats,
           topCustomers: Object.entries(customerStats)
             .sort(([, a], [, b]) => b.totalValue - a.totalValue)
             .slice(0, 10)
         };
         break;

             case 'expiring_contracts':
         const thirtyDaysFromNow = new Date();
         thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
         
         const expiringContracts = contracts.filter(c => {
           const endDate = new Date(c.endDate);
           return endDate <= thirtyDaysFromNow && c.status === AMCStatus.ACTIVE;
         });

         reportData = {
           expiringContracts: expiringContracts.length,
           totalValueAtRisk: expiringContracts.reduce((sum, c) => sum + c.contractValue, 0),
           contracts: expiringContracts.map(c => ({
             contractNumber: c.contractNumber,
             customer: (c.customer as any)?.name || 'Unknown',
             endDate: c.endDate,
             contractValue: c.contractValue,
             daysUntilExpiry: Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
           }))
         };
         break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    const response: APIResponse = {
      success: true,
      message: `${type.replace('_', ' ')} report generated successfully`,
      data: reportData
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Enhanced visit scheduling with automatic scheduling
// @route   POST /api/v1/amc/:id/schedule-visit-enhanced
// @access  Private
export const scheduleEnhancedVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      scheduledDate, 
      assignedTo, 
      visitType = 'routine',
      estimatedDuration = 2,
      notes,
      autoSchedule = false,
      scheduleType = 'manual' // manual, automatic, optimized
    } = req.body;

    const amc = await AMC.findById(id)
      .populate('customer', 'name email phone address')
      .populate('products', 'name category brand modelNumber');

    if (!amc) {
      throw new AppError('AMC contract not found', 404);
    }

    let visitSchedule: any[] = [];

    if (autoSchedule) {
      // Generate automatic visit schedule based on contract terms
      const startDate = new Date(amc.startDate);
      const endDate = new Date(amc.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const visitsPerMonth = amc.scheduledVisits / (totalDays / 30);
      
      for (let i = 0; i < amc.scheduledVisits; i++) {
        const visitDate = new Date(startDate);
        visitDate.setDate(startDate.getDate() + (i * (totalDays / amc.scheduledVisits)));
        
        visitSchedule.push({
          scheduledDate: visitDate.toISOString(),
          assignedTo: assignedTo || amc.createdBy,
          visitType: 'routine',
          estimatedDuration,
          notes: `Scheduled visit ${i + 1} of ${amc.scheduledVisits}`,
          status: 'pending'
        });
      }
    } else {
      // Single visit scheduling
      visitSchedule = [{
        scheduledDate,
        assignedTo,
        visitType,
        estimatedDuration,
        notes,
        status: 'pending'
      }];
    }

    // Update AMC with new visit schedule
    amc.visitSchedule = [...(amc.visitSchedule || []), ...visitSchedule];
    await amc.save();

    const response: APIResponse = {
      success: true,
      message: 'Visit(s) scheduled successfully',
      data: { visits: visitSchedule, amc }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk contract renewal
// @route   POST /api/v1/amc/bulk-renew
// @access  Private
export const bulkRenewContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractIds, renewalTerms, priceAdjustment } = req.body;

    const contracts = await AMC.find({ _id: { $in: contractIds } })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber');

    if (contracts.length === 0) {
      throw new AppError('No valid contracts found for renewal', 404);
    }

    const renewedContracts = [];

    for (const contract of contracts) {
      // Calculate new end date (extend by original duration)
      const originalStart = new Date(contract.startDate);
      const originalEnd = new Date(contract.endDate);
      const duration = originalEnd.getTime() - originalStart.getTime();
      
      const newStartDate = new Date(originalEnd);
      const newEndDate = new Date(newStartDate.getTime() + duration);

      // Apply price adjustment if specified
      let newContractValue = contract.contractValue;
      if (priceAdjustment) {
        if (priceAdjustment.type === 'percentage') {
          newContractValue = contract.contractValue * (1 + priceAdjustment.value / 100);
        } else if (priceAdjustment.type === 'fixed') {
          newContractValue = contract.contractValue + priceAdjustment.value;
        }
      }

      // Calculate next visit date (30 days from start)
      const nextVisitDate = new Date(newStartDate);
      nextVisitDate.setDate(nextVisitDate.getDate() + 30);

      // Update existing contract with new details
      contract.startDate = newStartDate;
      contract.endDate = newEndDate;
      contract.contractValue = newContractValue;
      contract.status = AMCStatus.ACTIVE;
      contract.terms = renewalTerms || contract.terms;
      contract.nextVisitDate = nextVisitDate;
      contract.completedVisits = 0; // Reset completed visits

      await contract.save();

      // Populate the updated contract for response
      const populatedContract = await AMC.findById(contract._id)
        .populate('customer', 'name email phone')
        .populate('products', 'name category brand modelNumber')
        .populate('createdBy', 'firstName lastName email');

      renewedContracts.push(populatedContract);
    }

    const response: APIResponse = {
      success: true,
      message: `${renewedContracts.length} contracts renewed successfully`,
      data: { renewedContracts }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC performance metrics
// @route   GET /api/v1/amc/:id/performance
// @access  Private
export const getAMCPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const amc = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber')
      .populate('visitSchedule.assignedTo', 'firstName lastName email');

    if (!amc) {
      throw new AppError('AMC contract not found', 404);
    }

    // Calculate performance metrics
    const totalVisits = amc.scheduledVisits;
    const completedVisits = amc.completedVisits;
    const completionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;
    
    const daysUntilExpiry = Math.ceil((new Date(amc.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const contractProgress = Math.max(0, Math.min(100, ((new Date().getTime() - new Date(amc.startDate).getTime()) / (new Date(amc.endDate).getTime() - new Date(amc.startDate).getTime())) * 100));

         const performanceMetrics = {
       contractProgress,
       completionRate,
       daysUntilExpiry,
       remainingVisits: totalVisits - completedVisits,
       overdueVisits: Math.max(0, totalVisits - completedVisits),
       averageResponseTime: 0,
       customerSatisfaction: 0,
       issueResolutionRate: 0
     };

    const response: APIResponse = {
      success: true,
      message: 'AMC performance metrics retrieved successfully',
      data: { amc, performanceMetrics }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Get AMC contract by ID with full details
// @route   GET /api/v1/amc/:id/details
// @access  Private
export const getAMCDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id)
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand modelNumber serialNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Calculate additional metrics
    const daysUntilExpiry = Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = contract.scheduledVisits > 0 ? (contract.completedVisits / contract.scheduledVisits) * 100 : 0;
    const remainingVisits = Math.max(0, contract.scheduledVisits - contract.completedVisits);

    const response: APIResponse = {
      success: true,
      message: 'AMC contract details retrieved successfully',
      data: {
        contract,
        metrics: {
          daysUntilExpiry,
          completionRate,
          remainingVisits,
          overdueVisits: Math.max(0, contract.scheduledVisits - contract.completedVisits)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract status
// @route   PUT /api/v1/amc/:id/status
// @access  Private
export const updateAMCStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, reason } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    contract.status = status;
    if (reason) {
      contract.terms = contract.terms ? `${contract.terms}\n\nStatus Update: ${reason}` : `Status Update: ${reason}`;
    }

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC contract status updated successfully',
      data: { contract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contracts by customer
// @route   GET /api/v1/amc/customer/:customerId
// @access  Private
export const getAMCsByCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, status } = req.query as {
      page?: string;
      limit?: string;
      status?: AMCStatus;
    };

    const query: any = { customer: customerId };
    if (status) {
      query.status = status;
    }

    const contracts = await AMC.find(query)
      .populate('products', 'name category brand modelNumber')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AMC.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'Customer AMC contracts retrieved successfully',
      data: { contracts },
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

// @desc    Get AMC contracts expiring soon
// @route   GET /api/v1/amc/expiring-soon
// @access  Private
export const getExpiringSoon = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const expiringContracts = await AMC.find({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .sort({ endDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts expiring in ${days} days retrieved successfully`,
      data: { 
        contracts: expiringContracts,
        count: expiringContracts.length,
        totalValue: expiringContracts.reduce((sum, c) => sum + c.contractValue, 0)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contracts requiring visits
// @route   GET /api/v1/amc/visits-due
// @access  Private
export const getVisitsDue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 7 } = req.query;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    // Find contracts where next visit is due or overdue
    const contractsDue = await AMC.find({
      status: AMCStatus.ACTIVE,
      $or: [
        { nextVisitDate: { $lte: dueDate } },
        { completedVisits: { $lt: '$scheduledVisits' } }
      ]
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .sort({ nextVisitDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts with visits due in ${days} days retrieved successfully`,
      data: { 
        contracts: contractsDue,
        count: contractsDue.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC dashboard statistics
// @route   GET /api/v1/amc/dashboard
// @access  Private
export const getAMCDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalContracts,
      activeContracts,
      expiredContracts,
      expiringSoon,
      totalValue,
      monthlyRevenue
    ] = await Promise.all([
      AMC.countDocuments(),
      AMC.countDocuments({ status: AMCStatus.ACTIVE }),
      AMC.countDocuments({ status: AMCStatus.EXPIRED }),
      AMC.countDocuments({
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        status: AMCStatus.ACTIVE
      }),
      AMC.aggregate([
        { $match: { status: AMCStatus.ACTIVE } },
        { $group: { _id: null, total: { $sum: '$contractValue' } } }
      ]),
      AMC.aggregate([
        { $match: { status: AMCStatus.ACTIVE } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$contractValue' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'AMC dashboard statistics retrieved successfully',
      data: {
        totalContracts,
        activeContracts,
        expiredContracts,
        expiringSoon,
        totalValue: totalValue[0]?.total || 0,
        monthlyRevenue,
        completionRate: activeContracts > 0 ? (activeContracts / totalContracts) * 100 : 0
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Delete AMC contract
// @route   DELETE /api/v1/amc/:id
// @access  Private (Admin/Super Admin only)
export const deleteAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the contract first to check if it exists
    const contract = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Check if contract can be deleted (not active contracts)
    if (contract.status === AMCStatus.ACTIVE) {
      return next(new AppError('Cannot delete active contracts. Please cancel or expire the contract first.', 400));
    }

    // Check if contract has completed visits (optional business rule)
    if (contract.completedVisits > 0) {
      return next(new AppError('Cannot delete contracts with completed visits. Please archive instead.', 400));
    }

    // Delete the contract
    await AMC.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'AMC contract deleted successfully',
      data: { 
        deletedContract: {
          _id: contract._id,
          contractNumber: contract.contractNumber,
          customer: contract.customer,
          products: contract.products,
          status: contract.status,
          deletedAt: new Date()
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete AMC contracts
// @route   DELETE /api/v1/amc/bulk-delete
// @access  Private (Admin/Super Admin only)
export const bulkDeleteAMCContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractIds, reason } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return next(new AppError('Contract IDs are required', 400));
    }

    // Find all contracts to check their status
    const contracts = await AMC.find({ _id: { $in: contractIds } })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (contracts.length === 0) {
      return next(new AppError('No valid contracts found', 404));
    }

    // Check for active contracts
    const activeContracts = contracts.filter(c => c.status === AMCStatus.ACTIVE);
    if (activeContracts.length > 0) {
      return next(new AppError(`Cannot delete ${activeContracts.length} active contracts. Please cancel or expire them first.`, 400));
    }

    // Check for contracts with completed visits
    const contractsWithVisits = contracts.filter(c => c.completedVisits > 0);
    if (contractsWithVisits.length > 0) {
      return next(new AppError(`Cannot delete ${contractsWithVisits.length} contracts with completed visits. Please archive instead.`, 400));
    }

    // Delete all contracts
    const deleteResult = await AMC.deleteMany({ _id: { $in: contractIds } });

    const response: APIResponse = {
      success: true,
      message: `${deleteResult.deletedCount} AMC contracts deleted successfully`,
      data: { 
        deletedCount: deleteResult.deletedCount,
        deletedContracts: contracts.map(c => ({
          _id: c._id,
          contractNumber: c.contractNumber,
          customer: c.customer,
          status: c.status
        })),
        reason: reason || 'Bulk deletion'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Archive AMC contract (soft delete)
// @route   PUT /api/v1/amc/:id/archive
// @access  Private (Admin/Super Admin only)
export const archiveAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Archive the contract by setting status to cancelled
    contract.status = AMCStatus.CANCELLED;
    if (reason) {
      contract.terms = contract.terms ? `${contract.terms}\n\nArchived: ${reason}` : `Archived: ${reason}`;
    }

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC contract archived successfully',
      data: { 
        contract,
        archivedAt: new Date(),
        reason: reason || 'Manual archive'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 