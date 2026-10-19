import mongoose from 'mongoose';

/**
 * Validates database environment variables.
 * Fails with a clear, safe startup error if required variables are missing.
 * Never logs connection strings or credentials.
 */
export function validateDatabaseEnv() {
  const mongoUrl = process.env.MONGODB_URL;
  const dbName = process.env.MONGO_DBNAME;

  if (!mongoUrl || typeof mongoUrl !== 'string' || !mongoUrl.trim()) {
    throw new Error('Database configuration error: Required environment variable MONGODB_URL is missing.');
  }

  if (!dbName || typeof dbName !== 'string' || !dbName.trim()) {
    throw new Error('Database configuration error: Required environment variable MONGO_DBNAME is missing.');
  }

  return { mongoUrl: mongoUrl.trim(), dbName: dbName.trim() };
}

/**
 * Connects to MongoDB Atlas using Mongoose and the database specified by MONGO_DBNAME.
 * Reuses existing connection without opening duplicates.
 */
export async function connectDB() {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting, wait for connection event
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return mongoose.connection;
  }

  const { mongoUrl, dbName } = validateDatabaseEnv();

  try {
    const conn = await mongoose.connect(mongoUrl, {
      dbName,
      autoIndex: true
    });
    console.log(`[Database] MongoDB connection established successfully (db: ${dbName})`);
    return conn;
  } catch (err) {
    console.error('[Database Connection Error]: Failed to connect to MongoDB.');
    throw new Error(`Database connection failed: ${err.message}`);
  }
}

/**
 * Safely disconnects from MongoDB.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
