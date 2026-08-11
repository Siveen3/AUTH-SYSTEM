const nodemailer = require('nodemailer');

function parseBoolean(value) {
    return String(value).toLowerCase() === 'true';
}

function createTransportFromEnvironment(env = process.env) {
    const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'];
    const missingVariable = requiredVariables.find((name) => !env[name]);

    if (missingVariable) {
        throw new Error(`${missingVariable} is required to send password-reset email`);
    }

    const port = Number.parseInt(env.SMTP_PORT, 10);

    if (!Number.isInteger(port)) {
        throw new Error('SMTP_PORT must be a valid number');
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
