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

    return {
        renderLoginPage,
        renderSignupPage,
        renderForgotPasswordPage,
        renderResetPasswordPage,
        renderDashboardPage
    };
}

module.exports = createPageController();
module.exports.createPageController = createPageController;
