"""Build the frontend without touching source files.

This is a thin wrapper around `npm run build` in the repository's frontend/
directory. It does not generate, rewrite, or overwrite any source file.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


def main() -> int:
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    print(f"Building frontend in {FRONTEND_DIR} ...")
    return subprocess.call([npm, "run", "build"], cwd=FRONTEND_DIR)


if __name__ == "__main__":
    raise SystemExit(main())
