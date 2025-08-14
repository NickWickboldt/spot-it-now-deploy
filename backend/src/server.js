import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.config.js';

// Import the main router from the index file
import apiRouter from './routes/index.routes.js';

// Configure environment variables
dotenv.config({
  path: './.env' 
});

// Initialize the Express app
const app = express();

// --- Middleware Configuration ---
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
// This middleware is necessary to parse cookies from incoming requests
app.use(cookieParser());


// --- Route Declaration ---
// All API routes will be prefixed with /api/v1
// For example, the user registration route is now: /api/v1/users/register
app.use("/api/v1", apiRouter);


// --- Database Connection and Server Start ---
const PORT = process.env.PORT || 8000;

connectDB()
.then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running at port: ${PORT}`);
    console.log(`🔗 Access the API at: http://localhost:${PORT}/api/v1`);
  });

  app.on("error", (error) => {
    console.log("ERROR: ", error);
    throw error;
  });
})
.catch((err) => {
  console.log("❌ MONGO db connection failed !!! ", err);
});
