const express = require('express');
const authenticateAccessToken = require('../middleware/jwtMiddleware');
const cartController = require('../controllers/cartController');

function createCartRouter() {
    const router = express.Router();

    router.get('/', authenticateAccessToken, cartController.getCartItems);
    router.post('/add', authenticateAccessToken, cartController.addToCart);
    router.delete('/:id', authenticateAccessToken, cartController.removeFromCart);

    return router;
}

module.exports = createCartRouter();
module.exports.createCartRouter = createCartRouter;
