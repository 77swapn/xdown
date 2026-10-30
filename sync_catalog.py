"""
Family Cinema - Catalog Sync Script
Scans your public Google Drive folder and syncs catalog.json / config.js
100% Free - No Google Cloud API Key or Subscription needed!
"""

import urllib.request
import re
import json
import os

FOLDER_ID = "1yl4nMX4s1WmlRpcXFZFZuQ_PS1bhO4_Z"
FOLDER_URL = f"https://drive.google.com/drive/folders/{FOLDER_ID}?usp=sharing"

def fetch_folder_items():
    print(f"Fetching catalog from Google Drive folder: {FOLDER_ID}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(FOLDER_URL, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Failed to reach Google Drive: {e}")
        return []

    pattern = re.compile(
        r'aria-label="([^"]+?)(?:\s+Video Shared|\s+Shared)?"\s+data-handled-by-drag-and-drop="true"[^>]*>.*?data-id="([a-zA-Z0-9_\-]+)"',
        re.DOTALL
    )
    
    matches = pattern.findall(html)
    items = []
    
    for name, fid in matches:
        ext = name.split(".")[-1].lower() if "." in name else ""
        if ext in ["mp4", "mkv", "webm", "avi", "mov"] or "video" in name.lower():
            size_match = re.search(r'aria-label="Size:\s*([^"]+)"[^>]*ssk=[\'"][^:\'"]*:' + re.escape(fid), html)
            size_str = size_match.group(1).strip() if size_match else ""
            mime = "video/mp4" if ext == "mp4" else "video/x-matroska" if ext == "mkv" else "video/*"
            
            items.append({
                "id": fid,
                "name": name,
                "size": size_str,
                "mimeType": mime
            })

    print(f"Found {len(items)} movies/videos in folder:")
    for item in items:
        print(f" - {item['name']} ({item['size'] or 'N/A'})")

    return items

def update_catalog():
    items = fetch_folder_items()
    if not items:
        print("No media items detected or folder is empty.")
        return

    with open("catalog.json", "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print("Updated catalog.json")

    config_content = f"""// Family Cinema Configuration
// 100% Free - No Google Cloud Billing, Credit Card, or API Key required!

const CONFIG = {{
  // Public Google Drive Folder ID
  ROOT_FOLDER_ID: "{FOLDER_ID}",

  // (Optional) Google Drive API v3 Key. If left empty, the app runs in 100% Free Mode.
  API_KEY: "",

  // Pre-loaded catalog from your folder
  DEFAULT_CATALOG: {json.dumps(items, indent=4, ensure_ascii=False)}
}};
"""
    with open("config.js", "w", encoding="utf-8") as f:
        f.write(config_content)
    print("Updated config.js with latest movies")

if __name__ == "__main__":
    update_catalog()
