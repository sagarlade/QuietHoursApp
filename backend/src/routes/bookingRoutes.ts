import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingDetail,
  updateBooking,
  cancelBooking,
} from '../controllers/bookingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getUserBookings);
router.get('/:id', authenticateToken, getBookingDetail);
router.put('/:id', authenticateToken, updateBooking);
router.delete('/:id', authenticateToken, cancelBooking);

export default router;
