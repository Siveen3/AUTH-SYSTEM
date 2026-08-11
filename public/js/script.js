/**
 * Modern SaaS Authentication Suite JavaScript
 * Handle Form Validation, Password Strength, Theme Switcher, Toast Engine & Mock Auth Persistence
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Dark/Light Theme Switcher ---
    initTheme();

    // --- 2. Initialize Password Show/Hide Buttons ---
    initPasswordToggles();

    // --- 3. Page Specific Initializations ---
    initLoginForm();
    initSignUpForm();
    initForgotPasswordForm();
    initTermsModal();
    initSocialAuthButtons();
});

/* ==========================================
   1. Theme Management System
   ========================================== */
function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            showToast(`Switched to ${newTheme} mode`, 'info', 2000);
        });
    }
}

/* ==========================================
   2. Password Visibility Toggle
   ========================================== */
function initPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.btn-toggle-password');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');

            // Swap SVG Eye Icons
            const eyeIcon = btn.querySelector('.eye-icon');
            const eyeOffIcon = btn.querySelector('.eye-off-icon');

            if (eyeIcon && eyeOffIcon) {
                if (isPassword) {
                    eyeIcon.style.display = 'none';
                    eyeOffIcon.style.display = 'block';
                } else {
                    eyeIcon.style.display = 'block';
                    eyeOffIcon.style.display = 'none';
                }
            }
        });
    });
}

/* ==========================================
   3. Validation Helpers
   ========================================== */
const VALIDATION = {
    isValidEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase().trim());
    },
    
    isValidName(name) {
        return name.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(name.trim());
    },

    evaluatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        if (checks.length) score++;
        if (checks.uppercase) score++;
        if (checks.number) score++;
        if (checks.special) score++;

        return { score, checks };
    }
};

function setFieldError(fieldId, errorMsg) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Feedback`);
    if (!input) return;

    input.classList.add('is-invalid');
    input.classList.remove('is-valid');

    if (feedback) {
        feedback.className = 'feedback-message error';
        feedback.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${errorMsg}`;
    }
}

function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Feedback`);
    if (!input) return;

    input.classList.remove('is-invalid');
    input.classList.add('is-valid');

    if (feedback) {
        feedback.className = 'feedback-message success';
        feedback.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Valid`;
    }
}

function resetField(fieldId) {
    const input = document.getElementById(fieldId);
    const feedback = document.getElementById(`${fieldId}Feedback`);
    if (!input) return;

    input.classList.remove('is-invalid', 'is-valid');
    if (feedback) {
        feedback.className = 'feedback-message';
        feedback.innerHTML = '';
    }
}

/* ==========================================
   4. Local Auth Data Store Simulator
   ========================================== */
function getUsersStore() {
    const users = localStorage.getItem('saas_app_users');
    if (!users) {
        // Default seed demo user
        const defaultUsers = [
            { name: 'Demo User', email: 'demo@example.com', password: 'Password123!' }
        ];
        localStorage.setItem('saas_app_users', JSON.stringify(defaultUsers));
        return defaultUsers;
    }
    return JSON.parse(users);
}

function saveUserStore(user) {
    const users = getUsersStore();
    users.push(user);
    localStorage.setItem('saas_app_users', JSON.stringify(users));
}

/* ==========================================
   5. Login Page Handler
   ========================================== */
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberCheckbox = document.getElementById('rememberMe');

    // Pre-fill email if passed in query param (e.g. redirected from Sign Up)
    const urlParams = new URLSearchParams(window.location.search);
    const paramEmail = urlParams.get('registeredEmail');
    if (paramEmail && emailInput) {
        emailInput.value = paramEmail;
        showToast('Account registered! You can now log in.', 'success', 5000);
    }

    // Real-time Validation Blur Events
    emailInput.addEventListener('blur', () => {
        if (!emailInput.value.trim()) {
            setFieldError('loginEmail', 'Email address is required');
        } else if (!VALIDATION.isValidEmail(emailInput.value)) {
            setFieldError('loginEmail', 'Please enter a valid email address');
        } else {
            clearFieldError('loginEmail');
        }
    });

    passwordInput.addEventListener('blur', () => {
        if (!passwordInput.value) {
            setFieldError('loginPassword', 'Password is required');
        } else {
            clearFieldError('loginPassword');
        }
    });

    // Submit Event
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        let hasError = false;

        if (!email) {
            setFieldError('loginEmail', 'Email address is required');
            hasError = true;
        } else if (!VALIDATION.isValidEmail(email)) {
            setFieldError('loginEmail', 'Please enter a valid email address');
            hasError = true;
        } else {
            clearFieldError('loginEmail');
        }

        if (!password) {
            setFieldError('loginPassword', 'Password is required');
            hasError = true;
        } else {
            clearFieldError('loginPassword');
        }

        if (hasError) {
            showToast('Please resolve the form errors.', 'error');
            return;
        }

        // Simulate Loading State & API Check
        const submitBtn = form.querySelector('.btn-primary');
        setButtonLoading(submitBtn, true);

        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulating network latency

        const users = getUsersStore();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        setButtonLoading(submitBtn, false);

        if (foundUser) {
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('remembered_user', email);
            }
            showToast(`Welcome back, ${foundUser.name}! Authentication successful.`, 'success');
            // Reset form
            form.reset();
            resetField('loginEmail');
            resetField('loginPassword');
        } else {
            setFieldError('loginPassword', 'Invalid email or password credentials');
            showToast('Invalid email or password. Try demo@example.com / Password123!', 'error', 5000);
        }
    });
}

