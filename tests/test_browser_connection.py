#!/usr/bin/env python
"""
Test browser connection to verify CDP is working.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from automation.browser import BrowserController
from vision.models import BrowserConfig


async def test_connection():
    """Test browser connection"""
    print("=" * 60)
    print("BROWSER CONNECTION TEST")
    print("=" * 60)
    print()
    print("Prerequisites:")
    print("  1. Brave Browser must be running")
    print("  2. Started with: --remote-debugging-port=9222")
    print()
    print("Testing connection...")
    print()

    config = BrowserConfig(cdp_url="http://127.0.0.1:9222")
    controller = BrowserController(config)

    try:
        page = await controller.connect()
        print("✓ Successfully connected to browser!")
        print(f"✓ Page title: {await page.title()}")
        print(f"✓ Page URL: {page.url}")

        # Navigate to a test page
        print("\nNavigating to example.com...")
        await page.goto("https://example.com")
        await asyncio.sleep(2)
        print(f"✓ New page title: {await page.title()}")

        await controller.close()
        print("\n✓ PASS: Browser connection works!")
        return 0

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Make sure Brave is running")
        print("  2. Start Brave with:")
        print('     "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --remote-debugging-port=9222')
        print("  3. Check if port 9222 is in use: lsof -i :9222")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(test_connection()))
