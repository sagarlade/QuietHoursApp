import { getPool } from "../config/database";

export const initializeDatabase = async () => {
  try {
    const pool = getPool();

    // Create Users Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        firstName NVARCHAR(100) NOT NULL,
        lastName NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        phone NVARCHAR(20),
        password NVARCHAR(MAX) NOT NULL,
        profileImage NVARCHAR(MAX),
        bio NVARCHAR(500),
        createdAt DATETIME DEFAULT GETUTCDATE(),
        updatedAt DATETIME DEFAULT GETUTCDATE()
      )
    `);

    // Create Places Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='places' AND xtype='U')
      CREATE TABLE places (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        address NVARCHAR(MAX) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        placeType NVARCHAR(50),
        amenities NVARCHAR(MAX),
        rating FLOAT DEFAULT 0,
        image NVARCHAR(MAX),
        hourlyRate DECIMAL(10, 2),
        googlePlaceId NVARCHAR(255),
        createdAt DATETIME DEFAULT GETUTCDATE(),
        updatedAt DATETIME DEFAULT GETUTCDATE()
      )
    `);

    // Create Bookings Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bookings' AND xtype='U')
      CREATE TABLE bookings (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        userId UNIQUEIDENTIFIER NOT NULL,
        placeId UNIQUEIDENTIFIER NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME NOT NULL,
        status NVARCHAR(50) DEFAULT 'pending',
        totalPrice DECIMAL(10, 2),
        notes NVARCHAR(MAX),
        createdAt DATETIME DEFAULT GETUTCDATE(),
        updatedAt DATETIME DEFAULT GETUTCDATE(),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
      )
    `);

    // Create Favorites Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='favorites' AND xtype='U')
      CREATE TABLE favorites (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        userId UNIQUEIDENTIFIER NOT NULL,
        placeId UNIQUEIDENTIFIER NOT NULL,
        createdAt DATETIME DEFAULT GETUTCDATE(),
        UNIQUE(userId, placeId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
      )
    `);

    // Create Reviews Table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='reviews' AND xtype='U')
      CREATE TABLE reviews (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        userId UNIQUEIDENTIFIER NOT NULL,
        placeId UNIQUEIDENTIFIER NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment NVARCHAR(MAX),
        createdAt DATETIME DEFAULT GETUTCDATE(),
        updatedAt DATETIME DEFAULT GETUTCDATE(),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (placeId) REFERENCES places(id) ON DELETE CASCADE
      )
    `);

    console.log("✓ Database schema initialized successfully");
  } catch (error) {
    console.error("✗ Database schema initialization failed:", error);
    throw error;
  }
};

export const seedDatabase = async () => {
  try {
    const pool = getPool();

    // Check if places already exist
    const result = await pool.request().query("SELECT COUNT(*) as count FROM places");

    if (result.recordset[0].count === 0) {
      // Seed sample places
      await pool.request().query(`
        INSERT INTO places (name, description, address, latitude, longitude, placeType, amenities, hourlyRate, image)
        VALUES 
        ('Quiet Cafe Downtown', 'A peaceful cafe with free WiFi', '123 Main St, City', 40.7128, -74.0060, 'Cafe', 'WiFi,Power Outlets,Quiet Zone', 5.00, 'https://picsum.photos/seed/quiet-1/800/600'),
        ('Library Study Zone', 'Modern library with study areas', '456 Oak Ave, City', 40.7200, -73.9800, 'Library', 'Quiet,Study Tables,WiFi', 0.00, 'https://picsum.photos/seed/quiet-2/800/600'),
        ('Coworking Space', 'Professional coworking environment', '789 Business Blvd, City', 40.7300, -73.9700, 'Coworking', 'WiFi,Meeting Rooms,Parking', 15.00, 'https://picsum.photos/seed/quiet-3/800/600'),
        ('Park Pavilion', 'Peaceful outdoor pavilion', '321 Green Lane, City', 40.7400, -73.9600, 'Park', 'Outdoor,Benches,Shade', 0.00, 'https://picsum.photos/seed/quiet-4/800/600'),
        ('Wellness Center', 'Meditation and wellness space', '654 Peace St, City', 40.7500, -73.9500, 'Wellness', 'Meditation,Yoga,Quiet', 10.00, 'https://picsum.photos/seed/quiet-5/800/600')
      `);
      console.log("Database seeded with sample places");
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
};

export const seedDatabase80 = async () => {
  try {
    const pool = getPool();

    const result = await pool.request().query("SELECT COUNT(*) as count FROM places");
    const existingCount = result.recordset[0].count || 0;
    const targetCount = 80;

    if (existingCount < targetCount) {
      const toCreate = targetCount - existingCount;
      const baseLat = 40.7128;
      const baseLon = -74.0060;

      for (let i = 0; i < toCreate; i++) {
        const index = existingCount + i + 1;
        const lat = baseLat + (Math.random() - 0.5) * 0.2;
        const lon = baseLon + (Math.random() - 0.5) * 0.2;
        const hourlyRate = (index % 5) * 3;

        await pool.request().query(`
          INSERT INTO places (name, description, address, latitude, longitude, placeType, amenities, hourlyRate, image)
          VALUES (
            'Quiet Place ${index}',
            'Calm and comfortable place number ${index}',
            '${index} Main St, City',
            ${lat},
            ${lon},
            'Cafe',
            'WiFi,Quiet,Power Outlets',
            ${hourlyRate},
            'https://picsum.photos/seed/quiet-${index}/800/600'
          )
        `);
      }

      console.log(`Database seeded with ${toCreate} places (total ${targetCount})`);
    }

    // Ensure all places have real images (replace placeholder images)
    await pool.request().query(`
      ;WITH cte AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY createdAt) AS rn
        FROM places
      )
      UPDATE p
      SET image = CONCAT('https://picsum.photos/seed/quiet-', cte.rn, '/800/600')
      FROM places p
      INNER JOIN cte ON p.id = cte.id
      WHERE p.image IS NULL OR p.image LIKE 'https://via.placeholder.com/%'
    `);
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
};
