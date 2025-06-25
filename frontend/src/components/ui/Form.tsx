import React from 'react';
import { FormField } from '../../types';

interface FormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const Form: React.FC<FormProps> = ({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false
}) => {
  const renderField = (field: FormField) => {
    const value = values[field.name] || '';
    const error = errors[field.name];
    const hasError = !!error;

    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      hasError ? 'border-red-300' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseInputClasses} h-24 resize-vertical`}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
              onChange(field.name, selectedValues);
            }}
            className={`${baseInputClasses} h-32`}
            disabled={disabled}
            required={field.required}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={disabled}
            />
            <label className="ml-2 text-sm text-gray-900">{field.label}</label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={disabled}
                />
                <label className="ml-2 text-sm text-gray-900">{option.label}</label>
              </div>
            ))}
          </div>
        );

      case 'date':
      case 'datetime-local':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, parseFloat(e.target.value) || 0)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => onChange(field.name, e.target.files?.[0] || null)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={baseInputClasses}
            disabled={disabled}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          {field.type !== 'checkbox' && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderField(field)}
          {errors[field.name] && (
            <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
          )}
        </div>
      ))}
    </div>
  );
}; 