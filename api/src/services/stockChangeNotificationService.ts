import { Product } from '../models/Product';
import { StockLocation, Room, Rack } from '../models/Stock';
import { notificationService } from './notificationService';

export interface StockChangeData {
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  locationId: string;
  roomId?: string;
  rackId?: string;
}

export class StockChangeNotificationService {
  private static instance: StockChangeNotificationService;

  private constructor() {}

  public static getInstance(): StockChangeNotificationService {
    if (!StockChangeNotificationService.instance) {
      StockChangeNotificationService.instance = new StockChangeNotificationService();
    }
    return StockChangeNotificationService.instance;
  }

  /**
   * Check if stock change requires notification and send it
   */
  async checkAndNotifyStockChange(changeData: StockChangeData): Promise<void> {
    try {
      // Get product details
      const product = await Product.findById(changeData.productId);
      if (!product) {
        console.log('Product not found for stock change notification');
        return;
      }

      // Get location details
      const location = await StockLocation.findById(changeData.locationId);
      const room = changeData.roomId ? await Room.findById(changeData.roomId) : null;
      const rack = changeData.rackId ? await Rack.findById(changeData.rackId) : null;

      const currentStock = changeData.newQuantity;
      const minStockLevel = product.minStockLevel || 0;
      const maxStockLevel = product.maxStockLevel || 0;

      // Determine notification type based on new stock level
      let notificationType: 'low_stock' | 'out_of_stock' | 'over_stock' | null = null;
      let threshold = 0;

      if (currentStock === 0 && minStockLevel > 0) {
        notificationType = 'out_of_stock';
        threshold = minStockLevel;
      } else if (currentStock > 0 && currentStock <= minStockLevel && minStockLevel > 0) {
        notificationType = 'low_stock';
        threshold = minStockLevel;
      } else if (maxStockLevel > 0 && currentStock > maxStockLevel) {
        notificationType = 'over_stock';
        threshold = maxStockLevel;
      }

      // If notification is needed, send it
      if (notificationType) {
        console.log(`🔔 Stock change triggered ${notificationType} notification for product: ${product.name}`);
        
        await notificationService.createInventoryNotification(
          notificationType,
          changeData.productId,
          product.name,
          product.partNo || 'N/A',
          currentStock,
          threshold,
          location?.name || 'Unknown',
          room?.name || undefined,
          rack?.name || undefined
        );

        console.log(`✅ Real-time ${notificationType} notification sent for ${product.name}`);
      }
    } catch (error) {
      // Don't let notification errors break the stock operation
      console.error('❌ Error in stock change notification service:', error);
    }
  }

  /**
   * Check if stock level change crosses notification thresholds
   */
  shouldNotifyStockChange(oldQuantity: number, newQuantity: number, minLevel: number, maxLevel: number): boolean {
    // Check if we crossed any thresholds
    const wasAboveMin = oldQuantity > minLevel;
    const isBelowMin = newQuantity <= minLevel;
    const wasBelowMax = oldQuantity <= maxLevel;
    const isAboveMax = newQuantity > maxLevel;
    const wasInStock = oldQuantity > 0;
    const isOutOfStock = newQuantity === 0;

    return (wasAboveMin && isBelowMin) || // Crossed low stock threshold
           (wasBelowMax && isAboveMax) || // Crossed max stock threshold
           (wasInStock && isOutOfStock);  // Crossed out of stock threshold
  }
}

export const stockChangeNotificationService = StockChangeNotificationService.getInstance();
export default stockChangeNotificationService; 