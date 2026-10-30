/**
 * Family Cinema - Progressive Web App
 * Designed for frictionless streaming by parents on Android & Mobile Web
 * Supports 100% Free Mode (No Google Cloud API Key or Billing required)
 */

// Application State
const state = {
  apiKey: localStorage.getItem('fc_api_key') || (typeof CONFIG !== 'undefined' ? CONFIG.API_KEY : '') || '',
  rootFolderId: localStorage.getItem('fc_root_folder_id') || (typeof CONFIG !== 'undefined' ? CONFIG.ROOT_FOLDER_ID : '') || '1yl4nMX4s1WmlRpcXFZFZuQ_PS1bhO4_Z',
  currentFolderId: '',
  breadcrumbs: [], // Stack of { id, name }
  files: [],       // Current folder items
  recentlyWatched: JSON.parse(localStorage.getItem('fc_recent_watched') || '[]'),
  currentPlayingFile: null
};

// DOM Elements
const elements = {
  homeBtn: document.getElementById('homeBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  breadcrumbs: document.getElementById('breadcrumbs'),
  setupNotice: document.getElementById('setupNotice'),
  openConfigBtn: document.getElementById('openConfigBtn'),
  recentSection: document.getElementById('recentSection'),
  recentGrid: document.getElementById('recentGrid'),
  clearRecentBtn: document.getElementById('clearRecentBtn'),
  librarySection: document.getElementById('librarySection'),
  currentCategoryTitle: document.getElementById('currentCategoryTitle'),
  itemCountBadge: document.getElementById('itemCountBadge'),
  loadingSkeleton: document.getElementById('loadingSkeleton'),
  emptyNotice: document.getElementById('emptyNotice'),
  emptyMessage: document.getElementById('emptyMessage'),
  mediaGrid: document.getElementById('mediaGrid'),
  // Sticky Player Elements
  playerSection: document.getElementById('playerSection'),
  nowPlayingTitle: document.getElementById('nowPlayingTitle'),
  videoIframe: document.getElementById('videoIframe'),
  closePlayerBtn: document.getElementById('closePlayerBtn'),
  playerVlcFallbackBtn: document.getElementById('playerVlcFallbackBtn'),
  // Settings Modal Elements
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  cfgApiKey: document.getElementById('cfgApiKey'),
  cfgFolderId: document.getElementById('cfgFolderId'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  toast: document.getElementById('toast')
};

// ==========================================
// PWA Service Worker Registration
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Family Cinema SW Registered:', reg.scope))
      .catch((err) => console.warn('Family Cinema SW Registration Failed:', err));
  });
}

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  renderRecentlyWatched();

  if (!state.rootFolderId) {
    showSetupNotice(true);
    showSkeleton(false);
  } else {
    state.currentFolderId = state.rootFolderId;
    state.breadcrumbs = [{ id: state.rootFolderId, name: '🏠 Home' }];
    renderBreadcrumbs();
    loadFolder(state.currentFolderId);
  }
});

// ==========================================
// Event Listeners
// ==========================================
function initEventListeners() {
  elements.homeBtn.addEventListener('click', () => {
    if (!state.rootFolderId) return;
    state.currentFolderId = state.rootFolderId;
    state.breadcrumbs = [{ id: state.rootFolderId, name: '🏠 Home' }];
    renderBreadcrumbs();
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    loadFolder(state.currentFolderId);
  });

  elements.refreshBtn.addEventListener('click', () => {
    if (state.currentFolderId) {
      showToast('Refreshing catalog...');
      loadFolder(state.currentFolderId);
    }
  });

  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.openConfigBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  elements.closePlayerBtn.addEventListener('click', closePlayer);

  // Search input live filtering
  elements.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    elements.clearSearchBtn.classList.toggle('hidden', query.length === 0);
    filterAndRender(query);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    filterAndRender('');
    elements.searchInput.focus();
  });

  elements.clearRecentBtn.addEventListener('click', () => {
    state.recentlyWatched = [];
    localStorage.removeItem('fc_recent_watched');
    renderRecentlyWatched();
    showToast('Recently watched history cleared');
  });
}

