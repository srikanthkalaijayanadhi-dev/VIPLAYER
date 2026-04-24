document.addEventListener('DOMContentLoaded', () => {
  const isWatchPage = document.body.dataset.page === 'watch';

  if (isWatchPage) {
    initWatchPage();
  } else {
    initAdminPage();
  }
});

function initAdminPage() {
  const form = document.getElementById('publishForm');
  const publishBtn = document.getElementById('publishBtn');
  const resultBox = document.getElementById('resultBox');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  const copyGroup = document.getElementById('copyGroup');
  const watchUrlInput = document.getElementById('watchUrl');
  const copyBtn = document.getElementById('copyBtn');

  if (!form) return;

  function showResult(isSuccess, title, message, url = '') {
    resultBox.style.display = 'block';
    
    if (isSuccess) {
      resultBox.classList.remove('error');
      resultTitle.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ${title}`;
      copyGroup.style.display = 'flex';
      watchUrlInput.value = url;
    } else {
      resultBox.classList.add('error');
      resultTitle.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${title}`;
      copyGroup.style.display = 'none';
      watchUrlInput.value = '';
    }
    
    resultMessage.textContent = message;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('adminPass').value;
    const embedCode = document.getElementById('embedCode').value;

    resultBox.style.display = 'none';
    publishBtn.classList.add('loading');
    publishBtn.disabled = true;

    try {
      if (password !== 'secret123') {
        throw new Error('Unauthorized: Invalid Admin Password!');
      }

      // Direct Upstash REST API Call (Frontend-only publish)
      const id = 'vid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      const UPSTASH_URL = "https://glorious-beagle-83532.upstash.io";
      const UPSTASH_TOKEN = "gQAAAAAAAUZMAAIgcDFkOTZmM2I1NjczOGE0ODFkYWJkYjgxNzU0ZGMyMmNiMw";

      const payload = { embedCode, createdAt: new Date().toISOString() };

      const response = await fetch(`${UPSTASH_URL}/set/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Upstash failed to respond. Response: ${responseText.slice(0,30)}...`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      let basePath = window.location.pathname;
      if (basePath.endsWith('index.html') || basePath.endsWith('/')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/'));
      }
      const watchUrl = `${window.location.origin}${basePath}/watch.html?id=${id}`;
      showResult(true, 'Published Successfully!', 'Share this secure link to allow viewing:', watchUrl);
      document.getElementById('embedCode').value = '';

    } catch (err) {
      showResult(false, 'Publish Failed', err.message);
    } finally {
      publishBtn.classList.remove('loading');
      publishBtn.disabled = false;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      watchUrlInput.select();
      document.execCommand('copy');
      
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    });
  }
}

async function initWatchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');
  
  const loading = document.getElementById('viewerLoading');
  const errorBox = document.getElementById('viewerError');
  const wrapper = document.getElementById('videoWrapper');

  if (!videoId) {
    loading.style.display = 'none';
    errorBox.style.display = 'block';
    return;
  }

  try {
    // Direct Upstash GET using Read-Only Token
    const UPSTASH_URL = "https://glorious-beagle-83532.upstash.io";
    const READONLY_TOKEN = "ggAAAAAAAUZMAAIgcDFbdPAc2Rau2gMipDboRE3W6lVSK9jBbn1GNAUmbjUV6g";
    
    const response = await fetch(`${UPSTASH_URL}/get/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${READONLY_TOKEN}`
      }
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.result) {
      throw new Error('Video not found or link expired.');
    }

    let videoData;
    // Upstash returns JSON stringified content in the result field sometimes, or raw object if stored properly.
    try {
      videoData = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    } catch(e) {
      videoData = data.result; // fallback
    }

    loading.style.display = 'none';
    wrapper.innerHTML = videoData.embedCode;
    wrapper.style.display = 'block';

  } catch (err) {
    loading.style.display = 'none';
    errorBox.querySelector('p').textContent = err.message;
    errorBox.style.display = 'block';
  }
}
