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

// Helper: Build addresses array so each Address-1, Address-2, Address-3, etc. is a separate address object
const buildAddresses = (row: any) => {
  const addresses: any[] = [];
  // Helper to add address objects for a given suffix ('' for main, '_1', '_2', ...)
  const addAddressesForSuffix = (suffix: string, startId: number) => {
    let count = 0;
    for (let i = 1; i <= 3; i++) {
      const addr = getColumnValue(row, [
        `Address-${i}${suffix}`, `Address ${i}${suffix}`, `address-${i}${suffix}`, `address${i}${suffix}`, `address ${i}${suffix}`
      ]);
      if (addr) {
        const addressObj: any = {
          id: startId + count,
          address: addr,
          state: getColumnValue(row, [`State${suffix}`, `state${suffix}`]),
          district: getColumnValue(row, [`District${suffix}`, `district${suffix}`]),
          pincode: getColumnValue(row, [`Pincode${suffix}`, `PIN${suffix}`, `pin${suffix}`, `pincode${suffix}`]),
          isPrimary: startId + count === 1
        };
        // Only add gstNumber to the very first address (id === 1)
        if (startId + count === 1) {
          addressObj.gstNumber = getColumnValue(row, [`GST DETAILS`, `GST`, `gst`, `gst number`, `gstNumber`]);
        }
        addresses.push(addressObj);
        count++;
      }
    }
    return count;
  };
  // Add main addresses (no suffix)
  let id = 1;
  id += addAddressesForSuffix('', id);
  // Add additional address sets (_1, _2, ...)
  let suffixIdx = 1;
  while (true) {
    const suffix = `_${suffixIdx}`;
    // Check if any address exists for this suffix
    let found = false;
    for (let i = 1; i <= 3; i++) {
      if (getColumnValue(row, [
        `Address-${i}${suffix}`, `Address ${i}${suffix}`, `address-${i}${suffix}`, `address${i}${suffix}`, `address ${i}${suffix}`
      ])) {
        found = true;
        break;
      }
    }
    if (!found) break;
    id += addAddressesForSuffix(suffix, id);
    suffixIdx++;
  }
  // Add GST number to the first address if present
  const gstNumber = getColumnValue(row, ['GST DETAILS', 'GST', 'gst', 'gst number', 'gstNumber']);
  if (gstNumber && addresses.length > 0) {
    addresses[0].gstNumber = gstNumber;
  }
  return addresses;
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
      String(val).toLowerCase() === 'sl.no' ||
      String(val).toLowerCase().includes('address')
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

    for (let i = 0; i < cleanedData.length; i++) {
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
        designation: getColumnValue(row, ['Designation', 'designation']) || 'N/A',
        email: getColumnValue(row, ['Email', 'email', 'E-mail']) || undefined,
        addresses: buildAddresses(row),
        customerType: CustomerType.RETAIL,
        type: mainType, // Set based on req.body or import column
        leadSource: '',
        status: LeadStatus.NEW,
        notes: ''
      };

      // Ensure phone is always a string (empty if missing)
      if (!customerInput.phone) {
        customerInput.phone = '';
      }

      // Skip header row and rows where name is missing (essential field)
      if (!customerInput.name || customerInput.name.toLowerCase() === 'name') {
        continue;
      }

      const { error } = createCustomerSchema.validate(customerInput);
      if (error) {
        preview.errors.push(`Row ${i + 2}: ${error.message}`);
        continue;
      }

      // Check for existing customer with same name, type, and phone
      const existing = await Customer.findOne({ name: customerInput.name, type: mainType, phone: customerInput.phone });
      if (existing) {
        preview.existingCustomers.push({
          name: existing.name,
          gstNumber: (existing as any).gstNumber,
        });
        preview.summary.existingCustomers++;
        continue;
      }

      preview.customersToCreate.push(customerInput);
      preview.summary.newCustomers++;
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
        designation: getColumnValue(row, ['Designation', 'designation']),
        // contactPersonName: getColumnValue(row, ['Contact person Name', 'Contact Person', 'contact person name']),
        gstNumber: getColumnValue(row, ['GST DETAILS', 'GST', 'gst', 'gst number', 'gstNumber']) || undefined,
        email: getColumnValue(row, ['Email', 'email', 'E-mail']) || undefined, // Set to undefined if empty
        // phone: getColumnValue(row, ['Mobile No', 'Phone', 'phone', 'mobile', 'mobile no']),
        addresses: buildAddresses(row),
        customerType: CustomerType.RETAIL,
        type: mainType, // This will always be customer for imports
        leadSource: '',
        status: LeadStatus.NEW,
        notes: ''
      };

      // Remove empty email field if not provided to avoid validation error
      if (!customerInput.email) {
        delete (customerInput as any).email;
      }

      // Ensure phone is always a string (empty if missing)
      if (!customerInput.phone) {
        customerInput.phone = '';
      }

      // Skip header row and rows where name is missing (essential field)
      if (!customerInput.name || customerInput.name.toLowerCase() === 'name') {
        results.errors.push(`Row ${i + 2}: Skipped - missing or invalid name.`);
        results.failed++;
        continue;
      }

    //   const { error } = createCustomerSchema.validate(customerInput);
    //   if (error) {
    //     results.failed++;
    //     results.errors.push(`Row ${i + 2}: ${error.message}`);
    //     continue;
    //   }

      // Check for existing customer with same name, type, and phone
      const existing = await Customer.findOne({ name: customerInput.name, type: mainType, phone: customerInput.phone });
      if (existing) {
        results.failed++;
        continue;
      }

    //   try {
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
    //   } catch (createErr: any) {
    //     results.failed++;
    //     results.errors.push(`Row ${i + 2}: ${createErr.message}`);
    //   }
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