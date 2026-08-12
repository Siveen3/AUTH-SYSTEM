const express = require('express');

const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

function createAuthRouter({ controller = authController } = {}) {
    const router = express.Router();

    // Register a new user (sends OTP for email verification)
    router.post('/signup', asyncHandler(controller.signup));

    // Verify the OTP sent during registration (activates the account)
    router.post('/verify-otp', asyncHandler(controller.verifyOtp));

    // Sign in with verified credentials (returns JWT access token)
    router.post('/login', asyncHandler(controller.login));

    return router;
}

module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
