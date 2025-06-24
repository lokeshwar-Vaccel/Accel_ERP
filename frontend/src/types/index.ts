

  export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  permissions: string[];
  phone?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super_admin' | 'admin' | 'hr' | 'manager' | 'viewer';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'active' | 'inactive' | 'prospect';
  type: 'residential' | 'commercial' | 'industrial';
  assignedTo: string;
  totalContracts: number;
  totalRevenue: number;
  lastContact: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplier: string;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastRestocked: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  customerId: string;
  customerName: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  category: string;
  estimatedHours: number;
  actualHours?: number;
  scheduledDate: string;
  completedDate?: string;
  cost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AMCContract {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  renewalDate: string;
  paymentTerms: string;
  serviceFrequency: string;
  assignedTechnician: string;
  lastServiceDate?: string;
  nextServiceDate: string;
  createdAt: string;
  updatedAt: string;
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

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  inventoryItems: number;
  activeContracts: number;
  pendingServices: number;
  monthlyRevenue: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value: number;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  name: string;
  type: 'financial' | 'operational' | 'custom';
  description: string;
  parameters: Record<string, any>;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  status: 'available' | 'busy' | 'offline';
  rating: number;
  completedJobs: number;
  location: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactPerson: string;
  paymentTerms: string;
  rating: number;
  status: 'active' | 'inactive';
  createdAt: string;
}