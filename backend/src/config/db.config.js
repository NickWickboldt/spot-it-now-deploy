import mongoose from 'mongoose';

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
    console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    // Log an error message and exit the process if the connection fails.
    console.error("MONGODB connection FAILED: ", error);
    process.exit(1); // Exit with a non-zero status code to indicate an error.
  }
};

export default connectDB;