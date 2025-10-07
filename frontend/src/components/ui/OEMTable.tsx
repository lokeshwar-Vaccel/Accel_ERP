import React from 'react';
import { Table } from './Table';
import { Button } from './Botton';
import { Badge } from './Badge';
import { Select } from './Select';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface OEM {
  _id: string;
  oemCode: string;
  companyName: string;
  alias?: string;
  contactPersonName?: string;
  mobileNo?: string;
  email?: string;
  addresses?: any[];
  bankDetails?: any[];
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OEMTableProps {
  oems: OEM[];
  loading?: boolean;
  onView: (oem: OEM) => void;
  onEdit: (oem: OEM) => void;
  onDelete: (oem: OEM) => void;
  onStatusUpdate: (oemId: string, status: string) => void;
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
}

const OEMTable: React.FC<OEMTableProps> = ({
  oems,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
  pagination
}) => {
  const columns = [
    { key: 'oemCode', title: 'OEM Code', sortable: true },
    { key: 'companyName', title: 'Company Name' },
    { key: 'alias', title: 'Alias' },
    { key: 'contactPersonName', title: 'Contact Person' },
    { key: 'mobileNo', title: 'Mobile' },
    { key: 'email', title: 'Email' },
    { key: 'addresses', title: 'Addresses' },
    { key: 'bankDetails', title: 'Bank Details' },
    { key: 'status', title: 'Status' },
    { key: 'actions', title: 'Actions' }
  ];

  const data = oems.map(oem => ({
    oemCode: oem.oemCode || '',
    companyName: oem.companyName || '',
    alias: oem.alias || '-',
    contactPersonName: oem.contactPersonName || '-',
    mobileNo: oem.mobileNo || '-',
    email: oem.email || '-',
    addresses: oem.addresses?.length || 0,
    bankDetails: oem.bankDetails?.length || 0,
    status: (
      <Select
        value={oem.status || 'active'}
        onChange={(e) => onStatusUpdate(oem._id, e.target.value)}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]}
        className="w-32"
      />
    ),
    actions: (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(oem)}
        >
          <Eye size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(oem)}
        >
          <Edit size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(oem)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    )
  }));

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      pagination={pagination}
    />
  );
};

export default OEMTable;
