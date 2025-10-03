import { Request, Response, NextFunction } from 'express';
import EVCustomer from '../models/EVCustomer';
import { AuthenticatedRequest, APIResponse, QueryParams, EVServiceType } from '../types';
import { AppError } from '../middleware/errorHandler';
import { createEVCustomerSchema, updateEVCustomerSchema, importEVCustomerSchema, CreateEVCustomerInput, UpdateEVCustomerInput, ImportEVCustomerInput } from '../schemas/evCustomerSchema';
import * as XLSX from 'xlsx';

// Helper: Determine service type based on service request number prefix
const getServiceTypeFromRequestNumber = (serviceRequestNumber: string): string => {
  if (!serviceRequestNumber) return '';
  
  const prefix = serviceRequestNumber.substring(0, 2).toUpperCase();
  
  switch (prefix) {
    case 'EV':
      return EVServiceType.ENQUIRY_VISIT;
    case 'SV':
      return EVServiceType.SURVEY_VISIT;
    case 'IN':
      return EVServiceType.INSTALLATION_VISIT;
    case 'CM':
      return EVServiceType.COMMISSION_VISIT;
    default:
      return '';
  }
};

// Helper: Get value from possible column names (case-insensitive, trims spaces)
const getColumnValue = (row: any, keys: string[]): string => {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.trim().toLowerCase() === key.trim().toLowerCase()) {
        return row[rowKey]?.toString().trim() || '';
      }
    }
  }
  return '';
};

// Helper: Clean headers and row keys
const cleanRowKeys = (row: any) => {
  const cleaned: any = {};
  for (const key in row) {
    cleaned[key.trim()] = row[key];
  }
  return cleaned;
};

// Helper: Safe date parsing with validation
const parseDate = (dateValue: string): Date => {
  if (!dateValue || !dateValue.trim()) {
    throw new Error('Date value is required');
  }

  try {
    let parsedDate: Date;
    
    // Check if it's already a valid date string
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // ISO format YYYY-MM-DD
      parsedDate = new Date(dateValue);
    } else if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // MM/DD/YYYY format
      const [month, day, year] = dateValue.split('/');
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateValue.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      // DD-MM-YYYY format
      const [day, month, year] = dateValue.split('-');
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateValue.match(/^\d+$/)) {
      // Excel date number (days since 1900-01-01)
      const excelDate = parseInt(dateValue);
      if (excelDate > 0 && excelDate < 100000) {
        // Convert Excel date number to JavaScript date
        const utcDays = Math.floor(excelDate - 25569);
        const utcValue = utcDays * 86400;
        parsedDate = new Date(utcValue * 1000);
      } else {
        parsedDate = new Date(dateValue);
      }
    } else {
      // Try Excel's default date parsing
      parsedDate = new Date(dateValue);
    }
    
    // Validate the parsed date
    if (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 1900 || parsedDate.getFullYear() > 2100) {
      throw new Error('Invalid date format');
    }
    
    return parsedDate;
  } catch (error) {
    throw new Error(`Invalid date format: ${dateValue}`);
  }
};

// Helper: Find the correct header row and data range
const findHeaderRowAndData = (worksheet: any) => {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Check each row to find the one with proper headers
  for (let row = range.s.r; row <= range.e.r; row++) {
    const rowData = XLSX.utils.sheet_to_json(worksheet, {
      range: row,
      header: 1,
      defval: '',
      raw: false
    })[0];
    
    if (rowData && Object.values(rowData).some(val => 
      String(val).toLowerCase() === 'booking reference' || 
      String(val).toLowerCase() === 'customer name' ||
      String(val).toLowerCase().includes('service request') ||
      String(val).toLowerCase().includes('vehicle model') ||
      String(val).toLowerCase().includes('contact number')
    )) {
      // Found the header row, return data starting from next row
      return XLSX.utils.sheet_to_json(worksheet, {
        range: row,
        defval: '',
        raw: false
      });
    }
  }
  
  // Fallback to default behavior
  return XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
    range: 1
  });
};

// @desc    Get all EV customers with pagination and search
// @route   GET /api/v1/ev-customers
// @access  Private
export const getAllEVCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sort = 'createdAt',
      serviceType,
      // Date filter parameters
      requestedDateFrom,
      requestedDateTo,
      completedDateFrom,
      completedDateTo,
      allStatusFilter,
      evStatusFilter,
      svStatusFilter,
      inStatusFilter,
      cmStatusFilter
    } = req.query as QueryParams & {
      requestedDateFrom?: string;
      requestedDateTo?: string;
      completedDateFrom?: string;
      completedDateTo?: string;
      allStatusFilter?: string;
      evStatusFilter?: string;
      svStatusFilter?: string;
      inStatusFilter?: string;
      cmStatusFilter?: string;
    };

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { 'customer.customerName': { $regex: search, $options: 'i' } },
        { 'customer.bookingReference': { $regex: search, $options: 'i' } },
        { 'customer.location': { $regex: search, $options: 'i' } },
        { 'customer.vehicleModel': { $regex: search, $options: 'i' } },
        { 'serviceRequest.serviceRequestNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.chargerSerialNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.VINNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.scope': { $regex: search, $options: 'i' } },
        { 'serviceRequest.serviceRequestStatus': { $regex: search, $options: 'i' } }
      ];

      // Handle contact number search separately since it's a Number field
      // Only add contact number search if the search term is numeric
      if (/^\d+$/.test(search)) {
        query.$or.push({ 'customer.contactNumber': parseInt(search) });
      }
    }

    // Filter by service type
    if (serviceType) {
      // Map frontend service type codes to actual service types
      let serviceTypeFilter: string;
      switch (serviceType) {
        case 'EV':
          serviceTypeFilter = 'Enquiry Visit';
          break;
        case 'SV':
          serviceTypeFilter = 'Survey Visit';
          break;
        case 'IN':
          serviceTypeFilter = 'Installation Visit';
          break;
        case 'CM':
          serviceTypeFilter = 'Commission Visit';
          break;
        default:
          serviceTypeFilter = serviceType as string;
      }
      
      query['serviceRequest.serviceType'] = serviceTypeFilter;
    }

    // Date filtering
    if (requestedDateFrom || requestedDateTo) {
      query['serviceRequest.requestedDate'] = {};
      if (requestedDateFrom) query['serviceRequest.requestedDate'].$gte = new Date(requestedDateFrom);
      if (requestedDateTo) query['serviceRequest.requestedDate'].$lte = new Date(requestedDateTo);
    }

    if (completedDateFrom || completedDateTo) {
      query['serviceRequest.completedDate'] = {};
      if (completedDateFrom) query['serviceRequest.completedDate'].$gte = new Date(completedDateFrom);
      if (completedDateTo) query['serviceRequest.completedDate'].$lte = new Date(completedDateTo);
    }

    // Handle status filters
    if (allStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = allStatusFilter;
    } else if (evStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = evStatusFilter;
    } else if (svStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = svStatusFilter;
    } else if (inStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = inStatusFilter;
    } else if (cmStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = cmStatusFilter;
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = -1; // Default to descending order

    const evCustomers = await EVCustomer.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await EVCustomer.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'EV customers retrieved successfully',
      data: {
        evCustomers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting EV customers:', error);
    next(error);
  }
};

