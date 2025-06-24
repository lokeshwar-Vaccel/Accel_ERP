import React from 'react';
import { Upload, File, Search, Download } from 'lucide-react';

const FileManagement: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">File Management</h1>
          <p className="text-gray-600 mt-1">Upload, organize and manage documents</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Files</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
        <File className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management System</h3>
        <p className="text-gray-500">Store and organize all your business documents securely</p>
      </div>
    </div>
  );
};

export default FileManagement; 