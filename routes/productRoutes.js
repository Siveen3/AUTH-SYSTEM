const express = require('express');
const authenticateAccessToken = require('../middleware/jwtMiddleware');
const productController = require('../controllers/productController');

function createProductRouter() {
    const router = express.Router();

    router.get('/', authenticateAccessToken, productController.listProducts);
    router.get('/:id', authenticateAccessToken, productController.getProductData);

    return router;
}

module.exports = createProductRouter();
module.exports.createProductRouter = createProductRouter;
