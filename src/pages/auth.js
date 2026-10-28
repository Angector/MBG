// === FILE: src/pages/auth.js ===
// Project: Mobogram — Phase 15: Auth Page
// Purpose: Authentication page logic - login/register forms, validation, submission

// ===== SECTION 0: Imports =====
import { ROUTES } from '../config.js';
import { t, applyTranslations } from '../i18n.js';
import { $, createEl, validateEmail, validatePassword, validateFullName } from '../utils.js';
import { signIn, signUp } from '../services/auth.service.js';
import { showToast } from '../ui/primitives.js';

// ===== SECTION 1: Init & Tab Switching =====

/** @type {'login'|'register'} */
let mode = 'login';

/**
 * Initialize auth page.
 * Sets up tab switching and renders initial form.
 */
function init() {
  applyTranslations();

  // Setup tab switching
  const tabs = $$('.auth-tabs__tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      if (newMode === mode) return;

      mode = newMode;

      // Update active tab
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      // Render appropriate form
      renderForm();
    });
  });

  // Render initial form
  renderForm();
}

// ===== SECTION 2: Form Rendering =====

/**
 * Render the appropriate form based on current mode.
 */
function renderForm() {
  const container = $('#auth-form-container');
  container.innerHTML = '';

  // Hide success message if showing
  $('#auth-success').hidden = true;

  if (mode === 'login') {
    renderLoginForm(container);
  } else {
    renderRegisterForm(container);
  }
}

/**
 * Render login form.
 * @param {HTMLElement} container
 */
function renderLoginForm(container) {
  const form = createEl('form', { className: 'auth-form' });

  // Email field
  const emailGroup = createEl('div', { className: 'form-group' });
  const emailLabel = createEl('label', { className: 'form-label', textContent: t('auth.email') || 'ایمیل' });
  const emailInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'email',
      name: 'email',
      required: '',
      autocomplete: 'email',
      placeholder: t('auth.emailPlaceholder') || 'example@email.com',
    },
  });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  form.appendChild(emailGroup);

  // Password field
  const passwordGroup = createEl('div', { className: 'form-group' });
  const passwordLabel = createEl('label', { className: 'form-label', textContent: t('auth.password') || 'رمز عبور' });
  const passwordInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'password',
      name: 'password',
      required: '',
      autocomplete: 'current-password',
      placeholder: t('auth.passwordPlaceholder') || '••••••••',
    },
  });
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  form.appendChild(passwordGroup);

  // Submit button
  const submitBtn = createEl('button', {
    className: 'btn btn--primary btn--block',
    textContent: t('auth.login') || 'ورود',
    attrs: { type: 'submit' },
  });
  form.appendChild(submitBtn);

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(form, submitBtn);
  });

  container.appendChild(form);
}

/**
 * Render register form.
 * @param {HTMLElement} container
 */
function renderRegisterForm(container) {
  const form = createEl('form', { className: 'auth-form' });

  // Full name field
  const nameGroup = createEl('div', { className: 'form-group' });
  const nameLabel = createEl('label', { className: 'form-label', textContent: t('auth.fullName') || 'نام و نام خانوادگی' });
  const nameInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'text',
      name: 'fullName',
      required: '',
      autocomplete: 'name',
      placeholder: t('auth.fullNamePlaceholder') || 'نام کامل خود را وارد کنید',
    },
  });
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // Email field
  const emailGroup = createEl('div', { className: 'form-group' });
  const emailLabel = createEl('label', { className: 'form-label', textContent: t('auth.email') || 'ایمیل' });
  const emailInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'email',
      name: 'email',
      required: '',
      autocomplete: 'email',
      placeholder: t('auth.emailPlaceholder') || 'example@email.com',
    },
  });
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  form.appendChild(emailGroup);

  // Password field
  const passwordGroup = createEl('div', { className: 'form-group' });
  const passwordLabel = createEl('label', { className: 'form-label', textContent: t('auth.password') || 'رمز عبور' });
  const passwordInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'password',
      name: 'password',
      required: '',
      autocomplete: 'new-password',
      placeholder: t('auth.passwordPlaceholder') || '••••••••',
    },
  });
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  form.appendChild(passwordGroup);

  // Submit button
  const submitBtn = createEl('button', {
    className: 'btn btn--primary btn--block',
    textContent: t('auth.register') || 'ثبت‌نام',
    attrs: { type: 'submit' },
  });
  form.appendChild(submitBtn);

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(form, submitBtn);
  });

  container.appendChild(form);
}

