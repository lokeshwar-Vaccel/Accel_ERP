import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, Plus, Search, Edit, Trash2, MoreHorizontal,
  Filter, Download, UserPlus, X, ChevronDown, RotateCcw,
  Info,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { setBreadcrumbs } from 'redux/auth/navigationSlice';
import { apiClient } from '../utils/api';
import { User, UserRole, UserDepartment } from '../types';
import PageHeader from '../components/ui/PageHeader';
import { useCurrentModulePermission } from 'layout/Sidebar';
import { RootState } from '../store';
import toast from 'react-hot-toast';
import { Pagination } from 'components/ui/Pagination';


// Module key-label map
const moduleMap = {
  dashboard: 'Dashboard',
          lead_management: 'CRM',
  user_management: 'User Management',
  product_management: 'Product Management',
  inventory_management: 'Inventory Management',
  service_management: 'Service Management',
  amc_management: 'AMC Management',
  purchase_orders: 'Purchase Orders',
  billing: 'Billing',
  dg_sales: 'DG Sales',
  reports_analytics: 'Reports & Analytics',
  file_management: 'File Management',
  communications: 'Communications',
  admin_settings: 'Admin Settings',
} as const;

const UserModuleMap = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  manager: 'Manager',
  field_engineer: 'Field Engineer',
  sales_engineer: 'Sales Engineer',
  viewer: 'Viewer',
} as const;

type ModuleKey = keyof typeof moduleMap;
type UserModuleKey = keyof typeof UserModuleMap;

interface ModuleAccess {
  module: ModuleKey;
  access: boolean;
  permission: 'read' | 'write' | 'admin';
}

// Define the user interface for this component
interface UserDisplay {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  lastLogin: string;
  salesEmployeeCode?: string; // Unique code for Sales Engineers
  moduleAccess: { [key: string]: { access: boolean; permission: string } };
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: string;
  department?: string;
  phone?: string;
  moduleAccess: ModuleAccess[];
}

