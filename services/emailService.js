const nodemailer = require('nodemailer');

function parseBoolean(value) {
    return String(value).toLowerCase() === 'true';
}

function createTransportFromEnvironment(env = process.env) {
    const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'];
    const missingVariable = requiredVariables.find((name) => !env[name]);

    // If required SMTP settings are missing, return null so callers can
    // gracefully fallback to a development console-only behavior.
    if (missingVariable) {
        return null;
    }

    const port = Number.parseInt(env.SMTP_PORT, 10);

    if (!Number.isInteger(port)) {
        return null;
    }

    const options = {
        host: env.SMTP_HOST,
        port,
        secure: parseBoolean(env.SMTP_SECURE)
    };

    if (env.SMTP_USER || env.SMTP_PASS) {
        options.auth = {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS
        };
    }

    return nodemailer.createTransport(options);
}

function createEmailService({ env = process.env, transport } = {}) {
    let mailTransport = transport;

    return {
        async sendPasswordResetEmail({ to, resetUrl }) {
            if (!mailTransport) {
                mailTransport = createTransportFromEnvironment(env);
            }

            // If there's no transport (missing SMTP configuration), fall back
            // to console logging for local development.
            if (!mailTransport) {
                // Respect an explicit flag to suppress console output in CI if set.
                if (String(env.SUPPRESS_RESET_LINK_CONSOLE).toLowerCase() === 'true') {
                    return;
                }

                // Log a dev-friendly message containing the reset URL so local
                // developers can copy it into the browser without an SMTP server.
                // eslint-disable-next-line no-console
                console.info('[DEV] Password reset link for', to, ':', resetUrl);
                return;
            }

            await mailTransport.sendMail({
                from: env.SMTP_FROM,
                to,
                subject: 'Reset your password',
                text: `Use this link to reset your password. The link expires in 15 minutes: ${resetUrl}`,
                html: [
                    '<p>We received a request to reset your password.</p>',
                    `<p><a href="${resetUrl}">Reset your password</a></p>`,
                    '<p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>'
                ].join('')
            });
        }
    };
}

module.exports = createEmailService();
module.exports.createEmailService = createEmailService;
module.exports.createTransportFromEnvironment = createTransportFromEnvironment;
