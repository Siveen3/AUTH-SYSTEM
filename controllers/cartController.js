const cartService = require('../services/cartService');
const productService = require('../services/productService');
const AppError = require('../utils/AppError');

function createCartController() {
    function viewCart(req, res) {
        const userId = req.auth?.userId;
        const cartItems = cartService.getCart(userId).map(entry => {
            const product = productService.getProductById(entry.productId);
            return {
                ...entry,
                product,
                total: product ? product.price * entry.quantity : 0
            };
        });

        const cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
        res.render('cart', { cartItems, cartTotal });
    }

    function getCartItems(req, res) {
        const userId = req.auth?.userId;
        const cartItems = cartService.getCart(userId).map(entry => {
            const product = productService.getProductById(entry.productId);
            return {
                ...entry,
                product,
                total: product ? product.price * entry.quantity : 0
            };
        });

        res.json({ cartItems });
    }

    function addToCart(req, res) {
        const userId = req.auth?.userId;
        const { productId, quantity } = req.body || {};

        if (!productId || typeof productId !== 'string') {
            throw new AppError('Product ID is required.', 400, 'VALIDATION_ERROR');
        }

        const amount = Number(quantity);
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new AppError('Quantity must be a positive integer.', 400, 'VALIDATION_ERROR');
        }

        const product = productService.getProductById(productId);
        if (!product) {
            throw new AppError('Product not found.', 404, 'NOT_FOUND');
        }

        cartService.addItemToCart(userId, { productId, quantity: amount });
        res.status(200).json({ message: 'Product added to cart.' });
    }

    function removeFromCart(req, res) {
        const userId = req.auth?.userId;
        const productId = req.params.id;

        if (!productId) {
            throw new AppError('Product ID is required.', 400, 'VALIDATION_ERROR');
        }

        cartService.removeItemFromCart(userId, productId);
        res.status(200).json({ message: 'Product removed from cart.' });
    }

    return {
        viewCart,
        getCartItems,
        addToCart,
        removeFromCart
    };
}

module.exports = createCartController();
module.exports.createCartController = createCartController;
