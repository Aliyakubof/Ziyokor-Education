import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('admin', 'manager'), settingsController.getAllSettings);
router.get('/:key', settingsController.getSettingByKey);
router.put('/:key', requireRole('admin', 'manager'), settingsController.updateSetting);

export default router;
