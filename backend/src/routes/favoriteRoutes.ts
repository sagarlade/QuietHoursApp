import { Router } from 'express';
import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorite,
  addReview,
} from '../controllers/favoriteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/', authenticateToken, addFavorite);
router.delete('/:placeId', authenticateToken, removeFavorite);
router.get('/', authenticateToken, getUserFavorites);
router.get('/:placeId/check', authenticateToken, isFavorite);

// Reviews
router.post('/review', authenticateToken, addReview);

export default router;
