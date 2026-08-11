const express = require('express');

const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

function createAuthRouter({ controller = authController } = {}) {
    const router = express.Router();

    router.post('/signup', asyncHandler(controller.signup));
    router.post('/login', asyncHandler(controller.login));

    return router;
}

module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
