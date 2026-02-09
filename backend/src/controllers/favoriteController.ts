import { Request, Response } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';

export const addFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { placeId } = req.body;

    if (!placeId) {
      return res.status(400).json({ message: 'Place ID is required' });
    }

    const pool = getPool();

    // Check if place exists
    const place = await pool
      .request()
      .input('id', sql.UniqueIdentifier, placeId)
      .query('SELECT id FROM places WHERE id = @id');

    if (place.recordset.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Check if already favorited
    const existing = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .query('SELECT id FROM favorites WHERE userId = @userId AND placeId = @placeId');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: 'Already added to favorites' });
    }

    // Add favorite
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .query(
        `INSERT INTO favorites (userId, placeId)
         OUTPUT INSERTED.*
         VALUES (@userId, @placeId)`
      );

    res.status(201).json({
      message: 'Added to favorites',
      favorite: result.recordset[0],
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Failed to add favorite', error });
  }
};

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { placeId } = req.params;

    const pool = getPool();

    const favorite = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .query('SELECT id FROM favorites WHERE userId = @userId AND placeId = @placeId');

    if (favorite.recordset.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .query('DELETE FROM favorites WHERE userId = @userId AND placeId = @placeId');

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Failed to remove favorite', error });
  }
};

export const getUserFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { skip = 0, limit = 20 } = req.query;

    const pool = getPool();

    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('skip', sql.Int, parseInt(skip as string))
      .input('limit', sql.Int, parseInt(limit as string))
      .query(`
        SELECT p.* FROM places p
        JOIN favorites f ON p.id = f.placeId
        WHERE f.userId = @userId
        ORDER BY f.createdAt DESC
        OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({
      message: 'Favorites retrieved successfully',
      places: result.recordset,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Failed to get favorites', error });
  }
};

export const isFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { placeId } = req.params;

    const pool = getPool();

    const favorite = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .query('SELECT id FROM favorites WHERE userId = @userId AND placeId = @placeId');

    res.json({
      isFavorite: favorite.recordset.length > 0,
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'Failed to check favorite', error });
  }
};

export const addReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { placeId, rating, comment } = req.body;

    if (!placeId || !rating) {
      return res.status(400).json({ message: 'Place ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const pool = getPool();

    // Check if place exists
    const place = await pool
      .request()
      .input('id', sql.UniqueIdentifier, placeId)
      .query('SELECT id FROM places WHERE id = @id');

    if (place.recordset.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Create review
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('placeId', sql.UniqueIdentifier, placeId)
      .input('rating', sql.Int, rating)
      .input('comment', sql.NVarChar, comment || null)
      .query(
        `INSERT INTO reviews (userId, placeId, rating, comment)
         OUTPUT INSERTED.*
         VALUES (@userId, @placeId, @rating, @comment)`
      );

    res.status(201).json({
      message: 'Review added successfully',
      review: result.recordset[0],
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Failed to add review', error });
  }
};
