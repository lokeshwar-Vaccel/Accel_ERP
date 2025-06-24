import React from 'react';
import { Upload, File, Search, Download } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

const FileManagement: React.FC = () => {
  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader 
        title="File Management"
        subtitle="Upload, organize and manage documents securely"
      >
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Upload Files</span>
        </button>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
        <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management System</h3>
        <p className="text-gray-500">Store and organize all your business documents securely</p>
      </div>
    </div>
  );
};

export default FileManagement; 