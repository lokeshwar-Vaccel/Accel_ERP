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
  if (!phoneNumber || !String(phoneNumber).trim()) {
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

// Helper: Find existing DG enquiry by enquiry number
const findExistingDGEnquiry = async (enquiryNo: string) => {
  if (!enquiryNo || !enquiryNo.trim()) {
    return null;
  }

  return await DGEnquiry.findOne({ enquiryNo: enquiryNo.trim() });
};

// Helper: Compare and update DG enquiry fields, returning changes made
const updateDGEnquiryFromImport = async (existingEnquiry: any, enquiryData: any) => {
  const changes: string[] = [];
  let hasChanges = false;

  // Define fields to compare (excluding system fields)
  const fieldsToCompare = [
    { key: 'zone', label: 'Zone' },
    { key: 'state', label: 'State' },
    { key: 'areaOffice', label: 'Area Office' },
    { key: 'dealer', label: 'Dealer' },
    { key: 'branch', label: 'Branch' },
    { key: 'location', label: 'Location' },
    { key: 'assignedEmployeeCode', label: 'Assigned Employee Code' },
    { key: 'assignedEmployeeName', label: 'Assigned Employee Name' },
    { key: 'employeeStatus', label: 'Employee Status' },
    { key: 'customerType', label: 'Customer Type' },
    { key: 'corporateName', label: 'Corporate Name' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'kva', label: 'KVA' },
    { key: 'phase', label: 'Phase' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'enquiryStatus', label: 'Enquiry Status' },
    { key: 'enquiryType', label: 'Enquiry Type' },
    { key: 'enquiryStage', label: 'Enquiry Stage' },
    { key: 'source', label: 'Source' },
    { key: 'sourceFrom', label: 'Source From' },
    { key: 'numberOfFollowUps', label: 'Number of Follow-ups' },
    { key: 'referenceEmployeeName', label: 'Reference Employee Name' },
    { key: 'referenceEmployeeMobileNumber', label: 'Reference Employee Mobile Number' },
    { key: 'events', label: 'Events' },
    { key: 'segment', label: 'Segment' },
    { key: 'subSegment', label: 'Sub Segment' },
    { key: 'dgOwnership', label: 'DG Ownership' },
    { key: 'panNumber', label: 'PAN Number' },
    { key: 'financeRequired', label: 'Finance Required' },
    { key: 'financeCompany', label: 'Finance Company' },
    { key: 'referredBy', label: 'Referred By' },
    { key: 'numberOfDG', label: 'Number of DG' },
    { key: 'notes', label: 'Notes' }
  ];

  // Compare and update fields
  fieldsToCompare.forEach(field => {
    const newValue = enquiryData[field.key];
    const currentValue = existingEnquiry[field.key];
    
    // Handle different data types
    let hasFieldChanged = false;
    if (field.key === 'quantity' || field.key === 'numberOfFollowUps' || field.key === 'numberOfDG') {
      // Numeric fields
      const newNum = newValue ? Number(newValue) : 0;
      const currentNum = currentValue ? Number(currentValue) : 0;
      hasFieldChanged = newNum !== currentNum;
    } else if (field.key.includes('Date')) {
      // Date fields
      const newDate = newValue ? new Date(newValue).toISOString() : null;
      const currentDate = currentValue ? new Date(currentValue).toISOString() : null;
      hasFieldChanged = newDate !== currentDate;
    } else {
      // String fields
      const newStr = newValue ? String(newValue).trim() : '';
      const currentStr = currentValue ? String(currentValue).trim() : '';
      hasFieldChanged = newStr !== currentStr;
    }
    
    if (hasFieldChanged) {
      const displayNewValue = newValue || '';
      const displayCurrentValue = currentValue || '';
      changes.push(`${field.label}: '${displayCurrentValue}' → '${displayNewValue}'`);
      existingEnquiry[field.key] = newValue;
      hasChanges = true;
    }
  });

  // Handle date fields separately
  const dateFields = [
    { key: 'enquiryDate', label: 'Enquiry Date' },
    { key: 'eoPoDate', label: 'EO/PO Date' },
    { key: 'plannedFollowUpDate', label: 'Planned Follow-up Date' },
    { key: 'lastFollowUpDate', label: 'Last Follow-up Date' },
    { key: 'enquiryClosureDate', label: 'Enquiry Closure Date' }
  ];

  dateFields.forEach(field => {
    const newValue = enquiryData[field.key];
    const currentValue = existingEnquiry[field.key];
    
    const newDate = newValue ? new Date(newValue).toISOString() : null;
    const currentDate = currentValue ? new Date(currentValue).toISOString() : null;
    
    if (newDate !== currentDate) {
      const displayNewValue = newValue ? new Date(newValue).toLocaleDateString() : '';
      const displayCurrentValue = currentValue ? new Date(currentValue).toLocaleDateString() : '';
      changes.push(`${field.label}: '${displayCurrentValue}' → '${displayNewValue}'`);
      existingEnquiry[field.key] = newValue;
      hasChanges = true;
    }
  });

  // Update addresses if provided
  if (enquiryData.addresses && enquiryData.addresses.length > 0) {
    const newPrimaryAddress = enquiryData.addresses[0];
    const existingPrimaryAddress = existingEnquiry.addresses.find((addr: any) => addr.isPrimary);
    
    if (existingPrimaryAddress) {
      const addressFields = [
        { key: 'address', label: 'Address' },
        { key: 'state', label: 'State' },
        { key: 'district', label: 'District' },
        { key: 'pincode', label: 'Pincode' },
        { key: 'contactPersonName', label: 'Contact Person' },
        { key: 'designation', label: 'Designation' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'gstNumber', label: 'GST Number' }
        // Note: tehsil is excluded from customer changes as it's handled in enquiry
      ];

      addressFields.forEach(field => {
        const newValue = newPrimaryAddress[field.key] || '';
        const currentValue = existingPrimaryAddress[field.key] || '';
        
        // Special handling for email fields - case insensitive comparison
        let hasFieldChanged = false;
        if (field.key === 'email') {
          hasFieldChanged = newValue && newValue.toLowerCase() !== currentValue.toLowerCase();
        } else {
          hasFieldChanged = newValue && newValue !== currentValue;
        }
        
        if (hasFieldChanged) {
          changes.push(`${field.label}: '${currentValue}' → '${newValue}'`);
          existingPrimaryAddress[field.key] = newValue;
          hasChanges = true;
        }
      });
    } else {
      changes.push('Added new primary address');
      existingEnquiry.addresses.push(newPrimaryAddress);
      hasChanges = true;
    }
  }

  const updatedEnquiry = await existingEnquiry.save();
  (updatedEnquiry as any).changes = changes;
  (updatedEnquiry as any).hasChanges = hasChanges;
  return updatedEnquiry;
};

// Helper: Create new customer from enquiry data
const createCustomerFromEnquiry = async (enquiryData: any, createdBy: string) => {
  // Use corporate name as the customer name (company name), fall back to contact person name if no corporate name
  const customerName = enquiryData.corporateName || enquiryData.customerName || 'Unknown Customer';
  
  console.log(`Creating customer: Corporate="${enquiryData.corporateName}", Contact="${enquiryData.customerName}", Final="${customerName}"`);
  
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

// Helper: Compare and update customer fields, returning changes made
const updateCustomerFromEnquiry = async (customer: any, enquiryData: any) => {
  const changes: string[] = [];
  let hasChanges = false;

  // Update customer name if corporate name is provided and different
  if (enquiryData.corporateName && enquiryData.corporateName !== customer.name) {
    changes.push(`Name: '${customer.name}' → '${enquiryData.corporateName}'`);
    customer.name = enquiryData.corporateName;
    hasChanges = true;
  }

  // Update notes if provided and different
  if (enquiryData.remarks && enquiryData.remarks !== customer.notes) {
    changes.push(`Notes: '${customer.notes || ''}' → '${enquiryData.remarks}'`);
    customer.notes = enquiryData.remarks;
    hasChanges = true;
  }

  // Update number of DG if provided and different
  if (enquiryData.numberOfDG && enquiryData.numberOfDG !== customer.numberOfDG) {
    changes.push(`Number of DG: ${customer.numberOfDG || 0} → ${enquiryData.numberOfDG}`);
    customer.numberOfDG = enquiryData.numberOfDG;
    hasChanges = true;
  }

  // Update or add address information
  if (enquiryData.addresses && enquiryData.addresses.length > 0) {
    const primaryAddress = enquiryData.addresses[0];
    
    // Check if we need to add a new address or update existing
    const existingPrimaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
    
    if (existingPrimaryAddress) {
      // Compare and update existing primary address fields
      const addressFields = [
        { key: 'address', label: 'Address' },
        { key: 'state', label: 'State' },
        { key: 'district', label: 'District' },
        { key: 'pincode', label: 'Pincode' },
        { key: 'contactPersonName', label: 'Contact Person' },
        { key: 'designation', label: 'Designation' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'gstNumber', label: 'GST Number' }
        // Note: tehsil is excluded from customer changes as it's handled in enquiry
      ];

      addressFields.forEach(field => {
        const newValue = primaryAddress[field.key] || '';
        const currentValue = existingPrimaryAddress[field.key] || '';
        
        // Special handling for email fields - case insensitive comparison
        let hasFieldChanged = false;
        if (field.key === 'email') {
          hasFieldChanged = newValue && newValue.toLowerCase() !== currentValue.toLowerCase();
        } else {
          hasFieldChanged = newValue && newValue !== currentValue;
        }
        
        if (hasFieldChanged) {
          changes.push(`${field.label}: '${currentValue}' → '${newValue}'`);
          existingPrimaryAddress[field.key] = newValue;
          hasChanges = true;
        }
      });
    } else {
      // Add new primary address
      changes.push('Added new primary address');
      customer.addresses.push(primaryAddress);
      hasChanges = true;
    }
  }

  const updatedCustomer = await customer.save();
  (updatedCustomer as any).isNew = false;
  (updatedCustomer as any).changes = changes;
  (updatedCustomer as any).hasChanges = hasChanges;
  return updatedCustomer;
};

// Helper: map Excel columns to schema fields
const mapExcelRowToEnquiry = (row: Record<string, any>) => {
  const phoneNumber = String(row['Phone Number'] || '').trim();
  
  // Try multiple possible column names for contact person name
  const contactPersonName = row['Name (Customer Name)'] || 
                           row['Customer Name'] || 
                           row['Contact Person Name'] || 
                           row['Name'] ||
                           row['Contact Person'] ||
                           row['Customer'] ||
                           row['Contact Name'] ||
                           row['Person Name'] ||
                           '';
                           
  // Try multiple possible column names for corporate name
  const corporateName = row['Corporate Name (Company Name)'] || 
                       row['Corporate Name'] || 
                       row['Company Name'] || 
                       row['Company'] ||
                       row['Organization Name'] ||
                       row['Business Name'] ||
                       '';
  
  console.log(`Primary column detection:`, {
    'Name (Customer Name)': `"${row['Name (Customer Name)']}"`,
    'Corporate Name (Company Name)': `"${row['Corporate Name (Company Name)']}"`,
    'Detected contactPersonName': `"${contactPersonName}"`,
    'Detected corporateName': `"${corporateName}"`
  });
  
  // Debug logging to help identify column mapping issues
  console.log(`Raw row data for mapping:`, {
    'Name (Customer Name)': row['Name (Customer Name)'],
    'Customer Name': row['Customer Name'],
    'Contact Person Name': row['Contact Person Name'],
    'Name': row['Name'],
    'Contact Person': row['Contact Person'],
    'Customer': row['Customer'],
    'Corporate Name (Company Name)': row['Corporate Name (Company Name)'],
    'Corporate Name': row['Corporate Name'],
    'Company Name': row['Company Name'],
    'Company': row['Company'],
    'Phone Number': row['Phone Number']
  });
  
  // Also check all available keys to see what's actually in the row
  console.log(`All available keys in row:`, Object.keys(row));
  console.log(`Values for all keys:`, Object.entries(row).map(([key, value]) => `${key}: "${value}"`).join(', '));
  
  // If contact person name is still empty, try to find it by looking at all columns
  let finalContactPersonName = contactPersonName;
  if (!finalContactPersonName) {
    console.log(`Contact person name not found, searching all columns...`);
    
    // First, try to find columns that match the expected pattern more closely
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && value.trim()) {
        const lowerKey = key.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Look for exact matches or close matches to expected column names
        if (lowerKey.includes('name') && lowerKey.includes('customer') && !lowerKey.includes('company') && !lowerKey.includes('corporate')) {
          finalContactPersonName = value.trim();
          console.log(`Found contact person name in column "${key}": "${value}"`);
          break;
        }
      }
    }
    
    // If still not found, try broader search
    if (!finalContactPersonName) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.trim()) {
          const lowerKey = key.toLowerCase();
          const lowerValue = value.toLowerCase();
          
          // Skip if it looks like a company name (contains common company words)
          if (lowerValue.includes('pvt') || lowerValue.includes('ltd') || lowerValue.includes('llp') || 
              lowerValue.includes('inc') || lowerValue.includes('corp') || lowerValue.includes('company')) {
            continue;
          }
          
          // Skip employee-related columns (we want customer contact, not employee)
          if (lowerKey.includes('employee') || lowerKey.includes('assigned')) {
            continue;
          }
          
          // If the column name suggests it's a person name
          if (lowerKey.includes('name') && !lowerKey.includes('company') && !lowerKey.includes('corporate') && !lowerKey.includes('employee')) {
            finalContactPersonName = value.trim();
            console.log(`Found contact person name in column "${key}": "${value}"`);
            break;
          }
        }
      }
    }
  }
  
  if (!finalContactPersonName && corporateName) {
    console.log(`Warning: No contact person name found for ${corporateName}`);
  }
  
  console.log(`Mapping: Corporate="${corporateName}", Contact="${finalContactPersonName}"`);
  
  // Create primary address from Excel data
  const primaryAddress = {
    id: 1,
    address: row['Address'] || '',
    state: row['State'] || '',
    district: row['District'] || '',
    pincode: row['PinCode'] || '',
    isPrimary: true,
    contactPersonName: finalContactPersonName, // Store actual contact person name, not fallback
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
    customerName: finalContactPersonName, // Store contact person name in customerName field
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

      const phoneNumber = String(row['Phone Number'] || '').trim();
      
      // Track duplicates by phone number only
      if (phoneNumber && phoneNumber !== '') {
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
      existingCustomers: 0,
      customersWithChanges: 0
    };
    
    const enquiryStats = {
      newEnquiries: 0,
      existingEnquiries: 0,
      enquiriesWithChanges: 0
    };

    for (const { row: mapped, index, rowNum } of validRows) {
      // Check if customer exists
      const existingCustomer = await findExistingCustomer(
        mapped.phoneNumber, 
        mapped.corporateName, // Use corporate name as the primary customer name
        mapped.customerName   // Use contact person name as secondary
      );

      // Check if DG enquiry exists
      const existingEnquiry = await findExistingDGEnquiry(mapped.enquiryNo);

      let customerInfo = {
        isExisting: !!existingCustomer,
        customerName: mapped.corporateName || mapped.customerName, // Show corporate name as primary
        contactPersonName: mapped.customerName, // Show contact person name separately
        phoneNumber: mapped.phoneNumber,
        changes: [] as string[],
        hasChanges: false
      };

      let enquiryInfo = {
        isExisting: !!existingEnquiry,
        enquiryNo: mapped.enquiryNo,
        changes: [] as string[],
        hasChanges: false
      };

      // Analyze customer changes
      if (existingCustomer) {
        customerStats.existingCustomers++;
        // Simulate customer update to get changes (without saving)
        const tempCustomer = existingCustomer.toObject();
        const changes: string[] = [];
        let hasChanges = false;

        // Check name change
        if (mapped.corporateName && mapped.corporateName !== tempCustomer.name) {
          changes.push(`Name: '${tempCustomer.name}' → '${mapped.corporateName}'`);
          hasChanges = true;
        }

        // Check notes change
        if (mapped.remarks && mapped.remarks !== tempCustomer.notes) {
          changes.push(`Notes: '${tempCustomer.notes || ''}' → '${mapped.remarks}'`);
          hasChanges = true;
        }

        // Check numberOfDG change
        if (mapped.numberOfDG && mapped.numberOfDG !== tempCustomer.numberOfDG) {
          changes.push(`Number of DG: ${tempCustomer.numberOfDG || 0} → ${mapped.numberOfDG}`);
          hasChanges = true;
        }

        // Check address changes
        if (mapped.addresses && mapped.addresses.length > 0) {
          const newPrimaryAddress = mapped.addresses[0];
          const existingPrimaryAddress = tempCustomer.addresses.find((addr: any) => addr.isPrimary);
          
          if (existingPrimaryAddress) {
            const addressFields = [
              { key: 'address', label: 'Address' },
              { key: 'state', label: 'State' },
              { key: 'district', label: 'District' },
              { key: 'pincode', label: 'Pincode' },
              { key: 'contactPersonName', label: 'Contact Person' },
              { key: 'designation', label: 'Designation' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'gstNumber', label: 'GST Number' }
              // Note: tehsil is excluded from customer changes as it's handled in enquiry
            ];

            addressFields.forEach(field => {
              const newValue = (newPrimaryAddress as Record<string, any>)[field.key] || '';
              const currentValue = (existingPrimaryAddress as Record<string, any>)[field.key] || '';
              
              // Special handling for email fields - case insensitive comparison
              let hasFieldChanged = false;
              if (field.key === 'email') {
                hasFieldChanged = newValue && newValue.toLowerCase() !== currentValue.toLowerCase();
              } else {
                hasFieldChanged = newValue && newValue !== currentValue;
              }
              
              if (hasFieldChanged) {
                changes.push(`${field.label}: '${currentValue}' → '${newValue}'`);
                hasChanges = true;
              }
            });
          } else {
            changes.push('Added new primary address');
            hasChanges = true;
          }
        }

        customerInfo.changes = changes;
        customerInfo.hasChanges = hasChanges;
        if (hasChanges) {
          customerStats.customersWithChanges++;
        }
      } else {
        customerStats.newCustomers++;
      }

      // Analyze enquiry changes
      if (existingEnquiry) {
        enquiryStats.existingEnquiries++;
        // Simulate enquiry update to get changes (without saving)
        const tempEnquiry = existingEnquiry.toObject();
        const changes: string[] = [];
        let hasChanges = false;

        // Define fields to compare
        const fieldsToCompare = [
          { key: 'zone', label: 'Zone' },
          { key: 'state', label: 'State' },
          { key: 'areaOffice', label: 'Area Office' },
          { key: 'dealer', label: 'Dealer' },
          { key: 'branch', label: 'Branch' },
          { key: 'location', label: 'Location' },
          { key: 'assignedEmployeeCode', label: 'Assigned Employee Code' },
          { key: 'assignedEmployeeName', label: 'Assigned Employee Name' },
          { key: 'employeeStatus', label: 'Employee Status' },
          { key: 'customerType', label: 'Customer Type' },
          { key: 'corporateName', label: 'Corporate Name' },
          { key: 'customerName', label: 'Customer Name' },
          { key: 'kva', label: 'KVA' },
          { key: 'phase', label: 'Phase' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'remarks', label: 'Remarks' },
          { key: 'enquiryStatus', label: 'Enquiry Status' },
          { key: 'enquiryType', label: 'Enquiry Type' },
          { key: 'enquiryStage', label: 'Enquiry Stage' },
          { key: 'source', label: 'Source' },
          { key: 'sourceFrom', label: 'Source From' },
          { key: 'numberOfFollowUps', label: 'Number of Follow-ups' },
          { key: 'referenceEmployeeName', label: 'Reference Employee Name' },
          { key: 'referenceEmployeeMobileNumber', label: 'Reference Employee Mobile Number' },
          { key: 'events', label: 'Events' },
          { key: 'segment', label: 'Segment' },
          { key: 'subSegment', label: 'Sub Segment' },
          { key: 'dgOwnership', label: 'DG Ownership' },
          { key: 'panNumber', label: 'PAN Number' },
          { key: 'financeRequired', label: 'Finance Required' },
          { key: 'financeCompany', label: 'Finance Company' },
          { key: 'referredBy', label: 'Referred By' },
          { key: 'numberOfDG', label: 'Number of DG' },
          { key: 'notes', label: 'Notes' }
        ];

        // Compare fields
        fieldsToCompare.forEach(field => {
          const newValue = mapped[field.key];
          const currentValue = (tempEnquiry as Record<string, any>)[field.key];
          
          let hasFieldChanged = false;
          if (field.key === 'quantity' || field.key === 'numberOfFollowUps' || field.key === 'numberOfDG') {
            const newNum = newValue ? Number(newValue) : 0;
            const currentNum = currentValue ? Number(currentValue) : 0;
            hasFieldChanged = newNum !== currentNum;
          } else if (field.key.includes('Date')) {
            const newDate = newValue ? new Date(newValue).toISOString() : null;
            const currentDate = currentValue ? new Date(currentValue).toISOString() : null;
            hasFieldChanged = newDate !== currentDate;
          } else {
            const newStr = newValue ? String(newValue).trim() : '';
            const currentStr = currentValue ? String(currentValue).trim() : '';
            hasFieldChanged = newStr !== currentStr;
          }
          
          if (hasFieldChanged) {
            const displayNewValue = newValue || '';
            const displayCurrentValue = currentValue || '';
            changes.push(`${field.label}: '${displayCurrentValue}' → '${displayNewValue}'`);
            hasChanges = true;
          }
        });

        // Check date fields
        const dateFields = [
          { key: 'enquiryDate', label: 'Enquiry Date' },
          { key: 'eoPoDate', label: 'EO/PO Date' },
          { key: 'plannedFollowUpDate', label: 'Planned Follow-up Date' },
          { key: 'lastFollowUpDate', label: 'Last Follow-up Date' },
          { key: 'enquiryClosureDate', label: 'Enquiry Closure Date' }
        ];

        dateFields.forEach(field => {
          const newValue = mapped[field.key];
          const currentValue = (tempEnquiry as Record<string, any>)[field.key];
          
          const newDate = newValue ? new Date(newValue).toISOString() : null;
          const currentDate = currentValue ? new Date(currentValue).toISOString() : null;
          
          if (newDate !== currentDate) {
            const displayNewValue = newValue ? new Date(newValue).toLocaleDateString() : '';
            const displayCurrentValue = currentValue ? new Date(currentValue).toLocaleDateString() : '';
            changes.push(`${field.label}: '${displayCurrentValue}' → '${displayNewValue}'`);
            hasChanges = true;
          }
        });

        enquiryInfo.changes = changes;
        enquiryInfo.hasChanges = hasChanges;
        if (hasChanges) {
          enquiryStats.enquiriesWithChanges++;
        }
      } else {
        enquiryStats.newEnquiries++;
      }

      // Add enquiry to create list with customer and enquiry info
      preview.enquiriesToCreate.push({
        ...mapped,
        customerInfo,
        enquiryInfo
      });

      // Add to sample data (first 10 rows)
      if (sampleData.length < 10) {
        sampleData.push({
          ...mapped,
          customerInfo,
          enquiryInfo
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
          // Customer statistics
          newCustomers: customerStats.newCustomers,
          existingCustomers: customerStats.existingCustomers,
          customersWithChanges: customerStats.customersWithChanges,
          customersWithoutChanges: customerStats.existingCustomers - customerStats.customersWithChanges,
          // Enquiry statistics
          newEnquiries: enquiryStats.newEnquiries,
          existingEnquiries: enquiryStats.existingEnquiries,
          enquiriesWithChanges: enquiryStats.enquiriesWithChanges,
          enquiriesWithoutChanges: enquiryStats.existingEnquiries - enquiryStats.enquiriesWithChanges
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

    console.log(`Excel file parsed successfully. Sheet names:`, workbook.SheetNames);
    console.log(`Using sheet: ${workbook.SheetNames[0]}`);
    console.log(`Raw rows count: ${rawRows.length}`);

    if (!rawRows.length) return next(new AppError('No data found in file', 400));

    // --- Duplicate detection for import ---
    // Check for duplicate phone numbers
    const phoneNumberMap: Record<string, number[]> = {};
    
    rawRows.forEach((row, idx) => {
      if (isDemoRow(row)) return;

      const phoneNumber = String(row['Phone Number'] || '').trim();
      
      if (phoneNumber && phoneNumber !== '') {
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
      updated: [] as any[],
      skipped: [] as { row: any; reason: string }[],
      errors: [] as { row: any; error: string }[],
      total: 0
    };

    let actualDataRows = 0;

    console.log(`Starting import process with ${rawRows.length} total rows`);
    console.log(`First row sample:`, rawRows[0]);
    console.log(`All column names:`, Object.keys(rawRows[0] || {}));
    
    // Process all rows and create/update enquiries
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      console.log(`Row ${i + 1}: Raw data:`, JSON.stringify(row, null, 2));
      console.log(`Row ${i + 1}: Checking if demo row...`);
      if (isDemoRow(row)) {
        console.log(`Row ${i + 1}: Skipped as demo row`);
        continue;
      }

      actualDataRows++;
      console.log(`Row ${i + 1}: Processing (actualDataRows: ${actualDataRows})`);

      // Check for duplicate phone numbers only
      if (rowsToSkip.has(i)) {
        const phoneNumber = row['Phone Number'] || '';
        console.log(`Row ${i + 1}: Skipped as duplicate phone number: ${phoneNumber}`);
        results.skipped.push({ 
          row, 
          reason: `Duplicate Phone Number detected (skipped): ${phoneNumber}` 
        });
        continue;
      }

      console.log(`Row ${i + 1}: Mapping Excel data...`);
      const mapped = mapExcelRowToEnquiry(row);
      console.log(`Row ${i + 1}: Mapped data:`, { 
        enquiryNo: mapped.enquiryNo, 
        corporateName: mapped.corporateName, 
        customerName: mapped.customerName,
        phoneNumber: mapped.phoneNumber,
        email: mapped.email
      });
      console.log(`Row ${i + 1}: Address data:`, mapped.addresses?.[0]);
      
      // Check if enquiry number is missing
      if (!mapped.enquiryNo || mapped.enquiryNo.trim() === '') {
        console.log(`Row ${i + 1}: Missing enquiry number, skipping...`);
        results.errors.push({
          row: mapped,
          error: 'Missing enquiry number'
        });
        continue;
      }
      
      console.log(`Row ${i + 1}: Validating against schema...`);
      const { error } = dgEnquiryImportSchema.validate(mapped, { abortEarly: false });

      if (error) {
        console.log(`Row ${i + 1}: Validation failed:`, error.details.map(e => e.message));
        results.errors.push({
          row: mapped,
          error: error.details.map(e => e.message).join('; ')
        });
        continue;
      }

      console.log(`Row ${i + 1}: Validation passed, proceeding to process...`);

      // Process this row (create or update enquiry)
      console.log(`Processing row ${i + 1}: Enquiry No ${mapped.enquiryNo}`);
      try {
        // Find or create customer
        console.log(`Row ${i + 1}: Looking for existing customer with phone: ${mapped.phoneNumber}, corporate: ${mapped.corporateName}`);
        let customer = await findExistingCustomer(
          mapped.phoneNumber, 
          mapped.corporateName, // Use corporate name as the primary customer name
          mapped.customerName   // Use contact person name as secondary
        );

        let customerChanges: string[] = [];
        let customerHasChanges = false;

        if (customer) {
          console.log(`Row ${i + 1}: Found existing customer: ${customer.name}`);
          // Update existing customer
          customer = await updateCustomerFromEnquiry(customer, mapped);
          customerChanges = (customer as any).changes || [];
          customerHasChanges = (customer as any).hasChanges || false;
          console.log(`Row ${i + 1}: Customer updated with changes:`, customerChanges);
        } else {
          console.log(`Row ${i + 1}: No existing customer found, creating new one...`);
          // Create new customer
          customer = await createCustomerFromEnquiry(mapped, req.user?.id || '');
          console.log(`Row ${i + 1}: New customer created: ${customer.name}`);
        }

        if (!customer) {
          throw new Error('Failed to create or find customer');
        }

        // Check if DG enquiry already exists
        console.log(`Row ${i + 1}: Checking if enquiry exists: ${mapped.enquiryNo}`);
        const existingEnquiry = await findExistingDGEnquiry(mapped.enquiryNo);

        if (existingEnquiry) {
          // Update existing enquiry
          console.log(`Row ${i + 1}: Updating existing enquiry: ${mapped.enquiryNo}`);
          console.log(`Row ${i + 1}: Existing enquiry customerName: "${existingEnquiry.customerName}"`);
          console.log(`Row ${i + 1}: Mapped customerName: "${mapped.customerName}"`);
          
          const updatedEnquiry = await updateDGEnquiryFromImport(existingEnquiry, mapped);
          const enquiryChanges = (updatedEnquiry as any).changes || [];
          const enquiryHasChanges = (updatedEnquiry as any).hasChanges || false;

          console.log(`Row ${i + 1}: Enquiry updated with changes:`, enquiryChanges);
          console.log(`Row ${i + 1}: Updated enquiry customerName: "${updatedEnquiry.customerName}"`);
          results.updated.push({
            enquiry: updatedEnquiry,
            customer: {
              id: customer._id,
              name: customer.name,
              isNew: customer.isNew || false,
              changes: customerChanges,
              hasChanges: customerHasChanges
            },
            enquiryChanges: enquiryChanges,
            enquiryHasChanges: enquiryHasChanges,
            enquiryNo: mapped.enquiryNo
          });
          console.log(`Row ${i + 1}: Added to updated results. Total updated: ${results.updated.length}`);
        } else {
          // Create new DG Enquiry with customer reference
          console.log(`Row ${i + 1}: Creating new enquiry: ${mapped.enquiryNo}`);
        const enquiryData = {
          ...mapped,
          createdBy: req.user?.id,
          customer: customer._id
        };

          console.log(`Row ${i + 1}: Enquiry data before creation:`, {
            customerName: enquiryData.customerName,
            corporateName: enquiryData.corporateName,
            addresses: enquiryData.addresses?.[0]
          });

        const createdEnquiry = await DGEnquiry.create(enquiryData);
          console.log(`Row ${i + 1}: New enquiry created with ID: ${createdEnquiry._id}`);
          console.log(`Row ${i + 1}: Created enquiry customerName: "${createdEnquiry.customerName}"`);
          console.log(`Row ${i + 1}: Created enquiry addresses:`, createdEnquiry.addresses?.[0]);

        results.created.push({
          enquiry: createdEnquiry,
          customer: {
            id: customer._id,
            name: customer.name,
              isNew: customer.isNew || false,
              changes: customerChanges,
              hasChanges: customerHasChanges
            },
            enquiryNo: mapped.enquiryNo
          });
          console.log(`Row ${i + 1}: Added to created results. Total created: ${results.created.length}`);
        }
      } catch (err: any) {
        console.error(`Row ${i + 1}: Error importing enquiry ${mapped.enquiryNo}:`, err);
        results.errors.push({ row: mapped, error: err.message });
        console.log(`Row ${i + 1}: Added to errors. Total errors: ${results.errors.length}`);
      }
    }

    results.total = actualDataRows;

    console.log(`Import completed. Created: ${results.created.length}, Updated: ${results.updated.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`);

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
