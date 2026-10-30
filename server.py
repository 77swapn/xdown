"""
NETFIX Local Developer Server & Telemetry Monitor
Robust Multi-Threaded Server with SO_REUSEADDR support
"""

import http.server
import socketserver
import json
import time
import os
import urllib.parse
from datetime import datetime

PORT = 3000
LOG_FILE = "telemetry_logs.json"

active_sessions = {}

def load_history():
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def append_log(event):
    history = load_history()
    history.append(event)
    if len(history) > 500:
        history = history[-500:]
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

class DevTelemetryHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/telemetry':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                ip = self.client_address[0]
                user_agent = self.headers.get('User-Agent', 'Unknown')
                
                ua_lower = user_agent.lower()
                device_type = "Desktop / PC"
                if "android" in ua_lower:
                    device_type = "Android Phone / Tablet"
                elif "iphone" in ua_lower:
                    device_type = "iPhone"
                elif "ipad" in ua_lower:
                    device_type = "iPad"
                elif "mobile" in ua_lower:
                    device_type = "Mobile Device"

                browser = "Chrome"
                if "firefox" in ua_lower:
                    browser = "Firefox"
                elif "safari" in ua_lower and "chrome" not in ua_lower:
                    browser = "Safari"
                elif "edg" in ua_lower:
                    browser = "Edge"

                session_id = data.get('session_id') or ip
                video = data.get('video') or "Browsing Library"
                action = data.get('action') or "heartbeat"
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                event = {
                    "session_id": session_id,
                    "timestamp": timestamp,
                    "ip": ip,
                    "device": f"{device_type} ({browser})",
                    "user_agent": user_agent,
                    "video": video,
                    "action": action
                }

                active_sessions[session_id] = {
                    "session_id": session_id,
                    "device": f"{device_type} ({browser})",
                    "ip": ip,
                    "video": video,
                    "action": action,
                    "last_seen": timestamp,
                    "last_timestamp": time.time()
                }

                append_log(event)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(f'{{"error":"{e}"}}'.encode('utf-8'))
                return

        super().do_POST()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == '/logs':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            
            now = time.time()
            live_users = [s for s in active_sessions.values() if now - s['last_timestamp'] < 45]
            history = list(reversed(load_history()[-40:]))

            html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NETFIX Live Dev Monitor</title>
  <meta http-equiv="refresh" content="5">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 font-sans p-6 min-h-screen">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-red-500 flex items-center gap-2">
          <span>NETFIX</span>
          <span class="text-xs bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded">DEV MONITOR</span>
        </h1>
        <p class="text-xs text-zinc-400 mt-1">Real-time local viewer & device telemetry. Auto-refreshes every 5s.</p>
      </div>
      <div class="text-right">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {len(live_users)} Active Viewer(s)
        </span>
      </div>
    </div>

    <!-- Active Now Section -->
    <div class="mb-8">
      <h2 class="text-sm font-semibold tracking-wide text-zinc-400 uppercase mb-3">Live Right Now</h2>
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow">
        <table class="w-full text-left text-sm">
          <thead class="bg-zinc-800/60 text-zinc-400 text-xs uppercase border-b border-zinc-800">
            <tr>
              <th class="py-3 px-4">Device</th>
              <th class="py-3 px-4">IP Address</th>
              <th class="py-3 px-4">Currently Watching / Action</th>
              <th class="py-3 px-4">Last Seen</th>
              <th class="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800">
            {"".join(f'''<tr class="hover:bg-zinc-800/40">
              <td class="py-3 px-4 font-medium text-white">{u["device"]}</td>
              <td class="py-3 px-4 font-mono text-xs text-zinc-400">{u["ip"]}</td>
              <td class="py-3 px-4 text-red-400 font-semibold">{u["video"]}</td>
              <td class="py-3 px-4 text-zinc-400 text-xs font-mono">{u["last_seen"]}</td>
              <td class="py-3 px-4 text-right"><span class="px-2 py-0.5 text-xs rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">LIVE</span></td>
            </tr>''' for u in live_users) if live_users else '<tr><td colspan="5" class="py-8 text-center text-zinc-500">No viewers actively streaming right now.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Event History Log -->
    <div>
      <h2 class="text-sm font-semibold tracking-wide text-zinc-400 uppercase mb-3">Recent Activity Log (Last 40 events)</h2>
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow">
        <table class="w-full text-left text-sm">
          <thead class="bg-zinc-800/60 text-zinc-400 text-xs uppercase border-b border-zinc-800">
            <tr>
              <th class="py-3 px-4">Timestamp</th>
              <th class="py-3 px-4">Device</th>
              <th class="py-3 px-4">Activity / Video</th>
              <th class="py-3 px-4">Raw User-Agent</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800">
            {"".join(f'''<tr class="hover:bg-zinc-800/40">
              <td class="py-2.5 px-4 text-xs font-mono text-zinc-400">{e["timestamp"]}</td>
              <td class="py-2.5 px-4 font-medium text-zinc-200">{e["device"]}</td>
              <td class="py-2.5 px-4 text-zinc-300">{e["action"]}: <span class="text-red-400 font-medium">{e["video"]}</span></td>
              <td class="py-2.5 px-4 text-[11px] font-mono text-zinc-500 truncate max-w-xs" title="{e["user_agent"]}">{e["user_agent"]}</td>
            </tr>''' for e in history) if history else '<tr><td colspan="4" class="py-8 text-center text-zinc-500">No history logged yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>"""
            self.wfile.write(html.encode('utf-8'))
            return

        super().do_GET()

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    # Ensure current directory is repository root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        with ThreadedTCPServer(("", PORT), DevTelemetryHandler) as httpd:
            print(f"=================================================")
            print(f"NETFIX Dev Server running at: http://localhost:{PORT}")
            print(f"Viewer Monitor Dashboard at:  http://localhost:{PORT}/logs")
            print(f"=================================================")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
