const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseBoolean(value) {
    return String(value).toLowerCase() === 'true';
}

function createTransportFromEnvironment(env = process.env) {
    const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'];
    const missingVariable = requiredVariables.find((name) => !env[name]);

    // If required SMTP settings are missing, return null so callers can
    // gracefully fall back to a development console-only behaviour.
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

// ---------------------------------------------------------------------------
// Email service factory
// ---------------------------------------------------------------------------

function createEmailService({ env = process.env, transport } = {}) {
    let mailTransport = transport;

    /**
     * Resolves the mail transport lazily (creates it from env if not provided).
     * @returns {object|null}
     */
    function resolveTransport() {
        if (!mailTransport) {
            mailTransport = createTransportFromEnvironment(env);
        }
        return mailTransport;
    }

    /**
     * Logs a dev-friendly fallback message when SMTP is not configured.
     */
    function devFallback(label, to, content) {
        if (String(env.SUPPRESS_RESET_LINK_CONSOLE).toLowerCase() === 'true') return;
        // eslint-disable-next-line no-console
        console.info(`[DEV] ${label} for ${to}:`, content);
    }

    return {
        // -----------------------------------------------------------------------
        // Password-reset link email (original behaviour, kept for compatibility)
        // -----------------------------------------------------------------------
        async sendPasswordResetEmail({ to, resetUrl }) {
            const transport = resolveTransport();

            if (!transport) {
                devFallback('Password reset link', to, resetUrl);
                return;
            }

            await transport.sendMail({
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
        },

        // -----------------------------------------------------------------------
        // OTP email (new: used for registration verification & password reset)
        // -----------------------------------------------------------------------
        /**
         * Sends a one-time password (OTP) to the given address.
         * @param {object} opts
         * @param {string} opts.to      - Recipient email address.
         * @param {string} opts.subject - Email subject line.
         * @param {number|string} opts.otp - The OTP code to include.
         */
        async sendOtpEmail({ to, subject, otp }) {
            const transport = resolveTransport();

            if (!transport) {
                devFallback(`OTP (${subject})`, to, otp);
                return;
            }

            const html = `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
                    <h1 style="font-size:22px;color:#111827;margin-bottom:8px;">AUTH-SYSTEM</h1>
                    <p style="color:#374151;margin-bottom:16px;">Your one-time verification code is:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;text-align:center;padding:16px;background:#f5f3ff;border-radius:6px;">
                        ${otp}
                    </div>
                    <p style="color:#6b7280;font-size:13px;margin-top:16px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                    <p style="color:#6b7280;font-size:13px;">If you did not request this code, you can safely ignore this email.</p>
                </div>
            `;

            await transport.sendMail({
                from: env.SMTP_FROM,
                to,
                subject,
                text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
                html
            });
        }
    };
}

module.exports = createEmailService();
module.exports.createEmailService = createEmailService;
module.exports.createTransportFromEnvironment = createTransportFromEnvironment;