// ==========================================
// API & Data Fetching (Dual Mode: Free / API)
// ==========================================
async function loadFolder(folderId) {
  showSkeleton(true);
  elements.emptyNotice.classList.add('hidden');
  elements.mediaGrid.innerHTML = '';

  // Mode 1: If an API Key is available, use Google Drive API v3
  if (state.apiKey) {
    try {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink,size,createdTime)');
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${state.apiKey}&fields=${fields}&pageSize=1000&orderBy=folder,name`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API Error (${res.status})`);
      }

      const data = await res.json();
      const allFiles = data.files || [];

      state.files = allFiles.filter(f => {
        if (f.mimeType === 'application/vnd.google-apps.folder') return true;
        const name = (f.name || '').toLowerCase();
        return (
          f.mimeType.startsWith('video/') ||
          name.endsWith('.mp4') ||
          name.endsWith('.mkv') ||
          name.endsWith('.webm') ||
          name.endsWith('.avi') ||
          name.endsWith('.mov')
        );
      });

      renderMediaGrid(state.files);
      showSkeleton(false);
      return;
    } catch (err) {
      console.warn('Google Drive API failed, falling back to free catalog mode:', err);
    }
  }

  // Mode 2: 100% Free Mode (Using preloaded folder items and direct parsing)
  try {
    if (typeof CONFIG !== 'undefined' && Array.isArray(CONFIG.DEFAULT_CATALOG) && CONFIG.DEFAULT_CATALOG.length > 0) {
      state.files = CONFIG.DEFAULT_CATALOG;
      renderMediaGrid(state.files);
    } else {
      elements.emptyNotice.classList.remove('hidden');
      elements.emptyMessage.innerHTML = `No videos found.`;
    }
  } catch (err) {
    console.error('Free mode error:', err);
    elements.emptyNotice.classList.remove('hidden');
    elements.emptyMessage.innerHTML = `⚠️ Could not load folder.<br><small>${escapeHtml(err.message)}</small>`;
  } finally {
    showSkeleton(false);
  }
}

// ==========================================
// Rendering Media Cards & Grid
// ==========================================
function filterAndRender(query) {
  if (!query) {
    renderMediaGrid(state.files);
    return;
  }
  const filtered = state.files.filter(f => f.name.toLowerCase().includes(query));
  renderMediaGrid(filtered);
}

function renderMediaGrid(items) {
  elements.mediaGrid.innerHTML = '';
  elements.itemCountBadge.textContent = `${items.length} ${items.length === 1 ? 'movie' : 'movies'}`;

  if (items.length === 0) {
    elements.emptyNotice.classList.remove('hidden');
    elements.emptyMessage.textContent = elements.searchInput.value 
      ? 'No movies match your search.' 
      : 'This folder is empty or contains no supported video files.';
    return;
  }

  elements.emptyNotice.classList.add('hidden');
  items.forEach(item => {
    const card = createMediaCard(item);
    elements.mediaGrid.appendChild(card);
  });
}

