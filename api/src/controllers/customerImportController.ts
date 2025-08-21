import { Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import {
  AuthenticatedRequest,
  APIResponse,
  CustomerType,
  CustomerMainType,
  LeadStatus
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { CustomerImportInput, createCustomerSchema } from '../schemas/customerSchemas';
import * as XLSX from 'xlsx';
import { TransactionCounter } from '../models/TransactionCounter';

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

// Helper: Build addresses array from the specific Excel format
const buildAddresses = (row: any) => {
  const addresses: any[] = [];
  
  // Get address lines and combine them - support multiple column name variations
  const addr1 = getColumnValue(row, ['Address line-1', 'Address line 1', 'address line-1', 'address line 1', 'Address 1', 'address 1', 'Street Address', 'street address']);
  const addr2 = getColumnValue(row, ['Address line-2', 'Address line 2', 'address line-2', 'address line 2', 'Address 2', 'address 2', 'Street Address 2', 'street address 2']);
  const addr3 = getColumnValue(row, ['Address line-3', 'Address line 3', 'address line-3', 'address line 3', 'Address 3', 'address 3', 'Street Address 3', 'street address 3']);
  
  // Combine address lines into a single address string
  const addressLines = [addr1, addr2, addr3].filter(line => line && line.trim()).join(', ');
  
  if (addressLines) {
    // Get pincode value - support multiple column name variations
    let pincode = getColumnValue(row, ['Pincode', 'PIN', 'pin', 'pincode', 'Pincode/PIN', 'pincode/pin', 'Postal Code', 'postal code', 'Zip Code', 'zip code']);
    
    // Get GST number value - support multiple column name variations
    let gstNumber = getColumnValue(row, ['GST DETAILS', 'GST', 'gst', 'gst number', 'gstNumber', 'GST Number', 'gst number', 'GSTIN', 'gstin', 'GST Registration', 'gst registration']);
    
    // Handle pincode field that might contain notes instead of actual pincode
    let notes = '';
    if (pincode && pincode.length > 10) {
      // If pincode field contains long text (like "Already uploaded by Accounts team"), 
      // it's likely notes, so clear pincode
      notes = pincode;
      pincode = '';
    }
    
    // Handle GST field that might contain notes instead of actual GST number
    if (gstNumber && gstNumber.length > 20) {
      // If GST field contains long text, it's likely notes, so add to notes and clear GST
      if (notes) {
        notes = notes + ' | ' + gstNumber;
      } else {
        notes = gstNumber;
      }
      gstNumber = '';
    }
    
    const addressObj: any = {
      id: 1,
      address: addressLines,
      state: getColumnValue(row, ['State', 'state', 'State/Province', 'state/province', 'Region', 'region']) || '',
      district: getColumnValue(row, ['District', 'district', 'City', 'city', 'County', 'county']) || '',
      pincode: pincode || '',
      isPrimary: true,
      gstNumber: gstNumber || ''
    };
    
    // If we extracted notes from pincode or GST fields, add them to the address
    if (notes) {
      addressObj.notes = notes;
    }
    
    addresses.push(addressObj);
  }
  
  return addresses;
};

// Helper: Build DG Details array from Excel format
const buildDGDetails = (row: any) => {
  const dgDetails: any[] = [];
  
  const dgSerialNo = getColumnValue(row, ['DG Sl.No', 'DG Serial No', 'dg sl.no', 'dg serial no']);
  const alternatorMake = getColumnValue(row, ['Alternator Make', 'alternator make']);
  const alternatorSlNo = getColumnValue(row, ['Alternator Sl.No', 'Alternator Serial No', 'alternator sl.no', 'alternator serial no']);
  const dgMake = getColumnValue(row, ['DG Make', 'dg make']);
  const engineSlNo = getColumnValue(row, ['Engine Sl.No', 'Engine Serial No', 'engine sl.no', 'engine serial no']);
  const dgModel = getColumnValue(row, ['DG Model', 'dg model']);
  const dgRatingKVA = getColumnValue(row, ['DG Rating in KVA', 'DG Rating KVA', 'dg rating in kva', 'dg rating kva']);
  const salesDealerName = getColumnValue(row, ['Sales Dealer Name', 'sales dealer name']);
  const commissioningDate = getColumnValue(row, ['Commissioning date', 'Commissioning Date', 'commissioning date']);
  const warrantyStatus = getColumnValue(row, ['Warranty / Non-Warranty', 'Warranty Status', 'warranty / non-warranty', 'warranty status']);
  const installationType = getColumnValue(row, ['Infold / Out Fold', 'Installation Type', 'infold / out fold', 'installation type']);
  const amcStatus = getColumnValue(row, ['AMC (Yes / No)', 'AMC Status', 'amc (yes / no)', 'amc status']);
  const cluster = getColumnValue(row, ['Cluster', 'cluster']);
  
  // Only create DG Details if we have meaningful data
  if (dgSerialNo || dgMake || dgModel || alternatorMake || alternatorSlNo || engineSlNo || dgRatingKVA || salesDealerName || commissioningDate || warrantyStatus || installationType || amcStatus || cluster) {
    // Safe date parsing with validation
    let safeCommissioningDate = new Date().toISOString().split('T')[0]; // Default to today
    
    if (commissioningDate && commissioningDate.trim()) {
      try {
        // Try to parse the date - handle various Excel date formats
        let parsedDate: Date;
        
        // Check if it's already a valid date string
        if (commissioningDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // ISO format YYYY-MM-DD
          parsedDate = new Date(commissioningDate);
        } else if (commissioningDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          // MM/DD/YYYY format
          const [month, day, year] = commissioningDate.split('/');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (commissioningDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
          // DD-MM-YYYY format
          const [day, month, year] = commissioningDate.split('-');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (commissioningDate.match(/^\d+$/)) {
          // Excel date number (days since 1900-01-01)
          const excelDate = parseInt(commissioningDate);
          if (excelDate > 0 && excelDate < 100000) {
            // Convert Excel date number to JavaScript date
            const utcDays = Math.floor(excelDate - 25569);
            const utcValue = utcDays * 86400;
            parsedDate = new Date(utcValue * 1000);
          } else {
            parsedDate = new Date(commissioningDate);
          }
        } else {
          // Try Excel's default date parsing
          parsedDate = new Date(commissioningDate);
        }
        
        // Validate the parsed date
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
          safeCommissioningDate = parsedDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Invalid commissioning date format:', commissioningDate, 'Using default date');
        // Keep the default date
      }
    }
    
    const dgDetail: any = {
      dgSerialNumbers: dgSerialNo || '',
      alternatorMake: alternatorMake || '',
      alternatorSerialNumber: alternatorSlNo || '',
      dgMake: dgMake || '',
      engineSerialNumber: engineSlNo || '',
      dgModel: dgModel || '',
      dgRatingKVA: dgRatingKVA ? parseInt(dgRatingKVA) || 0 : 0,
      salesDealerName: salesDealerName || '',
      commissioningDate: safeCommissioningDate,
      warrantyStatus: warrantyStatus && warrantyStatus.toLowerCase().includes('non') ? 'non_warranty' : 'warranty',
      amcStatus: amcStatus && amcStatus.toLowerCase().includes('yes') ? 'yes' : 'no',
      installationType: installationType && installationType.toLowerCase().includes('out') ? 'outfold' : 'infold',
      cluster: cluster || ''
    };
    dgDetails.push(dgDetail);
  }
  
  return dgDetails;
};

// Helper: Clean headers and row keys
const cleanRowKeys = (row: any) => {
  const cleaned: any = {};
  for (const key in row) {
    cleaned[key.trim()] = row[key];
  }
  return cleaned;
};

// Helper: Find existing customer by GST or name+phone
const findExistingCustomer = async (row: any) => {
  // const gst = getColumnValue(row, ['GST DETAILS', 'GST', 'gst', 'gst number', 'gstNumber']);
  // if (gst) {
  //   const byGst = await Customer.findOne({ 'addresses.gstNumber': gst });
  //   if (byGst) return byGst;
  // }
  const name = getColumnValue(row, ['Name', 'Customer Name', 'name', 'customer name']);
  // const phone = getColumnValue(row, ['Mobile No', 'Phone', 'phone', 'mobile', 'mobile no']);
  if (name ) {
    return await Customer.findOne({ name });
  }
  return null;
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
      String(val).toLowerCase() === 'name' || 
      String(val).toLowerCase() === 'alice' ||
      String(val).toLowerCase().includes('address line') ||
      String(val).toLowerCase().includes('gst details') ||
      String(val).toLowerCase().includes('contact person') ||
      String(val).toLowerCase().includes('mobile no') ||
      String(val).toLowerCase().includes('no of dg')
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

// Utility to get next customerId (same as in customerController)
async function getNextCustomerId() {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'customerId' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `SPS1${String(counter.sequence).padStart(4, '0')}`;
}

// @desc    Preview customers from Excel/CSV before import
// @route   POST /api/v1/customers/preview-import
// @access  Private
export const previewCustomerImport = async (
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
      customersToCreate: [] as any[],
      existingCustomers: [] as any[],
      errors: [] as string[],
      summary: {
        totalRows: cleanedData.length,
        newCustomers: 0,
        existingCustomers: 0
      }
    };

    // Log the first row to debug column mapping
    console.log('First row headers:', Object.keys(cleanedData[0] || {}));
    console.log('First row data:', cleanedData[0]);
    
    // Log sample DG details for debugging
    if (cleanedData.length > 0) {
      const sampleRow = cleanedData[0];
      const sampleDGDetails = buildDGDetails(sampleRow);
      console.log('Sample DG Details:', sampleDGDetails);
    }

    for (let i = 0; i < cleanedData.length; i++) {
      try {
        const row = cleanedData[i];

        // Determine mainType: priority is req.body.type, then row, then default
        let mainType = CustomerMainType.CUSTOMER;
        if (req.body && req.body.type && Object.values(CustomerMainType).includes(req.body.type)) {
          mainType = req.body.type;
        } else {
          const typeValue = getColumnValue(row, ['Type', 'type', 'Customer Type', 'customer type']);
          if (typeValue && typeValue.trim().toLowerCase() === 'supplier') {
            mainType = CustomerMainType.SUPPLIER;
          }
        }
        
        const customerInput: any = {
          name: getColumnValue(row, ['Name', 'Customer Name', 'name', 'customer name']),
          alice: getColumnValue(row, ['Alice', 'alice', 'Alias', 'alias', 'Short Name', 'short name', 'Customer Alias', 'customer alias']) || '',
          designation: getColumnValue(row, ['Designation', 'designation']) || '',
          contactPersonName: getColumnValue(row, ['Contact person Name', 'Contact Person Name', 'contact person name', 'contact person']) || '',
          email: getColumnValue(row, ['Email', 'email', 'E-mail']) || '',
          phone: getColumnValue(row, ['Mobile No', 'Mobile Number', 'Phone', 'mobile no', 'mobile number', 'phone', 'Contact Number', 'contact number', 'Phone Number', 'phone number', 'Phone/Notes', 'phone/notes', 'Contact Info', 'contact info']) || '',
          addresses: buildAddresses(row),
          siteAddress: getColumnValue(row, ['Site address', 'Site Address', 'site address', 'Installation Address', 'installation address']) || '',
          numberOfDG: (() => {
            const dgValue = getColumnValue(row, ['No of DG', 'Number of DG', 'no of dg', 'number of dg', 'NumberOfDG', 'numberOfDG', 'DG Count', 'dg count', 'DG Quantity', 'dg quantity', 'DG Units', 'dg units', 'Generator Count', 'generator count', 'DG Number', 'dg number', 'Total DG', 'total dg']);
            if (!dgValue || dgValue === '' || dgValue === 'null' || dgValue === 'undefined') {
              return 0;
            }
            const parsed = parseInt(dgValue);
            return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed)); // Ensure value is between 0-100
          })(),
          customerType: CustomerType.RETAIL,
          type: mainType, // Set based on req.body or import column
          leadSource: getColumnValue(row, ['Lead Source', 'lead source', 'Lead source']) || '',
          status: LeadStatus.NEW,
          notes: getColumnValue(row, ['Notes', 'notes', 'Note', 'note']) || '',
          dgDetails: buildDGDetails(row)
        };

        // Ensure phone is always a string (empty if missing)
        if (!customerInput.phone) {
          customerInput.phone = '';
        }
        
        // Handle phone field that might contain notes instead of phone numbers
        if (customerInput.phone && customerInput.phone.length > 20) {
          // If phone field contains long text (like "Already uploaded by Accounts team"), 
          // move it to notes and clear phone
          if (!customerInput.notes) {
            customerInput.notes = '';
          }
          customerInput.notes = (customerInput.notes + ' ' + customerInput.phone).trim();
          customerInput.phone = '';
        }
        
        // GST number handling is done in buildAddresses function

        // Skip header row and rows where name is missing (essential field)
        if (!customerInput.name || customerInput.name.toLowerCase() === 'name') {
          continue;
        }

        const { error } = createCustomerSchema.validate(customerInput);
        if (error) {
          preview.errors.push(`Row ${i + 2}: ${error.message}`);
          continue;
        }

        // Check for existing customer with same name and type
        const existing = await Customer.findOne({ 
          name: customerInput.name, 
          type: mainType
        });
        if (existing) {
          preview.existingCustomers.push({
            name: existing.name,
            phone: existing.phone,
            gstNumber: existing.addresses && existing.addresses[0] ? existing.addresses[0].gstNumber : undefined,
            alice: (existing as any).alice,
            siteAddress: (existing as any).siteAddress,
            numberOfDG: (existing as any).numberOfDG
          });
          preview.summary.existingCustomers++;
          continue;
        }

        preview.customersToCreate.push({
          name: customerInput.name,
          alice: customerInput.alice,
          contactPersonName: customerInput.contactPersonName,
          designation: customerInput.designation,
          phone: customerInput.phone,
          email: customerInput.email,
          siteAddress: customerInput.siteAddress,
          numberOfDG: customerInput.numberOfDG,
          gstNumber: customerInput.addresses && customerInput.addresses[0] ? customerInput.addresses[0].gstNumber : undefined,
          hasDGDetails: customerInput.dgDetails && customerInput.dgDetails.length > 0,
          dgDetails: customerInput.dgDetails // Include full DG details for preview
        });
        preview.summary.newCustomers++;
      } catch (rowError: any) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        preview.errors.push(`Row ${i + 2}: Processing error - ${rowError.message || 'Unknown error'}`);
        continue;
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Preview completed. ${preview.summary.newCustomers} new, ${preview.summary.existingCustomers} existing.`,
      data: preview
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error previewing customers:', error);
    next(error);
  }
};

// @desc    Import customers from Excel/CSV
// @route   POST /api/v1/customers/import
// @access  Private
export const importCustomers = async (
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
    console.log("rawData:",rawData);
    
    
    if (!rawData.length) return next(new AppError('No data found in file', 400));

    const cleanedData = rawData.map(cleanRowKeys);
    console.log("cleanedData:",cleanedData);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      createdCustomers: [] as any[]
    };

    for (let i = 0; i < cleanedData.length; i++) {
      try {
        const row = cleanedData[i];

        // Determine mainType: priority is req.body.type, then row, then default
        let mainType = CustomerMainType.CUSTOMER;
        if (req.body && req.body.type && Object.values(CustomerMainType).includes(req.body.type)) {
          mainType = req.body.type;
        } else {
          const typeValue = getColumnValue(row, ['Type', 'type', 'Customer Type', 'customer type']);
          if (typeValue && typeValue.trim().toLowerCase() === 'supplier') {
            mainType = CustomerMainType.SUPPLIER;
          }
        }
        
        const customerInput: any = {
          name: getColumnValue(row, ['Name', 'Customer Name', 'name', 'customer name']),
          alice: getColumnValue(row, ['Alice', 'alice', 'Alias', 'alias', 'Short Name', 'short name', 'Customer Alias', 'customer alias']) || '',
          designation: getColumnValue(row, ['Designation', 'designation', 'Designation/Role', 'designation/role']) || '',
          contactPersonName: getColumnValue(row, ['Contact person Name', 'Contact Person Name', 'contact person name', 'contact person', 'Contact Person', 'contact person']) || '',
          // GST number is handled in addresses, not at customer level
          email: getColumnValue(row, ['Email', 'email', 'E-mail', 'Email Address', 'email address']) || '', // Store as empty string if not provided
          phone: getColumnValue(row, ['Mobile No', 'Mobile Number', 'Phone', 'mobile no', 'mobile number', 'phone', 'Contact Number', 'contact number', 'Phone Number', 'phone number', 'Phone/Notes', 'phone/notes', 'Contact Info', 'contact info']) || '',
          addresses: buildAddresses(row),
          siteAddress: getColumnValue(row, ['Site address', 'Site Address', 'site address', 'Installation Address', 'installation address', 'Site Location', 'site location']) || '',
          numberOfDG: (() => {
            const dgValue = getColumnValue(row, ['No of DG', 'Number of DG', 'no of dg', 'number of dg', 'NumberOfDG', 'numberOfDG', 'DG Count', 'dg count', 'DG Quantity', 'dg quantity', 'DG Units', 'dg units', 'Generator Count', 'generator count', 'DG Number', 'dg number', 'Total DG', 'total dg']);
            if (!dgValue || dgValue === '' || dgValue === 'null' || dgValue === 'undefined') {
              return 0;
            }
            const parsed = parseInt(dgValue);
            return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed)); // Ensure value is between 0-100
          })(),
          customerType: CustomerType.RETAIL,
          type: mainType, // This will always be customer for imports
          leadSource: getColumnValue(row, ['Lead Source', 'lead source', 'Lead source', 'Source', 'source', 'Lead Origin', 'lead origin']) || '',
          status: LeadStatus.NEW,
          notes: getColumnValue(row, ['Notes', 'notes', 'Note', 'note', 'Comments', 'comments', 'Remarks', 'remarks']) || '',
          dgDetails: buildDGDetails(row)
        };

        // Email is now stored as empty string, no need to delete

        // Ensure phone is always a string (empty if missing)
        if (!customerInput.phone) {
          customerInput.phone = '';
        }
        
        // Handle phone field that might contain notes instead of phone numbers
        if (customerInput.phone && customerInput.phone.length > 20) {
          // If phone field contains long text (like "Already uploaded by Accounts team"), 
          // move it to notes and clear phone
          if (!customerInput.notes) {
            customerInput.notes = '';
          }
          customerInput.notes = (customerInput.notes + ' ' + customerInput.phone).trim();
          customerInput.phone = '';
        }
        
        // Handle GST field that might contain notes instead of actual GST number
        if (customerInput.gstNumber && customerInput.gstNumber.length > 20) {
          // If GST field contains long text, it's likely notes, so add to notes and clear GST
          if (!customerInput.notes) {
            customerInput.notes = '';
          }
          customerInput.notes = (customerInput.notes + ' ' + customerInput.gstNumber).trim();
          customerInput.gstNumber = '';
        }

        // Skip header row and rows where name is missing (essential field)
        if (!customerInput.name || customerInput.name.toLowerCase() === 'name') {
          results.errors.push(`Row ${i + 2}: Skipped - missing or invalid name.`);
          results.failed++;
          continue;
        }

        const { error } = createCustomerSchema.validate(customerInput);
        if (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
          continue;
        }

        // Check for existing customer with same name and type
        const existing = await Customer.findOne({ 
          name: customerInput.name, 
          type: mainType
        });
        if (existing) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Customer "${customerInput.name}" already exists.`);
          continue;
        }

        try {
          // Only generate customerId for CUSTOMER type
          let customerId: string | undefined = undefined;
          if (mainType === CustomerMainType.CUSTOMER) {
            customerId = await getNextCustomerId();
          }
          const createData = { ...customerInput, createdBy: req.user!.id };
          if (customerId) {
            createData.customerId = customerId;
          }
          const created = await Customer.create(createData);
          results.successful++;
          results.createdCustomers.push({
            name: created.name,
            phone: created.phone,
            gstNumber: created.addresses && created.addresses[0] ? created.addresses[0].gstNumber : undefined,
            id: created._id,
            ...(customerId ? { customerId: created.customerId } : {})
          });
        } catch (createErr: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${createErr.message}`);
        }
      } catch (rowError: any) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        results.errors.push(`Row ${i + 2}: Processing error - ${rowError.message || 'Unknown error'}`);
        results.failed++;
        continue;
      }
    }

    const isSupplierImport = req.body && req.body.type === CustomerMainType.SUPPLIER;
    const response: APIResponse = {
      success: true,
      message: `Import completed. ${results.successful} ${isSupplierImport ? 'suppliers' : 'customers'} created, ${results.failed} failed.`,
      data: {
        summary: {
          totalRows: cleanedData.length,
          successful: results.successful,
          failed: results.failed
        },
        ...(isSupplierImport
          ? { createdSuppliers: results.createdCustomers }
          : { createdCustomers: results.createdCustomers }),
        errors: results.errors
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error importing customers:', error);
    next(error);
  }
};