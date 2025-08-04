import React, { useState } from 'react';
import { ChevronUp, ChevronDown, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { TableColumn, PaginationInfo } from '../../types';
import { Pagination } from './Pagination';

interface TableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onView?: (record: any) => void;
  actions?: boolean;
  className?: string;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  onEdit,
  onDelete,
  onView,
  actions = false,
  className = ''
}) => {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  console.log("pagination:", pagination);
  
  const handleSort = (column: string) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);
    if (onSort) {
      onSort(column, direction);
    }
  };

  const renderActions = (record: any) => (
    <div className="relative">
      <button
        onClick={() => setActionMenuOpen(actionMenuOpen === record._id ? null : record._id)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {actionMenuOpen === record._id && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {onView && (
            <button
              onClick={() => {
                onView(record);
                setActionMenuOpen(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => {
                onEdit(record);
                setActionMenuOpen(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                onDelete(record);
                setActionMenuOpen(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={record._id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(record[column.key], record) : record[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderActions(record)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={onPageChange || (() => {})}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
        />
         </div>
      )}
    </div>
  );
}; 