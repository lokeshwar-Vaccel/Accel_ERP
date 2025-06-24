import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createAMCSchema,
  updateAMCSchema,
  amcQuerySchema,
  scheduleVisitSchema,
  completeVisitSchema,
  renewAMCSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getAMCContracts as getAMCs,
  getAMCContract as getAMC,
  createAMCContract as createAMC,
  updateAMCContract as updateAMC,
  scheduleAMCVisit as scheduleVisit,
  completeAMCVisit as completeVisit,
  renewAMCContract as renewAMC,
  getExpiringContracts,
  getAMCStats
} from '../controllers/amcController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for AMC management
router.use(checkModuleAccess('amc_management'));

// Placeholder for delete function
const deleteAMC = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Delete AMC endpoint',
    data: { id: req.params.id }
  });
};

// AMC routes
router.route('/')
  .get(validate(amcQuerySchema, 'query'), checkPermission('read'), getAMCs)
  .post(validate(createAMCSchema), checkPermission('write'), createAMC);

router.route('/:id')
  .get(checkPermission('read'), getAMC)
  .put(validate(updateAMCSchema), checkPermission('write'), updateAMC)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteAMC);

// AMC actions
router.post('/:id/schedule-visit', validate(scheduleVisitSchema), checkPermission('write'), scheduleVisit);
router.post('/visits/:visitId/complete', validate(completeVisitSchema), checkPermission('write'), completeVisit);
router.post('/:id/renew', validate(renewAMCSchema), checkPermission('write'), renewAMC);

// Special queries
router.get('/expiring/contracts', checkPermission('read'), getExpiringContracts);
router.get('/stats/overview', checkPermission('read'), getAMCStats);

export default router; 