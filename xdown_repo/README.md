# 🎬 Family Cinema PWA

A zero-friction, ultra-fast Progressive Web App (PWA) designed for older parents to stream movies, series, and home videos (`.mp4`, `.mkv`, `.webm`) directly from a public Google Drive folder on their Android phones and tablets. Hosted for free on **GitHub Pages**.

---

## 🌟 Key Features

1. **Dual-Playback Architecture:**
   - **Primary Web Player:** Google Drive `/preview` player embedded directly in-app; handles on-the-fly cloud transcoding for `.mp4` and `.mkv`.
   - **One-Tap VLC Deep-Link (`intent://`):** Streams direct raw media bytes to **VLC for Android** (`org.videolan.vlc`). Essential for massive `.mkv` files with DTS/AC3 multi-channel audio tracks or external subtitle streams.
2. **Parent-Proof UX Design:**
   - Dark mode with high contrast.
   - Extra-large typography (20px+ titles) with file extension stripping (clean movie names).
   - Massive tap targets (54px+ primary action buttons).
   - High-resolution movie posters and thumbnails auto-extracted via Google Drive API.
   - Sticky top video player with instant fallback options.
3. **Folder Navigation:** Full support for subcategories (e.g., "Classics", "Action", "TV Shows", "Season 1") with breadcrumb tracking.
4. **Recently Watched:** Saved locally in browser `localStorage` so parents can easily resume what they were watching.
5. **Installable PWA:** Works offline for app shell, installable via Android Chrome ("Add to Home Screen" in full-screen standalone mode).

---

## 🚀 Setup & Deployment Guide

### 1. Prepare Your Google Drive Media Folder
1. Go to [Google Drive](https://drive.google.com).
2. Create a new folder (e.g., `Family Cinema`) or pick an existing folder.
3. Right-click the folder > **Share** > Change General access to **"Anyone with the link"** and set role to **"Viewer"**.
4. Copy the link:
   ```
   https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J_XYZ?usp=sharing
   ```
   Your **Folder ID** is the alphanumeric string between `folders/` and `?`:
   `1A2B3C4D5E6F7G8H9I0J_XYZ`

---

### 2. Get a Google Cloud Drive API v3 Key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g., `Family-Cinema-Drive`).
3. Enable the **Google Drive API**:
   - Go to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.
4. Create an API Key:
   - Go to **APIs & Services > Credentials**.
   - Click **+ Create Credentials > API Key**.
   - Copy your new API key (e.g., `AIzaSy...`).
5. *(Recommended)* Restrict the API key:
   - Click on your newly created key name.
   - Under **API restrictions**, select **Restrict key**, check **Google Drive API**, and click **Save**.
   - Under **Application restrictions**, you can restrict the HTTP referrers to your GitHub Pages URL (e.g. `https://<username>.github.io/*`).

---

### 3. Deploy to GitHub Pages

#### Option A: Set Credentials in `config.js` (Easiest for Parents)
1. Fork or clone this repository to GitHub.
2. Open [`config.js`](config.js) and fill in your credentials:
   ```javascript
   const CONFIG = {
     API_KEY: "AIzaSyYourGeneratedApiKeyHere",
     ROOT_FOLDER_ID: "1A2B3C4D5E6F7G8H9I0J_XYZ"
   };
   ```
3. Commit and push the changes:
   ```bash
   git add .
   git commit -m "Configure Family Cinema"
   git push origin main
   ```
4. Enable GitHub Pages:
   - Go to your repository's **Settings > Pages**.
   - Under **Build and deployment > Source**, choose **Deploy from a branch**.
   - Select `main` branch and `/ (root)` folder. Click **Save**.
5. Your app is live at `https://<your-username>.github.io/<repo-name>/`!

#### Option B: Set via In-App Settings Modal
You can also leave `config.js` blank and simply tap the **⚙️ Settings** icon in the app on your parent's phone to enter the API Key and Folder ID. The app saves them securely to their device's `localStorage`.

---

## 📱 Parent Onboarding (Android Phone)

1. Open your GitHub Pages link in **Google Chrome** on the Android phone.
2. Chrome will prompt **"Add Family Cinema to Home Screen"** (or tap the 3-dot menu > **Add to Home screen** / **Install app**).
3. Tap **Install**. A dedicated app icon `🎬 Family Cinema` will appear on their phone's home screen.
4. *(Optional for MKV playback)*: Install [VLC for Android from Google Play Store](https://play.google.com/store/apps/details?id=org.videolan.vlc). When parents tap **"🟠 Open in VLC"**, it will automatically launch the hardware-accelerated video stream inside VLC!

---

## 🛠️ File Structure

```text
├── index.html       # Parent-friendly semantic UI & sticky player
├── styles.css       # High-contrast dark theme, large touch targets
├── app.js           # API v3 queries, VLC intent generator, breadcrumbs, history
├── config.js        # User credentials template
├── manifest.json    # PWA configuration for Android standalone installation
├── sw.js            # Service worker for offline shell caching
├── icons/           # PWA 192x192 and 512x512 app icons
└── README.md        # Comprehensive setup and deployment instructions
```