// @desc    Get EV customer by ID
// @route   GET /api/v1/ev-customers/:id
// @access  Private
export const getEVCustomerById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const evCustomer = await EVCustomer.findById(id).lean();

    if (!evCustomer) {
      return next(new AppError('EV customer not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'EV customer retrieved successfully',
      data: evCustomer
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting EV customer:', error);
    next(error);
  }
};

// @desc    Create new EV customer
// @route   POST /api/v1/ev-customers
// @access  Private
export const createEVCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = createEVCustomerSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    const evCustomerData: CreateEVCustomerInput = value;

    // Auto-determine service type based on service request number
    if (evCustomerData.serviceRequest.serviceRequestNumber) {
      const autoServiceType = getServiceTypeFromRequestNumber(evCustomerData.serviceRequest.serviceRequestNumber);
      if (autoServiceType) {
        evCustomerData.serviceRequest.serviceType = autoServiceType;
      }
    }

    // Validate field restrictions based on service type
    const serviceType = evCustomerData.serviceRequest.serviceType;
    if (serviceType === 'Enquiry Visit' || serviceType === 'EV') {
      // Only allow survey planned date for Enquiry Visit
      if (evCustomerData.serviceRequest.scope || evCustomerData.serviceRequest.cableLength || 
          evCustomerData.serviceRequest.additionalMcb || evCustomerData.serviceRequest.chargerRating ||
          evCustomerData.serviceRequest.actualCableLength || evCustomerData.serviceRequest.chargerSerialNumber ||
          evCustomerData.serviceRequest.chargerID || evCustomerData.serviceRequest.VINNumber ||
          evCustomerData.serviceRequest.DBSerialNumber) {
        return next(new AppError('Invalid fields for Enquiry Visit service type', 400));
      }
    } else if (serviceType === 'Survey Visit' || serviceType === 'SV') {
      // Only allow survey-specific fields for Survey Visit
      if (evCustomerData.serviceRequest.actualCableLength || evCustomerData.serviceRequest.chargerSerialNumber ||
          evCustomerData.serviceRequest.chargerID || evCustomerData.serviceRequest.VINNumber ||
          evCustomerData.serviceRequest.DBSerialNumber) {
        return next(new AppError('Invalid fields for Survey Visit service type', 400));
      }
    } else if (serviceType === 'Installation Visit') {
      // Only allow installation-specific fields for Installation Visit
      // Note: scope is allowed for automatic updates based on cable length
      if (evCustomerData.serviceRequest.cableLength || 
          evCustomerData.serviceRequest.additionalMcb || evCustomerData.serviceRequest.chargerRating ||
          evCustomerData.serviceRequest.chargerSerialNumber || evCustomerData.serviceRequest.chargerID ||
          evCustomerData.serviceRequest.VINNumber || evCustomerData.serviceRequest.DBSerialNumber) {
        return next(new AppError('Invalid fields for Installation Visit service type', 400));
      }
    } else if (serviceType === 'Commission Visit' || serviceType === 'CM') {
      // Only allow commission-specific fields for Commission Visit
      if (evCustomerData.serviceRequest.scope || evCustomerData.serviceRequest.cableLength || 
          evCustomerData.serviceRequest.additionalMcb || evCustomerData.serviceRequest.chargerRating ||
          evCustomerData.serviceRequest.actualCableLength) {
        return next(new AppError('Invalid fields for Commission Visit service type', 400));
      }
    }

    // Check for existing EV customer with same service request number
    const existingCustomer = await EVCustomer.findOne({
      'serviceRequest.serviceRequestNumber': evCustomerData.serviceRequest.serviceRequestNumber
    });

    if (existingCustomer) {
      return next(new AppError('EV customer with this service request number already exists', 400));
    }

    // Convert empty strings to null for optional fields
    if (evCustomerData.serviceRequest) {
      // Convert empty strings to null for string fields
      const stringFields = ['serviceEngineerName1', 'serviceEngineerName2', 'serviceEngineerName3', 'chargerSerialNumber', 'chargerID', 'chargerRating', 'VINNumber', 'DBSerialNumber'];
      stringFields.forEach(field => {
        if ((evCustomerData.serviceRequest as any)[field] === '') {
          (evCustomerData.serviceRequest as any)[field] = null;
        }
      });

      // Convert empty strings to null for date fields
      const dateFields = ['requestedDate', 'completedDate'];
      dateFields.forEach(field => {
        if ((evCustomerData.serviceRequest as any)[field] === '') {
          (evCustomerData.serviceRequest as any)[field] = null;
        }
      });

      // Convert empty strings to null for numeric fields
      const numericFields = ['cableLength', 'actualCableLength'];
      numericFields.forEach(field => {
        if ((evCustomerData.serviceRequest as any)[field] === '') {
          (evCustomerData.serviceRequest as any)[field] = null;
        }
      });
    }

    // Automatic scope update based on cable length for Survey Visit and Installation Visit
    const isSurveyVisit = serviceType === 'Survey Visit' || serviceType === 'SV';
    const isInstallationVisit = serviceType === 'Installation Visit';
    
    if ((isSurveyVisit || isInstallationVisit) && evCustomerData.serviceRequest) {
      const cableLength = evCustomerData.serviceRequest.cableLength;
      const actualCableLength = evCustomerData.serviceRequest.actualCableLength;
      
      // Always set scope based on cable length condition
      if ((cableLength && cableLength > 15) || (actualCableLength && actualCableLength > 15)) {
        evCustomerData.serviceRequest.scope = 'out scope';
      } else {
        evCustomerData.serviceRequest.scope = 'in scope';
      }
    }

    const evCustomer = await EVCustomer.create(evCustomerData);

    const response: APIResponse = {
      success: true,
      message: 'EV customer created successfully',
      data: evCustomer
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating EV customer:', error);
    next(error);
  }
};

