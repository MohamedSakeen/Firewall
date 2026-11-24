"""Local-lab launcher for NetGuard AI.

Creates a project-local Python virtual environment, installs the pinned backend
requirements into it, installs frontend dependencies from the checked-in lockfile,
then starts the API and Vite dev server. Nothing is installed globally, and the
sniffer is off by default (no Administrator/root needed for the normal path).

This project has no authentication yet. Keep both servers bound to localhost.
"""

from __future__ import annotations

import hashlib
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR = BACKEND_DIR / ".venv"
REQUIREMENTS_FILE = BACKEND_DIR / "requirements.txt"
REQUIREMENTS_STAMP = VENV_DIR / ".requirements.sha256"

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = "5000"
DEFAULT_ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"

TRUTHY = {"1", "true", "yes", "on"}


def venv_python() -> Path:
    if sys.platform == "win32":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def requirements_digest() -> str:
    return hashlib.sha256(REQUIREMENTS_FILE.read_bytes()).hexdigest()


def npm_command() -> str:
    return "npm.cmd" if sys.platform == "win32" else "npm"


def ensure_backend_dependencies() -> Path:
    python = venv_python()
    if not python.is_file():
        print("[1/3] Creating local Python environment at backend/.venv ...")
        # --system-site-packages lets an already-provisioned lab reuse installed
        # wheels instead of re-downloading them. Pinned versions still win: pip
        # installs into the venv whenever the host version does not match.
        subprocess.run(
            [sys.executable, "-m", "venv", "--system-site-packages", str(VENV_DIR)],
            cwd=ROOT_DIR,
            check=True,
        )

    digest = requirements_digest()
    stamp = REQUIREMENTS_STAMP.read_text(encoding="utf-8").strip() if REQUIREMENTS_STAMP.is_file() else ""
    if stamp == digest:
        print("[1/3] Using existing backend/.venv (requirements unchanged).")
        return python

    print("[1/3] Installing pinned backend requirements into backend/.venv ...")
    subprocess.run(
        [
            str(python), "-m", "pip", "install",
            "--disable-pip-version-check",
            "--retries", "5",
            "--timeout", "60",
            "-r", str(REQUIREMENTS_FILE),
        ],
        cwd=ROOT_DIR,
        check=True,
    )
    REQUIREMENTS_STAMP.write_text(digest + "\n", encoding="utf-8")
    return python


def ensure_frontend_dependencies() -> None:
    lockfile = FRONTEND_DIR / "package-lock.json"
    command = ["ci"] if lockfile.is_file() else ["install"]
    print(f"[2/3] Installing frontend dependencies with npm {'ci' if lockfile.is_file() else 'install'} ...")
    subprocess.run([npm_command(), *command], cwd=FRONTEND_DIR, check=True)


def runtime_env(host: str, port: str) -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("FIREWALL_HOST", host)
    env.setdefault("FIREWALL_PORT", port)
    env.setdefault("FIREWALL_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    env.setdefault("FIREWALL_ENABLE_SNIFFER", "0")
    env.setdefault("VITE_API_BASE_URL", f"http://{host}:{port}/api")
    env.setdefault("VITE_SOCKET_URL", f"http://{host}:{port}")
    return env


def child_process_options() -> dict:
    """Keep npm/python children in their own group so we can stop their children too."""
    if os.name == "posix":
        return {"start_new_session": True}
    return {"creationflags": getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)}


def _signal_process_tree(process: subprocess.Popen[bytes], sig: int) -> None:
    if os.name == "posix":
        try:
            os.killpg(os.getpgid(process.pid), sig)
            return
        except (ProcessLookupError, PermissionError, OSError):
            pass
    if sig == signal.SIGTERM:
        process.terminate()
    else:
        process.kill()


def stop_process(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return
    _signal_process_tree(process, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        _signal_process_tree(process, signal.SIGKILL)
        process.wait(timeout=10)


def _handle_sigterm(signum, frame) -> None:
    raise KeyboardInterrupt


def main() -> int:
    print("=" * 68)
    print(" NetGuard AI - local lab launcher (no authentication, localhost only)")
    print("=" * 68)

    signal.signal(signal.SIGTERM, _handle_sigterm)

    host = os.environ.get("FIREWALL_HOST", DEFAULT_HOST)
    port = os.environ.get("FIREWALL_PORT", DEFAULT_PORT)
    env = runtime_env(host, port)
    sniffer_enabled = env["FIREWALL_ENABLE_SNIFFER"].strip().lower() in TRUTHY

    python = ensure_backend_dependencies()
    ensure_frontend_dependencies()

    print("[3/3] Starting backend and frontend ...")
    backend = subprocess.Popen(
        [str(python), str(BACKEND_DIR / "api" / "api.py")],
        cwd=BACKEND_DIR,
        env=env,
        **child_process_options(),
    )
    frontend = subprocess.Popen(
        [npm_command(), "run", "dev", "--", "--host", host],
        cwd=FRONTEND_DIR,
        env=env,
        **child_process_options(),
    )

    print()
    print(f" API + WebSocket: http://{host}:{port}")
    print(f" Dashboard:       http://{host}:5173")
    print(f" Sniffer:         {'enabled (may need elevated privileges)' if sniffer_enabled else 'disabled'}")
    print(" Press Ctrl+C to stop both servers.")
    print()

    backend_process: subprocess.Popen[bytes] | None = backend
    frontend_process: subprocess.Popen[bytes] | None = frontend
    try:
        while backend_process.poll() is None and frontend_process.poll() is None:
            time.sleep(0.5)
        if backend_process.poll() is not None:
            print(f"Backend exited with code {backend_process.returncode}; stopping frontend.")
        else:
            print(f"Frontend exited with code {frontend_process.returncode}; stopping backend.")
    except KeyboardInterrupt:
        # A second Ctrl+C while tearing down should not interrupt cleanup.
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        print("\nCtrl+C received; shutting down both servers ...")
    finally:
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        stop_process(frontend_process)
        stop_process(backend_process)
        print("Both servers stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
