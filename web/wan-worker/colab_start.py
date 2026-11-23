#!/usr/bin/env python3
"""Start the authenticated Wan worker and a temporary Cloudflare quick tunnel in Colab."""
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKEN = os.environ.get("FVM_WAN_WORKER_TOKEN", "")
if len(TOKEN) < 24:
    raise SystemExit("Set FVM_WAN_WORKER_TOKEN to a random secret of at least 24 characters before starting.")
if not shutil.which("python"):
    raise SystemExit("Python is not available.")

worker = subprocess.Popen([sys.executable, "worker.py"], cwd=HERE, stdout=subprocess.DEVNULL, stderr=open("/tmp/fvm-wan-worker.log", "w"))
for _ in range(120):
    try:
        with urllib.request.urlopen("http://127.0.0.1:8787/health", timeout=2) as response:
            if response.status == 200:
                break
    except Exception:
        time.sleep(1)
else:
    worker.terminate()
    raise SystemExit("Wan worker did not start. Inspect /tmp/fvm-wan-worker.log.")

cloudflared = Path("/usr/local/bin/cloudflared")
if not cloudflared.exists():
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    urllib.request.urlretrieve(url, cloudflared)
    cloudflared.chmod(0o755)

tunnel = subprocess.Popen(
    [str(cloudflared), "tunnel", "--url", "http://127.0.0.1:8787", "--no-autoupdate"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
)
public_url = None
deadline = time.time() + 120
while time.time() < deadline:
    line = tunnel.stdout.readline() if tunnel.stdout else ""
    match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
    if match:
        public_url = match.group(0)
        break
    if tunnel.poll() is not None:
        break
if not public_url:
    tunnel.terminate()
    worker.terminate()
    raise SystemExit("Cloudflare tunnel did not return a public URL.")

print("\nFarmVsMonsters Wan Worker is running.")
print("FVM_WAN_WORKER_URL=" + public_url)
print("FVM_WAN_WORKER_TOKEN is set in this Colab runtime.")
print("Copy the URL and set the same secret in your local web/.env.local.")
print("Keep this Colab runtime alive while generating videos. Stop this cell/runtime to stop the worker.")
# Keep the process alive and continue draining tunnel output.
try:
    while worker.poll() is None and tunnel.poll() is None:
        time.sleep(2)
except KeyboardInterrupt:
    pass
finally:
    tunnel.terminate()
    worker.terminate()
