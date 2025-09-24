import { Response, NextFunction } from 'express';
import { DGEnquiry } from '../models/DGEnquiry';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest, APIResponse, CustomerType, CustomerMainType, LeadStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';
import { dgEnquiryImportSchema } from '../schemas';
import Joi from 'joi';

// Helper: Check if a row is a demo/test row
const isDemoRow = (row: Record<string, any>): boolean => {
  return Object.values(row).some(value => 
    typeof value === 'string' && 
    (value.toLowerCase().includes('excel upload') || 
     value.toLowerCase().includes('manual entry') ||
     value.toLowerCase().includes('demo') ||
     value.toLowerCase().includes('test'))
  );
};

// Helper: Find existing customer by phone number or name + phone combination
const findExistingCustomer = async (phoneNumber: string, customerName: string, corporateName: string) => {
  if (!phoneNumber || !phoneNumber.trim()) {
    return null;
  }

  // Try to find by phone number first
  let customer = await Customer.findOne({ 
    'addresses.phone': phoneNumber 
  });

  // If not found by phone, try to find by name + phone combination
  if (!customer && customerName) {
    customer = await Customer.findOne({
      name: customerName,
      'addresses.phone': phoneNumber
    });
  }

  // If still not found, try with corporate name
  if (!customer && corporateName) {
    customer = await Customer.findOne({
      name: corporateName,
      'addresses.phone': phoneNumber
    });
  }

  return customer;
};

// Helper: Create new customer from enquiry data
const createCustomerFromEnquiry = async (enquiryData: any, createdBy: string) => {
  const customerName = enquiryData.corporateName || enquiryData.customerName || 'Unknown Customer';
  
  const customerData = {
    name: customerName,
    customerType: CustomerType.DG,
    type: CustomerMainType.CUSTOMER,
    status: LeadStatus.NEW,
    addresses: enquiryData.addresses || [],
    numberOfDG: enquiryData.numberOfDG || 1,
    notes: enquiryData.remarks || '',
    createdBy: createdBy,
    leadSource: enquiryData.source || 'Excel Import'
  };

  const customer = await Customer.create(customerData);
  (customer as any).isNew = true;
  return customer;
};

// Helper: Update existing customer with enquiry data
const updateCustomerFromEnquiry = async (customer: any, enquiryData: any) => {
  // Update customer name if corporate name is provided and different
  if (enquiryData.corporateName && enquiryData.corporateName !== customer.name) {
    customer.name = enquiryData.corporateName;
  }

  // Update notes if provided
  if (enquiryData.remarks) {
    customer.notes = enquiryData.remarks || customer.notes;
  }

  // Update number of DG if provided
  if (enquiryData.numberOfDG) {
    customer.numberOfDG = enquiryData.numberOfDG;
  }

  // Update or add address information
  if (enquiryData.addresses && enquiryData.addresses.length > 0) {
    const primaryAddress = enquiryData.addresses[0];
    
    // Check if we need to add a new address or update existing
    const existingPrimaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
    
    if (existingPrimaryAddress) {
      // Update existing primary address
      Object.assign(existingPrimaryAddress, {
        address: primaryAddress.address || existingPrimaryAddress.address,
        state: primaryAddress.state || existingPrimaryAddress.state,
        district: primaryAddress.district || existingPrimaryAddress.district,
        pincode: primaryAddress.pincode || existingPrimaryAddress.pincode,
        contactPersonName: primaryAddress.contactPersonName || existingPrimaryAddress.contactPersonName,
        designation: primaryAddress.designation || existingPrimaryAddress.designation,
        email: primaryAddress.email || existingPrimaryAddress.email,
        phone: primaryAddress.phone || existingPrimaryAddress.phone,
        tehsil: primaryAddress.tehsil || existingPrimaryAddress.tehsil,
        gstNumber: primaryAddress.gstNumber || existingPrimaryAddress.gstNumber
      });
    } else {
      // Add new primary address
      customer.addresses.push(primaryAddress);
    }
  }

  const updatedCustomer = await customer.save();
  (updatedCustomer as any).isNew = false;
  return updatedCustomer;
};

