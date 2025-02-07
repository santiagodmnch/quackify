let recentEmails = [];

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#f44336' : '#4CAF50';
  setTimeout(() => {
    status.textContent = '';
  }, 2000);
}

async function copyToClipboard(email) {
  try {
    await navigator.clipboard.writeText(email);
    showStatus('Copied!');
  } catch (error) {
    showStatus('Failed to copy', true);
  }
}

function updateRecentEmails(showAll = false) {
  const container = document.getElementById('recent-emails');
  if (recentEmails.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #666; padding: 20px;">
        No emails generated yet
      </div>
    `;
    return;
  }
  
  const displayEmails = showAll ? recentEmails : recentEmails.slice(0, 3);
  
  container.innerHTML = `
    ${displayEmails
      .map(item => `
        <div class="email-item">
          <div class="email-details">
            <span class="email-text">${item.address}</span>
            <span class="email-site">${item.site}</span>
          </div>
          <button class="copy-btn" data-email="${item.address}" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </button>
        </div>
      `)
      .join('')}
    ${!showAll && recentEmails.length > 3 ? `
      <button id="viewAll" class="view-all-btn">
        View all (${recentEmails.length})
      </button>
    ` : ''}
  `;

  // Add click listeners to copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      copyToClipboard(btn.dataset.email);
    });
  });

  // Add view all button listener
  const viewAllBtn = document.getElementById('viewAll');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      updateRecentEmails(true);
    });
  }
}

async function generateEmail() {
  try {
    const { authToken } = await browser.storage.sync.get('authToken');
    
    if (!authToken) {
      showStatus('Please set your authorization token in settings', true);
      return;
    }

    const response = await fetch('https://quack.duckduckgo.com/api/email/addresses', {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Authorization': authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
        'Sec-GPC': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Priority': 'u=0',
        'Content-Type': 'application/json'
      },
      referrer: 'https://duckduckgo.com/'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to generate email address (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.address) {
      throw new Error('Invalid response from server: missing address');
    }

    const email = `${data.address}@duck.com`;
    
    // Get current tab info and safely parse URL
    const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    let site = 'unknown';
    
    try {
      if (currentTab?.url) {
        const urlObj = new URL(currentTab.url);
        site = urlObj.hostname || 'unknown';
      }
    } catch (urlError) {
      console.error('Error parsing URL:', urlError);
      site = 'invalid-url';
    }
    
    // Add to recent emails with site info
    recentEmails.unshift({
      address: email,
      site: site,
      date: new Date().toISOString()
    });
    if (recentEmails.length > 10) {
      recentEmails.pop();
    }
    
    // Save to storage
    await browser.storage.local.set({ recentEmails });
    
    // Update display
    updateRecentEmails();
    
    // Copy to clipboard
    await copyToClipboard(email);
    
  } catch (error) {
    console.error('Error details:', error);
    showStatus(error.message, true);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load recent emails
  const result = await browser.storage.local.get('recentEmails');
  recentEmails = result.recentEmails || [];
  updateRecentEmails();
  
  // Add generate button listener
  document.getElementById('generate').addEventListener('click', generateEmail);
  
  // Add settings link listener
  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
}); 