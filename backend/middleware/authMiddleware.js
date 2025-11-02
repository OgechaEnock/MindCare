import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token and authenticate requests
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: "Access denied. No token provided." 
      });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("Token verification error:", err.message);
        
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ 
            error: "Token has expired. Please login again." 
          });
        }
        
        return res.status(403).json({ 
          error: "Invalid token." 
        });
      }

      // Attach user info to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ 
      error: "Authentication failed." 
    });
  }
};

export default authenticateToken;