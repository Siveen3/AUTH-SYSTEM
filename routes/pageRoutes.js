const express = require('express');

const pageController = require('../controllers/pageController');
const authenticateAccessToken = require('../middleware/jwtMiddleware');

function createPageRouter() {
    const router = express.Router();

    router.get('/', (_req, res) => {
        res.redirect('/login');
    });

    router.get('/login', pageController.renderLoginPage);
    router.get('/signup', pageController.renderSignupPage);
    router.get('/forgot-password', pageController.renderForgotPasswordPage);
    router.get('/reset-password', pageController.renderResetPasswordPage);
    router.get('/dashboard', authenticateAccessToken, pageController.renderDashboardPage);
    router.get('/products', authenticateAccessToken, pageController.renderProductsPage);
    router.get('/product/:id', authenticateAccessToken, pageController.renderProductDetailsPage);
    router.get('/cart', authenticateAccessToken, pageController.renderCartPage);
    router.post('/cart/add', authenticateAccessToken, pageController.addToCartPage);
    router.post('/cart/remove/:id', authenticateAccessToken, pageController.removeCartItem);

    return router;
}

module.exports = createPageRouter();
module.exports.createPageRouter = createPageRouter;
