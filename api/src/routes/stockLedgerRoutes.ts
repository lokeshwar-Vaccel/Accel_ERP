import { Router } from 'express';
import { checkModuleAccess, checkPermission, protect } from '../middleware/auth';
import {
  getStockLedger,
} from '../controllers/stockLedgerController';

const router = Router();

router.use(protect);
router.use(checkModuleAccess('inventory_management'));

router.get('/', checkPermission('read'), getStockLedger);


export default router;
