import { Request } from 'express';
import { Document, Types } from 'mongoose';

// User Roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR = 'hr',
  MANAGER = 'manager',
  FIELD_OPERATOR = 'field_operator',
  VIEWER = 'viewer'
}

// User Status
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

// Customer Types
export enum CustomerType {
  RETAIL = 'retail',
  TELECOM = 'telecom',
  EV = 'ev',
  DG = 'dg',
  JENARAL = 'jenaral',
  JE = 'je',
  OEM = 'oem'
}

// Customer Main Type (customer or supplier)
export enum CustomerMainType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  DG_SALES_CUSTOMER = 'dg_sales_customer',
  OEM_CUSTOMER = 'oem_customer'
}

// Lead Status
export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  CONTACTED = 'contacted',
  CONVERTED = 'converted',
  LOST = 'lost'
}

// Service Ticket Status
export enum TicketStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// Service Ticket Priority
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Visit Details Enums
export enum TypeOfVisit {
  OIL_SERVICE = 'oil_service',
  COURTESY_VISIT = 'courtesy_visit',
  AMC_VISIT = 'amc_visit',
  SPARE = 'spare',
  FSC_VISIT = 'fsc_visit',
  PAID_VISIT = 'paid_visit'
}

export enum NatureOfWork {
  OIL_SERVICE = 'oil_service',
  SITE_VISIT = 'site_visit',
  BREAKDOWN = 'breakdown',
  INSTALLATION = 'installation',
  DMS_CALL = 'dms_call'
}

export enum SubNatureOfWork {
  FSC = 'fsc',
  AMC = 'amc',
  PAID = 'paid',
  COURTESY_VISIT = 'courtesy_visit',
  WARRANTY = 'warranty',
  PRE_INSTALLATION = 'pre_installation',
  COMMISSIONING = 'commissioning',
  EV = 'ev',
  LOGGED = 'logged',
  WITHOUT_LOGGED = 'without_logged'
}

// AMC Status
export enum AMCStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending'
}

// Stock Transaction Types
export enum StockTransactionType {
  INWARD = 'inward',
  OUTWARD = 'outward',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  RESERVATION = 'reservation',
  RELEASE = 'release'
}

// Product Categories
export enum ProductCategory {
  GENSET = 'genset',
  SPARE_PART = 'spare_part',
  ACCESSORY = 'accessory',
  DG_PRODUCT = 'dg_product',
  DG_SPARE = 'dg_spare',
  DG_ACCESSORY = 'dg_accessory'
}

// Stock Unit Type
export type StockUnit =
  | 'nos'
  | 'kg'
  | 'litre'
  | 'meter'
  | 'sq.ft'
  | 'hour'
  | 'set'
  | 'box'
  | 'can'
  | 'roll';

