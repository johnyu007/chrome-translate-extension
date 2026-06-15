"""
Build script — package the extension for Chrome/Edge or Firefox.
Usage:
  python build.py chrome    → dist/ai-translate-chrome-v1.0.0.zip
  python build.py firefox    → dist/ai-translate-firefox-v1.0.0.zip
  python build.py all        → both
"""
import os
import sys
import shutil
import zipfile

PROJECT = os.path.dirname(os.path.abspath(__file__))
VERSION = "1.0.0"

# Files always included in both builds
SHARED_FILES = [
    "background.js",
    "content.js",
    "sidepanel.css",
    "sidepanel.js",
    "settings.html",
    "settings.js",
    "lib/translator.js",
    "lib/providers/openai.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

# Browser-specific entry points
CHROME_ONLY = ["sidepanel.html"]
FIREFOX_ONLY = ["popup.html"]

EXCLUDE = {
    ".gitignore", "LICENSE", "README.md",
    ".claude", ".git", "__pycache__",
    "generate_icons.py", "build.py",
    "manifest.firefox.json",
    "dist",
}


def clean_dist():
    dist = os.path.join(PROJECT, "dist")
    if os.path.exists(dist):
        shutil.rmtree(dist)
    os.makedirs(dist)


def zip_dir(src_dir, zip_path):
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(src_dir):
            for f in files:
                full = os.path.join(root, f)
                arc = os.path.relpath(full, src_dir)
                zf.write(full, arc)


def build(browser):
    if browser not in ("chrome", "firefox"):
        print(f"Unknown browser: {browser}")
        sys.exit(1)

    # 1. Prepare build directory
    build_dir = os.path.join(PROJECT, "dist", f"build-{browser}")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    # 2. Copy shared files
    for f in SHARED_FILES:
        src = os.path.join(PROJECT, f)
        dst = os.path.join(build_dir, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isfile(src):
            shutil.copy2(src, dst)

    # 3. Copy browser-specific files
    only = CHROME_ONLY if browser == "chrome" else FIREFOX_ONLY
    for f in only:
        src = os.path.join(PROJECT, f)
        dst = os.path.join(build_dir, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)

    # 4. Copy the right manifest
    if browser == "chrome":
        shutil.copy2(
            os.path.join(PROJECT, "manifest.json"),
            os.path.join(build_dir, "manifest.json"),
        )
    else:
        shutil.copy2(
            os.path.join(PROJECT, "manifest.firefox.json"),
            os.path.join(build_dir, "manifest.json"),
        )

    # 5. Zip
    zip_name = f"ai-translate-{browser}-v{VERSION}.zip"
    zip_path = os.path.join(PROJECT, "dist", zip_name)
    zip_dir(build_dir, zip_path)

    # 6. Clean up build dir
    shutil.rmtree(build_dir)

    size = os.path.getsize(zip_path)
    print(f"  OK {zip_name}  ({size:,} bytes)")


def main():
    browsers = sys.argv[1:] if len(sys.argv) > 1 else ["all"]

    if "all" in browsers:
        browsers = ["chrome", "firefox"]

    clean_dist()
    print(f"Building v{VERSION}...")
    for b in browsers:
        build(b)
    print("Done → dist/")


if __name__ == "__main__":
    main()
