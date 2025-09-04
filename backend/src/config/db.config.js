import mongoose from 'mongoose';
import { log } from '../utils/logger.util.js';

/**
 * Establishes a connection to the MongoDB database.
 *
 * This function reads the MongoDB connection string from the environment variables
 * and uses Mongoose to connect to the database. It logs the connection status
 * to the console.
 */
const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB cluster.
    // The connection string should be stored in your .env file for security.
    // Example: MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority"
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`);

    // Log a success message with the host name if the connection is successful.
    log.info('backend-db', 'MongoDB connected', { host: connectionInstance.connection.host });
  } catch (error) {
    // Log an error message and exit the process if the connection fails.
    log.fatal('backend-db', 'MongoDB connection failed', { error: error?.message || error });
    process.exit(1); // Exit with a non-zero status code to indicate an error.
  }
};

export default connectDB;
