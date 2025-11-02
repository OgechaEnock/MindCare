import express from "express";
import pool from "../config/db.js";

const router = express.Router();

router.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json({
      message: "✅ Database connection successful!",
      server_time: result.rows[0].now,
    });
  } catch (err) {
    console.error("❌ Test DB Error:", err.message);
    res.status(500).json({ error: "Database connection failed." });
  }
});

export default router;
