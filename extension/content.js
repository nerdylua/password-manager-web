// CryptLock Extension Content Script
(function() {
  'use strict';

  // Don't run on CryptLock domains to avoid conflicts
  const currentDomain = window.location.hostname;
  const currentPort = window.location.port;
  const cryptlockDomains = [
    'localhost',
    '127.0.0.1',
    'cryptlock-chi.vercel.app',
    'cryptlock.me'
  ];

  // Check if we're on a CryptLock domain
  const isCryptLockDomain = cryptlockDomains.some(domain => 
    currentDomain === domain || currentDomain.endsWith('.' + domain)
  );

  // Also check for localhost with port 3000 (development)
  const isLocalDev = (currentDomain === 'localhost' || currentDomain === '127.0.0.1') && 
                    (currentPort === '3000' || currentPort === '3001');

  // Exit early if we're on CryptLock website
  if (isCryptLockDomain || isLocalDev) {
    console.log('CryptLock extension: Skipping on CryptLock domain');
    return;
  }

  let cryptlockButton = null;
  let currentPasswordField = null;
  let currentUsernameField = null;

  // Initialize the extension
  function init() {
    detectPasswordFields();
    observePageChanges();
  }

  // Detect password input fields on the page
  function detectPasswordFields() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(field => {
      if (!field.dataset.cryptlockProcessed) {
        field.dataset.cryptlockProcessed = 'true';
        setupPasswordFieldListener(field);
      }
    });
  }

  // Setup listeners for password fields
  function setupPasswordFieldListener(passwordField) {
    passwordField.addEventListener('input', function() {
      if (this.value.length > 0) {
        currentPasswordField = this;
        currentUsernameField = findUsernameField(this);
        showCryptLockButton(this);
      } else {
        hideCryptLockButton();
      }
    });

    passwordField.addEventListener('blur', function() {
      // Delay hiding to allow button click
      setTimeout(() => {
        if (!isButtonHovered()) {
          hideCryptLockButton();
        }
      }, 200);
    });
  }

  // Find the username/email field near the password field
  function findUsernameField(passwordField) {
    const form = passwordField.closest('form');
    if (!form) return null;

    // Look for email or username fields
    const possibleSelectors = [
      'input[type="email"]',
      'input[type="text"][name*="user"]',
      'input[type="text"][name*="email"]',
      'input[type="text"][id*="user"]',
      'input[type="text"][id*="email"]',
      'input[type="text"][placeholder*="email"]',
      'input[type="text"][placeholder*="username"]'
    ];

    for (const selector of possibleSelectors) {
      const field = form.querySelector(selector);
      if (field && field.value) {
        return field;
      }
    }

    return null;
  }

  // Show the CryptLock save button
  function showCryptLockButton(passwordField) {
    if (cryptlockButton) {
      hideCryptLockButton();
    }

    cryptlockButton = document.createElement('div');
    cryptlockButton.id = 'cryptlock-save-button';
    cryptlockButton.innerHTML = `
      <div class="cryptlock-button-container">
        <button class="cryptlock-save-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
          </svg>
          Open CryptLock Dashboard and save
        </button>
      </div>
    `;

    // Position the button near the password field
    const rect = passwordField.getBoundingClientRect();
    cryptlockButton.style.position = 'fixed';
    cryptlockButton.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    cryptlockButton.style.left = (rect.left + window.scrollX) + 'px';
    cryptlockButton.style.zIndex = '10000';

    document.body.appendChild(cryptlockButton);

    // Add click listener
    const saveBtn = cryptlockButton.querySelector('.cryptlock-save-btn');
    saveBtn.addEventListener('click', handleSavePassword);

    // Track hover state
    cryptlockButton.addEventListener('mouseenter', () => {
      cryptlockButton.dataset.hovered = 'true';
    });
    
    cryptlockButton.addEventListener('mouseleave', () => {
      cryptlockButton.dataset.hovered = 'false';
    });
  }

  // Hide the CryptLock save button
  function hideCryptLockButton() {
    if (cryptlockButton) {
      cryptlockButton.remove();
      cryptlockButton = null;
    }
  }

  // Check if button is being hovered
  function isButtonHovered() {
    return cryptlockButton && cryptlockButton.dataset.hovered === 'true';
  }

  // Handle password save action
  function handleSavePassword() {
    if (!currentPasswordField || !currentPasswordField.value) {
      showNotification('No password to save', 'error');
      return;
    }

    // Show success notification and redirect to dashboard
    showNotification('Opening CryptLock dashboard - navigate to vault to add your password', 'success');
    
    // Simple redirect to dashboard page
    chrome.runtime.sendMessage({
      action: 'openDashboard'
    }, (response) => {
      if (response && response.success) {
        // Additional success feedback
        setTimeout(() => {
          showNotification('CryptLock dashboard opened in new tab', 'info');
        }, 1000);
      } else {
        // Fallback - direct window open (will use main production domain)
        showNotification('Opening CryptLock dashboard...', 'info');
        window.open('https://cryptlock.me/dashboard', '_blank');
      }
    });

    hideCryptLockButton();
  }

  // Show notification to user
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `cryptlock-notification cryptlock-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Observe page changes for SPAs
  function observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Re-scan for new password fields
          setTimeout(detectPasswordFields, 100);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(); 