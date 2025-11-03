import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MODERATION_API_URL = process.env.MODERATION_API_URL || "http://localhost:8000/generate/";
const MODERATION_TIMEOUT_MS = parseInt(process.env.MODERATION_TIMEOUT_MS) || 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; 

// In-memory rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; 

/**
 * Wait fo rate limits
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏱ Rate limit: Waiting ${waitTime}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fallback keyword-based moderation
 */
function fallbackModeration(text) {
  console.log("Using fallback keyword-based moderation");
  
  const lowerText = text.toLowerCase();
  const bannedWords = [
    'suicide', 'kill yourself', 'self-harm', 'self harm', 'kys',
    'spam', 'viagra', 'casino', 'scam', 'hate speech'
  ];
  
  const foundWords = bannedWords.filter(word => lowerText.includes(word));
  
  if (foundWords.length > 0) {
    return {
      safety: false,
      categories: foundWords,
      fallback: true
    };
  }
  
  return {
    safety: true,
    categories: [],
    fallback: true
  };
}

/**
 * Moderate content using the LLM API (matches provided sample code)
 * @param {string} text - Content to moderate
 * @returns {Promise<{safety: boolean, categories: array, fallback?: boolean}>}
 */
export const moderateText = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Invalid text for moderation");
  }

  console.log("🔍 Moderating content:", text.substring(0, 50) + "...");

  // Try to connect to the moderation API with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Wait to respect rate limits
      await waitForRateLimit();

      // Call the LLM API
      const response = await axios.post(
        MODERATION_API_URL,
        { prompt: text },
        {
          timeout: MODERATION_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" }
        }
      );

      // Expected response format: { safety: true/false, categories: [...] }
      const { safety, categories } = response.data;

      console.log("Moderation result:", { safety, categories });

      return {
        safety: safety === true || safety === "safe" || safety === "Safe",
        categories: categories || [],
        fallback: false
      };

    } catch (error) {
      console.error(`Moderation attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      // Handle specific error cases
      if (error.response?.status === 429) {
        console.error("Rate limit exceeded (429)");
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      
      if (error.response?.status === 503 || error.response?.status === 502) {
        console.error("Moderation service unavailable (503/502)");
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        throw new Error("Moderation service is temporarily unavailable. Please try again later.");
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error("Moderation request timed out");
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        throw new Error("Moderation request timed out. Please try again.");
      }

      // Handle DNS resolution failures (EAI_AGAIN, ENOTFOUND)
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND') {
        console.error(" Cannot resolve moderation service hostname:", error.code);
        console.error("   Check if 'cmsai' is in your /etc/hosts file or use 'localhost'");
        
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        
        // Use fallback after all retries exhausted
        console.log("All retry attempts failed - using fallback moderation");
        return fallbackModeration(text);
      }

      //  Handle connection refused
      if (error.code === 'ECONNREFUSED') {
        console.error("Cannot connect to moderation service - connection refused");
        console.error("   Check if the moderation API is running on port 8000");
        
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        
        // Use fallback after all retries exhausted
        console.log("All retry attempts failed - using fallback moderation");
        return fallbackModeration(text);
      }

      // Generic network errors
      if (error.code && (error.code.startsWith('E') || error.code === 'ECONNRESET')) {
        console.error(`Network error: ${error.code}`);
        
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        
        // Use fallback after all retries exhausted
        console.log("All retry attempts failed - using fallback moderation");
        return fallbackModeration(text);
      }

      // If this is the last attempt, use fallback
      if (attempt === MAX_RETRIES) {
        console.error("All moderation attempts failed - using fallback");
        return fallbackModeration(text);
      }

      // Wait before retry
      await sleep(RETRY_DELAY * attempt);
    }
  }

  // Fallback if all retries failed
  console.log("Moderation service completely unavailable - using fallback");
  return fallbackModeration(text);
};

/**
 * Express middleware for content moderation with better error handling
 */
export const moderateContentMiddleware = async (req, res, next) => {
  try {
    const { text, content, body, title } = req.body;
    const textToModerate = text || content || body || title;

    if (!textToModerate) {
      return res.status(400).json({ 
        error: "No content provided for moderation" 
      });
    }

    const result = await moderateText(textToModerate);

    if (!result.safety) {
      console.log("Content rejected by moderation");
      return res.status(403).json({ 
        error: "Content rejected by moderation filter",
        categories: result.categories,
        message: "Your post could not be published due to safety concerns. Please review community guidelines.",
        usedFallback: result.fallback
      });
    }

    // Attach moderation result to request for later use
    req.moderationResult = result;
    
    // Log if fallback was used
    if (result.fallback) {
      console.log("Content approved using fallback moderation");
    }
    
    next();

  } catch (error) {
    console.error("Moderation middleware error:", error.message);
    
    // Check  rate limit error
    if (error.message.includes("Rate limit")) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: "Too many requests. Please wait a moment and try again.",
        retryAfter: 2
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