function createMediaCard(item) {
  const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
  const card = document.createElement('div');
  card.className = 'media-card';

  // Thumbnail generation (works completely free without API key)
  let thumbHtml = '';
  if (isFolder) {
    thumbHtml = `
      <div class="card-thumbnail-wrap">
        <div class="card-thumb-fallback">📁</div>
        <span class="folder-indicator">Category / Folder</span>
      </div>
    `;
  } else {
    // Direct public Google Drive thumbnail endpoint
    const thumbUrl = item.thumbnailLink 
      ? item.thumbnailLink.replace(/=s\d+/, '=s600') 
      : `https://drive.google.com/thumbnail?id=${item.id}&sz=w600`;
    
    const formattedSize = item.size ? (typeof item.size === 'string' && item.size.includes('B') ? item.size : formatFileSize(item.size)) : '';
    const ext = getExtension(item.name);

    thumbHtml = `
      <div class="card-thumbnail-wrap">
        <img class="card-thumb" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="card-thumb-fallback" style="display:none;">🎬</div>
        ${ext ? `<span class="format-badge">${escapeHtml(ext)}</span>` : ''}
        ${formattedSize ? `<span class="size-badge">${escapeHtml(formattedSize)}</span>` : ''}
      </div>
    `;
  }

  // Card body & parent-friendly large buttons
  let actionButtonsHtml = '';
  if (isFolder) {
    actionButtonsHtml = `
      <button class="btn-open-folder" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">
        <span>📂 Open Folder</span>
      </button>
    `;
  } else {
    const vlcIntentUrl = generateVlcIntentUrl(item.id, item.name);
    actionButtonsHtml = `
      <button class="btn-play-primary" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">
        <span>▶ Play Now</span>
      </button>
      <a class="btn-vlc-secondary" href="${vlcIntentUrl}" target="_blank" rel="noopener" data-vlc-id="${escapeHtml(item.id)}">
        <span>🟠 Open in VLC</span>
      </a>
    `;
  }

  card.innerHTML = `
    ${thumbHtml}
    <div class="card-body">
      <div class="card-title" title="${escapeHtml(item.name)}">${escapeHtml(cleanFileName(item.name))}</div>
      <div class="card-actions">
        ${actionButtonsHtml}
      </div>
    </div>
  `;

  // Attach event handlers
  if (isFolder) {
    const openBtn = card.querySelector('.btn-open-folder');
    openBtn.addEventListener('click', () => {
      openFolder(item.id, item.name);
    });
  } else {
    const playBtn = card.querySelector('.btn-play-primary');
    playBtn.addEventListener('click', () => {
      playVideo(item);
    });

    const vlcBtn = card.querySelector('.btn-vlc-secondary');
    vlcBtn.addEventListener('click', () => {
      addToRecentlyWatched(item);
    });
  }

  return card;
}

