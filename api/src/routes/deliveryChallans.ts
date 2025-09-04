import express from 'express';
import {
  getDeliveryChallans,
  getDeliveryChallan,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  getDeliveryChallanStats,
  updateDeliveryChallanStatus,
  generateDeliveryChallanPDFEndpoint
} from '../controllers/deliveryChallanController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes
router.route('/')
  .get(getDeliveryChallans)
  .post(createDeliveryChallan);



router.route('/stats')
  .get(getDeliveryChallanStats);

router.route('/:id')
  .get(getDeliveryChallan)
  .put(updateDeliveryChallan)
  .delete(deleteDeliveryChallan);

router.route('/:id/status')
  .patch(updateDeliveryChallanStatus);

router.route('/:id/pdf')
  .get(generateDeliveryChallanPDFEndpoint);

export default router; 