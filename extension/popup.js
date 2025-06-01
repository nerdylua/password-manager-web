// CryptLock Extension Popup Script
document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
});

function initializePopup() {
  // Setup event listeners
  document.getElementById('openDashboard').addEventListener('click', openDashboard);
  document.getElementById('generatePassword').addEventListener('click', generatePassword);
  document.getElementById('viewSettings').addEventListener('click', viewSettings);
  
  // Check connection status
  checkCryptLockConnection();
}

// Open CryptLock dashboard
async function openDashboard(e) {
  e.preventDefault();
  
  try {
    // Check if user already has a CryptLock tab open to use the same domain
    const existingTabs = await chrome.tabs.query({
      url: [
        'http://localhost:3000/*', 
        'https://cryptlock-chi.vercel.app/*',
        'https://cryptlock.me/*'
      ]
    });
    
    let targetUrl;
    
    if (existingTabs.length > 0) {
      // Use the same domain as existing tab
      const existingUrl = new URL(existingTabs[0].url);
      targetUrl = `${existingUrl.origin}/dashboard`;
    } else {
      // Default to main production domain
      targetUrl = 'https://cryptlock.me/dashboard';
    }
    
    chrome.tabs.create({ url: targetUrl });
    window.close();
  } catch (error) {
    // Fallback to main domain
    chrome.tabs.create({ url: 'https://cryptlock.me/dashboard' });
    window.close();
  }
}

// Generate a strong password
function generatePassword(e) {
  e.preventDefault();
  
  const password = generateSecurePassword();
  
  // Copy to clipboard
  navigator.clipboard.writeText(password).then(() => {
    showStatus('Password copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = password;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showStatus('Password copied to clipboard!', 'success');
  });
}

// Generate a cryptographically secure password
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  password += getRandomChar(lowercase);
  password += getRandomChar(uppercase);
  password += getRandomChar(numbers);
  password += getRandomChar(symbols);
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += getRandomChar(charset);
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Get a cryptographically random character from charset
function getRandomChar(charset) {
  const array = new Uint8Array(1);
  crypto.getRandomValues(array);
  return charset[array[0] % charset.length];
}

// View extension settings
function viewSettings(e) {
  e.preventDefault();
  
  // For now, just show info about the extension
  showStatus('Extension settings coming soon!', 'info');
  
  // Future: Open settings page
  // chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}

// Check if CryptLock is accessible
async function checkCryptLockConnection() {
  const statusElement = document.getElementById('connectionStatus');
  
  try {
    // Try to find CryptLock tabs
    const tabs = await chrome.tabs.query({
      url: [
        'http://localhost:3000/*', 
        'https://cryptlock-chi.vercel.app/*',
        'https://cryptlock.me/*'
      ]
    });
    
    if (tabs.length > 0) {
      statusElement.textContent = 'Connected to CryptLock';
      statusElement.className = 'status connected';
    } else {
      statusElement.textContent = 'Click "Open Dashboard" to connect';
      statusElement.className = 'status disconnected';
    }
  } catch (error) {
    statusElement.textContent = 'Connection check failed';
    statusElement.className = 'status disconnected';
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('connectionStatus');
  const originalText = statusElement.textContent;
  const originalClass = statusElement.className;
  
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  
  // Revert after 2 seconds
  setTimeout(() => {
    statusElement.textContent = originalText;
    statusElement.className = originalClass;
  }, 2000);
}

// Listen for extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatus') {
    showStatus(request.message, request.type);
  }
}); 