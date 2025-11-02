import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MODERATION_API_URL = process.env.MODERATION_API_URL || "http://cmsai:8000/generate/";
const MODERATION_TIMEOUT_MS = parseInt(process.env.MODERATION_TIMEOUT_MS) || 30000;

// Simple in-memory rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

/**
 * Wait to respect rate limits
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏱️  Rate limit: Waiting ${waitTime}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Moderate content using the LLM API (matches provided sample code)
 * @param {string} text - Content to moderate
 * @returns {Promise<{safety: boolean, categories: array}>}
 */
export const moderateText = async (text) => {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error("Invalid text for moderation");
    }

    console.log("🔍 Moderating content:", text.substring(0, 50) + "...");

    // Wait to respect rate limits
    await waitForRateLimit();

    // Call the LLM API exactly as shown in the sample code
    const response = await axios.post(
      MODERATION_API_URL,
      { prompt: text }, // ✅ Matches sample: payload = {"prompt": "..."}
      {
        timeout: MODERATION_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" }
      }
    );

    // Expected response format: { safety: true/false, categories: [...] }
    const { safety, categories } = response.data;

    console.log("✅ Moderation result:", { safety, categories });

    return {
      safety: safety === true,
      categories: categories || []
    };

  } catch (error) {
    // Handle specific error cases
    if (error.response?.status === 429) {
      console.error("⚠️  Rate limit exceeded (429). Please wait before trying again.");
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    
    if (error.response?.status === 503 || error.response?.status === 502) {
      console.error("⚠️  Moderation service unavailable (503/502)");
      throw new Error("Moderation service is temporarily unavailable. Please try again later.");
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error("⏱️  Moderation request timed out");
      throw new Error("Moderation request timed out. Please try again.");
    }

    if (error.code === 'ECONNREFUSED') {
      console.error("❌ Cannot connect to moderation service");
      throw new Error("Cannot connect to moderation service. Please check if the service is running.");
    }

    console.error("❌ Moderation API error:", error.message);
    throw new Error("Moderation service unavailable");
  }
};

/**
 * Express middleware for content moderation with better error handling
 */
export const moderateContentMiddleware = async (req, res, next) => {
  try {
    const { text, content, body } = req.body;
    const textToModerate = text || content || body;

    if (!textToModerate) {
      return res.status(400).json({ 
        error: "No content provided for moderation" 
      });
    }

    const result = await moderateText(textToModerate);

    if (!result.safety) {
      console.log("🚫 Content rejected by moderation");
      return res.status(403).json({ 
        error: "Content rejected by moderation filter",
        categories: result.categories,
        message: "Your post could not be published due to safety concerns. Please review community guidelines."
      });
    }

    // Attach moderation result to request for later use
    req.moderationResult = result;
    next();

  } catch (error) {
    console.error("❌ Moderation middleware error:", error.message);
    
    // Check if it's a rate limit error
    if (error.message.includes("Rate limit")) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many requests. Please wait a moment and try again.",
        retryAfter: 2 // seconds
      });
    }

    // Check if it's a service unavailable error
    if (error.message.includes("unavailable") || error.message.includes("connect")) {
      return res.status(503).json({ 
        error: "Service unavailable",
        message: "Moderation service is temporarily unavailable. Please try again later."
      });
    }

    // Generic error
    res.status(503).json({ 
      error: "Moderation failed",
      message: "Unable to moderate content at this time. Please try again later."
    });
  }
};

export default { moderateText, moderateContentMiddleware };