// Helper: map Excel columns to schema fields
const mapExcelRowToEnquiry = (row: Record<string, any>) => {
  const phoneNumber = row['Phone Number'] || '';
  const contactPersonName = row['Name (Customer Name)'] || row['Customer Name'] || row['Contact Person Name'] || '';
  const corporateName = row['Corporate Name (Company Name)'] || '';
  
  // Use contact person name, or fall back to corporate name if contact person name is empty
  const finalContactPersonName = contactPersonName || corporateName;
  
  // Debug logging to help identify column mapping issues
  if (!contactPersonName && corporateName) {
    console.log(`Warning: No contact person name found for ${corporateName}, using corporate name as fallback`);
  }
  
  // Create primary address from Excel data
  const primaryAddress = {
    id: 1,
    address: row['Address'] || '',
    state: row['State'] || '',
    district: row['District'] || '',
    pincode: row['PinCode'] || '',
    isPrimary: true,
    contactPersonName: finalContactPersonName,
    designation: row['Designation'] || '',
    email: row['Email'] || '',
    phone: phoneNumber,
    tehsil: row['Tehsil'] || '',
    registrationStatus: 'non_registered' as const
  };

  return {
    zone: row['Zone'] || '',
    state: row['State'] || '',
    areaOffice: row['Area Office'] || '',
    dealer: row['Dealer'] || '',
    branch: row['Branch'] || '',
    location: row['Location'] || '',
    assignedEmployeeCode: row['Assigned Employee Code'] || '',
    assignedEmployeeName: row['Assigned Employee Name'] || '',
    employeeStatus: row['Employee Status'] || '',
    enquiryNo: row['Enquiry No'] || '',
    enquiryDate: row['Enquiry Date'] ? new Date(row['Enquiry Date']) : undefined,
    customerType: row['Customer Type'] || '',
    corporateName: corporateName,
    customerName: corporateName, // Store corporate name in customerName field
    phoneNumber: phoneNumber, // This will be populated from addresses[].phone by pre-save middleware
    email: row['Email'] || '', // This will be populated from addresses[].email by pre-save middleware
    address: row['Address'] || '', // This will be populated from addresses[].address by pre-save middleware
    pinCode: row['PinCode'] || '', // This will be populated from addresses[].pincode by pre-save middleware
    tehsil: row['Tehsil'] || '', // This will be populated from addresses[].tehsil by pre-save middleware
    district: row['District'] || '', // This will be populated from addresses[].district by pre-save middleware
    kva: row['KVA'] || '',
    phase: row['Phase'] || '',
    quantity: row['Quantity'] ? Number(row['Quantity']) : undefined,
    remarks: row['Remarks'] || '',
    enquiryStatus: row['Enquiry Status'] || '',
    enquiryType: row['Enquiry Type'] || '',
    enquiryStage: row['Enquiry Stage'] || '',
    eoPoDate: row['EO/PO Date'] ? new Date(row['EO/PO Date']) : undefined,
    plannedFollowUpDate: row['Planned Follow-up Date'] ? new Date(row['Planned Follow-up Date']) : undefined,
    source: row['Source'] || '',
    referenceEmployeeName: row['Reference Employee Name'] || '',
    referenceEmployeeMobileNumber: row['Reference Employee Mobile Number'] || '',
    sourceFrom: row['Source From'] || '',
    events: row['Events'] || '',
    numberOfFollowUps: row['Number of Follow-ups'] ? Number(row['Number of Follow-ups']) : 0,
    segment: row['Segment'] || '',
    subSegment: row['Sub Segment'] || '',
    dgOwnership: row['DG Ownership'] || '',
    createdBy: row['Created By'] || '',
    panNumber: row['PAN Number'] || '',
    lastFollowUpDate: row['Last Follow-up Date'] ? new Date(row['Last Follow-up Date']) : undefined,
    enquiryClosureDate: row['Enquiry Closure Date'] ? new Date(row['Enquiry Closure Date']) : undefined,
    financeRequired: row['Finance Required'] || '',
    financeCompany: row['Finance Company'] || '',
    referredBy: row['Referred By'] || '',
    // Add addresses array with primary address
    addresses: [primaryAddress],
    numberOfDG: row['Number of DG'] ? Number(row['Number of DG']) : 1,
    notes: row['Notes'] || ''
  };
};

