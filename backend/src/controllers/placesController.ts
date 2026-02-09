import { Request, Response } from 'express';
import { getPool } from '../config/database';
import sql from 'mssql';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export const getNearbyPlaces = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 5000, type = 'Cafe' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const pool = getPool();

    // Get places from database within radius
    const query = `
      SELECT TOP 20 * FROM places
      WHERE (6371000 * ACOS(COS(RADIANS(@lat)) * COS(RADIANS(latitude)) * 
             COS(RADIANS(longitude) - RADIANS(@long)) + 
             SIN(RADIANS(@lat)) * SIN(RADIANS(latitude)))) <= @radius
      ORDER BY (6371000 * ACOS(COS(RADIANS(@lat)) * COS(RADIANS(latitude)) * 
             COS(RADIANS(longitude) - RADIANS(@long)) + 
             SIN(RADIANS(@lat)) * SIN(RADIANS(latitude)))) ASC
    `;

    let request = pool.request()
      .input('lat', sql.Float, parseFloat(latitude as string))
      .input('long', sql.Float, parseFloat(longitude as string))
      .input('radius', sql.Int, parseInt(radius as string));

    if (type) {
      request = request.input('type', sql.NVarChar, type as string);
    }

    const result = await request.query(query);

    res.json({
      message: 'Places retrieved successfully',
      places: result.recordset,
    });
  } catch (error) {
    console.error('Get nearby places error:', error);
    res.status(500).json({ message: 'Failed to get nearby places', error });
  }
};

export const searchPlacesFromGoogle = async (req: Request, res: Response) => {
  try {
    const { query, latitude, longitude, radius = 5000 } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const pool = getPool();
    const searchQuery = `%${String(query).trim()}%`;

    // Use Photon (OpenStreetMap) for free search
    const photonParams = new URLSearchParams({
      q: String(query).trim(),
      limit: '20',
    });

    if (latitude && longitude) {
      photonParams.set('lat', String(latitude));
      photonParams.set('lon', String(longitude));
    }

    const photonUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;
    const response = await axios.get(photonUrl);

    if (!response.data?.features || response.data.features.length === 0) {
      const dbFallback = await pool
        .request()
        .input('q', sql.NVarChar, searchQuery)
        .query(`
          SELECT TOP 20 * FROM places
          WHERE name LIKE @q OR address LIKE @q OR amenities LIKE @q OR placeType LIKE @q
          ORDER BY createdAt DESC
        `);

      return res.status(200).json({
        message: 'Photon returned no results; using local database search',
        places: dbFallback.recordset,
      });
    }

    const places = response.data.features.map((feature: any) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [0, 0];
      const lon = coords[0];
      const lat = coords[1];

      const addressParts = [
        props.street,
        props.housenumber,
        props.city,
        props.state,
        props.country,
      ].filter(Boolean);

      return {
        id: props.osm_id ? String(props.osm_id) : undefined,
        name: props.name || props.street || 'Place',
        address: addressParts.join(', '),
        latitude: lat,
        longitude: lon,
        placeType: props.type || props.osm_key || 'Place',
        amenities: props.osm_value || null,
        rating: 0,
        image: 'https://via.placeholder.com/300',
        googlePlaceId: null,
      };
    });

    res.json({
      message: 'Photon search successful',
      places,
    });
  } catch (error) {
    console.error('Google Places search error:', error);
    res.status(500).json({ message: 'Failed to search Google Places', error });
  }
};

export const getAllPlaces = async (req: Request, res: Response) => {
  try {
    const { skip = 0, limit = 20, type } = req.query;

    const pool = getPool();

    let queryStr = 'SELECT * FROM places';
    let request = pool.request()
      .input('skip', sql.Int, parseInt(skip as string))
      .input('limit', sql.Int, parseInt(limit as string));

    if (type) {
      queryStr += ' WHERE placeType = @type';
      request = request.input('type', sql.NVarChar, type as string);
    }

    queryStr += ' ORDER BY createdAt DESC OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY';

    const result = await request.query(queryStr);

    res.json({
      message: 'Places retrieved successfully',
      places: result.recordset,
    });
  } catch (error) {
    console.error('Get all places error:', error);
    res.status(500).json({ message: 'Failed to get places', error });
  }
};

export const getPlaceDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pool = getPool();

    const place = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM places WHERE id = @id');

    if (place.recordset.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Get reviews for this place
    const reviews = await pool
      .request()
      .input('placeId', sql.UniqueIdentifier, id)
      .query(`
        SELECT r.*, u.firstName, u.lastName
        FROM reviews r
        JOIN users u ON r.userId = u.id
        WHERE r.placeId = @placeId
        ORDER BY r.createdAt DESC
      `);

    res.json({
      message: 'Place details retrieved successfully',
      place: place.recordset[0],
      reviews: reviews.recordset,
    });
  } catch (error) {
    console.error('Get place detail error:', error);
    res.status(500).json({ message: 'Failed to get place details', error });
  }
};

export const addPlace = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      placeType,
      amenities,
      hourlyRate,
      image,
      googlePlaceId,
    } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const pool = getPool();

    if (googlePlaceId) {
      const existingByExternalId = await pool
        .request()
        .input('googlePlaceId', sql.NVarChar, googlePlaceId)
        .query('SELECT TOP 1 * FROM places WHERE googlePlaceId = @googlePlaceId');

      if (existingByExternalId.recordset.length > 0) {
        return res.status(200).json({
          message: 'Place already exists',
          place: existingByExternalId.recordset[0],
        });
      }
    }

    const existingByNameAddress = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('address', sql.NVarChar, address)
      .query('SELECT TOP 1 * FROM places WHERE name = @name AND address = @address');

    if (existingByNameAddress.recordset.length > 0) {
      return res.status(200).json({
        message: 'Place already exists',
        place: existingByNameAddress.recordset[0],
      });
    }

    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('address', sql.NVarChar, address)
      .input('latitude', sql.Float, latitude)
      .input('longitude', sql.Float, longitude)
      .input('placeType', sql.NVarChar, placeType || null)
      .input('amenities', sql.NVarChar, amenities || null)
      .input('hourlyRate', sql.Decimal(10, 2), hourlyRate || null)
      .input('image', sql.NVarChar, image || null)
      .input('googlePlaceId', sql.NVarChar, googlePlaceId || null)
      .query(
        `INSERT INTO places (name, description, address, latitude, longitude, placeType, amenities, hourlyRate, image, googlePlaceId)
         OUTPUT INSERTED.*
         VALUES (@name, @description, @address, @latitude, @longitude, @placeType, @amenities, @hourlyRate, @image, @googlePlaceId)`
      );

    res.status(201).json({
      message: 'Place added successfully',
      place: result.recordset[0],
    });
  } catch (error) {
    console.error('Add place error:', error);
    res.status(500).json({ message: 'Failed to add place', error });
  }
};
