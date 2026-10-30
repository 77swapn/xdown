"""
NETFIX - Automated Catalog Sync Engine
Scans your Google Drive folder and verifies active video files.
"""

import urllib.request
import re
import json
import os
import sys

FOLDER_ID = "1yl4nMX4s1WmlRpcXFZFZuQ_PS1bhO4_Z"
FOLDER_URL = f"https://drive.google.com/drive/folders/{FOLDER_ID}?usp=sharing"

def sync():
    print(f"Connecting to Google Drive folder ({FOLDER_ID})...")
    req = urllib.request.Request(
        FOLDER_URL, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode("utf-8", "ignore")
    except Exception as e:
        print(f"Error reading Drive folder: {e}")
        return False

    pattern = re.compile(
        r'aria-label="([^"]+?)(?:\s+Video Shared|\s+Shared)?"\s+data-handled-by-drag-and-drop="true"[^>]*>.*?data-id="([a-zA-Z0-9_\-]+)"',
        re.DOTALL
    )

    matches = pattern.findall(html)
    files = []
    
    for name, fid in matches:
        ext = name.split(".")[-1].lower() if "." in name else ""
        if ext in ["mkv", "mp4", "webm", "avi", "mov"] or "video" in name.lower():
            # Test if file actually exists and is active (avoid deleted/ghost files)
            check_url = f"https://drive.google.com/file/d/{fid}/preview"
            try:
                c_req = urllib.request.Request(check_url, headers={"User-Agent": "Mozilla/5.0"})
                c_resp = urllib.request.urlopen(c_req)
                c_html = c_resp.read().decode("utf-8", "ignore")
                if "does not exist" in c_html or "Sorry" in c_html:
                    continue
            except Exception:
                continue

            # Extract size if available
            size_match = re.search(r'Storage used:\s*([^"<]+)', html[html.find(fid)-300:html.find(fid)+300] if fid in html else '')
            size_str = size_match.group(1).strip() if size_match else ""

            files.append({
                "id": fid,
                "name": name,
                "size": size_str,
                "mimeType": "video/x-matroska" if ext == "mkv" else "video/mp4"
            })

    print(f"Found {len(files)} active movie(s):")
    for f in files:
        print(f"  + {f['name']} [{f['size'] or 'N/A'}] (ID: {f['id']})")

    # Update catalog.json
    with open("catalog.json", "w", encoding="utf-8") as out:
        json.dump(files, out, indent=2, ensure_ascii=False)
    print("Updated catalog.json successfully.")

    # Update index.html embedded fallback
    try:
        with open("index.html", "r", encoding="utf-8") as f_in:
            html_content = f_in.read()

        json_str = json.dumps(files, indent=6, ensure_ascii=False)
        replacement = f"const DEFAULT_FILES = {json_str};"
        html_content = re.sub(r'const DEFAULT_FILES = \[.*?\];', replacement, html_content, flags=re.DOTALL)

        with open("index.html", "w", encoding="utf-8") as f_out:
            f_out.write(html_content)
        print("Updated index.html fallback catalog.")
    except Exception as e:
        print(f"Warning updating index.html: {e}")

    return True

if __name__ == "__main__":
    sync()
