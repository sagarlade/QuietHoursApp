import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import sql from 'mssql';

export const signup = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const pool = getPool();

    // Check if user exists
    const existingUser = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool
      .request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || null)
      .input('password', sql.NVarChar, hashedPassword)
      .query(
        `INSERT INTO users (firstName, lastName, email, phone, password)
         OUTPUT INSERTED.id
         VALUES (@firstName, @lastName, @email, @phone, @password)`
      );

    const userId = result.recordset[0].id;
    const token = generateToken(userId);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        firstName,
        lastName,
        email,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Signup failed', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const pool = getPool();

    // Find user
    const user = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    if (user.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userData = user.recordset[0];

    // Compare password
    const isValidPassword = await comparePassword(password, userData.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(userData.id);

    res.json({
      message: 'Login successful',
      user: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        profileImage: userData.profileImage,
        bio: userData.bio,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const pool = getPool();
    const user = await pool
      .request()
      .input('id', sql.UniqueIdentifier, userId)
      .query('SELECT * FROM users WHERE id = @id');

    if (user.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.recordset[0];

    res.json({
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      profileImage: userData.profileImage,
      bio: userData.bio,
      createdAt: userData.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, phone, bio, profileImage } = req.body;

    const pool = getPool();

    await pool
      .request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('firstName', sql.NVarChar, firstName || null)
      .input('lastName', sql.NVarChar, lastName || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('bio', sql.NVarChar, bio || null)
      .input('profileImage', sql.NVarChar, profileImage || null)
      .query(
        `UPDATE users
         SET firstName = COALESCE(@firstName, firstName),
             lastName = COALESCE(@lastName, lastName),
             phone = COALESCE(@phone, phone),
             bio = COALESCE(@bio, bio),
             profileImage = COALESCE(@profileImage, profileImage),
             updatedAt = GETUTCDATE()
         WHERE id = @id`
      );

    const user = await pool
      .request()
      .input('id', sql.UniqueIdentifier, userId)
      .query('SELECT * FROM users WHERE id = @id');

    const userData = user.recordset[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        profileImage: userData.profileImage,
        bio: userData.bio,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error });
  }
};