// ===== SECTION 3: Submit Logic =====

/**
 * Handle form submission.
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} submitBtn
 */
async function handleSubmit(form, submitBtn) {
  // Prevent double submission
  if (submitBtn.hasAttribute('aria-busy')) return;

  // Get form data
  const formData = new FormData(form);
  const email = formData.get('email')?.toString().trim() || '';
  const password = formData.get('password')?.toString() || '';
  const fullName = formData.get('fullName')?.toString().trim() || '';

  // Validate
  const errors = [];

  if (mode === 'register' && fullName) {
    const nameValidation = validateFullName(fullName);
    if (!nameValidation.valid) {
      errors.push(nameValidation.message || t('validation.fullName.short'));
    }
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.push(emailValidation.message || t('validation.email.invalid'));
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.push(passwordValidation.message || t('validation.password.short'));
  }

  if (errors.length > 0) {
    showToast({ message: errors[0], variant: 'error' });
    return;
  }

  // Show loading state
  submitBtn.setAttribute('aria-busy', 'true');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = t('common.loading') || 'در حال پردازش...';

  try {
    if (mode === 'login') {
      // Sign in
      await signIn({ email, password });
      showToast({ message: t('auth.loginSuccess') || 'با موفقیت وارد شدید', variant: 'success' });

      // Redirect to home or intended destination
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || ROUTES.home;
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
    } else {
      // Sign up
      const { needsEmailConfirmation } = await signUp({ email, password, fullName });

      if (needsEmailConfirmation) {
        // Show success message
        showSuccessMessage(t('auth.emailConfirmationSent') || 'لینک تأیید به ایمیل شما ارسال شد. لطفاً ایمیل خود را بررسی کنید.');
      } else {
        showToast({ message: t('auth.registerSuccess') || 'با موفقیت ثبت‌نام کردید', variant: 'success' });

        // Redirect to home
        setTimeout(() => {
          window.location.href = ROUTES.home;
        }, 1000);
      }
    }
  } catch (err) {
    console.error('Auth error:', err);
    showToast({ message: err.message || t('errors.authFailed') || 'خطا در احراز هویت', variant: 'error' });

    // Reset button state
    submitBtn.removeAttribute('aria-busy');
    submitBtn.textContent = originalText;
  }
}

/**
 * Show success message (e.g., email confirmation).
 * @param {string} message
 */
function showSuccessMessage(message) {
  const container = $('#auth-form-container');
  const successContainer = $('#auth-success');

  container.hidden = true;
  successContainer.innerHTML = '';

  const icon = createEl('div', { className: 'auth-success__icon' });
  icon.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;
  successContainer.appendChild(icon);

  const title = createEl('h2', {
    className: 'auth-success__title',
    textContent: t('auth.checkEmail') || 'ایمیل خود را بررسی کنید',
  });
  successContainer.appendChild(title);

  const messageEl = createEl('p', {
    className: 'auth-success__message',
    textContent: message,
  });
  successContainer.appendChild(messageEl);

  const backBtn = createEl('a', {
    className: 'btn btn--secondary',
    textContent: t('auth.backToLogin') || 'بازگشت به ورود',
    attrs: { href: 'auth.html' },
  });
  successContainer.appendChild(backBtn);

  successContainer.hidden = false;
}

// ===== SECTION 4: Start =====

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
