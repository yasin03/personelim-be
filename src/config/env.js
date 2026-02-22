const dotenv = require("dotenv");

const loadEnv = () => {
  dotenv.config();
  return process.env;
};

const requireEnv = (keys) => {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
    error.statusCode = 500;
    throw error;
  }
};

module.exports = {
  loadEnv,
  requireEnv,
};
