import os
import sys
import subprocess
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def main():
    print("=================================================================")
    print(" NetGuard AI - Smart Firewall, IDS & IPS Startup Script")
    print("=================================================================\n")

    # Step 1: Install Python dependencies
    print("[1/3] Installing/Verifying Python Backend Dependencies...")
    req_file = os.path.join(BACKEND_DIR, "requirements.txt")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_file], check=True)

    # Step 2: Install Node dependencies
    print("\n[2/3] Installing/Verifying React Frontend Dependencies...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True)

    # Step 3: Launch Servers
    print("\n[3/3] Launching Flask Backend API & React Frontend Dashboard...")
    backend_proc = subprocess.Popen([sys.executable, os.path.join(BACKEND_DIR, "api", "api.py")], cwd=BACKEND_DIR)
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=FRONTEND_DIR)

    print("\n=================================================================")
    print(" NetGuard AI Systems Started Successfully!")
    print(" Backend API & WebSockets: http://localhost:5000")
    print(" React SOC Dashboard UI:   http://localhost:5173")
    print(" Press Ctrl+C to terminate both servers.")
    print("=================================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
