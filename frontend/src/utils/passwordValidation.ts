// Password validation utility functions

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireSpecialChar: boolean;
  requireNoSpaces: boolean;
}

export const defaultPasswordRequirements: PasswordRequirements = {
  minLength: 8,
  maxLength: 16,
  requireUppercase: true,
  requireLowercase: true,
  requireSpecialChar: true,
  requireNoSpaces: true,
};

export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = defaultPasswordRequirements
): PasswordValidationResult => {
  const errors: string[] = [];

  // Check length requirements
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (password.length > requirements.maxLength) {
    errors.push(`Password must not exceed ${requirements.maxLength} characters`);
  }

  // Check uppercase requirement
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check lowercase requirement
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check special character requirement
  if (requirements.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check no spaces requirement
  if (requirements.requireNoSpaces && /\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getPasswordErrorMessage = (password: string): string | null => {
  const result = validatePassword(password);
  return result.errors.length > 0 ? result.errors.join(', ') : null;
};

export const getPasswordStrengthMessage = (password: string): string => {
  const result = validatePassword(password);
  
  if (result.isValid) {
    return 'Password meets all requirements';
  }
  
  return `Password requirements: ${result.errors.join(', ')}`;
};

// Common password patterns for validation
export const passwordPatterns = {
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  hasNoSpaces: /^\S*$/,
};

export default {
  validatePassword,
  getPasswordErrorMessage,
  getPasswordStrengthMessage,
  passwordPatterns,
  defaultPasswordRequirements,
};
