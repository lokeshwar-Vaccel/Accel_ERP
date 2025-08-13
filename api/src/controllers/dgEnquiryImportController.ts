import { Response, NextFunction } from 'express';
import { DGEnquiry } from '../models/DGEnquiry';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';
import { dgEnquiryImportSchema } from '../schemas';
import Joi from 'joi';
import { DGCustomer, DGCustomerType, DGCustomerStatus, DGLeadSource, DGPhase } from '../models/DGCustomer';

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

// Helper: map Excel columns to schema fields
const mapExcelRowToEnquiry = (row: Record<string, any>) => ({
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
  corporateName: row['Corporate Name (Company Name)'] || '',
  customerName: row['Name (Customer Name)'] || '',
  phoneNumber: row['Phone Number'] || '',
  email: row['Email'] || '',
  address: row['Address'] || '',
  pinCode: row['PinCode'] || '',
  tehsil: row['Tehsil'] || '',
  district: row['District'] || '',
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
  numberOfFollowUps: row['Number of Follow-ups'] ? Number(row['Number of Follow-ups']) : undefined,
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
});

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
    // Only check for duplicate enquiry numbers, not phone numbers or emails
    const enquiryNoMap: Record<string, number[]> = {}; // enquiryNo -> array of row indices
    
    rawRows.forEach((row, idx) => {
      // Skip demo rows from duplicate detection
      if (isDemoRow(row)) {
        return;
      }

      const enquiryNo = row['Enquiry No'] || row['EnquiryNo'] || row['enquiryNo'] || row['ENQUIRY NO'];
      
      // Track duplicates by enquiry number only
      if (enquiryNo) {
        if (!enquiryNoMap[enquiryNo]) enquiryNoMap[enquiryNo] = [];
        enquiryNoMap[enquiryNo].push(idx);
      }
    });
    
    // Find duplicate rows by enquiry number only
    const duplicateEnquiryNos = Object.entries(enquiryNoMap).filter(([_, indices]) => indices.length > 1);
    
    // Create sets to track which rows to keep vs skip
    const rowsToKeep = new Set<number>(); // First occurrence of each duplicate group
    const rowsToSkip = new Set<number>(); // Subsequent occurrences of duplicate groups
    
    // For enquiry number duplicates, keep the first occurrence
    duplicateEnquiryNos.forEach(([enquiryNo, indices]) => {
      rowsToKeep.add(indices[0]); // Keep first occurrence
      indices.slice(1).forEach(idx => rowsToSkip.add(idx)); // Skip rest
    });
    
    // Convert to arrays for easier processing
    const duplicateRowObjects = Array.from(rowsToSkip).map(idx => rawRows[idx]);
    
    // Grouped duplicates for reporting
    const duplicateGroupsArray = [
      ...duplicateEnquiryNos.map(([enquiryNo, indices]) => ({
        type: 'enquiryNo',
        value: enquiryNo,
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
      customersToCreate: [] as any[],
      existingCustomers: [] as any[],
      duplicateCount: 0,
      uniqueEnquiries: 0
    };

    const sampleData: any[] = [];
    let newCustomersCount = 0;
    let existingCustomersCount = 0;
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

        // Check for duplicate enquiry numbers only
        const shouldSkip = rowsToSkip.has(i);
        if (shouldSkip) {
          const duplicateReasons = [];
          if (enquiryNo && enquiryNoMap[enquiryNo]?.length > 1) {
            duplicateReasons.push('Duplicate Enquiry No');
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

    // Get all existing customers by phone numbers (single query)
    const existingCustomers = await DGCustomer.find({
      phone: { $in: Array.from(phoneNumbers) }
    });
    
    const existingPhoneMap = new Map<string, any>();
    existingCustomers.forEach(customer => {
      existingPhoneMap.set(customer.phone, customer);
    });

    // Process valid rows and prepare customer data
    const newCustomerPhoneMap = new Map<string, any>();
    
    for (const { row: mapped, index, rowNum } of validRows) {
      let customer = null;
      
      if (mapped.phoneNumber) {
        customer = existingPhoneMap.get(mapped.phoneNumber);
        
        if (customer) {
          existingCustomersCount++;
          preview.existingCustomers.push({
            enquiryNo: mapped.enquiryNo,
            customerName: customer.name,
            email: customer.email,
            phone: customer.phone,
            isDGSalesCustomer: customer.isDGSalesCustomer || false
          });
        } else if (!newCustomerPhoneMap.has(mapped.phoneNumber)) {
          // This is a new unique phone number
          newCustomersCount++;
          
          const baseName = mapped.customerName || mapped.corporateName || 'Unknown Customer';
          const uniqueName = `${baseName} (${mapped.enquiryNo})`;
          
          const customerData = {
            name: uniqueName,
            corporateName: mapped.corporateName,
            contactPersonName: mapped.customerName,
            email: mapped.email || undefined,
            phone: mapped.phoneNumber,
            addresses: [{
              id: new Date().getTime() + index,
              address: mapped.address || '',
              state: mapped.state || '',
              district: mapped.district || '',
              pincode: mapped.pinCode || '',
              tehsil: mapped.tehsil || '',
              isPrimary: true
            }],
            dgRequirements: {
              kva: mapped.kva || '',
              phase: mapped.phase === '3' ? DGPhase.THREE : DGPhase.SINGLE,
              quantity: mapped.quantity || 1,
              segment: mapped.segment,
              subSegment: mapped.subSegment || '',
              dgOwnership: mapped.dgOwnership || 'NOT_OWNED',
              financeRequired: mapped.financeRequired === 'Yes',
              financeCompany: mapped.financeCompany || '',
              remarks: mapped.remarks || ''
            },
            customerType: mapped.customerType === 'Corporate' ? DGCustomerType.CORPORATE : DGCustomerType.RETAIL,
            status: DGCustomerStatus.NEW,
            leadSource: DGLeadSource.PORTAL_UPLOAD,
            sourceFrom: mapped.sourceFrom || '',
            assignedEmployeeCode: mapped.assignedEmployeeCode || '',
            assignedEmployeeName: mapped.assignedEmployeeName || '',
            employeeStatus: mapped.employeeStatus || '',
            referenceEmployeeName: mapped.referenceEmployeeName || '',
            referenceEmployeeMobileNumber: mapped.referenceEmployeeMobileNumber || '',
            referredBy: mapped.referredBy || '',
            events: mapped.events || '',
            notes: mapped.remarks || '',
            createdBy: req.user?.id
          };
          
          preview.customersToCreate.push(customerData);
          newCustomerPhoneMap.set(mapped.phoneNumber, customerData);
        }
      }

      // Add enquiry to create list
      preview.enquiriesToCreate.push({
        ...mapped,
        customer: customer?._id,
        status: customer ? 'existing_customer' : 'new_customer'
      });

      // Add to sample data (first 10 rows)
      if (sampleData.length < 10) {
        sampleData.push({
          ...mapped,
          status: customer ? 'existing_customer' : 'new_customer',
          customerExists: !!customer
        });
      }

      preview.validRows++;
    }

    // Calculate statistics
    const uniqueEnquiries = Object.keys(enquiryNoMap);
    const duplicateCount = duplicateRowObjects.length;

    const response: APIResponse = {
      success: true,
      message: 'Import preview generated successfully',
      data: {
        summary: {
          totalRows: actualDataRows, // Use actual data rows instead of raw rows
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          newCustomers: newCustomersCount,
          existingCustomers: existingCustomersCount,
          duplicateCount: duplicateCount,
          uniqueEnquiries: uniqueEnquiries.length,
          enquiriesToCreate: preview.enquiriesToCreate.length
        },
        errors: preview.errors,
        sample: sampleData,
        enquiriesToCreate: preview.enquiriesToCreate,
        customersToCreate: preview.customersToCreate,
        existingCustomers: preview.existingCustomers,
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
    // Only check for duplicate enquiry numbers, not phone numbers or emails
    const enquiryNoMap: Record<string, number[]> = {};
    
    rawRows.forEach((row, idx) => {
      if (isDemoRow(row)) return;

      const enquiryNo = row['Enquiry No'] || row['EnquiryNo'] || row['enquiryNo'] || row['ENQUIRY NO'];
      
      if (enquiryNo) {
        if (!enquiryNoMap[enquiryNo]) enquiryNoMap[enquiryNo] = [];
        enquiryNoMap[enquiryNo].push(idx);
      }
    });
    
    // Create sets to track which rows to keep vs skip
    const rowsToKeep = new Set<number>(); // First occurrence of each duplicate group
    const rowsToSkip = new Set<number>(); // Subsequent occurrences of duplicate groups
    
    // Only skip duplicate enquiry numbers, allow duplicate phone numbers and emails
    Object.entries(enquiryNoMap).forEach(([_, indices]) => {
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

    // First, collect all unique phone numbers and check existing customers
    const phoneNumbers = new Set<string>();
    const validRows: any[] = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (isDemoRow(row)) continue;

      actualDataRows++;

      // Check for duplicate enquiry numbers only
      if (rowsToSkip.has(i)) {
        const enquiryNo = row['Enquiry No'] || row['EnquiryNo'] || row['enquiryNo'] || row['ENQUIRY NO'];
        results.skipped.push({ 
          row, 
          reason: `Duplicate Enquiry No detected (skipped): ${enquiryNo}` 
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

      const existing = await DGEnquiry.findOne({ enquiryNo: mapped.enquiryNo });
      if (existing) {
        results.skipped.push({ row: mapped, reason: 'Duplicate enquiryNo in database' });
        continue;
      }

      if (mapped.phoneNumber) {
        phoneNumbers.add(mapped.phoneNumber);
      }
      
      validRows.push({ row: mapped, index: i });
    }

    // Get all existing customers by phone numbers
    const existingCustomers = await DGCustomer.find({
      phone: { $in: Array.from(phoneNumbers) }
    });
    
    const existingPhoneMap = new Map<string, any>();
    existingCustomers.forEach(customer => {
      existingPhoneMap.set(customer.phone, customer);
    });

    // Prepare bulk customer data for new customers
    const newCustomerData: any[] = [];
    const customerPhoneMap = new Map<string, any>();

    for (const { row: mapped, index } of validRows) {
      if (mapped.phoneNumber && !existingPhoneMap.has(mapped.phoneNumber) && !customerPhoneMap.has(mapped.phoneNumber)) {
        // This is a new unique phone number, prepare customer data
        const baseName = mapped.customerName || mapped.corporateName || 'Unknown Customer';
        const uniqueName = `${baseName} (${mapped.enquiryNo})`;
        
        const customerData = {
          name: uniqueName,
          corporateName: mapped.corporateName,
          contactPersonName: mapped.customerName,
          email: mapped.email || undefined,
          phone: mapped.phoneNumber,
          addresses: [{
            id: new Date().getTime() + index, // Make ID unique
            address: mapped.address || '',
            state: mapped.state || '',
            district: mapped.district || '',
            pincode: mapped.pinCode || '',
            tehsil: mapped.tehsil || '',
            isPrimary: true
          }],
          dgRequirements: {
            kva: mapped.kva || '',
            phase: mapped.phase === '3' ? DGPhase.THREE : DGPhase.SINGLE,
            quantity: mapped.quantity || 1,
            segment: mapped.segment,
            subSegment: mapped.subSegment || '',
            dgOwnership: mapped.dgOwnership || 'NOT_OWNED',
            financeRequired: mapped.financeRequired === 'Yes',
            financeCompany: mapped.financeCompany || '',
            remarks: mapped.remarks || ''
          },
          customerType: mapped.customerType === 'Corporate' ? DGCustomerType.CORPORATE : DGCustomerType.RETAIL,
          status: DGCustomerStatus.NEW,
          leadSource: DGLeadSource.PORTAL_UPLOAD,
          sourceFrom: mapped.sourceFrom || '',
          assignedEmployeeCode: mapped.assignedEmployeeCode || '',
          assignedEmployeeName: mapped.assignedEmployeeName || '',
          employeeStatus: mapped.employeeStatus || '',
          referenceEmployeeName: mapped.referenceEmployeeName || '',
          referenceEmployeeMobileNumber: mapped.referenceEmployeeMobileNumber || '',
          referredBy: mapped.referredBy || '',
          events: mapped.events || '',
          notes: mapped.remarks || '',
          createdBy: req.user?.id
        };
        
        newCustomerData.push(customerData);
        customerPhoneMap.set(mapped.phoneNumber, customerData);
      }
    }

    // Bulk create new customers
    let createdCustomers: any[] = [];
    if (newCustomerData.length > 0) {
      try {
        console.log(`Creating ${newCustomerData.length} new customers in bulk...`);
        createdCustomers = await DGCustomer.insertMany(newCustomerData);
        console.log(`Successfully created ${createdCustomers.length} customers`);
        
        // Add created customers to the map
        createdCustomers.forEach(customer => {
          existingPhoneMap.set(customer.phone, customer);
        });
      } catch (bulkErr: any) {
        console.error('Bulk customer creation failed:', bulkErr);
        results.errors.push({
          row: { enquiryNo: 'BULK_CREATION' },
          error: `Bulk customer creation failed: ${bulkErr.message}`
        });
      }
    }

    // Now process all valid rows and create enquiries
    for (const { row: mapped, index } of validRows) {
      try {
        let customer: any = null;
        
        if (mapped.phoneNumber) {
          customer = existingPhoneMap.get(mapped.phoneNumber);
        }

        // Create DG Enquiry
        const enquiryData = {
          ...mapped,
          customer: customer?._id,
          createdBy: req.user?.id
        };

        const createdEnquiry = await DGEnquiry.create(enquiryData);

        results.created.push({
          enquiry: createdEnquiry,
          customer: customer ? {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            isNew: createdCustomers.some(c => c._id.toString() === customer._id.toString())
          } : null
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

// @desc    Generate prospective customers from DG Enquiries
// @route   POST /api/v1/dg-enquiries/generate-customers
// @access  Private
export const generateProspectiveCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const enquiries = await DGEnquiry.find({ customer: { $exists: false } });

    const created: any[] = [];
    let linked = 0;
    const errors: any[] = [];

    for (const enq of enquiries) {
      try {
        let customer = await DGCustomer.findOne({
          $or: [
            { phone: enq.phoneNumber },
            { email: enq.email },
            { name: enq.customerName }
          ],
          isDGSalesCustomer: true
        });

        if (!customer) {
          // Create unique name to avoid conflicts
          const baseName = enq.customerName || enq.corporateName || 'Unknown Customer';
          const uniqueName = `${baseName} (${enq.enquiryNo})`;
          
          customer = await DGCustomer.create({
            name: uniqueName,
            corporateName: enq.corporateName,
            contactPersonName: enq.customerName,
            email: enq.email,
            phone: enq.phoneNumber,
            addresses: [{
              id: new Date().getTime(),
              address: enq.address,
              state: enq.state,
              district: enq.district,
              pincode: enq.pinCode,
              tehsil: enq.tehsil,
              isPrimary: true
            }],
            dgRequirements: {
              kva: enq.kva || '',
              phase: enq.phase === '3' ? DGPhase.THREE : DGPhase.SINGLE,
              quantity: enq.quantity || 1,
              segment: enq.segment,
              subSegment: enq.subSegment || '',
              dgOwnership: enq.dgOwnership || 'NOT_OWNED',
              financeRequired: enq.financeRequired === 'Yes',
              financeCompany: enq.financeCompany || '',
              remarks: enq.remarks || ''
            },
            customerType: enq.customerType === 'Corporate' ? DGCustomerType.CORPORATE : DGCustomerType.RETAIL,
            status: DGCustomerStatus.NEW,
            leadSource: DGLeadSource.PORTAL_UPLOAD,
            sourceFrom: enq.sourceFrom || '',
            assignedEmployeeCode: enq.assignedEmployeeCode || '',
            assignedEmployeeName: enq.assignedEmployeeName || '',
            employeeStatus: enq.employeeStatus || '',
            referenceEmployeeName: enq.referenceEmployeeName || '',
            referenceEmployeeMobileNumber: enq.referenceEmployeeMobileNumber || '',
            referredBy: enq.referredBy || '',
            events: enq.events || '',
            notes: enq.remarks || '',
            createdBy: enq.createdBy || req.user?.id
          });

          // Optional: populate any virtuals if needed
          created.push(customer.toObject());
        } else {
          linked++;
        }

        enq.customer = customer._id;
        await enq.save();
      } catch (err: any) {
        errors.push({ enquiryNo: enq.enquiryNo, error: err.message });
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Prospective customers processed successfully',
      data: {
        created,
        linked,
        errors
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};