// ==========================================
// Folder Navigation & Breadcrumbs
// ==========================================
function openFolder(folderId, folderName) {
  state.currentFolderId = folderId;
  state.breadcrumbs.push({ id: folderId, name: folderName });
  renderBreadcrumbs();
  elements.searchInput.value = '';
  elements.clearSearchBtn.classList.add('hidden');
  loadFolder(folderId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderBreadcrumbs() {
  elements.breadcrumbs.innerHTML = '';
  state.breadcrumbs.forEach((crumb, index) => {
    const isLast = index === state.breadcrumbs.length - 1;
    const btn = document.createElement('button');
    btn.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
    btn.textContent = cleanFileName(crumb.name);
    
    btn.addEventListener('click', () => {
      if (!isLast) {
        state.breadcrumbs = state.breadcrumbs.slice(0, index + 1);
        state.currentFolderId = crumb.id;
        renderBreadcrumbs();
        elements.searchInput.value = '';
        elements.clearSearchBtn.classList.add('hidden');
        loadFolder(crumb.id);
      }
    });

    elements.breadcrumbs.appendChild(btn);
  });

  const currentTitle = state.breadcrumbs[state.breadcrumbs.length - 1]?.name || 'Movies';
  elements.currentCategoryTitle.textContent = cleanFileName(currentTitle);
}

// ==========================================
// Video Playback Logic
// ==========================================
function playVideo(file) {
  state.currentPlayingFile = file;

  // Update In-App Player UI
  elements.nowPlayingTitle.textContent = cleanFileName(file.name);
  elements.videoIframe.src = `https://drive.google.com/file/d/${file.id}/preview`;
  elements.playerVlcFallbackBtn.href = generateVlcIntentUrl(file.id, file.name);

  elements.playerSection.classList.remove('hidden');

  // Scroll to video player smoothly so parents don't miss it
  elements.playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  addToRecentlyWatched(file);
}

function closePlayer() {
  elements.videoIframe.src = '';
  elements.playerSection.classList.add('hidden');
  state.currentPlayingFile = null;
}

/**
 * Constructs an Android Intent URI that streams the file inside VLC for Android.
 * Works whether an API key exists or directly via Drive preview link.
 */
function generateVlcIntentUrl(fileId, fileName) {
  const streamUrl = state.apiKey 
    ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${state.apiKey}`
    : `https://drive.google.com/uc?export=download&id=${fileId}`;

  const ext = getExtension(fileName).toLowerCase();
  
  let mimeType = 'video/*';
  if (ext === 'mkv') mimeType = 'video/x-matroska';
  else if (ext === 'mp4') mimeType = 'video/mp4';

  return `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=${mimeType};package=org.videolan.vlc;end`;
}

// ==========================================
// Recently Watched (localStorage)
// ==========================================
function addToRecentlyWatched(file) {
  state.recentlyWatched = state.recentlyWatched.filter(item => item.id !== file.id);
  state.recentlyWatched.unshift({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumbnailLink: file.thumbnailLink,
    size: file.size,
    watchedAt: new Date().toISOString()
  });

  if (state.recentlyWatched.length > 6) {
    state.recentlyWatched = state.recentlyWatched.slice(0, 6);
  }

  localStorage.setItem('fc_recent_watched', JSON.stringify(state.recentlyWatched));
  renderRecentlyWatched();
}

function renderRecentlyWatched() {
  if (!state.recentlyWatched || state.recentlyWatched.length === 0) {
    elements.recentSection.classList.add('hidden');
    elements.recentGrid.innerHTML = '';
    return;
  }

  elements.recentSection.classList.remove('hidden');
  elements.recentGrid.innerHTML = '';

  state.recentlyWatched.forEach(item => {
    const card = createMediaCard(item);
    elements.recentGrid.appendChild(card);
  });
}

// ==========================================
// Settings Modal & Configuration
// ==========================================
function openSettingsModal() {
  elements.cfgApiKey.value = state.apiKey;
  elements.cfgFolderId.value = state.rootFolderId;
  elements.settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  elements.settingsModal.classList.add('hidden');
}

function saveSettings() {
  const newApiKey = elements.cfgApiKey.value.trim();
  const newFolderId = elements.cfgFolderId.value.trim();

  state.apiKey = newApiKey;
  if (newFolderId) {
    state.rootFolderId = newFolderId;
    state.currentFolderId = newFolderId;
    state.breadcrumbs = [{ id: newFolderId, name: '🏠 Home' }];
    localStorage.setItem('fc_root_folder_id', newFolderId);
  }

  localStorage.setItem('fc_api_key', newApiKey);

  closeSettingsModal();
  showSetupNotice(false);
  renderBreadcrumbs();
  loadFolder(state.currentFolderId);
  showToast('Settings saved!');
}

function showSetupNotice(show) {
  elements.setupNotice.classList.toggle('hidden', !show);
  elements.librarySection.classList.toggle('hidden', show);
}

function showSkeleton(show) {
  elements.loadingSkeleton.classList.toggle('hidden', !show);
}

function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.remove('hidden');
  clearTimeout(elements.toast._timer);
  elements.toast._timer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

// ==========================================
// Helper Utility Functions
// ==========================================
function cleanFileName(filename) {
  if (!filename) return '';
  return filename.replace(/\.(mp4|mkv|webm|avi|mov)$/i, '');
}

function getExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const num = parseInt(bytes, 10);
  if (isNaN(num)) return bytes;
  if (num >= 1073741824) return (num / 1073741824).toFixed(1) + ' GB';
  if (num >= 1048576) return (num / 1048576).toFixed(0) + ' MB';
  return (num / 1024).toFixed(0) + ' KB';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
