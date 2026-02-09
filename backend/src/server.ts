import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database';
import { initializeDatabase, seedDatabase, seedDatabase80 } from './models/database';
import { errorHandler } from './middleware/auth';

// Import routes
import authRoutes from './routes/authRoutes';
import placesRoutes from './routes/placesRoutes';
import bookingRoutes from './routes/bookingRoutes';
import favoriteRoutes from './routes/favoriteRoutes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoriteRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize and start server
const startServer = async () => {
  try {
    // Try to connect to database, but do not exit if it fails.
    try {
      await connectDB();
      // Initialize database schema
      await initializeDatabase();
      // Seed database with sample data
      await seedDatabase();
      // Ensure at least 80 places with images
      await seedDatabase80();
    } catch (dbErr) {
      console.warn('\n! Warning: Database unavailable. Starting server in limited mode.');
      console.warn('  - Ensure SQL Server is running and env vars in backend/.env are correct.');
      console.warn('  - To run SQL Server locally you can use Docker:');
      console.warn('    docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123" -p 1433:1433 mcr.microsoft.com/mssql/server:2019-latest');
      console.warn('\n  Continuing to start API server without DB connection. Some endpoints will return errors until DB is available.');
    }

    // Start server regardless of DB connection success
    app.listen(Number(PORT), '0.0.0.0',() => {
      console.log(`\n✓ Server is running on http://localhost:${PORT}`);
      console.log(`✓ API Documentation: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});

startServer();

export default app;