/* ==========================================
   6. Sign Up Page Handler & Password Strength
   ========================================== */
function initSignUpForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirmPassword');
    const termsCheckbox = document.getElementById('termsCheckbox');

    // Password Live Strength Meter Handler
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const result = VALIDATION.evaluatePasswordStrength(val);
        updateStrengthUI(result, val.length > 0);

        if (confirmInput.value.length > 0) {
            validatePasswordMatch();
        }
    });

    confirmInput.addEventListener('input', validatePasswordMatch);

    function validatePasswordMatch() {
        if (!confirmInput.value) {
            setFieldError('signupConfirmPassword', 'Please confirm your password');
            return false;
        }
        if (confirmInput.value !== passwordInput.value) {
            setFieldError('signupConfirmPassword', 'Passwords do not match');
            return false;
        }
        clearFieldError('signupConfirmPassword');
        return true;
    }

    // Input blur validations
    nameInput.addEventListener('blur', () => {
        if (!nameInput.value.trim()) {
            setFieldError('signupName', 'Full name is required');
        } else if (!VALIDATION.isValidName(nameInput.value)) {
            setFieldError('signupName', 'Enter a valid name (at least 2 characters)');
        } else {
            clearFieldError('signupName');
        }
    });

    emailInput.addEventListener('blur', () => {
        if (!emailInput.value.trim()) {
            setFieldError('signupEmail', 'Email address is required');
        } else if (!VALIDATION.isValidEmail(emailInput.value)) {
            setFieldError('signupEmail', 'Please enter a valid email address');
        } else {
            clearFieldError('signupEmail');
        }
    });

    // Form Submit Event
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let hasError = false;

        // 1. Name Check
        if (!nameInput.value.trim() || !VALIDATION.isValidName(nameInput.value)) {
            setFieldError('signupName', 'Enter a valid full name');
            hasError = true;
        } else {
            clearFieldError('signupName');
        }

        // 2. Email Check
        if (!emailInput.value.trim() || !VALIDATION.isValidEmail(emailInput.value)) {
            setFieldError('signupEmail', 'Enter a valid email address');
            hasError = true;
        } else {
            clearFieldError('signupEmail');
        }

        // 3. Password Strength Check (Must be at least Score >= 3)
        const strength = VALIDATION.evaluatePasswordStrength(passwordInput.value);
        if (strength.score < 3) {
            setFieldError('signupPassword', 'Password is too weak. Meet all criteria above.');
            hasError = true;
        } else {
            clearFieldError('signupPassword');
        }

        // 4. Password Match Check
        if (!validatePasswordMatch()) {
            hasError = true;
        }

        // 5. Terms Checkbox
        if (!termsCheckbox.checked) {
            showToast('You must accept the Terms & Conditions to register.', 'error');
            hasError = true;
        }

        if (hasError) return;

        // Check if email already registered
        const users = getUsersStore();
        const existing = users.find(u => u.email.toLowerCase() === emailInput.value.trim().toLowerCase());
        if (existing) {
            setFieldError('signupEmail', 'This email is already registered');
            showToast('An account with this email already exists.', 'error');
            return;
        }

        // Simulate API Registration
        const submitBtn = form.querySelector('.btn-primary');
        setButtonLoading(submitBtn, true);

        await new Promise(resolve => setTimeout(resolve, 1400));

        // Save User Store
        saveUserStore({
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        setButtonLoading(submitBtn, false);

        showToast('Account created successfully! Redirecting to login...', 'success', 3000);

        setTimeout(() => {
            window.location.href = `login.html?registeredEmail=${encodeURIComponent(emailInput.value.trim())}`;
        }, 1500);
    });
}

