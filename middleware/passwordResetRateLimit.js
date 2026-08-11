const { rateLimit } = require('express-rate-limit');

const passwordResetRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many password-reset requests. Please try again later.'
        }
    }
});

module.exports = passwordResetRateLimit;