// @desc    Preview DG Enquiries from Excel/CSV before import
// @route   POST /api/v1/dg-enquiries/preview-import
// @access  Private
export const previewDGEnquiryImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (!rawRows.length) {
      return next(new AppError('No data found in file', 400));
    }

    // --- Enhanced Duplicate detection logic ---
    // Check for duplicate phone numbers
    const phoneNumberMap: Record<string, number[]> = {}; // phoneNumber -> array of row indices
    
    rawRows.forEach((row, idx) => {
      // Skip demo rows from duplicate detection
      if (isDemoRow(row)) {
        return;
      }

      const phoneNumber = row['Phone Number'] || '';
      
      // Track duplicates by phone number only
      if (phoneNumber && phoneNumber.trim() !== '') {
        if (!phoneNumberMap[phoneNumber]) phoneNumberMap[phoneNumber] = [];
        phoneNumberMap[phoneNumber].push(idx);
      }
    });
    
    // Find duplicate rows by phone number only
    const duplicatePhoneNumbers = Object.entries(phoneNumberMap).filter(([_, indices]) => indices.length > 1);
    
    // Create sets to track which rows to keep vs skip
    const rowsToKeep = new Set<number>(); // First occurrence of each duplicate group
    const rowsToSkip = new Set<number>(); // Subsequent occurrences of duplicate groups
    
    // For phone number duplicates, keep the first occurrence
    duplicatePhoneNumbers.forEach(([phoneNumber, indices]) => {
      rowsToKeep.add(indices[0]); // Keep first occurrence
      indices.slice(1).forEach(idx => rowsToSkip.add(idx)); // Skip rest
    });
    
    // Convert to arrays for easier processing
    const duplicateRowObjects = Array.from(rowsToSkip).map(idx => rawRows[idx]);
    
    // Grouped duplicates for reporting
    const duplicateGroupsArray = [
      ...duplicatePhoneNumbers.map(([phoneNumber, indices]) => ({
        type: 'phoneNumber',
        value: phoneNumber,
        rows: indices.map(idx => rawRows[idx])
      }))
    ];
    
    // Store duplicate row data in memory for download
    (req as any).duplicateRowData = duplicateRowObjects;
    // --- End duplicate detection ---

    const preview = {
      totalRows: rawRows.length,
      validRows: 0,
      invalidRows: 0,
      errors: [] as string[],
      enquiriesToCreate: [] as any[],
      duplicateCount: 0,
      uniqueEnquiries: 0
    };

    const sampleData: any[] = [];
    let actualDataRows = 0; // Counter for non-demo rows

    // --- Track unstored rows ---
    const unstoredRows: { row: any, reason: string }[] = [];
    // --- End track unstored rows ---

    // First, collect all valid rows and phone numbers
    const phoneNumbers = new Set<string>();
    const validRows: any[] = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Excel row number (accounting for header)

      try {
        // Skip demo rows - don't validate or process them
        if (isDemoRow(row)) {
          continue;
        }

        // Increment actual data rows counter
        actualDataRows++;

        const mapped = mapExcelRowToEnquiry(row);
        
        // Basic validation for essential fields
        const enquiryNo = mapped.enquiryNo;
        const customerName = mapped.customerName || mapped.corporateName;
        const phoneNumber = mapped.phoneNumber;
        const email = mapped.email;

        if (!enquiryNo) {
          preview.errors.push(`Row ${rowNum}: Missing essential field (Enquiry No)`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Missing Enquiry No' });
          continue;
        }

        if (!customerName && !phoneNumber && !email) {
          preview.errors.push(`Row ${rowNum}: Missing customer information (Name, Phone, or Email)`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Missing customer information' });
          continue;
        }

        // Validate the mapped data against schema
        const { error } = dgEnquiryImportSchema.validate(mapped, { abortEarly: false });
        if (error) {
          const errorMessages = error.details.map(e => e.message).join('; ');
          preview.errors.push(`Row ${rowNum}: ${errorMessages}`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: errorMessages });
          continue;
        }

        // Check for duplicate phone numbers only
        const shouldSkip = rowsToSkip.has(i);
        if (shouldSkip) {
          const duplicateReasons = [];
          if (phoneNumber && phoneNumberMap[phoneNumber]?.length > 1) {
            duplicateReasons.push('Duplicate Phone Number');
          }
          
          unstoredRows.push({ 
            row, 
            reason: `Duplicate detected (skipped): ${duplicateReasons.join(', ')}` 
          });
          continue; // Skip processing this row
        }

        if (phoneNumber) {
          phoneNumbers.add(phoneNumber);
        }
        
        validRows.push({ row: mapped, index: i, rowNum });
      } catch (error: any) {
        preview.errors.push(`Row ${rowNum}: ${error.message}`);
        preview.invalidRows++;
        unstoredRows.push({ row, reason: error.message });
      }
    }

    // Process valid rows and prepare enquiry data
    const customerStats = {
      newCustomers: 0,
      existingCustomers: 0
    };

    for (const { row: mapped, index, rowNum } of validRows) {
      // Check if customer exists
      const existingCustomer = await findExistingCustomer(
        mapped.phoneNumber, 
        mapped.customerName, 
        mapped.corporateName
      );

      const customerInfo = {
        isExisting: !!existingCustomer,
        customerName: mapped.corporateName || mapped.customerName,
        phoneNumber: mapped.phoneNumber
      };

      if (existingCustomer) {
        customerStats.existingCustomers++;
      } else {
        customerStats.newCustomers++;
      }

      // Add enquiry to create list with customer info
      preview.enquiriesToCreate.push({
        ...mapped,
        customerInfo
      });

      // Add to sample data (first 10 rows)
      if (sampleData.length < 10) {
        sampleData.push({
          ...mapped,
          customerInfo
        });
      }

      preview.validRows++;
    }

    // Calculate statistics
    const uniquePhoneNumbers = Object.keys(phoneNumberMap);
    const duplicateCount = duplicateRowObjects.length;

    const response: APIResponse = {
      success: true,
      message: 'Import preview generated successfully',
      data: {
        summary: {
          totalRows: actualDataRows, // Use actual data rows instead of raw rows
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          duplicateCount: duplicateCount,
          uniquePhoneNumbers: uniquePhoneNumbers.length,
          enquiriesToCreate: preview.enquiriesToCreate.length,
          newCustomers: customerStats.newCustomers,
          existingCustomers: customerStats.existingCustomers
        },
        errors: preview.errors,
        sample: sampleData,
        enquiriesToCreate: preview.enquiriesToCreate,
        duplicateGroups: duplicateGroupsArray,
        duplicateRows: duplicateRowObjects,
        unstoredRows: unstoredRows
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Import DG Enquiries from Excel/CSV
// @route   POST /api/v1/dg-enquiries/import
// @access  Private
export const importDGEnquiries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (!rawRows.length) return next(new AppError('No data found in file', 400));

    // --- Duplicate detection for import ---
    // Check for duplicate phone numbers
    const phoneNumberMap: Record<string, number[]> = {};
    
    rawRows.forEach((row, idx) => {
      if (isDemoRow(row)) return;

      const phoneNumber = row['Phone Number'] || '';
      
      if (phoneNumber && phoneNumber.trim() !== '') {
        if (!phoneNumberMap[phoneNumber]) phoneNumberMap[phoneNumber] = [];
        phoneNumberMap[phoneNumber].push(idx);
      }
    });
    
    // Create sets to track which rows to keep vs skip
    const rowsToKeep = new Set<number>(); // First occurrence of each duplicate group
    const rowsToSkip = new Set<number>(); // Subsequent occurrences of duplicate groups
    
    // Skip duplicate phone numbers
    Object.entries(phoneNumberMap).forEach(([_, indices]) => {
      if (indices.length > 1) {
        rowsToKeep.add(indices[0]); // Keep first occurrence
        indices.slice(1).forEach(idx => rowsToSkip.add(idx)); // Skip rest
      }
    });
    // --- End duplicate detection ---

    const results = {
      created: [] as any[],
      skipped: [] as { row: any; reason: string }[],
      errors: [] as { row: any; error: string }[],
      total: 0
    };

    let actualDataRows = 0;

    // Process valid rows and create enquiries
    const validRows: any[] = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (isDemoRow(row)) continue;

      actualDataRows++;

      // Check for duplicate phone numbers only
      if (rowsToSkip.has(i)) {
        const phoneNumber = row['Phone Number'] || '';
        results.skipped.push({ 
          row, 
          reason: `Duplicate Phone Number detected (skipped): ${phoneNumber}` 
        });
        continue;
      }

      const mapped = mapExcelRowToEnquiry(row);
      const { error } = dgEnquiryImportSchema.validate(mapped, { abortEarly: false });

      if (error) {
        results.errors.push({
          row: mapped,
          error: error.details.map(e => e.message).join('; ')
        });
        continue;
      }

      const existing = await DGEnquiry.findOne({ phoneNumber: mapped.phoneNumber });
      if (existing) {
        results.skipped.push({ row: mapped, reason: 'Duplicate phone number in database' });
        continue;
      }
      
      validRows.push({ row: mapped, index: i });
    }

    // Process valid rows and create enquiries
    for (const { row: mapped, index } of validRows) {
      try {
        // Find or create customer
        let customer = await findExistingCustomer(
          mapped.phoneNumber, 
          mapped.customerName, 
          mapped.corporateName
        );

        if (customer) {
          // Update existing customer
          customer = await updateCustomerFromEnquiry(customer, mapped);
        } else {
          // Create new customer
          customer = await createCustomerFromEnquiry(mapped, req.user?.id || '');
        }

        if (!customer) {
          throw new Error('Failed to create or find customer');
        }

        // Create DG Enquiry with customer reference
        const enquiryData = {
          ...mapped,
          createdBy: req.user?.id,
          customer: customer._id
        };

        const createdEnquiry = await DGEnquiry.create(enquiryData);

        results.created.push({
          enquiry: createdEnquiry,
          customer: {
            id: customer._id,
            name: customer.name,
            isNew: customer.isNew || false
          }
        });
      } catch (err: any) {
        console.error(`Error importing enquiry ${mapped.enquiryNo}:`, err);
        results.errors.push({ row: mapped, error: err.message });
      }
    }

    results.total = actualDataRows;

    res.status(200).json({
      success: true,
      message: 'Enquiries import completed',
      results
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get paginated list of DG Enquiries
// @route   GET /api/v1/dg-enquiries
// @access  Private
export const getDGEnquiries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const filter: any = {};
    if (search) {
      filter.$or = [
        { enquiryNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { corporateName: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await DGEnquiry.countDocuments(filter);
    const enquiries = await DGEnquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: enquiries,
      pagination: {
        page,
        limit,
        total: total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated list of DG Enquiries
