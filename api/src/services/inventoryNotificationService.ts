import { Stock } from '../models/Stock';
import { Product } from '../models/Product';
import { notificationService } from './notificationService';
import mongoose from 'mongoose';

export interface LowStockItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  partNo: string;
  currentStock: number;
  minStockLevel: number;
  location: string;
  room?: string;
  rack?: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface OutOfStockItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  partNo: string;
  location: string;
  room?: string;
  rack?: string;
}

export interface OverStockItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  partNo: string;
  currentStock: number;
  maxStockLevel: number;
  location: string;
  room?: string;
  rack?: string;
  severity: 'warning' | 'info';
}

export class InventoryNotificationService {
  private static instance: InventoryNotificationService;

  private constructor() {}

  public static getInstance(): InventoryNotificationService {
    if (!InventoryNotificationService.instance) {
      InventoryNotificationService.instance = new InventoryNotificationService();
    }
    return InventoryNotificationService.instance;
  }

  /**
   * Check for low stock items across all locations
   */
  async checkLowStockItems(): Promise<LowStockItem[]> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ['$productInfo.minStockLevel', 0] }, // Only check products with min stock level set
                { $lte: ['$availableQuantity', '$productInfo.minStockLevel'] }, // Available quantity is below min level
                { $gt: ['$availableQuantity', 0] } // Still has some stock (not completely out)
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'stocklocations',
            localField: 'location',
            foreignField: '_id',
            as: 'locationInfo'
          }
        },
        { $unwind: '$locationInfo' },
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomInfo'
          }
        },
        {
          $lookup: {
            from: 'racks',
            localField: 'rack',
            foreignField: '_id',
            as: 'rackInfo'
          }
        },
        {
          $project: {
            productId: '$product',
            productName: '$productInfo.name',
            partNo: '$productInfo.partNo',
            currentStock: '$availableQuantity',
            minStockLevel: '$productInfo.minStockLevel',
            location: '$locationInfo.name',
            room: { $arrayElemAt: ['$roomInfo.name', 0] },
            rack: { $arrayElemAt: ['$rackInfo.name', 0] }
          }
        }
      ];

      const lowStockItems = await Stock.aggregate(pipeline);
      
      // Add severity calculation
      return lowStockItems.map(item => ({
        ...item,
        severity: this.calculateSeverity(item.currentStock, item.minStockLevel)
      }));
    } catch (error) {
      console.error('Error checking low stock items:', error);
      throw error;
    }
  }

  /**
   * Check for completely out of stock items
   */
  async checkOutOfStockItems(): Promise<OutOfStockItem[]> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $match: {
            $expr: {
              $lte: ['$availableQuantity', 0] // Available quantity is 0 or negative
            }
          }
        },
        {
          $lookup: {
            from: 'stocklocations',
            localField: 'location',
            foreignField: '_id',
            as: 'locationInfo'
          }
        },
        { $unwind: '$locationInfo' },
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomInfo'
          }
        },
        {
          $lookup: {
            from: 'racks',
            localField: 'rack',
            foreignField: '_id',
            as: 'rackInfo'
          }
        },
        {
          $project: {
            productId: '$product',
            productName: '$productInfo.name',
            partNo: '$productInfo.partNo',
            location: '$locationInfo.name',
            room: { $arrayElemAt: ['$roomInfo.name', 0] },
            rack: { $arrayElemAt: ['$rackInfo.name', 0] }
          }
        }
      ];

      const outOfStockItems = await Stock.aggregate(pipeline);
      return outOfStockItems;
    } catch (error) {
      console.error('Error checking out of stock items:', error);
      throw error;
    }
  }

  /**
   * Check for overstock items (exceeding maximum stock level)
   */
  async checkOverStockItems(): Promise<OverStockItem[]> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ['$productInfo.maxStockLevel', 0] }, // Only check products with max stock level set
                { $gte: ['$availableQuantity', '$productInfo.maxStockLevel'] }, // Available quantity exceeds max level
                { $gt: ['$availableQuantity', 0] } // Still has stock
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'stocklocations',
            localField: 'location',
            foreignField: '_id',
            as: 'locationInfo'
          }
        },
        { $unwind: '$locationInfo' },
        {
          $lookup: {
            from: 'rooms',
            localField: 'room',
            foreignField: '_id',
            as: 'roomInfo'
          }
        },
        {
          $lookup: {
            from: 'racks',
            localField: 'rack',
            foreignField: '_id',
            as: 'rackInfo'
          }
        },
        {
          $project: {
            productId: '$product',
            productName: '$productInfo.name',
            partNo: '$productInfo.partNo',
            currentStock: '$availableQuantity',
            maxStockLevel: '$productInfo.maxStockLevel',
            location: '$locationInfo.name',
            room: { $arrayElemAt: ['$roomInfo.name', 0] },
            rack: { $arrayElemAt: ['$rackInfo.name', 0] }
          }
        }
      ];

      const overStockItems = await Stock.aggregate(pipeline);
      
      // Add severity calculation
      return overStockItems.map(item => ({
        ...item,
        severity: this.calculateOverStockSeverity(item.currentStock, item.maxStockLevel)
      }));
    } catch (error) {
      console.error('Error checking overstock items:', error);
      throw error;
    }
  }

  /**
   * Create low stock notifications for all relevant users
   */
  async createLowStockNotifications(): Promise<number> {
    try {
      const lowStockItems = await this.checkLowStockItems();
      const outOfStockItems = await this.checkOutOfStockItems();
      const overStockItems = await this.checkOverStockItems();
      
      if (lowStockItems.length === 0 && outOfStockItems.length === 0 && overStockItems.length === 0) {
        return 0; // No notifications needed
      }

      let totalNotifications = 0;

      // Create notifications for low stock items using the new method
      for (const item of lowStockItems) {
        await notificationService.createInventoryNotification(
          'low_stock',
          item.productId.toString(),
          item.productName,
          item.partNo,
          item.currentStock,
          item.minStockLevel,
          item.location,
          item.room,
          item.rack
        );
        totalNotifications++;
      }

      // Create notifications for out of stock items
      for (const item of outOfStockItems) {
        await notificationService.createInventoryNotification(
          'out_of_stock',
          item.productId.toString(),
          item.productName,
          item.partNo,
          0,
          0,
          item.location,
          item.room,
          item.rack
        );
        totalNotifications++;
      }

      // Create notifications for overstock items
      for (const item of overStockItems) {
        await notificationService.createInventoryNotification(
          'over_stock',
          item.productId.toString(),
          item.productName,
          item.partNo,
          item.currentStock,
          item.maxStockLevel,
          item.location,
          item.room,
          item.rack
        );
        totalNotifications++;
      }

      console.log(`✅ Created ${totalNotifications} real-time inventory notifications (Low: ${lowStockItems.length}, Out: ${outOfStockItems.length}, Over: ${overStockItems.length})`);
      return totalNotifications;
    } catch (error) {
      console.error('Error creating low stock notifications:', error);
      throw error;
    }
  }

  /**
   * Calculate severity level based on current stock vs minimum stock level
   */
  private calculateSeverity(currentStock: number, minStockLevel: number): 'critical' | 'warning' | 'info' {
    if (currentStock === 0) return 'critical';
    
    const percentage = (currentStock / minStockLevel) * 100;
    
    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'warning';
    return 'info';
  }

  /**
   * Calculate severity level for overstock items
   */
  private calculateOverStockSeverity(currentStock: number, maxStockLevel: number): 'warning' | 'info' {
    if (maxStockLevel === 0) return 'info';
    
    const percentage = (currentStock / maxStockLevel) * 100;
    
    if (percentage >= 200) return 'warning'; // 2x or more than max level
    return 'info'; // Between 100% and 200% of max level
  }

  /**
   * Check if notifications are needed (to avoid duplicate notifications)
   */
  async shouldCreateNotifications(): Promise<boolean> {
    try {
      // Check if we already sent notifications in the last 1 hour (for real-time updates)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { Notification } = await import('../models/Notification');
      const recentNotifications = await Notification.countDocuments({
        type: { $in: ['low_stock', 'out_of_stock'] },
        category: 'inventory',
        createdAt: { $gte: oneHourAgo }
      });

      // Only create new notifications if there are none in the last 1 hour
      return recentNotifications === 0;
    } catch (error) {
      console.error('Error checking if notifications should be created:', error);
      return true; // Default to creating notifications if check fails
    }
  }

  /**
   * Get low stock summary for dashboard
   */
  async getLowStockSummary(): Promise<{
    lowStockCount: number;
    outOfStockCount: number;
    overStockCount: number;
    criticalItems: number;
    warningItems: number;
  }> {
    try {
      const lowStockItems = await this.checkLowStockItems();
      const outOfStockItems = await this.checkOutOfStockItems();
      const overStockItems = await this.checkOverStockItems();

      let criticalItems = 0;
      let warningItems = 0;

      for (const item of lowStockItems) {
        if (item.severity === 'critical') criticalItems++;
        else if (item.severity === 'warning') warningItems++;
      }

      return {
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        overStockCount: overStockItems.length,
        criticalItems,
        warningItems
      };
    } catch (error) {
      console.error('Error getting low stock summary:', error);
      throw error;
    }
  }

  /**
   * Create a single low stock notification for a specific product
   */
  async createProductLowStockNotification(productId: string, currentStock: number, minStockLevel: number): Promise<void> {
    try {
      const { Product } = await import('../models/Product');
      const product = await Product.findById(productId);
      
      if (!product || !product.partNo) {
        console.log('Product not found or missing part number for notification');
        return;
      }

      // Get stock location info with proper population
      const stock = await Stock.findOne({ product: productId })
        .populate('location', 'name')
        .populate('room', 'name')
        .populate('rack', 'name');
      
      const location = (stock?.location as any)?.name || 'Unknown';
      const room = (stock?.room as any)?.name;
      const rack = (stock?.rack as any)?.name;

      await notificationService.createInventoryNotification(
        'low_stock',
        productId,
        product.name,
        product.partNo,
        currentStock,
        minStockLevel,
        location,
        room,
        rack
      );

      console.log(`✅ Created real-time low stock notification for product: ${product.name}`);
    } catch (error) {
      console.error('Error creating product low stock notification:', error);
      throw error;
    }
  }

  /**
   * Create a single overstock notification for a specific product
   */
  async createProductOverStockNotification(productId: string, currentStock: number, maxStockLevel: number): Promise<void> {
    try {
      const { Product } = await import('../models/Product');
      const product = await Product.findById(productId);
      
      if (!product || !product.partNo) {
        console.log('Product not found or missing part number for notification');
        return;
      }

      // Get stock location info with proper population
      const stock = await Stock.findOne({ product: productId })
        .populate('location', 'name')
        .populate('room', 'name')
        .populate('rack', 'name');
      
      const location = (stock?.location as any)?.name || 'Unknown';
      const room = (stock?.room as any)?.name;
      const rack = (stock?.rack as any)?.name;

      await notificationService.createInventoryNotification(
        'over_stock',
        productId,
        product.name,
        product.partNo,
        currentStock,
        maxStockLevel,
        location,
        room,
        rack
      );

      console.log(`✅ Created real-time overstock notification for product: ${product.name}`);
    } catch (error) {
      console.error('Error creating product overstock notification:', error);
      throw error;
    }
  }
}

export const inventoryNotificationService = InventoryNotificationService.getInstance();
export default inventoryNotificationService; 