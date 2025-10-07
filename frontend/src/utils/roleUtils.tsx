import { UserRole } from '../types';
// import { ROLE_HIERARCHY } from './constants';

export const hasAccess = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

// export const hasHigherRole = (userRole: UserRole, compareRole: UserRole): boolean => {
//   return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[compareRole];
// };

export const getRoleColor = (role: UserRole): string => {
  const colors = {
    super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
    admin: 'bg-blue-100 text-blue-800 border-blue-200',
    manager: 'bg-green-100 text-green-800 border-green-200',
    hr: 'bg-orange-100 text-orange-800 border-orange-200',
    field_engineer: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    sales_engineer: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    viewer: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[role];
};