import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import connectDB from "./config/db.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/requestLogger.middleware.js";
import { initializeSocketIO } from "./socket/index.js";
import { log } from "./utils/logger.util.js";

// Import the main router from the index file
import apiRouter from "./routes/index.routes.js";

// Configure environment variables

// Initialize the Express app
const app = express();

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// --- Middleware Configuration ---
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// This middleware is necessary to parse cookies from incoming requests
app.use(cookieParser());
// Request logging should come before routes to capture all endpoints
app.use(requestLogger);

// --- Route Declaration ---
// All API routes will be prefixed with /api/v1
// For example, the user registration route is now: /api/v1/users/register
app.use("/api/v1", apiRouter);
// Global error handler after routes
app.use(errorHandler);

// --- Database Connection and Server Start ---
const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    // Initialize Socket.io with the HTTP server
    initializeSocketIO(httpServer);

    httpServer.listen(PORT, () => {
      log.info("backend-server", `Server listening on port ${PORT}`, {
        url: `http://localhost:${PORT}/api/v1`,
        env: process.env.NODE_ENV || "development",
      });
    });

    httpServer.on("error", (error) => {
      log.error("backend-server", "App server error", {
        error: error?.message || error,
      });
      throw error;
    });
  })
  .catch((err) => {
    log.fatal("backend-server", "MongoDB connection failed", {
      error: err?.message || err,
    });
  });
