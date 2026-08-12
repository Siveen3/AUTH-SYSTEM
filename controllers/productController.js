const productService = require('../services/productService');

function createProductController() {
    function listProducts(req, res) {
        const products = productService.getAllProducts();
        res.json({ products });
    }

    function getProductData(req, res) {
        const productId = req.params.id;
        const product = productService.getProductById(productId);

        if (!product) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        res.json({ product });
    }

    return {
        listProducts,
        getProductData
    };
}

module.exports = createProductController();
module.exports.createProductController = createProductController;
