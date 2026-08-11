const AppError = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
    next(new AppError(`Route ${req.method} ${req.originalUrl} was not found`, 404, 'NOT_FOUND'));
}

function errorHandler(error, _req, res, _next) {
    const statusCode = error.statusCode || 500;
    const isOperational = error.isOperational === true;

    if (!isOperational) {
        console.error(error);
    }

    res.status(statusCode).json({
        error: {
            code: isOperational ? error.code : 'INTERNAL_SERVER_ERROR',
            message: isOperational ? error.message : 'An unexpected error occurred.'
        }
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
