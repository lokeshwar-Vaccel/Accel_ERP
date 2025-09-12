export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  moduleAccess: string[];
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR = 'hr',
  MANAGER = 'manager',
  FIELD_ENGINEER = 'field_engineer',
  VIEWER = 'viewer'
}

export interface Address {
  id: number;
  address: string;
  state?: string;
  district?: string;
  pincode?: string;
  isPrimary?: boolean;
  gstNumber?: string; // Add GST number per address, optional
}

export interface Customer {
  _id: string;
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email: string;
  phone: string;
  address: string;
  siteAddress?: string;
  numberOfDG?: number;
  customerType: CustomerType;
  leadSource: string;
  status: LeadStatus;
  notes?: string;
  assignedTo: string;
  createdBy: string;
  contactHistory: ContactHistory[];
  createdAt: string;
  updatedAt: string;
  addresses: Address[];
  dgDetails?: DGDetails[];
}

export enum CustomerType {
  TELECOM = 'telecom',
  RETAIL = 'retail',
  EV = 'ev',
  DG = 'dg',
  JENARAL = 'jenaral',
  JE = 'je',
  OEM = 'oem'
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost'
}

export interface ContactHistory {
  type: string;
  date: string;
  notes: string;
  createdBy: string;
}

export interface DGDetails {
  _id: string;
  dgSerialNumbers: string;
  alternatorMake: string;
  alternatorSerialNumber: string;
  dgMake: string;
  engineSerialNumber: string;
  dgModel: string;
  dgRatingKVA: number;
  salesDealerName: string;
  commissioningDate: string;
  warrantyStatus: string;
  cluster: string;
  customer: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: ProductCategory;
  brand: string;
  modelNumber: string;
  specifications: Record<string, any>;
  price: number;
  minStockLevel: number;
  tags: string[];
  warranty?: Warranty;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DGProduct {
  _id: string;
  description?: string;
  isActive: boolean;
  kva: string;
  phase: 'single' | 'three';
  annexureRating: string;
  dgModel: string;
  numberOfCylinders: number;
  subject: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum ProductCategory {
  GENSET = 'genset',
  SPARE_PART = 'spare_part',
  ACCESSORY = 'accessory',
  DG_PRODUCT = 'dg_product',
  DG_SPARE = 'dg_spare',
  DG_ACCESSORY = 'dg_accessory'
}

export interface Warranty {
  duration: number;
  unit: string;
  terms: string;
}

export interface StockLocation {
  _id: string;
  name: string;
  address: string;
  type: string;
  contactPerson: string;
  phone: string;
  isActive: boolean;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  _id: string;
  product: string | Product;
  location: string | StockLocation;
  quantity: number;
  reservedQuantity: number;
  lastUpdated: string;
  transactions: StockTransaction[];
}

export interface StockTransaction {
  type: StockTransactionType;
  quantity: number;
  date: string;
  reference: string;
  notes?: string;
}

export enum StockTransactionType {
  INWARD = 'inward',
  OUTWARD = 'outward',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RESERVATION = 'reservation',
  RELEASE = 'release'
}

export interface ServiceTicket {
  _id: string;
  ticketNumber: string;
  customer: string | Customer;
  product?: string | Product;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string | User;
  scheduledDate?: string;
  completedDate?: string;
  serviceType: string;
  urgencyLevel: string;
  serialNumber?: string;
  customerNotes?: string;
  serviceReport?: string;
  workDuration?: number;
  partsUsed?: PartUsage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface PartUsage {
  product: string;
  quantity: number;
  unitPrice: number;
}

export interface AMC {
  _id: string;
  contractNumber: string;
  customer: string | Customer;
  products: string[] | Product[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  completedVisits?: number;
  status: AMCStatus;
  contractType: string;
  paymentTerms: string;
  visits: AMCVisit[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export enum AMCStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending'
}

export interface AMCVisit {
  scheduledDate: string;
  visitType: string;
  assignedTo: string;
  completedDate?: string;
  serviceReport?: string;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  deliveryLocation: string | StockLocation;
  paymentTerms: string;
  department?: string; // Department for this purchase order
  supplierContact: SupplierContact;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  product: string | Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierContact {
  name: string;
  email: string;
  phone: string;
}

export interface FileDocument {
  _id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  category?: string;
  tags: string[];
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationMessage {
  _id: string;
  type: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject?: string;
  content: string;
  status: MessageStatus;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  createdBy: string;
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  activeAMCs: number;
  pendingTickets: number;
  monthlyRevenue: number;
  lowStockItems: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user: string;
}

export interface ReportDefinition {
  _id: string;
  name: string;
  type: ReportType;
  description: string;
  parameters: ReportParameter[];
  createdBy: string;
  createdAt: string;
}

export enum ReportType {
  SERVICE_TICKETS = 'service-tickets',
  INVENTORY = 'inventory',
  REVENUE = 'revenue',
  CUSTOMERS = 'customers',
  PERFORMANCE = 'performance',
  CUSTOM = 'custom'
}

export interface ReportParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  options?: any[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface TableColumn {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
}

export interface Module {
  id: string;
  name: string;
  icon: string;
  path: string;
  requiredRoles: UserRole[];
  subModules?: SubModule[];
}

export interface SubModule {
  id: string;
  name: string;
  path: string;
  requiredRoles: UserRole[];
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

// Enhanced Payment Method Details
export interface PaymentMethodDetails {
  // Cash Payment
  cash?: {
    receivedBy?: string;
    receiptNumber?: string;
  };
  
  // Cheque Payment
  cheque?: {
    chequeNumber?: string;
    bankName?: string;
    branchName?: string;
    issueDate?: string;
    clearanceDate?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  
  // Bank Transfer
  bankTransfer?: {
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    ifscCode?: string;
    transactionId?: string;
    transferDate?: string;
    accountHolderName?: string;
    referenceNumber?: string;
  };
  
  // UPI Payment
  upi?: {
    upiId?: string;
    transactionId?: string;
    transactionReference?: string;
    payerName?: string;
    payerPhone?: string;
  };
  
  // Card Payment
  card?: {
    cardType?: 'credit' | 'debit' | 'prepaid';
    cardNetwork?: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
    lastFourDigits?: string;
    transactionId?: string;
    authorizationCode?: string;
    cardHolderName?: string;
  };
  
  // Other Payment Methods
  other?: {
    methodName?: string;
    referenceNumber?: string;
    additionalDetails?: Record<string, any>;
  };
}

// Enhanced Purchase Order Payment
export interface PurchaseOrderPayment {
  _id: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'other';
  paymentMethodDetails: PaymentMethodDetails;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentDate: string;
  notes?: string;
  receiptNumber?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}