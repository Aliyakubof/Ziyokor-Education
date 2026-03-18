import { Router } from 'express';
import * as shopController from '../controllers/shopController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/items', shopController.getItems);
router.post('/purchase', requireRole('student'), shopController.purchaseItem);
router.get('/:id/purchases', shopController.getPurchases);

// Manager Shop Routes
router.get('/manager/items', requireRole('admin', 'manager'), shopController.getManagerShopItems);
router.post('/manager/items', requireRole('admin', 'manager'), shopController.createShopItem);
router.put('/manager/items/:id', requireRole('admin', 'manager'), shopController.updateShopItem);
router.delete('/manager/items/:id', requireRole('admin', 'manager'), shopController.deleteShopItem);

export default router;
