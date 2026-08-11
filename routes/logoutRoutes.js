const express = require('express');

function createLogoutRouter() {
    const router = express.Router();

    router.get('/logout', (_req, res) => {
        res.clearCookie('accessToken');
        res.redirect('/login');
    });

    return router;
}

module.exports = createLogoutRouter();
module.exports.createLogoutRouter = createLogoutRouter;
