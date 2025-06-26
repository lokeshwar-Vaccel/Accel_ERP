import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Botton';
import { Mail, Phone, User as UserIcon } from 'lucide-react';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'viewer' as UserRole,
    department: user?.department || '',
    status: user?.status || 'active' as 'active' | 'inactive',
    permissions: user?.permissions || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR Manager' },
    { value: 'viewer', label: 'Viewer' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const departmentOptions = [
    { value: 'Administration', label: 'Administration' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Technical', label: 'Technical' },
    { value: 'Customer Service', label: 'Customer Service' },
    { value: 'Sales', label: 'Sales' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Set permissions based on role
      const permissions = getPermissionsByRole(formData.role);
      onSubmit({
        ...formData,
        permissions
      });
    }
  };

  const getPermissionsByRole = (role: UserRole): string[] => {
    switch (role) {
      case 'super_admin':
        return ['all'];
      case 'admin':
        return ['users', 'crm', 'inventory', 'services', 'amc', 'reports', 'settings'];
      case 'manager':
        return ['users', 'crm', 'inventory', 'services', 'amc', 'reports'];
      case 'hr':
        return ['users', 'inventory'];
      case 'viewer':
        return ['crm', 'services', 'reports'];
      default:
        return [];
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          icon={<UserIcon size={16} />}
          placeholder="Enter full name"
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          icon={<Mail size={16} />}
          placeholder="Enter email address"
        />

        <Input
          label="Phone Number"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone}
          icon={<Phone size={16} />}
          placeholder="Enter phone number"
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          options={roleOptions}
        />

        <Select
          label="Department"
          value={formData.department}
          onChange={(e) => handleChange('department', e.target.value)}
          error={errors.department}
          options={departmentOptions}
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          options={statusOptions}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
};