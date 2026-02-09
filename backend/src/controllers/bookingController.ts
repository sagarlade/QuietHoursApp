import { Request, Response } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { placeId, startTime, endTime, notes } = req.body;

    if (!placeId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const pool = getPool();

    // Get place details for pricing
    const place = await pool
      .request()
      .input('id', sql.UniqueIdentifier, placeId)
      .query('SELECT * FROM places WHERE id = @id');

    if (place.recordset.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    const placeData = place.recordset[0];
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const totalPrice = (placeData.hourlyRate || 0) * hours;

    // Check for booking conflicts
    const conflictCheck = await pool
      .request()
      .input('placeId', sql.UniqueIdentifier, placeId)
      .input('startTime', sql.DateTime, start)
      .input('endTime', sql.DateTime, end)
      .query(`
        SELECT id FROM bookings
        WHERE placeId = @placeId
        AND status IN ('pending', 'confirmed')
        AND (
          (startTime < @endTime AND endTime > @startTime)
        )
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ message: 'Place is already booked for this time period' });
    }

    // Create booking
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .input('startTime', sql.DateTime, start)
      .input('endTime', sql.DateTime, end)
      .input('totalPrice', sql.Decimal(10, 2), totalPrice)
      .input('notes', sql.NVarChar, notes || null)
      .query(
        `INSERT INTO bookings (userId, placeId, startTime, endTime, totalPrice, notes, status)
         OUTPUT INSERTED.*
         VALUES (@userId, @placeId, @startTime, @endTime, @totalPrice, @notes, 'pending')`
      );

    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.recordset[0],
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Failed to create booking', error });
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, skip = 0, limit = 20 } = req.query;

    const pool = getPool();

    let queryStr = `
      SELECT b.*, p.name as placeName, p.address, p.latitude, p.longitude, p.image
      FROM bookings b
      JOIN places p ON b.placeId = p.id
      WHERE b.userId = @userId
    `;

    let request = pool.request().input('userId', sql.UniqueIdentifier, userId);

    if (status) {
      queryStr += ' AND b.status = @status';
      request = request.input('status', sql.NVarChar, status as string);
    }

    queryStr += `
      ORDER BY b.startTime DESC
      OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY
    `;

    request = request
      .input('skip', sql.Int, parseInt(skip as string))
      .input('limit', sql.Int, parseInt(limit as string));

    const result = await request.query(queryStr);

    res.json({
      message: 'Bookings retrieved successfully',
      bookings: result.recordset,
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Failed to get bookings', error });
  }
};

export const getBookingDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const pool = getPool();

    const booking = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT b.*, p.name as placeName, p.address, p.latitude, p.longitude, p.image, p.amenities
        FROM bookings b
        JOIN places p ON b.placeId = p.id
        WHERE b.id = @id AND b.userId = @userId
      `);

    if (booking.recordset.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      message: 'Booking details retrieved successfully',
      booking: booking.recordset[0],
    });
  } catch (error) {
    console.error('Get booking detail error:', error);
    res.status(500).json({ message: 'Failed to get booking details', error });
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pool = getPool();

    // Verify booking belongs to user
    const booking = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT userId FROM bookings WHERE id = @id');

    if (booking.recordset.length === 0 || booking.recordset[0].userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .input('notes', sql.NVarChar, notes || null)
      .query(
        `UPDATE bookings
         SET status = @status,
             notes = COALESCE(@notes, notes),
             updatedAt = GETUTCDATE()
         WHERE id = @id
         SELECT * FROM bookings WHERE id = @id`
      );

    res.json({
      message: 'Booking updated successfully',
      booking: result.recordset[0],
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Failed to update booking', error });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const pool = getPool();

    // Verify booking belongs to user
    const booking = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT userId, status FROM bookings WHERE id = @id');

    if (booking.recordset.length === 0 || booking.recordset[0].userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.recordset[0].status === 'completed' || booking.recordset[0].status === 'cancelled') {
      return res.status(400).json({ message: `Cannot cancel a ${booking.recordset[0].status} booking` });
    }

    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query(
        `UPDATE bookings
         SET status = 'cancelled', updatedAt = GETUTCDATE()
         WHERE id = @id
         SELECT * FROM bookings WHERE id = @id`
      );

    res.json({
      message: 'Booking cancelled successfully',
      booking: result.recordset[0],
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Failed to cancel booking', error });
  }
};
