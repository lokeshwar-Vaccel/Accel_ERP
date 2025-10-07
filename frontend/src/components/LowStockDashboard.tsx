import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Bell,
  TrendingDown,
  XCircle,
  CheckCircle,
  MapPin,
  Box
} from 'lucide-react';
import { Button } from './ui/Botton';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import apiClient from '../utils/api';
import { toast } from 'react-hot-toast';

interface LowStockItem {
  productId: string;
  productName: string;
  partNo: string;
  currentStock: number;
  minStockLevel: number;
  location: string;
  room?: string;
  rack?: string;
  severity: 'critical' | 'warning' | 'info';
}

interface OutOfStockItem {
  productId: string;
  productName: string;
  partNo: string;
  location: string;
  room?: string;
  rack?: string;
}

interface LowStockSummary {
  lowStockCount: number;
  outOfStockCount: number;
  criticalItems: number;
  warningItems: number;
}

const LowStockDashboard: React.FC = () => {
  const [summary, setSummary] = useState<LowStockSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<OutOfStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Fetch low stock summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await apiClient.notifications.getLowStockSummary();
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching low stock summary:', error);
      toast.error('Failed to fetch low stock summary');
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed low stock items
  const fetchLowStockItems = async () => {
    try {
      const response = await apiClient.notifications.getLowStockItems();
      setLowStockItems(response.data.lowStockItems);
      setOutOfStockItems(response.data.outOfStockItems);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      toast.error('Failed to fetch low stock items');
    }
  };

  // Trigger low stock notifications manually
  const triggerNotifications = async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.notifications.triggerLowStockNotifications();
      const notificationsCreated = response.data.notificationsCreated;
      
      if (notificationsCreated > 0) {
        toast.success(`Successfully sent ${notificationsCreated} low stock notifications`);
        // Refresh the data
        await fetchSummary();
        await fetchLowStockItems();
      } else {
        toast.success('No new notifications needed at this time');
      }
    } catch (error) {
      console.error('Error triggering notifications:', error);
      toast.error('Failed to trigger notifications');
    } finally {
      setRefreshing(false);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  // Calculate stock percentage
  const calculateStockPercentage = (current: number, min: number) => {
    if (min === 0) return 0;
    return Math.round((current / min) * 100);
  };

  // Countdown timer effect
  useEffect(() => {
    if (!nextRefresh) return;

    const countdownInterval = setInterval(() => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((nextRefresh.getTime() - now.getTime()) / 1000));
      setCountdown(timeLeft);
      
      if (timeLeft === 0) {
        // Trigger refresh when countdown reaches 0
        fetchSummary();
        fetchLowStockItems();
        
        // Set next refresh time
        const newNextRefreshTime = new Date(now.getTime() + 10 * 60 * 1000);
        setNextRefresh(newNextRefreshTime);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [nextRefresh]);

  useEffect(() => {
    fetchSummary();
    fetchLowStockItems();
    
    // Calculate next refresh time (every 10 minutes)
    const now = new Date();
    const nextRefreshTime = new Date(now.getTime() + 10 * 60 * 1000);
    setNextRefresh(nextRefreshTime);
    
    // Set up real-time refresh every 10 minutes to match cron schedule
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing inventory data...');
      fetchSummary();
      fetchLowStockItems();
      
      // Update next refresh time
      const newNow = new Date();
      const newNextRefreshTime = new Date(newNow.getTime() + 10 * 60 * 1000);
      setNextRefresh(newNextRefreshTime);
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading inventory status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Alerts</h2>
          <p className="text-gray-600">Monitor stock levels and receive notifications for low inventory</p>
          {nextRefresh && (
            <div className="flex items-center mt-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <span>
                Real-time updates every 10 minutes • Next refresh in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              fetchSummary();
              fetchLowStockItems();
            }}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={triggerNotifications}
            disabled={refreshing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Alerts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Critical Items</p>
                <p className="text-2xl font-bold text-red-600">{summary.criticalItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Warning Items</p>
                <p className="text-2xl font-bold text-orange-600">{summary.warningItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-blue-600">{summary.lowStockCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Box className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-600">{summary.outOfStockCount}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Toggle Details */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          className="w-full max-w-md"
        >
          {showDetails ? 'Hide Details' : 'Show Detailed View'}
        </Button>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className="space-y-6">
          {/* Low Stock Items */}
          {lowStockItems.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                Low Stock Items ({lowStockItems.length})
              </h3>
              <div className="space-y-3">
                {lowStockItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-orange-400"
                  >
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(item.severity)}
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">Part: {item.partNo}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {item.location}
                            {item.room && ` - ${item.room}`}
                            {item.rack && ` - ${item.rack}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getSeverityColor(item.severity)}>
                          {item.severity}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {calculateStockPercentage(item.currentStock, item.minStockLevel)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Stock: <span className="font-medium">{item.currentStock}</span> / {item.minStockLevel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Out of Stock Items */}
          {outOfStockItems.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                Out of Stock Items ({outOfStockItems.length})
              </h3>
              <div className="space-y-3">
                {outOfStockItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-400"
                  >
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">Part: {item.partNo}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {item.location}
                            {item.room && ` - ${item.room}`}
                            {item.rack && ` - ${item.rack}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        Out of Stock
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No Items Message */}
          {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Good!</h3>
              <p className="text-gray-600">
                No low stock or out of stock items found. Your inventory levels are healthy.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Information Panel */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Critical:</strong> Stock below 25% of minimum level</li>
              <li>• <strong>Warning:</strong> Stock below 50% of minimum level</li>
              <li>• <strong>Info:</strong> Stock below minimum level but above 50%</li>
              <li>• Notifications are automatically sent every 10 minutes for real-time updates</li>
              <li>• Use "Send Alerts" to manually trigger notifications</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LowStockDashboard; 