// @desc    Update EV customer
// @route   PUT /api/v1/ev-customers/:id
// @access  Private
export const updateEVCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { error, value } = updateEVCustomerSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.message, 400));
    }

    const updateData: UpdateEVCustomerInput = value;

    // Check if EV customer exists
    const existingCustomer = await EVCustomer.findById(id);
    if (!existingCustomer) {
      return next(new AppError('EV customer not found', 404));
    }

    // Auto-determine service type based on service request number if it's being updated
    if (updateData.serviceRequest?.serviceRequestNumber) {
      const autoServiceType = getServiceTypeFromRequestNumber(updateData.serviceRequest.serviceRequestNumber);
      if (autoServiceType) {
        updateData.serviceRequest.serviceType = autoServiceType;
      }
    }

    // Get the current service type to validate field restrictions
    const currentServiceType = existingCustomer.serviceRequest?.serviceType || updateData.serviceRequest?.serviceType;
    
    // Check if this is a status-only update
    const isStatusOnlyUpdate = Object.keys(updateData.serviceRequest || {}).length === 1 && 
                               updateData.serviceRequest?.serviceRequestStatus !== undefined;
    
    // Validate field restrictions based on service type (skip for status-only updates)
    if (!isStatusOnlyUpdate && currentServiceType) {
      if (currentServiceType === 'Enquiry Visit' || currentServiceType === 'EV') {
        // Only allow survey planned date for Enquiry Visit
        if (updateData.serviceRequest?.scope || updateData.serviceRequest?.cableLength || 
            updateData.serviceRequest?.additionalMcb || updateData.serviceRequest?.chargerRating ||
            updateData.serviceRequest?.actualCableLength || updateData.serviceRequest?.chargerSerialNumber ||
            updateData.serviceRequest?.chargerID || updateData.serviceRequest?.VINNumber ||
            updateData.serviceRequest?.DBSerialNumber) {
          return next(new AppError('Invalid fields for Enquiry Visit service type', 400));
        }
      } else if (currentServiceType === 'Survey Visit' || currentServiceType === 'SV') {
        // Only allow survey-specific fields for Survey Visit
        if (updateData.serviceRequest?.actualCableLength || updateData.serviceRequest?.chargerSerialNumber ||
            updateData.serviceRequest?.chargerID || updateData.serviceRequest?.VINNumber ||
            updateData.serviceRequest?.DBSerialNumber) {
          return next(new AppError('Invalid fields for Survey Visit service type', 400));
        }
      } else if (currentServiceType === 'Installation Visit') {
        // Only allow installation-specific fields for Installation Visit
        // Note: scope is allowed for automatic updates based on cable length
        if (updateData.serviceRequest?.cableLength || 
            updateData.serviceRequest?.additionalMcb || updateData.serviceRequest?.chargerRating ||
            updateData.serviceRequest?.chargerSerialNumber || updateData.serviceRequest?.chargerID ||
            updateData.serviceRequest?.VINNumber || updateData.serviceRequest?.DBSerialNumber) {
          return next(new AppError('Invalid fields for Installation Visit service type', 400));
        }
      } else if (currentServiceType === 'Commission Visit' || currentServiceType === 'CM') {
        // Only allow commission-specific fields for Commission Visit
        if (updateData.serviceRequest?.scope || updateData.serviceRequest?.cableLength || 
            updateData.serviceRequest?.additionalMcb || updateData.serviceRequest?.chargerRating ||
            updateData.serviceRequest?.actualCableLength) {
          return next(new AppError('Invalid fields for Commission Visit service type', 400));
        }
      }
    }

    // If service request number is being updated, check for duplicates
    if (updateData.serviceRequest?.serviceRequestNumber) {
      const duplicateCustomer = await EVCustomer.findOne({
        'serviceRequest.serviceRequestNumber': updateData.serviceRequest.serviceRequestNumber,
        _id: { $ne: id }
      });

      if (duplicateCustomer) {
        return next(new AppError('EV customer with this service request number already exists', 400));
      }
    }

    // Convert empty strings to null for optional fields
    if (updateData.serviceRequest) {
      // Convert empty strings to null for string fields
      const stringFields = ['serviceEngineerName1', 'serviceEngineerName2', 'serviceEngineerName3', 'chargerSerialNumber', 'chargerID', 'chargerRating', 'VINNumber', 'DBSerialNumber'];
      stringFields.forEach(field => {
        if ((updateData.serviceRequest as any)[field] === '') {
          (updateData.serviceRequest as any)[field] = null;
        }
      });

      // Convert empty strings to null for date fields
      const dateFields = ['requestedDate', 'completedDate'];
      dateFields.forEach(field => {
        if ((updateData.serviceRequest as any)[field] === '') {
          (updateData.serviceRequest as any)[field] = null;
        }
      });

      // Convert empty strings to null for numeric fields
      const numericFields = ['cableLength', 'actualCableLength'];
      numericFields.forEach(field => {
        if ((updateData.serviceRequest as any)[field] === '') {
          (updateData.serviceRequest as any)[field] = null;
        }
      });
    }

    // Automatic scope update based on cable length for Survey Visit and Installation Visit
    const serviceType = currentServiceType || existingCustomer.serviceRequest?.serviceType;
    const isSurveyVisit = serviceType === 'Survey Visit';
    const isInstallationVisit = serviceType === 'Installation Visit';
    
    if ((isSurveyVisit || isInstallationVisit) && updateData.serviceRequest) {
      const cableLength = updateData.serviceRequest.cableLength;
      const actualCableLength = updateData.serviceRequest.actualCableLength;
      
      // Always set scope based on cable length condition, regardless of incoming scope value
      if ((cableLength && cableLength > 15) || (actualCableLength && actualCableLength > 15)) {
        updateData.serviceRequest.scope = 'out scope';
      } else {
        updateData.serviceRequest.scope = 'in scope';
      }
    }

    // Use $set operator to properly update nested fields without overwriting
    const updateQuery: any = {};
    
    // Build the update query with $set for nested fields
    if (updateData.customer) {
      Object.keys(updateData.customer).forEach(key => {
        updateQuery[`customer.${key}`] = (updateData.customer as any)[key];
      });
    }
    
    if (updateData.serviceRequest) {
      Object.keys(updateData.serviceRequest).forEach(key => {
        updateQuery[`serviceRequest.${key}`] = (updateData.serviceRequest as any)[key];
      });
    }

    console.log('Update Query:', JSON.stringify(updateQuery, null, 2));

    const updatedCustomer = await EVCustomer.findByIdAndUpdate(
      id,
      { $set: updateQuery },
      { new: true, runValidators: true }
    );

    console.log('Updated Customer:', JSON.stringify(updatedCustomer, null, 2));
    console.log('Service Request Number:', updatedCustomer?.serviceRequest?.serviceRequestNumber);
    console.log('Service Type:', updatedCustomer?.serviceRequest?.serviceType);

    const response: APIResponse = {
      success: true,
      message: 'EV customer updated successfully',
      data: updatedCustomer
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating EV customer:', error);
    next(error);
  }
};

