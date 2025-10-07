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

// Define the type for the form state
interface UserFormState {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
  permissions: string[];
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<UserFormState>({
    name: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || UserRole.VIEWER,
    department: '', // No department on User, so default to empty string
    status: 'active', // No status on User, so default to 'active'
    permissions: [], // No permissions on User, so default to []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleOptions = [
    { value: UserRole.SUPER_ADMIN, label: 'Super Admin' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.MANAGER, label: 'Manager' },
    { value: UserRole.HR, label: 'HR Manager' },
    { value: UserRole.VIEWER, label: 'Viewer' }
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      // Set permissions based on role
      const permissions = getPermissionsByRole(formData.role);
      // Split name into firstName and lastName if needed
      const [firstName, ...rest] = formData.name.split(' ');
      const lastName = rest.join(' ');
      onSubmit({
        ...formData,
        firstName,
        lastName,
        permissions
      } as any);
    }
  };

  const getPermissionsByRole = (role: UserRole): string[] => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return ['all'];
      case UserRole.ADMIN:
        return ['users', 'crm', 'inventory', 'services', 'amc', 'reports', 'settings'];
      case UserRole.MANAGER:
        return ['users', 'crm', 'inventory', 'services', 'amc', 'reports'];
      case UserRole.HR:
        return ['users', 'inventory'];
      case UserRole.VIEWER:
        return ['crm', 'services', 'reports'];
      default:
        return [];
    }
  };

  const handleChange = (field: keyof UserFormState, value: string) => {
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
          error={errors.name}
          icon={<UserIcon size={16} />}
          placeholder="Enter full name"
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('email', e.target.value)}
          error={errors.email}
          icon={<Mail size={16} />}
          placeholder="Enter email address"
        />

        <Input
          label="Phone Number"
          value={formData.phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('phone', e.target.value)}
          error={errors.phone}
          icon={<Phone size={16} />}
          placeholder="Enter phone number"
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('role', e.target.value as UserRole)}
          options={roleOptions}
        />

        <Select
          label="Department"
          value={formData.department}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('department', e.target.value)}
          error={errors.department}
          options={departmentOptions}
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('status', e.target.value as 'active' | 'inactive')}
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