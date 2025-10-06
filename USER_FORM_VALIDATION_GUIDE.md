# User Form Validation & Sanitization Guide

## Overview
Enhanced validation and sanitization system for the UserManagement module with real-time feedback and automatic input cleaning.

## Features Implemented

### ✅ **Input Sanitization**
- **First Name**: Only alphabets and spaces allowed, numbers/special chars removed
- **Last Name**: Only alphabets and spaces allowed, numbers/special chars removed
- **Email**: Converted to lowercase, trimmed whitespace
- **Phone**: Only numbers allowed (0-9), auto-limited to 10 digits
- **Password**: No sanitization (user needs to see what they type)

### ✅ **Real-Time Validation**
- **Immediate feedback** while typing
- **Visual indicators** with red borders for invalid fields
- **Specific error messages** for each validation rule
- **Auto-clearing** of errors when valid input is entered

### ✅ **Comprehensive Validation Rules**

#### **First Name & Last Name**
```typescript
// Validation Rules:
- Required field
- Only letters (A-Z, a-z) and spaces allowed
- First Name: Minimum 2 characters
- Last Name: Minimum 1 character (allows single letter surnames)
- Maximum 50 characters for both
- No numbers or special characters

// Real-time Messages:
- "First name can only contain letters and spaces"
- "First name must be at least 2 characters long"
- "Last name can only contain letters and spaces"
- "Last name must be at least 1 character long"
```

#### **Email Address**
```typescript
// Validation Rules:
- Required field
- Valid email format: user@domain.com
- Must contain @ symbol and domain
- Maximum 255 characters
- Converted to lowercase automatically

// Real-time Messages:
- "Please enter a valid email address"
- "Email cannot exceed 255 characters"
```

#### **Phone Number**
```typescript
// Validation Rules:
- Optional field
- Exactly 10 digits required when provided
- Only numbers allowed (no spaces, dashes, or other chars)
- Auto-truncated to 10 digits maximum

// Real-time Messages:
- "Phone number can only contain numbers"
- "Phone number must be exactly 10 digits"
```

#### **Password (New Users Only)**
```typescript
// Validation Rules:
- Required for new users
- 8-16 characters length
- At least one uppercase letter
- At least one lowercase letter
- At least one special character
- No spaces allowed
- Priority: Space validation happens first

// Real-time Messages:
- "Password cannot contain spaces" (immediate)
- "Password must be between 8-16 characters long"
- "Password must contain at least one uppercase letter, one lowercase letter, and one special character"
```

## Usage Examples

### **User Experience Flow**

#### **Name Fields**
1. **User types**: "John123" → **Sanitized to**: "John" (numbers removed)
2. **Error message**: "First name kann only contain letters and spaces"
3. **User types**: "Jo" → **Error message**: "First name must be at least 2 characters long"
4. **User types**: "John" → ✅ **Valid, no errors**

#### **Email Field**
1. **User types**: "JOHN@EXAMPLE.COM" → **Sanitized to**: "john@example.com"
2. **User types**: "john@" → **Error message**: "Please enter a valid email address"
3. **User types**: "john@example.com" → ✅ **Valid, no errors**

#### **Phone Field**
1. **User types**: "98765-43210" → **Sanitized to**: "9876543210"
2. **User types**: "98765abc43210" → **Sanitized to**: "9876543210"
3. **User types**: "12345678901" → **Sanitized to**: "1234567890" (limit 10 digits)
4. **Validation**: ✅ **Valid if exactly 10 digits**

#### **Password Field**
1. **User types**: "My Password123!" → **Error message**: "Password cannot contain spaces"
2. **User removes space**: "MyPassword123!" → ✅ **Valid (meets all criteria)**

## Technical Implementation

### **Sanitization Function**
```typescript
const sanitizeInput = (value: string, type: string): string => {
  switch (type) {
    case 'name':
      return value.replace(/[^a-zA-Z\s]/g, '').trim();
    case 'email':
      return value.toLowerCase().trim();
    case 'phone':
      return value.replace(/[^0-9]/g, '');
    case 'password':
      return value; // No sanitization
    default:
      return value.trim();
  }
};
```

### **Real-Time Validation**
```typescript
const handleInputChange = (field: string, value: string) => {
  let sanitizedValue = sanitizeInput(value, fieldType);
  
  // Apply field-specific sanitization
  if (field === 'firstName' || field === 'lastName') {
    sanitizedValue = sanitizeInput(value, 'name');
  } else if (field === 'email') {
    sanitizedValue = sanitizeInput(value, 'email');
  } else if (field === 'phone') {
    sanitizedValue = sanitizeInput(value, 'phone');
    if (sanitizedValue.length > 10) {
      sanitizedValue = sanitizedValue.substring(0, 10);
    }
  }
  
  setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  
  // Real-time validation logic...
};
```

## Benefits

### 🚀 **User Experience**
- **Instant feedback** - Users see errors immediately while typing
- **Prevent submission** of invalid data before form submit
- **Auto-correction** - Invalid characters automatically removed
- **Clear guidance** - Specific error messages guide users

### 🛡️ **Data Quality**
- **Consistent formatting** - Data stored in standardized format
- **Prevent invalid data** - Only valid data reaches the backend
- **Security enhancement** - Prevents malicious input patterns

### 📊 **Form Validation**
- **Real-time checks** during input
- **Comprehensive validation** on form submit
- **Graceful error handling** with user-friendly messages

## Testing Scenarios

### ✅ **Valid Inputs**
- Names: "John Doe", "Mary Jane Smith"
- Emails: "user@example.com", "test.email+tag@domain.co.uk"
- Phones: "1234567890", "9876543210"
- Passwords: "MyPassword123!", "SecurePass$456"

### ❌ **Invalid Inputs**
- Names: "John123", "User@Name", "A"
- Emails: "invalid-email", "user@", "@domain.com"
- Phones: "123-456-7890", "123abc456", "123"
- Passwords: "password", "12345678", "My Password123!"

## Error Messages Reference

| Field | Condition | Error Message |
|-------|-----------|---------------|
| First Name | Contains numbers/special chars | "First name can only contain letters and spaces" |
| First Name | Too short | "First name must be at least 2 characters long" |
| First Name | Too long | "First name cannot exceed 50 characters" |
| Last Name | Contains numbers/special chars | "Last name can only contain letters and spaces" |
| Last Name | Too short | "Last name must be at least 1 character long" |
| Last Name | Too long | "Last name cannot exceed 50 characters" |
| Email | Invalid format | "Please enter a valid email address" |
| Email | Too long | "Email cannot exceed 255 characters" |
| Phone | Contains non-numeric chars | "Phone number can only contain numbers" |
| Phone | Wrong length | "Phone number must be exactly 10 digits" |
| Password | Contains spaces | "Password cannot contain spaces" |
| Password | Wrong length | "Password must be between 8-16 characters long" |
| Password | Missing requirements | "Password must contain at least one uppercase letter, one lowercase letter, and one special character" |

## Integration Notes

- **Backend compatibility**: All sanitized data is sent to backend
- **Database storage**: Clean, validated data enters database
- **Error handling**: Form submission blocked until all validation passes
- **Performance**: Lightweight validation with minimal impact on typing speed

---

*This validation system ensures data integrity while providing excellent user experience through real-time feedback and intelligent input sanitization.*
