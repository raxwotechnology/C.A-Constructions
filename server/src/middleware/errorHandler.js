const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    if (err.path === '_id') {
      message = `Resource not found`;
      statusCode = 404;
    } else {
      message = `Invalid value provided for field '${err.path}'`;
      statusCode = 400;
    }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  console.error(`[ERROR] ${statusCode}: ${message}`);
  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