function updateStrengthUI(result, hasText) {
    const meterSegments = document.querySelectorAll('.strength-segment');
    const statusText = document.getElementById('strengthLabel');

    const checkLength = document.getElementById('checkLength');
    const checkUpper = document.getElementById('checkUpper');
    const checkNumber = document.getElementById('checkNumber');
    const checkSpecial = document.getElementById('checkSpecial');

    // Update Checklist Pills
    if (checkLength) toggleCheckPill(checkLength, result.checks.length);
    if (checkUpper) toggleCheckPill(checkUpper, result.checks.uppercase);
    if (checkNumber) toggleCheckPill(checkNumber, result.checks.number);
    if (checkSpecial) toggleCheckPill(checkSpecial, result.checks.special);

    if (!hasText) {
        meterSegments.forEach(seg => seg.style.backgroundColor = 'transparent');
        if (statusText) statusText.textContent = '';
        return;
    }

    // Color logic
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];

    meterSegments.forEach((seg, index) => {
        if (index < result.score) {
            seg.style.backgroundColor = colors[result.score - 1] || colors[0];
        } else {
            seg.style.backgroundColor = 'transparent';
        }
    });

    if (statusText) {
        statusText.textContent = labels[result.score - 1] || 'Weak';
        statusText.style.color = colors[result.score - 1] || colors[0];
    }
}

function toggleCheckPill(el, isPassed) {
    if (isPassed) {
        el.classList.add('passed');
    } else {
        el.classList.remove('passed');
    }
}

/* ==========================================
   7. Forgot Password Page Handler
   ========================================== */
function initForgotPasswordForm() {
    const form = document.getElementById('forgotForm');
    if (!form) return;

    const emailInput = document.getElementById('forgotEmail');
    const formView = document.getElementById('forgotFormView');
    const successView = document.getElementById('forgotSuccessView');
    const resendBtn = document.getElementById('resendEmailBtn');
    const timerDisplay = document.getElementById('resendTimer');

    let countdownInterval = null;

    emailInput.addEventListener('blur', () => {
        if (!emailInput.value.trim()) {
            setFieldError('forgotEmail', 'Email address is required');
        } else if (!VALIDATION.isValidEmail(emailInput.value)) {
            setFieldError('forgotEmail', 'Please enter a valid email address');
        } else {
            clearFieldError('forgotEmail');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email || !VALIDATION.isValidEmail(email)) {
            setFieldError('forgotEmail', 'Please enter a valid email address');
            return;
        }

        const submitBtn = form.querySelector('.btn-primary');
        setButtonLoading(submitBtn, true);

        await new Promise(resolve => setTimeout(resolve, 1200));

        setButtonLoading(submitBtn, false);

        // Transition to Success Card View
        if (formView && successView) {
            formView.style.display = 'none';
            successView.classList.add('is-active');
            
            const sentEmailSpan = document.getElementById('sentEmailAddress');
            if (sentEmailSpan) sentEmailSpan.textContent = email;

            startResendTimer();
        }

        showToast('Password reset link sent to your email!', 'success');
    });

    if (resendBtn) {
        resendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (resendBtn.disabled) return;
            showToast('Reset email resent successfully!', 'info');
            startResendTimer();
        });
    }

    function startResendTimer() {
        if (!resendBtn || !timerDisplay) return;
        
        let secondsLeft = 30;
        resendBtn.disabled = true;

        clearInterval(countdownInterval);

        timerDisplay.textContent = `${secondsLeft}s`;

        countdownInterval = setInterval(() => {
            secondsLeft--;
            timerDisplay.textContent = `${secondsLeft}s`;

            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                resendBtn.disabled = false;
                timerDisplay.textContent = 'Ready';
            }
        }, 1000);
    }
}

/* ==========================================
   8. Terms Modal Handler
   ========================================== */
function initTermsModal() {
    const modal = document.getElementById('termsModal');
    const openBtn = document.getElementById('openTermsBtn');
    const closeBtns = document.querySelectorAll('.close-modal-trigger');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('is-open');
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('is-open');
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('is-open');
        }
    });
}

/* ==========================================
   9. Social Auth Mock Handlers
   ========================================== */
function initSocialAuthButtons() {
    const socialBtns = document.querySelectorAll('.btn-social');
    socialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.getAttribute('data-provider') || 'Social Account';
            showToast(`Connecting to ${provider} authentication...`, 'info');
        });
    });
}

/* ==========================================
   10. UI Utility Functions (Loading & Toast)
   ========================================== */
function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.classList.add('is-loading');
        button.disabled = true;
    } else {
        button.classList.remove('is-loading');
        button.disabled = false;
    }
}

function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger reflow to start transition
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
