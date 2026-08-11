const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const AppError = require('../utils/AppError');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const UNAUTHORIZED_RESPONSE = {
    error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
    }
};

function rejectUnauthorized(res) {
    return res.status(401).json(UNAUTHORIZED_RESPONSE);
}

async function authenticateAccessToken(req, res, next) {
    const authorization = req.get('authorization');
    const parts = authorization ? authorization.trim().split(/\s+/) : [];

    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        return rejectUnauthorized(res);
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        return next(
            new AppError(
                'JWT access-token configuration is missing.',
                500,
                'AUTH_CONFIGURATION_ERROR'
            )
        );
    }

    let claims;

    try {
        claims = jwt.verify(parts[1], secret, { algorithms: ['HS256'] });
    } catch (_error) {
        return rejectUnauthorized(res);
    }

    const hasValidClaims =
        claims &&
        typeof claims === 'object' &&
        typeof claims.sub === 'string' &&
        OBJECT_ID_PATTERN.test(claims.sub) &&
        claims.type === 'access' &&
        Number.isInteger(claims.ver) &&
        claims.ver >= 0;

    if (!hasValidClaims) {
        return rejectUnauthorized(res);
    }

    let user;

    try {
        user = await User.findById(claims.sub).select('_id passwordVersion');
    } catch (error) {
        return next(error);
    }

    if (!user || user.passwordVersion !== claims.ver) {
        return rejectUnauthorized(res);
    }

    req.auth = {
        userId: String(user._id),
        claims
    };

    return next();
}

module.exports = authenticateAccessToken;
module.exports.authenticateAccessToken = authenticateAccessToken;
