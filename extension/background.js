// CryptLock Extension Background Script

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('CryptLock Password Saver installed successfully');
});

// Handle service worker startup
self.addEventListener('activate', (event) => {
  console.log('CryptLock service worker activated');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request.action);
  
  if (request.action === 'openDashboard') {
    handleOpenDashboard(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  return false;
});

// Handle opening dashboard page
async function handleOpenDashboard(sendResponse) {
  try {
    console.log('Opening CryptLock dashboard page...');
    
    // Check if CryptLock tab is already open
    const cryptlockTabs = await findCryptLockTabs();
    
    let targetUrl;
    
    if (cryptlockTabs.length > 0) {
      console.log('Found existing CryptLock tab, focusing it...');
      // Use the same domain as existing tab and navigate to dashboard
      const existingUrl = new URL(cryptlockTabs[0].url);
      targetUrl = `${existingUrl.origin}/dashboard`;
      
      const tab = cryptlockTabs[0];
      await chrome.tabs.update(tab.id, { 
        active: true,
        url: targetUrl
      });
      await chrome.windows.update(tab.windowId, { focused: true });
      sendResponse({ success: true });
    } else {
      console.log('No existing CryptLock tab found, opening new tab...');
      // Default to main production domain
      targetUrl = 'https://cryptlock.me/dashboard';
      
      // Open new CryptLock dashboard tab
      const tab = await chrome.tabs.create({ 
        url: targetUrl,
        active: true
      });
      
      if (tab) {
        console.log('CryptLock dashboard tab created successfully:', tab.id);
        sendResponse({ success: true, tabId: tab.id });
      } else {
        throw new Error('Failed to create tab');
      }
    }
  } catch (error) {
    console.error('Error opening dashboard:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Find existing CryptLock tabs (simplified)
async function findCryptLockTabs() {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'http://localhost:3000/*', 
        'https://cryptlock-chi.vercel.app/*',
        'https://cryptlock.me/*'
      ]
    });
    console.log(`Found ${tabs.length} CryptLock tabs`);
    return tabs;
  } catch (error) {
    console.error('Error finding CryptLock tabs:', error);
    return [];
  }
} 