import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';

interface DGProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportResult {
  imported: number;
  errorCount: number;
  importedProducts: Array<{
    row: number;
    subject: string;
    kva: string;
    phase: string;
    dgModel: string;
    numberOfCylinders: number;
  }>;
  errors?: string[];
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
}

interface PreviewData {
  row: number;
  subject: string;
  annexureRating: string;
  modelCylinder: string;
  productDescription: string;
  model: string;
  noOfCylinders: string;
  parsedData: {
    kva: string;
    phase: string;
    dgModel: string;
    numberOfCylinders: number;
    isValid: boolean;
    errors: string[];
  };
}

const DGProductImportModal: React.FC<DGProductImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication status when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('authToken');
      console.log('🔐 Modal Opened - Auth Status:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
      });
      
      if (!token) {
        toast.error('Please login first to access this feature');
        onClose();
      }
    }
  }, [isOpen, onClose]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please select a valid Excel file (.xls, .xlsx) or CSV file');
        return;
      }
      
      // Debug: Check authentication status
      const token = localStorage.getItem('authToken');
      console.log('🔐 Auth Token Status:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
      });
      
      if (!token) {
        toast.error('Please login first to upload files');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
      setPreviewData([]);
      setShowPreview(false);
      
      // Automatically preview the file upon selection
      try {
        setIsPreviewing(true);
        const response = await apiClient.dgProducts.preview(selectedFile);
        
        if (response.success) {
          setPreviewData(response.data.previewData);
          setValidationSummary(response.data.validationSummary);
          setShowPreview(true);
          toast.success(`Preview generated for ${response.data.validationSummary.totalRows} rows`);
        } else {
          toast.error('Failed to generate preview');
        }
      } catch (error: any) {
        console.error('❌ Preview Error:', error);
        toast.error(error.message || 'Failed to preview file');
        // Reset file if preview fails
        setFile(null);
      } finally {
        setIsPreviewing(false);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiClient.dgProducts.import(file);
      
      if (response.success) {
        setImportResult(response.data);
        toast.success(`Import completed! ${response.data.imported} products imported successfully.`);
        onImportSuccess();
      } else {
        toast.error('Import failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setShowPreview(false);
    setValidationSummary(null);
    onClose();
  };

  const downloadTemplate = () => {
    // Create a sample Excel template with the expected structure
    const templateData = [
      ['Subject', 'Annexure Rating', 'Model & Cylinder', 'Product Description', 'Model', 'No Of Cylinders'],
      [
        'Offer for the Supply of 10 kVA (3P) Genset confirming to latest CPCB IV+ emission norms.',
        '10 Kva (3P)',
        'M2155G1 & CYL-2',
        'Supply of 10 kVA 3 phase, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic 2 cylinder engine, model M2155G1, coupled with 10 KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.',
        'M2155G1',
        '2'
      ],
      [
        'Offer for the Supply of 15 kVA (3P) Prime Genset confirming to latest CPCB IV+ emission norms.',
        '15 kva (3P) Prime',
        'M3205G1 & CYL-3',
        'Supply of 15 kVA 3 phase, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic 3 cylinder engine, model M3205G1, coupled with 15 KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.',
        'M3205G1',
        '3'
      ]
    ];

    // Convert to CSV format
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dg-products-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import DG Products from Excel</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Authentication Status */}
          {(() => {
            const token = localStorage.getItem('authToken');
            return token ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    ✅ Authenticated - Ready to upload files
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">
                      ❌ Not authenticated - Please login first
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      // Redirect to login page or show login modal
                      window.location.href = '/login';
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Import Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Upload an Excel file (.xls, .xlsx) or CSV file</li>
              <li>• First row should contain column headers</li>
              <li>• Required columns: Subject, Annexure Rating, Model & Cylinder, Product Description, Model, No Of Cylinders</li>
              <li>• The system will automatically parse KVA and Phase from Annexure Rating</li>
              <li>• Duplicate products (same KVA, Phase, Model, Cylinders) will be skipped</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Download Template</h3>
              <p className="text-xs text-gray-500">Get a sample file with the correct format</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Upload */}
          <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
            localStorage.getItem('authToken') 
              ? 'border-gray-300' 
              : 'border-gray-200 bg-gray-50 opacity-50'
          }`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileChange}
              disabled={!localStorage.getItem('authToken')}
              className="hidden"
            />
            
            {!file ? (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {localStorage.getItem('authToken') 
                      ? 'Click to upload or drag and drop' 
                      : 'Please login first to upload files'
                    }
                  </p>
                  <p className="text-xs text-gray-500">Excel (.xls, .xlsx) or CSV files only</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!localStorage.getItem('authToken')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localStorage.getItem('authToken') ? 'Select File' : 'Login Required'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {isPreviewing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Generating Preview...</p>
                      <p className="text-xs text-gray-500">Please wait while we process your file</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setFile(null)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      >
                        Change File
                      </button>
                      
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Preview Section */}
          {showPreview && previewData.length > 0 && (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Preview automatically generated! Review the data below before importing.
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {validationSummary?.validRows || 0} valid, {validationSummary?.invalidRows || 0} invalid
                  </span>
                  {/* <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button> */}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-medium text-gray-700">Row</th>
                      <th className="text-left p-2 font-medium text-gray-700">Subject</th>
                      <th className="text-left p-2 font-medium text-gray-700">Annexure Rating</th>
                      <th className="text-left p-2 font-medium text-gray-700">Model & Cylinder</th>
                      <th className="text-left p-2 font-medium text-gray-700">Parsed KVA</th>
                      <th className="text-left p-2 font-medium text-gray-700">Parsed Phase</th>
                      <th className="text-left p-2 font-medium text-gray-700">Parsed Model</th>
                      <th className="text-left p-2 font-medium text-gray-700">Parsed Cylinders</th>
                      <th className="text-left p-2 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-white">
                        <td className="p-2 font-medium text-gray-900">{row.row}</td>
                        <td className="p-2 text-gray-700 max-w-xs truncate" title={row.subject}>
                          {row.subject}
                        </td>
                        <td className="p-2 text-gray-700">{row.annexureRating}</td>
                        <td className="p-2 text-gray-700">{row.modelCylinder}</td>
                        <td className="p-2 text-gray-700">{row.parsedData.kva || '-'}</td>
                        <td className="p-2 text-gray-700">{row.parsedData.phase || '-'}</td>
                        <td className="p-2 text-gray-700">{row.parsedData.dgModel || '-'}</td>
                        <td className="p-2 text-gray-700">{row.parsedData.numberOfCylinders || '-'}</td>
                        <td className="p-2">
                          {row.parsedData.isValid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600">Total Rows</p>
                      <p className="text-xl font-bold text-blue-600">{validationSummary?.totalRows || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600">Valid Rows</p>
                      <p className="text-xl font-bold text-green-600">
                        {validationSummary?.validRows || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600">Invalid Rows</p>
                      <p className="text-xl font-bold text-red-600">
                        {validationSummary?.invalidRows || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {validationSummary && validationSummary.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {validationSummary.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Import Results</h3>
              
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Successfully Imported</p>
                      <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                    </div>
                  </div>
                </div>
                
                {importResult.errorCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Errors</p>
                        <p className="text-2xl font-bold text-red-600">{importResult.errorCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Imported Products */}
              {importResult.importedProducts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Imported Products</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {importResult.importedProducts.map((product, index) => (
                      <div key={index} className="text-xs text-gray-600 mb-1">
                        Row {product.row}: {product.subject} - {product.kva} kVA ({product.phase === 'single' ? '1P' : '3P'}) - {product.dgModel}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs text-red-700 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
        <button
                        onClick={handleImport}
                        disabled={isImporting || !file || !validationSummary || validationSummary.validRows === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isImporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Import Products</span>
                          </>
                        )}
                      </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DGProductImportModal; 