// @desc    Delete EV customer
// @route   DELETE /api/v1/ev-customers/:id
// @access  Private
export const deleteEVCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('Delete EV customer request:', { id, user: req.user?.id });

    const evCustomer = await EVCustomer.findById(id);
    console.log('Found EV customer:', evCustomer ? 'Yes' : 'No');

    if (!evCustomer) {
      console.log('EV customer not found for ID:', id);
      return next(new AppError('EV customer not found', 404));
    }

    await EVCustomer.findByIdAndDelete(id);
    console.log('EV customer deleted successfully:', id);

    const response: APIResponse = {
      success: true,
      message: 'EV customer deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error deleting EV customer:', error);
    next(error);
  }
};

// @desc    Preview EV customers from Excel/CSV before import
// @route   POST /api/v1/ev-customers/preview-import
// @access  Private
export const previewEVCustomerImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Use the improved header detection
    const rawData: any[] = findHeaderRowAndData(worksheet);
      
    if (!rawData.length) return next(new AppError('No data found in file', 400));

    const cleanedData = rawData.map(cleanRowKeys);

    const preview = {
      evCustomersToCreate: [] as any[],
      evCustomersToUpdate: [] as any[],
      errors: [] as string[],
      summary: {
        totalRows: cleanedData.length,
        newEVCustomers: 0,
        existingEVCustomers: 0
      }
    };

    // Log the first row to debug column mapping
    console.log('First row headers:', Object.keys(cleanedData[0] || {}));
    console.log('First row data:', cleanedData[0]);
    
    // Debug: Log all available column names
    if (cleanedData.length > 0) {
      console.log('All available column names:', Object.keys(cleanedData[0]));
      console.log('Sample row data for debugging:', cleanedData[0]);
    }

    for (let i = 0; i < cleanedData.length; i++) {
      try {
        const row = cleanedData[i];

        const evCustomerInput: any = {
          customer: {
            bookingReference: getColumnValue(row, ['Booking Reference', 'booking reference', 'Booking Ref', 'booking ref', 'Reference', 'reference', 'Booking Ref No']),
            customerName: getColumnValue(row, ['Customer Name', 'customer name', 'Name', 'name', 'Client Name', 'client name']),
            contactNumber: getColumnValue(row, ['Contact Number', 'contact number', 'Phone', 'phone', 'Mobile', 'mobile', 'Mobile Number', 'mobile number', 'ContactNo']),
            location: getColumnValue(row, ['Location', 'location', 'City', 'city', 'Area', 'area', 'SiteLocation']),
            address: getColumnValue(row, ['Address', 'address', 'Full Address', 'full address', 'Complete Address', 'complete address', 'Address1']),
            vehicleModel: getColumnValue(row, ['Vehicle Model', 'vehicle model', 'Model', 'model', 'Car Model', 'car model']),
            automobileDealerName: getColumnValue(row, ['Automobile Dealer Name', 'automobile dealer name', 'Dealer Name', 'dealer name', 'Dealer', 'dealer', 'AutomotiveDealerName'])
          },
          serviceRequest: {
            serviceRequestNumber: getColumnValue(row, ['Service Request Number', 'service request number', 'SR Number', 'sr number', 'Request Number', 'request number']),
            serviceType: getColumnValue(row, ['Service Type', 'service type', 'Type', 'type', 'Service', 'service']),
            requestedDate: getColumnValue(row, ['Service Requested On Date', 'service requested on date', 'Service Required Date', 'service required date', 'Requested Date', 'requested date', 'Survey Planned Date', 'survey planned date', 'Installation Planned Date', 'installation planned date', 'Commission Planned Date', 'commission planned date']),
            completedDate: getColumnValue(row, ['Survey Completed Date', 'survey completed date', 'Installation Completed Date', 'installation completed date', 'Commission Completed Date', 'commission completed date', 'Completed Date', 'completed date']),
            serviceEngineerName1: getColumnValue(row, ['Service Engineer Name 1', 'service engineer name 1', 'Engineer 1', 'engineer 1', 'Primary Engineer', 'primary engineer', 'SR Engineer']),
            serviceEngineerName2: getColumnValue(row, ['Service Engineer Name 2', 'service engineer name 2', 'Engineer 2', 'engineer 2', 'Secondary Engineer', 'secondary engineer']),
            serviceEngineerName3: getColumnValue(row, ['Service Engineer Name 3', 'service engineer name 3', 'Engineer 3', 'engineer 3', 'Tertiary Engineer', 'tertiary engineer']),
            additionalMcb: getColumnValue(row, ['Additional MCB', 'additional mcb', 'MCB', 'mcb', 'Extra MCB', 'extra mcb']).toLowerCase() === 'yes' || 
                          getColumnValue(row, ['Additional MCB', 'additional mcb', 'MCB', 'mcb', 'Extra MCB', 'extra mcb']).toLowerCase() === 'true',
            cableLength: getColumnValue(row, ['Cable Length', 'cable length', 'Cable', 'cable', 'Length', 'length']),
            actualCableLength: getColumnValue(row, ['Actual Cable Length', 'actual cable length', 'Actual Length', 'actual length', 'Used Length', 'used length']),
            chargerSerialNumber: getColumnValue(row, ['Charger Serial Number', 'charger serial number', 'Charger Serial', 'charger serial', 'Serial Number', 'serial number']),
            chargerID: getColumnValue(row, ['Charger ID', 'charger id', 'Charger', 'charger', 'ID', 'id']),
            chargerRating: getColumnValue(row, ['Charger Rating', 'charger rating', 'Rating', 'rating', 'Power Rating', 'power rating']),
            VINNumber: getColumnValue(row, ['VIN Number', 'vin number', 'VIN', 'vin', 'Vehicle VIN', 'vehicle vin']),
            DBSerialNumber: getColumnValue(row, ['DB Serial Number', 'db serial number', 'DB Serial', 'db serial', 'Distribution Board', 'distribution board']),
            scope: getColumnValue(row, ['Scope', 'scope', 'Service Scope', 'service scope', 'In Scope', 'in scope', 'Out Scope', 'out scope']) || 'in scope',
            serviceRequestStatus: getColumnValue(row, ['Service Request Status', 'service request status', 'Status', 'status', 'Request Status', 'request status']) || 'open'
          }
        };

        // Debug: Log extracted values for first few rows
        if (i < 3) {
          console.log(`Row ${i + 1} extracted values:`, {
            bookingReference: evCustomerInput.customer.bookingReference,
            customerName: evCustomerInput.customer.customerName,
            contactNumber: evCustomerInput.customer.contactNumber,
            location: evCustomerInput.customer.location,
            address: evCustomerInput.customer.address,
            vehicleModel: evCustomerInput.customer.vehicleModel,
            automobileDealerName: evCustomerInput.customer.automobileDealerName
          });
        }

        // Skip header row and rows where essential fields are missing
        if (!evCustomerInput.serviceRequest.serviceRequestNumber || 
            !evCustomerInput.customer.customerName ||
            evCustomerInput.serviceRequest.serviceRequestNumber.toLowerCase() === 'service request number') {
          continue;
        }

        // Auto-determine service type based on service request number
        if (evCustomerInput.serviceRequest.serviceRequestNumber) {
          const autoServiceType = getServiceTypeFromRequestNumber(evCustomerInput.serviceRequest.serviceRequestNumber);
          if (autoServiceType) {
            evCustomerInput.serviceRequest.serviceType = autoServiceType;
          }
        }

        // Parse dates
        try {
          if (evCustomerInput.serviceRequest.surveyPlannedDate) {
            evCustomerInput.serviceRequest.surveyPlannedDate = parseDate(evCustomerInput.serviceRequest.surveyPlannedDate);
          }
          if (evCustomerInput.serviceRequest.surveyCompletedDate) {
            evCustomerInput.serviceRequest.surveyCompletedDate = parseDate(evCustomerInput.serviceRequest.surveyCompletedDate);
          }
          if (evCustomerInput.serviceRequest.installationPlannedDate) {
            evCustomerInput.serviceRequest.installationPlannedDate = parseDate(evCustomerInput.serviceRequest.installationPlannedDate);
          }
          if (evCustomerInput.serviceRequest.installationCompletedDate) {
            evCustomerInput.serviceRequest.installationCompletedDate = parseDate(evCustomerInput.serviceRequest.installationCompletedDate);
          }
          if (evCustomerInput.serviceRequest.commissionPlannedDate) {
            evCustomerInput.serviceRequest.commissionPlannedDate = parseDate(evCustomerInput.serviceRequest.commissionPlannedDate);
          }
          if (evCustomerInput.serviceRequest.commissionCompletedDate) {
            evCustomerInput.serviceRequest.commissionCompletedDate = parseDate(evCustomerInput.serviceRequest.commissionCompletedDate);
          }
        } catch (dateError: any) {
          preview.errors.push(`Row ${i + 2}: ${dateError.message}`);
          continue;
        }

        // Parse numbers
        try {
          if (evCustomerInput.customer.contactNumber) {
            evCustomerInput.customer.contactNumber = parseInt(evCustomerInput.customer.contactNumber);
            if (isNaN(evCustomerInput.customer.contactNumber)) {
              throw new Error('Invalid contact number format');
            }
          }
          if (evCustomerInput.serviceRequest.cableLength) {
            evCustomerInput.serviceRequest.cableLength = parseFloat(evCustomerInput.serviceRequest.cableLength);
            if (isNaN(evCustomerInput.serviceRequest.cableLength)) {
              throw new Error('Invalid cable length format');
            }
          }
          if (evCustomerInput.serviceRequest.actualCableLength) {
            evCustomerInput.serviceRequest.actualCableLength = parseFloat(evCustomerInput.serviceRequest.actualCableLength);
            if (isNaN(evCustomerInput.serviceRequest.actualCableLength)) {
              throw new Error('Invalid actual cable length format');
            }
          }
        } catch (numberError: any) {
          preview.errors.push(`Row ${i + 2}: ${numberError.message}`);
          continue;
        }

        const { error } = importEVCustomerSchema.validate(evCustomerInput);
        if (error) {
          preview.errors.push(`Row ${i + 2}: ${error.message}`);
          continue;
        }

        // Check for existing EV customer with same service request number
        const existing = await EVCustomer.findOne({
          'serviceRequest.serviceRequestNumber': evCustomerInput.serviceRequest.serviceRequestNumber
        });

        if (existing) {
          preview.evCustomersToUpdate.push({
            serviceRequestNumber: existing.serviceRequest.serviceRequestNumber,
            customerName: evCustomerInput.customer.customerName,
            contactNumber: evCustomerInput.customer.contactNumber,
            location: evCustomerInput.customer.location,
            vehicleModel: evCustomerInput.customer.vehicleModel,
            bookingReference: evCustomerInput.customer.bookingReference,
            serviceType: evCustomerInput.serviceRequest.serviceType,
            requestedDate: evCustomerInput.serviceRequest.requestedDate,
            completedDate: evCustomerInput.serviceRequest.completedDate,
            chargerSerialNumber: evCustomerInput.serviceRequest.chargerSerialNumber,
            VINNumber: evCustomerInput.serviceRequest.VINNumber,
            action: 'update'
          });
          preview.summary.existingEVCustomers++;
          continue;
        }

        preview.evCustomersToCreate.push({
          serviceRequestNumber: evCustomerInput.serviceRequest.serviceRequestNumber,
          customerName: evCustomerInput.customer.customerName,
          contactNumber: evCustomerInput.customer.contactNumber,
          location: evCustomerInput.customer.location,
          vehicleModel: evCustomerInput.customer.vehicleModel,
          bookingReference: evCustomerInput.customer.bookingReference,
          serviceType: evCustomerInput.serviceRequest.serviceType,
          surveyPlannedDate: evCustomerInput.serviceRequest.surveyPlannedDate,
          surveyCompletedDate: evCustomerInput.serviceRequest.surveyCompletedDate,
          installationPlannedDate: evCustomerInput.serviceRequest.installationPlannedDate,
          installationCompletedDate: evCustomerInput.serviceRequest.installationCompletedDate,
          commissionPlannedDate: evCustomerInput.serviceRequest.commissionPlannedDate,
          commissionCompletedDate: evCustomerInput.serviceRequest.commissionCompletedDate,
          chargerSerialNumber: evCustomerInput.serviceRequest.chargerSerialNumber,
          VINNumber: evCustomerInput.serviceRequest.VINNumber,
          action: 'create'
        });
        preview.summary.newEVCustomers++;
      } catch (rowError: any) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        preview.errors.push(`Row ${i + 2}: Processing error - ${rowError.message || 'Unknown error'}`);
        continue;
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Preview completed. ${preview.summary.newEVCustomers} new, ${preview.summary.existingEVCustomers} to update.`,
      data: preview
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error previewing EV customers:', error);
    next(error);
  }
};

// @desc    Import EV customers from Excel/CSV
// @route   POST /api/v1/ev-customers/import
// @access  Private
export const importEVCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Use the improved header detection
    const rawData: any[] = findHeaderRowAndData(worksheet);
    
    if (!rawData.length) return next(new AppError('No data found in file', 400));

    const cleanedData = rawData.map(cleanRowKeys);
    
    const results = {
      successful: 0,
      failed: 0,
      updated: 0,
      created: 0,
      errors: [] as string[],
      createdEVCustomers: [] as any[],
      updatedEVCustomers: [] as any[]
    };

    for (let i = 0; i < cleanedData.length; i++) {
      try {
        const row = cleanedData[i];

        const evCustomerInput: any = {
          customer: {
            bookingReference: getColumnValue(row, ['Booking Reference', 'booking reference', 'Booking Ref', 'booking ref', 'Reference', 'reference', 'Booking Ref No']),
            customerName: getColumnValue(row, ['Customer Name', 'customer name', 'Name', 'name', 'Client Name', 'client name']),
            contactNumber: getColumnValue(row, ['Contact Number', 'contact number', 'Phone', 'phone', 'Mobile', 'mobile', 'Mobile Number', 'mobile number', 'ContactNo']),
            location: getColumnValue(row, ['Location', 'location', 'City', 'city', 'Area', 'area', 'SiteLocation']),
            address: getColumnValue(row, ['Address', 'address', 'Full Address', 'full address', 'Complete Address', 'complete address', 'Address1']),
            vehicleModel: getColumnValue(row, ['Vehicle Model', 'vehicle model', 'Model', 'model', 'Car Model', 'car model']),
            automobileDealerName: getColumnValue(row, ['Automobile Dealer Name', 'automobile dealer name', 'Dealer Name', 'dealer name', 'Dealer', 'dealer', 'AutomotiveDealerName'])
          },
          serviceRequest: {
            serviceRequestNumber: getColumnValue(row, ['Service Request Number', 'service request number', 'SR Number', 'sr number', 'Request Number', 'request number']),
            serviceType: getColumnValue(row, ['Service Type', 'service type', 'Type', 'type', 'Service', 'service']),
            requestedDate: getColumnValue(row, ['Service Requested On Date', 'service requested on date', 'Service Required Date', 'service required date', 'Requested Date', 'requested date', 'Survey Planned Date', 'survey planned date', 'Installation Planned Date', 'installation planned date', 'Commission Planned Date', 'commission planned date']),
            completedDate: getColumnValue(row, ['Survey Completed Date', 'survey completed date', 'Installation Completed Date', 'installation completed date', 'Commission Completed Date', 'commission completed date', 'Completed Date', 'completed date']),
            serviceEngineerName1: getColumnValue(row, ['Service Engineer Name 1', 'service engineer name 1', 'Engineer 1', 'engineer 1', 'Primary Engineer', 'primary engineer', 'SR Engineer']),
            serviceEngineerName2: getColumnValue(row, ['Service Engineer Name 2', 'service engineer name 2', 'Engineer 2', 'engineer 2', 'Secondary Engineer', 'secondary engineer']),
            serviceEngineerName3: getColumnValue(row, ['Service Engineer Name 3', 'service engineer name 3', 'Engineer 3', 'engineer 3', 'Tertiary Engineer', 'tertiary engineer']),
            additionalMcb: getColumnValue(row, ['Additional MCB', 'additional mcb', 'MCB', 'mcb', 'Extra MCB', 'extra mcb']).toLowerCase() === 'yes' || 
                          getColumnValue(row, ['Additional MCB', 'additional mcb', 'MCB', 'mcb', 'Extra MCB', 'extra mcb']).toLowerCase() === 'true',
            cableLength: getColumnValue(row, ['Cable Length', 'cable length', 'Cable', 'cable', 'Length', 'length']),
            actualCableLength: getColumnValue(row, ['Actual Cable Length', 'actual cable length', 'Actual Length', 'actual length', 'Used Length', 'used length']),
            chargerSerialNumber: getColumnValue(row, ['Charger Serial Number', 'charger serial number', 'Charger Serial', 'charger serial', 'Serial Number', 'serial number']),
            chargerID: getColumnValue(row, ['Charger ID', 'charger id', 'Charger', 'charger', 'ID', 'id']),
            chargerRating: getColumnValue(row, ['Charger Rating', 'charger rating', 'Rating', 'rating', 'Power Rating', 'power rating']),
            VINNumber: getColumnValue(row, ['VIN Number', 'vin number', 'VIN', 'vin', 'Vehicle VIN', 'vehicle vin']),
            DBSerialNumber: getColumnValue(row, ['DB Serial Number', 'db serial number', 'DB Serial', 'db serial', 'Distribution Board', 'distribution board']),
            scope: getColumnValue(row, ['Scope', 'scope', 'Service Scope', 'service scope', 'In Scope', 'in scope', 'Out Scope', 'out scope']) || 'in scope',
            serviceRequestStatus: getColumnValue(row, ['Service Request Status', 'service request status', 'Status', 'status', 'Request Status', 'request status']) || 'open'
          }
        };

        // Debug: Log extracted values for first few rows
        if (i < 3) {
          console.log(`Import Row ${i + 1} extracted values:`, {
            bookingReference: evCustomerInput.customer.bookingReference,
            customerName: evCustomerInput.customer.customerName,
            contactNumber: evCustomerInput.customer.contactNumber,
            location: evCustomerInput.customer.location,
            address: evCustomerInput.customer.address,
            vehicleModel: evCustomerInput.customer.vehicleModel,
            automobileDealerName: evCustomerInput.customer.automobileDealerName
          });
        }

        // Skip header row and rows where essential fields are missing
        if (!evCustomerInput.serviceRequest.serviceRequestNumber || 
            !evCustomerInput.customer.customerName ||
            evCustomerInput.serviceRequest.serviceRequestNumber.toLowerCase() === 'service request number') {
          results.errors.push(`Row ${i + 2}: Skipped - missing or invalid service request number or customer name.`);
          results.failed++;
          continue;
        }

        // Auto-determine service type based on service request number
        if (evCustomerInput.serviceRequest.serviceRequestNumber) {
          const autoServiceType = getServiceTypeFromRequestNumber(evCustomerInput.serviceRequest.serviceRequestNumber);
          if (autoServiceType) {
            evCustomerInput.serviceRequest.serviceType = autoServiceType;
          }
        }

        // Parse dates
        try {
          if (evCustomerInput.serviceRequest.surveyPlannedDate) {
            evCustomerInput.serviceRequest.surveyPlannedDate = parseDate(evCustomerInput.serviceRequest.surveyPlannedDate);
          }
          if (evCustomerInput.serviceRequest.surveyCompletedDate) {
            evCustomerInput.serviceRequest.surveyCompletedDate = parseDate(evCustomerInput.serviceRequest.surveyCompletedDate);
          }
          if (evCustomerInput.serviceRequest.installationPlannedDate) {
            evCustomerInput.serviceRequest.installationPlannedDate = parseDate(evCustomerInput.serviceRequest.installationPlannedDate);
          }
          if (evCustomerInput.serviceRequest.installationCompletedDate) {
            evCustomerInput.serviceRequest.installationCompletedDate = parseDate(evCustomerInput.serviceRequest.installationCompletedDate);
          }
          if (evCustomerInput.serviceRequest.commissionPlannedDate) {
            evCustomerInput.serviceRequest.commissionPlannedDate = parseDate(evCustomerInput.serviceRequest.commissionPlannedDate);
          }
          if (evCustomerInput.serviceRequest.commissionCompletedDate) {
            evCustomerInput.serviceRequest.commissionCompletedDate = parseDate(evCustomerInput.serviceRequest.commissionCompletedDate);
          }
        } catch (dateError: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${dateError.message}`);
          continue;
        }

        // Parse numbers
        try {
          if (evCustomerInput.customer.contactNumber) {
            evCustomerInput.customer.contactNumber = parseInt(evCustomerInput.customer.contactNumber);
            if (isNaN(evCustomerInput.customer.contactNumber)) {
              throw new Error('Invalid contact number format');
            }
          }
          if (evCustomerInput.serviceRequest.cableLength) {
            evCustomerInput.serviceRequest.cableLength = parseFloat(evCustomerInput.serviceRequest.cableLength);
            if (isNaN(evCustomerInput.serviceRequest.cableLength)) {
              throw new Error('Invalid cable length format');
            }
          }
          if (evCustomerInput.serviceRequest.actualCableLength) {
            evCustomerInput.serviceRequest.actualCableLength = parseFloat(evCustomerInput.serviceRequest.actualCableLength);
            if (isNaN(evCustomerInput.serviceRequest.actualCableLength)) {
              throw new Error('Invalid actual cable length format');
            }
          }
        } catch (numberError: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${numberError.message}`);
          continue;
        }

        const { error } = importEVCustomerSchema.validate(evCustomerInput);
        if (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
          continue;
        }

        // Check for existing EV customer with same service request number
        const existing = await EVCustomer.findOne({
          'serviceRequest.serviceRequestNumber': evCustomerInput.serviceRequest.serviceRequestNumber
        });

        // Automatic scope update based on cable length for Survey Visit and Installation Visit
        const serviceType = evCustomerInput.serviceRequest.serviceType;
        const isSurveyVisit = serviceType === 'Survey Visit' || serviceType === 'SV';
        const isInstallationVisit = serviceType === 'Installation Visit';
        
        if ((isSurveyVisit || isInstallationVisit) && evCustomerInput.serviceRequest) {
          const cableLength = evCustomerInput.serviceRequest.cableLength;
          const actualCableLength = evCustomerInput.serviceRequest.actualCableLength;
          
          // Always set scope based on cable length condition
          if ((cableLength && cableLength > 15) || (actualCableLength && actualCableLength > 15)) {
            evCustomerInput.serviceRequest.scope = 'out scope';
          } else {
            evCustomerInput.serviceRequest.scope = 'in scope';
          }
        }

        try {
          if (existing) {
            // Update existing customer
            const updated = await EVCustomer.findByIdAndUpdate(
              existing._id,
              evCustomerInput,
              { new: true, runValidators: true }
            );
            
            results.successful++;
            results.updated++;
            results.updatedEVCustomers.push({
              serviceRequestNumber: updated?.serviceRequest.serviceRequestNumber,
              customerName: updated?.customer.customerName,
              contactNumber: updated?.customer.contactNumber,
              vehicleModel: updated?.customer.vehicleModel,
              id: updated?._id,
              action: 'updated'
            });
          } else {
            // Create new customer
          const created = await EVCustomer.create(evCustomerInput);
          results.successful++;
            results.created++;
          results.createdEVCustomers.push({
            serviceRequestNumber: created.serviceRequest.serviceRequestNumber,
            customerName: created.customer.customerName,
            contactNumber: created.customer.contactNumber,
            vehicleModel: created.customer.vehicleModel,
              id: created._id,
              action: 'created'
          });
          }
        } catch (operationErr: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${operationErr.message}`);
        }
      } catch (rowError: any) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        results.errors.push(`Row ${i + 2}: Processing error - ${rowError.message || 'Unknown error'}`);
        results.failed++;
        continue;
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Import completed. ${results.created} EV customers created, ${results.updated} updated, ${results.failed} failed.`,
      data: {
        summary: {
          totalRows: cleanedData.length,
          successful: results.successful,
          created: results.created,
          updated: results.updated,
          failed: results.failed
        },
        createdEVCustomers: results.createdEVCustomers,
        updatedEVCustomers: results.updatedEVCustomers,
        errors: results.errors
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error importing EV customers:', error);
    next(error);
  }
};

// @desc    Export EV customers to Excel
// @route   GET /api/v1/ev-customers/export
// @access  Private
export const exportEVCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      search,
      serviceType,
      // Date filter parameters
      requestedDateFrom,
      requestedDateTo,
      completedDateFrom,
      completedDateTo,
      allStatusFilter,
      evStatusFilter,
      svStatusFilter,
      inStatusFilter,
      cmStatusFilter
    } = req.query as QueryParams & {
      requestedDateFrom?: string;
      requestedDateTo?: string;
      completedDateFrom?: string;
      completedDateTo?: string;
      allStatusFilter?: string;
      evStatusFilter?: string;
      svStatusFilter?: string;
      inStatusFilter?: string;
      cmStatusFilter?: string;
    };

    // Build query (same logic as getAllEVCustomers)
    const query: any = {};
    
    if (search) {
      query.$or = [
        { 'customer.customerName': { $regex: search, $options: 'i' } },
        { 'customer.bookingReference': { $regex: search, $options: 'i' } },
        { 'customer.location': { $regex: search, $options: 'i' } },
        { 'customer.vehicleModel': { $regex: search, $options: 'i' } },
        { 'serviceRequest.serviceRequestNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.chargerSerialNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.VINNumber': { $regex: search, $options: 'i' } },
        { 'serviceRequest.scope': { $regex: search, $options: 'i' } },
        { 'serviceRequest.serviceRequestStatus': { $regex: search, $options: 'i' } }
      ];

      // Handle contact number search separately since it's a Number field
      // Only add contact number search if the search term is numeric
      if (/^\d+$/.test(search)) {
        query.$or.push({ 'customer.contactNumber': parseInt(search) });
      }
    }

    // Filter by service type
    if (serviceType) {
      // Map frontend service type codes to actual service types
      let serviceTypeFilter: string;
      switch (serviceType) {
        case 'EV':
          serviceTypeFilter = 'Enquiry Visit';
          break;
        case 'SV':
          serviceTypeFilter = 'Survey Visit';
          break;
        case 'IN':
          serviceTypeFilter = 'Installation Visit';
          break;
        case 'CM':
          serviceTypeFilter = 'Commission Visit';
          break;
        default:
          serviceTypeFilter = serviceType;
      }
      query['serviceRequest.serviceType'] = serviceTypeFilter;
    }

    // Add date filters (same logic as getAllEVCustomers)
    if (requestedDateFrom || requestedDateTo) {
      query['serviceRequest.requestedDate'] = {};
      if (requestedDateFrom) query['serviceRequest.requestedDate'].$gte = new Date(requestedDateFrom);
      if (requestedDateTo) query['serviceRequest.requestedDate'].$lte = new Date(requestedDateTo);
    }

    if (completedDateFrom || completedDateTo) {
      query['serviceRequest.completedDate'] = {};
      if (completedDateFrom) query['serviceRequest.completedDate'].$gte = new Date(completedDateFrom);
      if (completedDateTo) query['serviceRequest.completedDate'].$lte = new Date(completedDateTo);
    }


    // Handle status filters
    if (allStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = allStatusFilter;
    } else if (evStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = evStatusFilter;
    } else if (svStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = svStatusFilter;
    } else if (inStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = inStatusFilter;
    } else if (cmStatusFilter) {
      query['serviceRequest.serviceRequestStatus'] = cmStatusFilter;
    }

    const evCustomers = await EVCustomer.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Prepare data for Excel export
    const exportData = evCustomers.map((customer, index) => ({
      'Serial No.': index + 1,
      'SR Number': customer.serviceRequest.serviceRequestNumber,
      'Customer Name': customer.customer.customerName,
      'Contact Number': customer.customer.contactNumber,
      'Location': customer.customer.location,
      'Address': customer.customer.address,
      'Vehicle Model': customer.customer.vehicleModel,
      'Automobile Dealer Name': customer.customer.automobileDealerName,
      'Booking Reference': customer.customer.bookingReference,
      'Service Type': customer.serviceRequest.serviceType,
      'Requested Date': customer.serviceRequest.requestedDate ? new Date(customer.serviceRequest.requestedDate).toLocaleDateString() : '',
      'Completed Date': customer.serviceRequest.completedDate ? new Date(customer.serviceRequest.completedDate).toLocaleDateString() : '',
      'Service Engineer 1': customer.serviceRequest.serviceEngineerName1,
      'Service Engineer 2': customer.serviceRequest.serviceEngineerName2,
      'Service Engineer 3': customer.serviceRequest.serviceEngineerName3,
      'Additional MCB': customer.serviceRequest.additionalMcb ? 'Yes' : 'No',
      'Cable Length': customer.serviceRequest.cableLength,
      'Actual Cable Length': customer.serviceRequest.actualCableLength,
      'Charger Serial Number': customer.serviceRequest.chargerSerialNumber,
      'Charger ID': customer.serviceRequest.chargerID,
      'Charger Rating': customer.serviceRequest.chargerRating,
      'VIN Number': customer.serviceRequest.VINNumber,
      'DB Serial Number': customer.serviceRequest.DBSerialNumber,
      'Scope': customer.serviceRequest?.scope || '',
      'Service Request Status': customer.serviceRequest?.serviceRequestStatus || '',
      'Created At': (customer as any).createdAt ? new Date((customer as any).createdAt).toLocaleDateString() : ''
    }));

    // Remove empty columns
    if (exportData.length > 0) {
      const allKeys = Object.keys(exportData[0]);
      const columnsToRemove: string[] = [];

      // Check each column to see if it's empty
      allKeys.forEach(key => {
        const hasData = exportData.some(row => {
          const value = (row as any)[key];
          return value !== null && value !== undefined && value !== '' && value !== 'No';
        });
        
        if (!hasData) {
          columnsToRemove.push(key);
        }
      });

      // Remove empty columns from each row
      if (columnsToRemove.length > 0) {
        exportData.forEach(row => {
          columnsToRemove.forEach(key => {
            delete (row as any)[key];
          });
        });
      }
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths dynamically based on remaining columns
    if (exportData.length > 0) {
      const remainingKeys = Object.keys(exportData[0]);
      const columnWidthMap: { [key: string]: number } = {
        'Serial No.': 10,
        'SR Number': 15,
        'Customer Name': 20,
        'Contact Number': 15,
        'Location': 15,
        'Address': 30,
        'Vehicle Model': 15,
        'Automobile Dealer Name': 20,
        'Booking Reference': 15,
        'Service Type': 15,
        'Requested Date': 18,
        'Completed Date': 18,
        'Service Engineer 1': 18,
        'Service Engineer 2': 18,
        'Service Engineer 3': 18,
        'Additional MCB': 12,
        'Cable Length': 12,
        'Actual Cable Length': 15,
        'Charger Serial Number': 18,
        'Charger ID': 12,
        'Charger Rating': 12,
        'VIN Number': 15,
        'DB Serial Number': 15,
        'Scope': 12,
        'Service Request Status': 18,
        'Created At': 12
      };

      const columnWidths = remainingKeys.map(key => ({
        wch: columnWidthMap[key] || 15 // Default width if not found
      }));

      worksheet['!cols'] = columnWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'EV Customers');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ev-customers-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting EV customers:', error);
    next(error);
  }
};