export const UserManagement: React.FC = () => {
  const dispatch = useDispatch();
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user?.role);

  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDisplay | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserDisplay | null>(null);
  const permission = useCurrentModulePermission();

  // Form states
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: "",
    department: '',
    phone: '',
    moduleAccess: []
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const userRoles: UserModuleKey[] = ['super_admin', 'admin', 'hr', 'manager', 'field_engineer', 'sales_engineer', 'viewer'];
  const allModules: ModuleKey[] = [
    'dashboard',
    'lead_management',
    'user_management',
    'product_management',
    'inventory_management',
    'service_management',
    'amc_management',
    'purchase_orders',
    'billing',
    'dg_sales',
    'reports_analytics',
    'file_management',
    'communications',
    'admin_settings',
  ];

  const roleModuleMapping: Record<string, ModuleKey[]> = {
    super_admin: allModules,
    admin: allModules,
    hr: [
      'dashboard',
      'user_management',
      'inventory_management',
      'purchase_orders',
      'lead_management',
      'dg_sales',
    ],
    manager: allModules.filter(m => m !== 'admin_settings'),
    field_engineer: [
      'dashboard',
      'service_management',
      'amc_management',
      'inventory_management',
      'product_management',
    ],
    sales_engineer: [
      'dashboard',
      'dg_sales',
      'product_management',
      'lead_management',
    ],
    viewer: ['dashboard'],
  };

  // Custom dropdown states
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);


  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR' },
    { value: 'field_engineer', label: 'Field Engineer' },
    { value: 'sales_engineer', label: 'Sales Engineer' },
    { value: 'viewer', label: 'Viewer' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'in-active', label: 'In Active' },
    { value: 'deleted', label: 'Deleted' },
  ];

  const departmentOptions = [
    { value: 'accounts', label: 'Accounts' },
    { value: 'stores', label: 'Stores' },
    { value: 'dg_sales', label: 'DG Sales' },
    { value: 'ev', label: 'EV' },
    { value: 'telecom', label: 'Telecom' },
    { value: 'admin', label: 'Admin' },
    { value: 'retail_service', label: 'Retail Service' },
  ];

  // Helper for status label (add this if not present)
  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  // Helper for role label
  const getRoleLabel = (value: string) => {
    const option = roleOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  // Helper for department label
  const getDepartmentLabel = (value: string) => {
    const option = departmentOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Departments';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowRoleDropdown(false);
        setShowDepartmentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch users from API with pagination
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query parameters for pagination and filtering
      const params: any = {
        page: currentPage,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
      };
      
      // When statusFilter is 'all', explicitly send 'all' to backend
      if (statusFilter === 'all') {
        params.status = 'all';
      }

      console.log('Fetching users with params:', params);
      
      // Fetch users with pagination
      const response = await apiClient.users.getAll(params);
      
      console.log('Users response:', response.data);

      // Map API response to UserDisplay interface
      const usersData = response.data as any;
      const paginationData = response.pagination || {};

      const mappedUsers: UserDisplay[] = usersData.users.map((user: any) => ({
        id: user.id || user._id,
        name: user.fullName || `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        department: user.department || '', // Use department from backend, empty string if not set
        status: user.status || 'active',
        lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
        phone: user.phone || '', // Ensure phone is included
        salesEmployeeCode: user.salesEmployeeCode || '', // Sales Employee Code for Sales Engineers
        moduleAccess: user.moduleAccess || [] // Ensure module access is included
      }));

      setUsers(mappedUsers);
      setTotalAdmins(usersData.totalAdmin || 0);
      // Set pagination data
      setCurrentPage(paginationData.page || 1);
      setLimit(paginationData.limit || 10);
      setTotalDatas(paginationData.total || 0);
      setTotalPages(paginationData.pages || 0);

    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(setBreadcrumbs([
      { label: 'Dashboard', path: '/' },
      { label: 'User Management' }
    ]));

    fetchUsers();
  }, [dispatch, currentPage, limit, searchTerm, statusFilter, roleFilter, departmentFilter]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target as Node)) {
        setIsDepartmentDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRoleDropdownOpen(false);
        setIsDepartmentDropdownOpen(false);
      }
    };

    if (isRoleDropdownOpen || isDepartmentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRoleDropdownOpen, isDepartmentDropdownOpen]);

  // Modal handlers
  const openAddUserModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
      department: '',
      phone: '',
      moduleAccess: []
    });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowUserModal(true);
  };

  const openEditUserModal = (user: UserDisplay) => {
    // Prevent editing deleted users
    if (user.status === 'deleted') {
      setError('Cannot edit deactivated users. Please restore the user first.');
      return;
    }

    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      email: user.email,
      password: '', // Not required for editing
      confirmPassword: '', // Not required for editing
      role: user.role as UserRole,
      department: user.department || '',
      phone: user.phone || '',
      moduleAccess: Array.isArray(user.moduleAccess)
        ? user.moduleAccess.map((item) => ({
          module: item.module as ModuleKey,
          access: item.access,
          permission: item.permission as 'read' | 'write' | 'admin'
        }))
        : []
    });
    setShowPassword(false);
    setShowConfirmPassword(false);

    setFormErrors({});
    setShowUserModal(true);
  };


  const closeModal = () => {
    setShowUserModal(false);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setIsRoleDropdownOpen(false);
    setIsDepartmentDropdownOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
      department: '',
      phone: '',
      moduleAccess: []
    });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openDeleteConfirm = (user: UserDisplay) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // First Name Validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      errors.firstName = 'First name can only contain letters and spaces';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters long';
    } else if (formData.firstName.trim().length > 50) {
      errors.firstName = 'First name cannot exceed 50 characters';
    }

    // Last Name Validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      errors.lastName = 'Last name can only contain letters and spaces';
    } else if (formData.lastName.trim().length < 1) {
      errors.lastName = 'Last name must be at least 1 character long';
    } else if (formData.lastName.trim().length > 50) {
      errors.lastName = 'Last name cannot exceed 50 characters';
    }

    // Email Validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (formData.email.length > 255) {
      errors.email = 'Email cannot exceed 255 characters';
    }

    // Phone Number Validation
    if (formData.phone && formData.phone.trim() !== '') {
      if (!/^[0-9]{10}$/.test(formData.phone)) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }
    }

    // Password validation for new users
    if (!isEditing) {
      if (!formData.password || formData.password.trim().length === 0) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8 || formData.password.length > 16) {
        errors.password = 'Password must be between 8-16 characters long';
      } else if (/\s/.test(formData.password)) {
        errors.password = 'Password cannot contain spaces';
      } else {
        const hasUppercase = /[A-Z]/.test(formData.password);
        const hasLowercase = /[a-z]/.test(formData.password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);

        if (!hasUppercase || !hasLowercase || !hasSpecialChar) {
          errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one special character';
        }
      }
      
      if (!formData.confirmPassword || formData.confirmPassword.trim().length === 0) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Prepare form data - remove empty department to avoid validation error
      const dataToSend = {
        ...formData,
        department: formData.department && formData.department.trim() ? formData.department : undefined
      };

      if (isEditing && selectedUser) {
        const res = await apiClient.users.update(selectedUser.id, dataToSend);
        toast.success(res?.message)
      } else {
        const response = await apiClient.users.create(dataToSend);
        toast.success(response?.message)
      }

      await fetchUsers();
      closeUserModal();
    } catch (err: any) {
      console.error('Error saving user:', err);
      
      // Extract error message from backend response
      let errorMessage = 'Failed to save user';
      
      if (err?.response?.data?.message) {
        // Backend error message from API response
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        // Direct error message (like "User with this email already exists")
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  const handleDelete = async () => {
    if (!userToDelete) return;

    setSubmitting(true);
    try {
      const response = await apiClient.users.delete(userToDelete.id);
      toast.success(response?.message)

      await fetchUsers();
      closeDeleteConfirm();
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      
      // Extract error message from backend response
      let errorMessage = 'Failed to deactivate user';
      
      if (err?.response?.data?.message) {
        // Backend error message from API response
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        // Direct error message
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (user: UserDisplay) => {
    console.log('Attempting to restore user:', user.id, user.name);
    setSubmitting(true);
    try {
      const response = await apiClient.users.restore(user.id);
      console.log('Restore response:', response);
      toast.success(response?.message || 'User restored successfully');
      await fetchUsers();
      setError(null); // Clear any existing errors
    } catch (err: any) {
      console.error('Error restoring user:', err);
      console.error('Error details:', err?.response?.data || err);
      
      // Extract error message from backend response
      let errorMessage = 'Failed to restore user';
      
      if (err?.response?.data?.message) {
        // Backend error message from API response
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        // Direct error message
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const sanitizeInput = (value: string, type: string): string => {
    switch (type) {
      case 'name':
        // Allow only alphabets and spaces, remove numbers and special characters
        return value.replace(/[^a-zA-Z\s]/g, '').trim();
      case 'email':
        // Allow email format characters and convert to lowercase
        return value.toLowerCase().trim();
      case 'phone':
        // Allow only numbers
        return value.replace(/[^0-9]/g, '');
      case 'password':
        // No sanitization for password - user needs to see what they type
        return value;
      default:
        return value.trim();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    
    // Sanitize input based on field type
    if (field === 'firstName' || field === 'lastName') {
      sanitizedValue = sanitizeInput(value, 'name');
    } else if (field === 'email') {
      sanitizedValue = sanitizeInput(value, 'email');
    } else if (field === 'phone') {
      sanitizedValue = sanitizeInput(value, 'phone');
      // Limit phone number to 10 digits
      if (sanitizedValue.length > 10) {
        sanitizedValue = sanitizedValue.substring(0, 10);
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Real-time validation
    if (field === 'firstName') {
      if (!/^[a-zA-Z\s]*$/.test(sanitizedValue)) {
        setFormErrors(prev => ({ ...prev, firstName: 'First name can only contain letters and spaces' }));
      } else if (sanitizedValue.trim().length > 0 && sanitizedValue.trim().length < 2) {
        setFormErrors(prev => ({ ...prev, firstName: 'First name must be at least 2 characters long' }));
      } else {
        setFormErrors(prev => ({ ...prev, firstName: '' }));
      }
    } else if (field === 'lastName') {
      if (!/^[a-zA-Z\s]*$/.test(sanitizedValue)) {
        setFormErrors(prev => ({ ...prev, lastName: 'Last name can only contain letters and spaces' }));
      } else {
        setFormErrors(prev => ({ ...prev, lastName: '' }));
      }
    } else if (field === 'email') {
      if (sanitizedValue.trim().length > 0 && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(sanitizedValue)) {
        setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      } else {
        setFormErrors(prev => ({ ...prev, email: '' }));
      }
    } else if (field === 'phone') {
      if (sanitizedValue.length > 0 && !/^[0-9]{0,10}$/.test(sanitizedValue)) {
        setFormErrors(prev => ({ ...prev, phone: 'Phone number can only contain numbers' }));
      } else if (sanitizedValue.length === 10 && !/^[0-9]{10}$/.test(sanitizedValue)) {
        setFormErrors(prev => ({ ...prev, phone: 'Phone number must be exactly 10 digits' }));
      } else {
        setFormErrors(prev => ({ ...prev, phone: '' }));
      }
    } else if (field === 'password' && /\s/.test(sanitizedValue)) {
      setFormErrors(prev => ({ ...prev, password: 'Password cannot contain spaces' }));
    } else if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
    setIsRoleDropdownOpen(false);

    // Clear error for role field
    if (formErrors.role) {
      setFormErrors(prev => ({
        ...prev,
        role: ''
      }));
    }
  };

  const handleDepartmentSelect = (department: string) => {
    setFormData(prev => ({
      ...prev,
      department
    }));
    setIsDepartmentDropdownOpen(false);

    // Clear error for department field
    if (formErrors.department) {
      setFormErrors(prev => ({
        ...prev,
        department: ''
      }));
    }
  };

  const handleRoleChange = (selectedRole: string) => {
    const allowedModules = roleModuleMapping[selectedRole] || [];
    const newModuleAccess: ModuleAccess[] = allowedModules.map((module: ModuleKey) => {
      const existing = formData.moduleAccess.find((m) => m.module === module);
      
      // Dashboard should have read access by default
      if (module === 'dashboard') {
        return {
          module,
          access: true,
          permission: 'read',
        };
      }
      
      return {
        module,
        access: existing ? existing.access : false,
        permission: existing ? existing.permission : 'read',
      };
    });
    setFormData(prev => ({
      ...prev,
      role: selectedRole as UserRole,
      moduleAccess: newModuleAccess
    }));

    // Clear role error message when role is selected
    if (formErrors.role) {
      setFormErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const handleModuleToggle = (module: ModuleKey) => {
    // Prevent unchecking dashboard module
    if (module === 'dashboard') {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      moduleAccess: prev.moduleAccess.map(m =>
        m.module === module ? { ...m, access: !m.access } : m
      )
    }));
  };

  const handlePermissionChange = (module: ModuleKey, permission: string) => {
    setFormData(prev => ({
      ...prev,
      moduleAccess: prev.moduleAccess.map(m =>
        m.module === module ? { ...m, permission: permission as 'read' | 'write' } : m
      )
    }));
  };

  const filteredUsers = users.filter((user: UserDisplay) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
  });

  // Sort users: active users first, then deleted users at the bottom
  const sortedUsers = filteredUsers.sort((a, b) => {
    if (a.status === 'deleted' && b.status !== 'deleted') return 1;
    if (a.status !== 'deleted' && b.status === 'deleted') return -1;
    return 0;
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-orange-100 text-orange-800',
      'deleted': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadge = (role: string) => {
    const colors: { [key: string]: string } = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-blue-100 text-blue-800',
      'manager': 'bg-orange-100 text-orange-800',
      'hr': 'bg-teal-100 text-teal-800',
      'field_engineer': 'bg-indigo-100 text-indigo-800',
      'sales_engineer': 'bg-cyan-100 text-cyan-800',
      'viewer': 'bg-gray-100 text-gray-800',
    };
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getDepartmentBadge = (department: string) => {
    const colors: { [key: string]: string } = {
      'accounts': 'bg-emerald-100 text-emerald-800',
      'stores': 'bg-amber-100 text-amber-800',
      'dg_sales': 'bg-blue-100 text-blue-800',
      'ev': 'bg-green-100 text-green-800',
      'telecom': 'bg-violet-100 text-violet-800',
      'admin': 'bg-red-100 text-red-800',
      'retail_service': 'bg-pink-100 text-pink-800',
    };
    return colors[department.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatRoleDisplay = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'manager': 'Manager',
      'hr': 'HR',
      'field_engineer': 'Field Engineer',
      'sales_engineer': 'Sales Engineer',
      'viewer': 'Viewer',
    };
    return roleMap[role] || role;
  };

  const formatDepartmentDisplay = (department: string) => {
    const departmentMap: { [key: string]: string } = {
      'accounts': 'Accounts',
      'stores': 'Stores',
      'dg_sales': 'DG Sales',
      'ev': 'EV',
      'telecom': 'Telecom',
      'admin': 'Admin',
      'retail_service': 'Retail Service',
    };
    return departmentMap[department] || department;
  };

  const getAvailableModules = () => {
    const roleKey = typeof formData.role === 'string' && (['super_admin', 'admin', 'hr', 'manager', 'field_engineer', 'sales_engineer', 'viewer'] as const).includes(formData.role as any)
      ? (formData.role as unknown as 'super_admin' | 'admin' | 'hr' | 'manager' | 'field_engineer' | 'sales_engineer' | 'viewer')
      : 'viewer';
    return roleModuleMapping[roleKey] || [];
  };

  const getSelectedModulesCount = () => {
    return formData.moduleAccess.filter(config => config.access).length;
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      'super_admin': 'Complete system access with all administrative privileges',
      'admin': 'Near-complete access excluding system-level admin settings',
      'hr': 'Access to user management, HR-related modules',
      'manager': 'Comprehensive access to operational modules',
      'field_engineer': 'Access to field operations, service management, and inventory',
      'sales_engineer': 'Access to DG sales, product management, and lead management',
      'viewer': 'Read-only access to selected modules'
    };
    return descriptions[role as keyof typeof descriptions] || '';
  };

  const canEditUser = (currentUserRole: any, targetUserRole: any) => {
    // Super Admin: Can edit/delete all users except other Super Admin users
    if (currentUserRole === 'super_admin') {
      return targetUserRole !== 'super_admin';
    }

    // Admin: Cannot edit/delete Super Admin or other Admin users
    if (currentUserRole === 'admin') {
      return targetUserRole !== 'super_admin' && targetUserRole !== 'admin';
    }

    // Manager: Can edit/delete HR, Field Engineer and Viewer users
    if (currentUserRole === 'manager') {
      return ['hr', 'field_engineer', 'sales_engineer', 'viewer'].includes(targetUserRole);
    }

    // HR: Can edit/delete Viewer users only (NOT Manager users)
    if (currentUserRole === 'hr') {
      return targetUserRole === 'viewer';
    }

    // Field Engineer: Cannot edit/delete any users
    if (currentUserRole === 'field_engineer') {
      return false;
    }
    // Sales Engineer: Cannot edit/delete any users
    if (currentUserRole === 'sales_engineer') {
      return false;
    }

    // Viewer: Cannot edit/delete any users
    if (currentUserRole === 'viewer') {
      return false;
    }

    return false;
  };

  const getAvailableRoles = (currentUserRole: any, existingUsers: any) => {
    const allRoles = ['super_admin', 'admin', 'hr', 'manager', 'field_engineer', 'sales_engineer', 'viewer'];
    const UserModuleMap: any = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      hr: 'HR',
      manager: 'Manager',
      field_engineer: 'Field Engineer',
      sales_engineer: 'Sales Engineer',
      viewer: 'Viewer'
    };

    // HR can only assign viewer role
    if (currentUserRole === 'hr') {
      return [{ value: 'viewer', label: 'Viewer' }];
    }

    // Filter roles based on business rules and existing users
    return allRoles
      .filter(role => {
        // Super Admin: Can assign any role, but limit super_admin if it already exists
        if (currentUserRole === 'super_admin') {
          if (role === 'super_admin' && existingUsers.some((user: any) => user.role === 'super_admin')) return false;
          return true;
        }

        // Admin: Can assign hr, manager, field_engineer, sales_engineer, viewer roles
        if (currentUserRole === 'admin') {
          return ['hr', 'manager', 'field_engineer', 'sales_engineer', 'viewer'].includes(role);
        }

        // Manager: Can assign hr, field_engineer, sales_engineer and viewer roles
        if (currentUserRole === 'manager') {
          return ['hr', 'field_engineer', 'sales_engineer', 'viewer'].includes(role);
        }

        // Field Engineer: Cannot assign any roles
        if (currentUserRole === 'field_engineer') {
          return false;
        }

        // Sales Engineer: Cannot assign any roles
        if (currentUserRole === 'sales_engineer') {
          return false;
        }

        // Viewer: Cannot assign any roles
        return false;
      })
      .map(role => ({ value: role, label: UserModuleMap[role] }));
  };

  const selectAll = (permission: 'read' | 'write') => {
    const newModuleAccess = getAvailableModules().map((module) => ({
      module,
      access: true,
      permission,
    }));
    setFormData((prev: any) => ({ ...prev, moduleAccess: newModuleAccess }));
  };

  const deselectAll = () => {
    const newModuleAccess = getAvailableModules().map((module) => ({
      module,
      access: module === 'dashboard' ? true : false, // Dashboard should always remain selected
      permission: 'read',
    }));
    setFormData((prev: any) => ({ ...prev, moduleAccess: newModuleAccess }));
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage system users and their permissions"
      >
        {(permission === 'write' || permission === 'admin') && <button
          onClick={openAddUserModal}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm">Add User</span>
        </button>}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Users</p>
              <p className="text-xl font-bold text-gray-900">
                {totalDatas || users.filter((u: UserDisplay) => u.status !== 'deleted').length}
              </p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Online</p>
              <p className="text-xl font-bold text-green-600">
                {totalDatas || users.filter((u: UserDisplay) => u.status === 'active').length}
              </p>
            </div>
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Deactivated</p>
              <p className="text-xl font-bold text-gray-600">
                {users.filter((u: UserDisplay) => u.status === 'deleted').length}
              </p>
            </div>
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Admins</p>
              <p className="text-xl font-bold text-purple-600">
                {totalAdmins || users.filter((u: UserDisplay) => u.role.toLowerCase().includes('admin') && u.status !== 'deleted').length}
              </p>
            </div>
            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Role Custom Dropdown */}
          <div className="relative dropdown-container w-40">
            <button
              onClick={() => {
                setShowRoleDropdown(!showRoleDropdown);
              }}
              className="flex items-center justify-between w-full px-2 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getRoleLabel(roleFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showRoleDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showRoleDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setRoleFilter(option.value);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${roleFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Status Custom Dropdown */}
          <div className="relative dropdown-container w-40">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
              }}
              className="flex items-center justify-between w-full px-2 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getStatusLabel(statusFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Department Custom Dropdown */}
          <div className="relative dropdown-container w-40">
            <button
              onClick={() => {
                setShowDepartmentDropdown(!showDepartmentDropdown);
              }}
              className="flex items-center justify-between w-full px-2 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getDepartmentLabel(departmentFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showDepartmentDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  key="all"
                  onClick={() => {
                    setDepartmentFilter('all');
                    setShowDepartmentDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${departmentFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                >
                  All Departments
                </button>
                {departmentOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDepartmentFilter(option.value);
                      setShowDepartmentDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${departmentFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* <div className="flex space-x-2 ml-auto">
            <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div> */}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={fetchUsers}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  {(permission === 'write' || permission === 'admin') && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (sortedUsers.map((user: UserDisplay) => {
                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 transition-colors ${user.status === 'deleted' ? 'opacity-60 bg-gray-25' : ''
                        }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${user.status === 'deleted' ? 'bg-gray-300' : 'bg-gray-200'
                              }`}
                          >
                            <span className="text-xs font-medium text-gray-600">
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div
                              className={`text-xs font-medium ${user.status === 'deleted' ? 'text-gray-600' : 'text-gray-900'
                                }`}
                            >
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {formatRoleDisplay(user.role)}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {user.role === 'sales_engineer' && user.salesEmployeeCode ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.salesEmployeeCode}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.department ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentBadge(
                              user.department
                            )}`}
                          >
                            {formatDepartmentDisplay(user.department)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                            user.status
                          )}`}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {user.lastLogin}
                      </td>

                      {(permission === 'write' || permission === 'admin') && (
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {user.status === 'deleted' ? (
                              canEditUser(currentUser, user.role) ? (
                                <button
                                  onClick={() => handleRestore(user)}
                                  disabled={submitting}
                                  className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                  title="Restore User"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">No access</span>
                              )
                            ) : (
                              <>
                                {canEditUser(currentUser, user.role) ? (
                                  <>
                                    <button
                                      onClick={() => openEditUserModal(user)}
                                      className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                      title="Edit User"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteConfirm(user)}
                                      className="text-orange-600 hover:text-orange-900 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                      title="Deactivate User"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">No access</span>
                                )}

                              </>

                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                }))

                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />

      {/* User Form Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isEditing ? 'Edit User' : 'Create New User'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {isEditing ? 'Update user information and permissions' : 'Add a new user to the system'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter first name (letters only)"
                    />
                    {formErrors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter last name (letters only)"
                    />
                    {formErrors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter email address"
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User Role <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={roleDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between ${formErrors.role ? 'border-red-500' : 'border-gray-300'
                          } ${isRoleDropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      >
                        <span className={formData.role ? 'text-gray-900' : 'text-gray-500'}>
                          {formData.role ?
                            getAvailableRoles(currentUser, users).find((role: any) => role.value === formData.role)?.label || 'Select a role'
                            : 'Select a role'
                          }
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Options */}
                      {isRoleDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {getAvailableRoles(currentUser, users).map((role: any) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                handleRoleChange(role.value);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${formData.role === role.value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                            >
                              <span>{role.label}</span>
                              {formData.role === role.value && (
                                <span className="text-blue-600 text-xs">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formErrors.role && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.role}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <div className="relative" ref={departmentDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between ${formErrors.department ? 'border-red-500' : 'border-gray-300'
                          } ${isDepartmentDropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      >
                        <span className={formData.department ? 'text-gray-900' : 'text-gray-500'}>
                          {formData.department ?
                            departmentOptions.find((dept) => dept.value === formData.department)?.label || 'Select a department'
                            : 'Select a department'
                          }
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Options */}
                      {isDepartmentDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {departmentOptions.map((dept) => (
                            <button
                              key={dept.value}
                              type="button"
                              onClick={() => {
                                handleDepartmentSelect(dept.value);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${formData.department === dept.value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                            >
                              <span>{dept.label}</span>
                              {formData.department === dept.value && (
                                <span className="text-blue-600 text-xs">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {formErrors.department && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.department}</p>
                    )}
                  </div>

                  {/* Phone Number Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter 10-digit phone number"
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Password Fields */}
                {!isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter password (8-16 chars, caps+special char, no spaces)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Role Description */}
                {formData.role && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {getRoleDescription(formData.role)}
                    </p>
                  </div>
                )}

                {/* Module Permissions */}
                {formData.role && Object.keys(formData.moduleAccess || {}).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        Module Permissions ({getSelectedModulesCount()} selected)
                      </h3>
                      <div className='flex gap-2'>
                        <button
                          type="button"
                          onClick={() => selectAll('read')}
                          className="px-2 py-1 bg-blue-100 text-xs text-blue-800 rounded hover:bg-blue-200"
                        >
                          All Read
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAll('write')}
                          className="px-2 py-1 bg-green-100 text-xs text-green-800 rounded hover:bg-green-200"
                        >
                          All Write
                        </button>
                        <button
                          type="button"
                          onClick={deselectAll}
                          className="px-2 py-1 bg-gray-100 text-xs text-gray-800 rounded hover:bg-gray-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Module Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {getAvailableModules().map((module) => {
                        
                        const config = formData.moduleAccess.find((m) => m.module === module);
                        
                        return (
                          <div
                            key={module}
                            className={`border rounded-lg p-3 ${config?.access ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={config?.access || false}
                                  onChange={() => handleModuleToggle(module)}
                                  disabled={module === 'dashboard'}
                                  className={`w-4 h-4 text-blue-600 border-gray-300 rounded ${
                                    module === 'dashboard' 
                                      ? 'cursor-not-all bg-gray-100' 
                                      : 'cursor-pointer'
                                  }`}
                                />
                                <label className={`ml-2 text-sm ${module === 'dashboard' ? 'text-gray-700 font-medium' : 'text-gray-900'}`}>
                                  {moduleMap[module]}
                                  {module === 'dashboard' && <span className="text-blue-600 text-xs ml-1">(Required)</span>}
                                </label>
                              </div>

                              {config?.access && (
                                <div className="flex bg-white rounded border">
                                  <button
                                    type="button"
                                    onClick={() => handlePermissionChange(module, 'read')}
                                    className={`px-2 py-1 text-xs rounded-l ${config.permission === 'read'
                                      ? 'bg-blue-600 text-white'
                                      : 'text-blue-600 hover:bg-blue-50'
                                      }`}
                                  >
                                    Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePermissionChange(module, 'write')}
                                    className={`px-2 py-1 text-xs rounded-r border-l ${config.permission === 'write'
                                      ? 'bg-green-600 text-white'
                                      : 'text-green-600 hover:bg-green-50'
                                      }`}
                                  >
                                    Write
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        {isEditing ? 'Update User' : 'Create User'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4">
            <div className="p-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
                <Trash2 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Deactivate User
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to deactivate <strong>{userToDelete.name}</strong>?
                The user will be marked as deleted but can be restored later if needed.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Deactivating...' : 'Deactivate User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// export default UserManagement;