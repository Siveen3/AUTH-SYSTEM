const express = require('express');

const passwordResetController = require('../controllers/passwordResetController');
const passwordResetRateLimit = require('../middleware/passwordResetRateLimit');
const asyncHandler = require('../utils/asyncHandler');

function createPasswordResetRouter({
    controller = passwordResetController,
    forgotPasswordLimiter = passwordResetRateLimit
} = {}) {
    const router = express.Router();

    router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(controller.forgotPassword));
    router.post('/reset-password', asyncHandler(controller.resetPassword));

    return router;
}

module.exports = createPasswordResetRouter();
module.exports.createPasswordResetRouter = createPasswordResetRouter;
