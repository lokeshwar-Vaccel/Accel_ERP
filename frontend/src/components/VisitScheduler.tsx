import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Settings,
  Plus,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../utils/api';

interface VisitSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  amcId: string;
  amcData?: any;
}

interface VisitData {
  scheduledDate: string;
  assignedTo: string;
  visitType: 'routine' | 'emergency' | 'followup' | 'inspection';
  estimatedDuration: number;
  notes: string;
  autoSchedule: boolean;
  scheduleType: 'manual' | 'automatic' | 'optimized';
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const VisitScheduler: React.FC<VisitSchedulerProps> = ({ isOpen, onClose, amcId, amcData }) => {
  const [visitData, setVisitData] = useState<VisitData>({
    scheduledDate: '',
    assignedTo: '',
    visitType: 'routine',
    estimatedDuration: 2,
    notes: '',
    autoSchedule: false,
    scheduleType: 'manual'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setVisitData({
        scheduledDate: '',
        assignedTo: '',
        visitType: 'routine',
        estimatedDuration: 2,
        notes: '',
        autoSchedule: false,
        scheduleType: 'manual'
      });
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.users.getAll();
      console.log('Users API response:', response); // Debug log
      // Ensure users is always an array
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
        console.log('Users set successfully:', response.data.length, 'users');
      } else {
        console.error('Invalid users data:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiClient.amc.scheduleEnhancedVisit(amcId, visitData);
      onClose();
      // You might want to trigger a refresh of the AMC data here
    } catch (error: any) {
      setError(error.message || 'Failed to schedule visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSchedule = () => {
    setVisitData(prev => ({
      ...prev,
      autoSchedule: !prev.autoSchedule,
      scheduleType: !prev.autoSchedule ? 'automatic' : 'manual'
    }));
  };

  const generateOptimalSchedule = () => {
    if (!amcData) return;

    // Calculate optimal visit dates based on contract duration and scheduled visits
    const startDate = new Date(amcData.startDate);
    const endDate = new Date(amcData.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.floor(totalDays / amcData.scheduledVisits);

    const optimalDates = [];
    for (let i = 0; i < amcData.scheduledVisits; i++) {
      const visitDate = new Date(startDate);
      visitDate.setDate(startDate.getDate() + (i * intervalDays));
      optimalDates.push(visitDate.toISOString().split('T')[0]);
    }

    return optimalDates;
  };

  const renderAutoSchedulePreview = () => {
    if (!visitData.autoSchedule || !amcData) return null;

    const optimalDates = generateOptimalSchedule();

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Auto-Schedule Preview</h4>
        <div className="space-y-2">
          {optimalDates?.map((date, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Visit {index + 1}</span>
              <span className="text-blue-900 font-medium">{new Date(date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          {amcData.scheduledVisits} visits will be automatically scheduled over the contract period
        </p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Schedule Visit</h2>
            <p className="text-gray-600">Schedule a visit for AMC contract</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Auto Schedule Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Auto Schedule</h3>
              <p className="text-xs text-gray-600">Automatically schedule all visits for the contract</p>
            </div>
            <button
              type="button"
              onClick={handleAutoSchedule}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                visitData.autoSchedule ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  visitData.autoSchedule ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {renderAutoSchedulePreview()}

          {/* Manual Schedule Fields */}
          {!visitData.autoSchedule && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={visitData.scheduledDate}
                    onChange={(e) => setVisitData({ ...visitData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Type *
                  </label>
                  <select
                    required
                    value={visitData.visitType}
                    onChange={(e) => setVisitData({ ...visitData, visitType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="routine">Routine Maintenance</option>
                    <option value="emergency">Emergency Service</option>
                    <option value="followup">Follow-up Visit</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To *
                  </label>
                  <select
                    required
                    value={visitData.assignedTo}
                    onChange={(e) => setVisitData({ ...visitData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? 'Loading technicians...' : 'Select Technician'}
                    </option>
                    {!loading && Array.isArray(users) && users.length > 0 && users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                    {!loading && Array.isArray(users) && users.length === 0 && (
                      <option value="" disabled>No technicians available</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Duration (hours) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="24"
                    value={visitData.estimatedDuration}
                    onChange={(e) => setVisitData({ ...visitData, estimatedDuration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={visitData.notes}
                  onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
                  rows={3}
                  placeholder="Enter visit notes, special instructions, or requirements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Schedule Type Selection */}
          {visitData.autoSchedule && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'automatic', label: 'Automatic', description: 'Evenly spaced visits' },
                  { value: 'optimized', label: 'Optimized', description: 'Smart scheduling based on usage' },
                  { value: 'manual', label: 'Manual', description: 'Custom schedule' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setVisitData({ ...visitData, scheduleType: type.value as any })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      visitData.scheduleType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Visit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitScheduler; 