// User Interface
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  address?: string;
    moduleAccess: {
    module: string;
    access: boolean;
    permission: 'read' | 'write' | 'admin';
  }[];
  createdBy?: string;
  lastLoginAt?: Date;
  profileImage?: string;
  // Virtual properties
  fullName: string;
  // Mongoose timestamps
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateJWT(): string;
}
// Interface for StockLedger document
export interface IStockLedger extends Document {
  product: Types.ObjectId;
  location: Types.ObjectId;
  transactionType: StockTransactionType;
  quantity: number;
  reason?: string;
  notes?: string;
  performedBy: Types.ObjectId;
  transactionDate?: Date;
  resultingQuantity: number;
  previousQuantity: number;
  referenceId: string;
  referenceType?: 'purchase_order' | 'service_ticket' | 'adjustment' | 'transfer' | 'sale' | 'reservation';
  unitCost?: number;
  totalCost?: number;
  batchNumber?: string;
  serialNumbers?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Address Interface
export interface Address {
  id: number;
  address: string;
  state?: string;
  district?: string;
  pincode?: string;
  isPrimary: boolean;
  gstNumber?: string;
  notes?: string; // Added for storing notes from misused fields
}
// DG Requirements Interface
export interface DGRequirements {
  kva?: string;
  phase?: string;
  quantity?: number;
  segment?: string;
  subSegment?: string;
  currentPowerSource?: string;
  backupHours?: number;
  installationLocation?: string;
}

// Customer Interface
export interface ICustomer extends Document {
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email?: string;
  phone: string;
  panNumber?: string;
  addresses: Address[];
  siteAddress?: string;
  numberOfDG?: number;
  customerType: CustomerType;
  type: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  assignedTo?: string;
  status: LeadStatus;
  notes?: string;
  contactHistory: IContactHistory[];
  createdBy: string;
  customerId?: string;
  isDGSalesCustomer?: boolean;
  dgRequirements?: DGRequirements;
  dgDetails?: Types.ObjectId[]; // Array of DGDetails ObjectIds
}

// Contact History Interface
export interface IContactHistory {
  type: 'call' | 'meeting' | 'email' | 'whatsapp';
  date: Date;
  notes: string;
  followUpDate?: Date;
  createdBy: string;
}

// Product Interface
export interface IProduct extends Document {
  name: string;
  description?: string;
  category: ProductCategory;
  brand?: string;
  modelNumber?: string;
  partNo?: string;
  hsnNumber?: string;
  specifications?: Record<string, any>;
  price: number;
  gst: number;
  minStockLevel: number;
  maxStockLevel?: number;
  isActive: boolean;
  createdBy: string;
  stockUnit?: StockUnit;
}

// DG Product Interface
export interface IDGProduct {
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
  createdAt: Date;
  updatedAt: Date;
}

// Stock Location Interface
export interface IStockLocation extends Document {
  name: string;
  address: string;
  type: 'main_office' | 'warehouse' | 'service_center';
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
  gstNumber?: string;
}

// Room Interface
export interface IRoom extends Document {
  name: string;
  description?: string;
  location: string;
  isActive: boolean;
}

// Rack Interface
export interface IRack extends Document {
  name: string;
  description?: string;
  location: string;
  room: string;
  isActive: boolean;
}

// Stock Interface
export interface IStock extends Document {
  product: string;
  location: string;
  room?: string;
  rack?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: Date;
}


// Service Ticket Interface
export interface IServiceTicket extends Document {
  ticketNumber: string;
  customer: string;
  product?: string;
  serialNumber?: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  partsUsed: IPartUsed[];
  serviceReport?: string;
  customerSignature?: string;
  slaDeadline?: Date;
  createdBy: string;
}

// Parts Used Interface
export interface IPartUsed {
  product: string;
  quantity: number;
  serialNumbers?: string[];
}

// AMC Interface
export interface IAMC extends Document {
  contractNumber: string;
  customer: string;
  products: string[];
  startDate: Date;
  endDate: Date;
  contractValue: number;
  scheduledVisits: number;
  completedVisits: number;
  status: AMCStatus;
  nextVisitDate?: Date;
  visitSchedule: IVisitSchedule[];
  terms?: string;
  createdBy: string;
}

// Visit Schedule Interface
export interface IVisitSchedule {
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

// Purchase Order Interface
export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplier: string;
  items: IPOItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  createdBy: string;
}

// Purchase Order Item Interface
export interface IPOItem {
  product: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Stock Transaction Interface
export interface IStockTransaction extends Document {
  type: StockTransactionType;
  product: string;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  reference?: string;
  referenceType?: 'purchase_order' | 'service_ticket' | 'adjustment' | 'transfer' | 'reservation';
  notes?: string;
  createdBy: string;
}

// Extended Request Interface
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    moduleAccess: {
      module: string;
      access: boolean;
      permission: 'read' | 'write' | 'admin';
    }[];
  };
}

// DGDetails Interface
export interface IDGDetails extends Document {
  customer: Types.ObjectId;
  dgSerialNumbers: string;
  alternatorMake: string;
  alternatorSerialNumber: string;
  dgMake: string;
  engineSerialNumber: string;
  dgModel: string;
  dgRatingKVA: number;
  salesDealerName: string;
  commissioningDate: Date;
  warrantyStatus: 'warranty' | 'non_warranty';
  installationType: 'infold' | 'outfold';
  amcStatus: 'yes' | 'no';
  cluster: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Interface
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  totalPurchaseOrdersCount?: number;
  pendingPurchaseOrdersCount?: number;
  confirmedPurchaseOrdersCount?: number;
  error?: string;
  totalStock?: number;
  totalLowStock?: number;
  totalOutOfStock?: number;
  totalOverStocked?: number;
  totalInStock?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Query Parameters Interface
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// Email Template Interface
export interface IEmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

// Notification Interface
export interface INotification extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  recipient: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

// Dashboard Stats Interface
export interface IDashboardStats {
  totalCustomers: number;
  activeTickets: number;
  pendingAMCs: number;
  lowStockItems: number;
  monthlyRevenue: number;
  ticketResolutionRate: number;
  inventoryValue: number;
}

// Report Filters Interface
export interface IReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  customer?: string;
  product?: string;
  location?: string;
  status?: string;
  assignedTo?: string;
} 