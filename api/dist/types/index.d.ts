import { Request } from 'express';
import { Document } from 'mongoose';
export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    HR = "hr",
    MANAGER = "manager",
    VIEWER = "viewer"
}
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare enum CustomerType {
    RETAIL = "retail",
    TELECOM = "telecom"
}
export declare enum LeadStatus {
    NEW = "new",
    QUALIFIED = "qualified",
    CONTACTED = "contacted",
    CONVERTED = "converted",
    LOST = "lost"
}
export declare enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed",
    CANCELLED = "cancelled"
}
export declare enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum AMCStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    CANCELLED = "cancelled",
    PENDING = "pending"
}
export declare enum StockTransactionType {
    INWARD = "inward",
    OUTWARD = "outward",
    ADJUSTMENT = "adjustment",
    TRANSFER = "transfer"
}
export declare enum ProductCategory {
    GENSET = "genset",
    SPARE_PART = "spare_part",
    ACCESSORY = "accessory"
}
export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    address?: string;
    moduleAccess: string[];
    createdBy?: string;
    lastLoginAt?: Date;
    profileImage?: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateJWT(): string;
}
export interface ICustomer extends Document {
    name: string;
    email?: string;
    phone: string;
    address: string;
    customerType: CustomerType;
    leadSource?: string;
    assignedTo?: string;
    status: LeadStatus;
    notes?: string;
    contactHistory: IContactHistory[];
    createdBy: string;
}
export interface IContactHistory {
    type: 'call' | 'meeting' | 'email' | 'whatsapp';
    date: Date;
    notes: string;
    followUpDate?: Date;
    createdBy: string;
}
export interface IProduct extends Document {
    name: string;
    description?: string;
    category: ProductCategory;
    brand?: string;
    model?: string;
    specifications?: Record<string, any>;
    price: number;
    minStockLevel: number;
    isActive: boolean;
    createdBy: string;
}
export interface IStockLocation extends Document {
    name: string;
    address: string;
    type: 'main_office' | 'warehouse' | 'service_center';
    contactPerson?: string;
    phone?: string;
    isActive: boolean;
}
export interface IStock extends Document {
    product: string;
    location: string;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    lastUpdated: Date;
}
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
export interface IPartUsed {
    product: string;
    quantity: number;
    serialNumbers?: string[];
}
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
export interface IVisitSchedule {
    scheduledDate: Date;
    completedDate?: Date;
    assignedTo?: string;
    status: 'pending' | 'completed' | 'cancelled';
    notes?: string;
}
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
export interface IPOItem {
    product: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}
export interface IStockTransaction extends Document {
    type: StockTransactionType;
    product: string;
    fromLocation?: string;
    toLocation?: string;
    quantity: number;
    reference?: string;
    referenceType?: 'purchase_order' | 'service_ticket' | 'adjustment' | 'transfer';
    notes?: string;
    createdBy: string;
}
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        moduleAccess: string[];
    };
}
export interface APIResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
export interface QueryParams {
    page?: number;
    limit?: number;
    sort?: string;
    filter?: Record<string, any>;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
export interface IEmailTemplate {
    name: string;
    subject: string;
    body: string;
    variables: string[];
}
export interface INotification extends Document {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    recipient: string;
    isRead: boolean;
    data?: Record<string, any>;
    createdAt: Date;
}
export interface IDashboardStats {
    totalCustomers: number;
    activeTickets: number;
    pendingAMCs: number;
    lowStockItems: number;
    monthlyRevenue: number;
    ticketResolutionRate: number;
    inventoryValue: number;
}
export interface IReportFilters {
    dateFrom?: Date;
    dateTo?: Date;
    customer?: string;
    product?: string;
    location?: string;
    status?: string;
    assignedTo?: string;
}
//# sourceMappingURL=index.d.ts.map