import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import medicationRoutes from "./routes/medicationRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import forumRoutes from "./routes/forumRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js"; 
import { initializeScheduler } from "./utils/scheduler.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//  Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Request logging middleware 
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes); 

//  Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ 
      status: "Server is running",
      database: " Connected",
      server_time: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ 
      status: " Server error",
      database: "Disconnected",
      error: err.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

//  Global error handler
app.use((err, req, res, next) => {
  console.error(" Global error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// Initialize notification scheduler
initializeScheduler();

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Mental Health Support App Backend    ║
║  Port: ${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}           ║
║  Status: ✅ Running                    ║
║  Notifications: ✅ Active              ║
╚════════════════════════════════════════╝
  `);
});

export default app;