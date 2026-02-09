import { Router } from 'express';
import {
  getNearbyPlaces,
  searchPlacesFromGoogle,
  getAllPlaces,
  getPlaceDetail,
  addPlace,
} from '../controllers/placesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/nearby', getNearbyPlaces);
router.get('/', getAllPlaces);
router.get('/:id', getPlaceDetail);
router.post('/search', searchPlacesFromGoogle);

// Protected routes
router.post('/', authenticateToken, addPlace);

export default router;
