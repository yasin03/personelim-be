const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const payload = {
    error: statusCode >= 500 ? "Internal server error" : "Request failed",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : statusCode >= 500
          ? "Something went wrong"
          : err.message,
  };

  if (err.code) {
    payload.code = err.code;
  }
  if (process.env.NODE_ENV === "development" && err.details) {
    payload.details = err.details;
  }

  console.error("Error:", err);
  return res.status(statusCode).json(payload);
};

module.exports = {
  errorHandler,
};
