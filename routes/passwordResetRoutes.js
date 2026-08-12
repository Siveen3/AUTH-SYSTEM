const express = require('express');

const passwordResetController = require('../controllers/passwordResetController');
const passwordResetRateLimit = require('../middleware/passwordResetRateLimit');
const asyncHandler = require('../utils/asyncHandler');

function createPasswordResetRouter({
    controller = passwordResetController,
    forgotPasswordLimiter = passwordResetRateLimit
} = {}) {
    const router = express.Router();

    // Step 1: request a password-reset OTP
    // Rate-limited to 5 requests per IP per 15 minutes
    router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(controller.forgotPassword));

    // Step 2: submit the OTP + new password
    // Body: { email, otp, newPassword, confirmPassword }
    router.post('/reset-password', asyncHandler(controller.resetPassword));

    return router;
}

module.exports = createPasswordResetRouter();
module.exports.createPasswordResetRouter = createPasswordResetRouter;
