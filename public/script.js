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
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ embedCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish video');
      }

      const watchUrl = `${window.location.origin}/watch?id=${data.id}`;
      showResult(true, 'Published Successfully!', 'Share this secure link to allow viewing:', watchUrl);
      
      // Clear form
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
    const response = await fetch(`/api/video?id=${videoId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Video not found');
    }

    loading.style.display = 'none';
    wrapper.innerHTML = data.embedCode;
    wrapper.style.display = 'block';

  } catch (err) {
    loading.style.display = 'none';
    errorBox.querySelector('p').textContent = err.message;
    errorBox.style.display = 'block';
  }
}
