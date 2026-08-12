function createPageController() {
    function renderLoginPage(req, res) {
        res.render('login', { registeredEmail: req.query.registeredEmail || '' });
    }

    function renderSignupPage(req, res) {
        res.render('signup');
    }

    function renderForgotPasswordPage(req, res) {
        res.render('forgot-password');
    }

    function renderResetPasswordPage(req, res) {
        res.render('reset-password', { token: req.query.token || '' });
    }

    function renderDashboardPage(req, res) {
        res.render('dashboard', { userId: req.auth?.userId || '' });
    }

    function renderProductsPage(req, res) {
        const productService = require('../services/productService');
        const products = productService.getAllProducts();
        res.render('products', { products });
    }

    function renderProductDetailsPage(req, res) {
        const productService = require('../services/productService');
        const product = productService.getProductById(req.params.id);

        if (!product) {
            return res.status(404).render('404', { message: 'Product not found.' });
        }

        res.render('product-details', { product });
    }

    function renderCartPage(req, res) {
        const cartService = require('../services/cartService');
        const productService = require('../services/productService');
        const userId = req.auth.userId;
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

    function addToCartPage(req, res) {
        const cartService = require('../services/cartService');
        const productService = require('../services/productService');
        const { productId, quantity } = req.body || {};
        const userId = req.auth.userId;

        if (!productId || typeof productId !== 'string') {
            return res.status(400).render('404', { message: 'Product ID is required.' });
        }

        const amount = Number(quantity);
        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(400).render('404', { message: 'Quantity must be a positive integer.' });
        }

        const product = productService.getProductById(productId);
        if (!product) {
            return res.status(404).render('404', { message: 'Product not found.' });
        }

        cartService.addItemToCart(userId, { productId, quantity: amount });
        res.redirect('/cart');
    }

    function removeCartItem(req, res) {
        const cartService = require('../services/cartService');
        const productId = req.params.id;
        const userId = req.auth.userId;

        if (!productId) {
            return res.status(400).render('404', { message: 'Product ID is required.' });
        }

        cartService.removeItemFromCart(userId, productId);
        res.redirect('/cart');
    }

    return {
        renderLoginPage,
        renderSignupPage,
        renderForgotPasswordPage,
        renderResetPasswordPage,
        renderDashboardPage,
        renderProductsPage,
        renderProductDetailsPage,
        renderCartPage,
        addToCartPage,
        removeCartItem
    };
}

module.exports = createPageController();
module.exports.createPageController = createPageController;
