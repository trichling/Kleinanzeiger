#!/usr/bin/env python
"""
Integration test for kleinanzeigen.de automation.
Tests form filling and category selection without needing vision/content generation.

Prerequisites:
1. Brave Browser must be running with: --remote-debugging-port=9222
2. You must be logged in to kleinanzeigen.de in that browser
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path so we can import as a module
sys.path.insert(0, str(Path(__file__).parent.parent))

# Now import from src package
from src.automation.browser import BrowserController
from src.automation.kleinanzeigen import KleinanzeigenAutomator, collect_uploadable_images
from src.vision.models import BrowserConfig, AdContent


def create_test_ad() -> AdContent:
    """Create a test ad with realistic data"""
    return AdContent(
        title="Playmobil City Life Planschbecken Set 4140",
        description="""Verkaufe ein gut erhaltenes Playmobil City Life Planschbecken Set (4140).

Das Set beinhaltet:
- Planschbecken mit Zubehör
- 3 Figuren (1 Erwachsener, 2 Kinder)
- Sonnenliege und Sonnenschirm
- Boot und Schwimmtier
- Grüne Bodenplatte mit Pflanzen
- Originalverpackung

Zustand: Wie Neu
Das Set ist vollständig und in sehr gutem Zustand.

Nur Abholung möglich.""",
        price=15.0,
        category="Spielzeug",
        subcategory=None,
        condition="Gebraucht",
        shipping_type="PICKUP",
        postal_code="48429"
    )


async def test_browser_navigation():
    """Test 1: Basic browser connection and navigation"""
    print("\n" + "=" * 60)
    print("TEST 1: Browser Connection & Navigation")
    print("=" * 60)

    config = BrowserConfig(cdp_url="http://127.0.0.1:9222")
    controller = BrowserController(config)

    try:
        page = await controller.connect()
        print(f"✓ Connected to browser")
        print(f"  Current URL: {page.url}")
        print(f"  Page title: {await page.title()}")

        # Navigate to kleinanzeigen.de
        print("\nNavigating to kleinanzeigen.de...")
        await page.goto("https://www.kleinanzeigen.de", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        print(f"✓ Navigated successfully")
        print(f"  URL: {page.url}")
        print(f"  Title: {await page.title()}")

        await controller.close()
        print("\n✓ PASS: Navigation works")
        return True

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_login_check():
    """Test 2: Check if user is logged in"""
    print("\n" + "=" * 60)
    print("TEST 2: Login Status Check")
    print("=" * 60)

    config = BrowserConfig(cdp_url="http://127.0.0.1:9222")
    controller = BrowserController(config)

    try:
        page = await controller.connect()
        await page.goto("https://www.kleinanzeigen.de", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        # Check for login indicators
        print("\nChecking for login indicators...")

        # Try to find user menu or login button
        selectors_to_check = [
            ('a[id*="login"]', "Login link"),
            ('button[id*="login"]', "Login button"),
            ('[data-testid*="user"]', "User menu"),
            ('a[href*="/m-meine-anzeigen"]', "My ads link"),
            ('[id*="user-menu"]', "User menu")
        ]

        found_elements = []
        for selector, description in selectors_to_check:
            try:
                element = await page.wait_for_selector(selector, timeout=2000, state='attached')
                if element:
                    text = await element.inner_text()
                    found_elements.append(f"  ✓ {description}: '{text.strip()[:50]}'")
            except:
                pass

        if found_elements:
            print("\nFound elements:")
            for elem in found_elements:
                print(elem)
        else:
            print("  ⚠ No user-related elements found")

        # Take a screenshot for manual inspection
        screenshot_path = Path("logs/screenshots/login_check.png")
        screenshot_path.parent.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(screenshot_path))
        print(f"\n✓ Screenshot saved: {screenshot_path}")

        await controller.close()
        print("\n✓ PASS: Login check complete")
        print("  Please review the screenshot to verify login status")
        return True

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_find_post_button():
    """Test 3: Find the 'Post Ad' or 'Anzeige aufgeben' button"""
    print("\n" + "=" * 60)
    print("TEST 3: Find Post Ad Button")
    print("=" * 60)

    config = BrowserConfig(cdp_url="http://127.0.0.1:9222")
    controller = BrowserController(config)

    try:
        page = await controller.connect()
        await page.goto("https://www.kleinanzeigen.de", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        print("\nSearching for 'Post Ad' button...")

        # Different possible selectors for the post button
        selectors = [
            'a[href*="/p-anzeige-aufgeben"]',
            'a[href*="/posten"]',
            'button:has-text("Anzeige aufgeben")',
            'a:has-text("Anzeige aufgeben")',
            '[data-testid*="post"]',
            'a[id*="post"]'
        ]

        post_button = None
        for selector in selectors:
            try:
                element = await page.wait_for_selector(selector, timeout=2000, state='visible')
                if element:
                    text = await element.inner_text()
                    href = await element.get_attribute('href') or 'N/A'
                    print(f"  ✓ Found: '{text.strip()}' (selector: {selector})")
                    print(f"    href: {href}")
                    post_button = element
                    break
            except:
                continue

        if post_button:
            # Take screenshot
            screenshot_path = Path("logs/screenshots/post_button_found.png")
            screenshot_path.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(screenshot_path))
            print(f"\n✓ Screenshot saved: {screenshot_path}")

            print("\n✓ PASS: Found post button")
        else:
            print("\n⚠ WARNING: Could not find post button")
            print("  You may need to update selectors or ensure you're logged in")

            screenshot_path = Path("logs/screenshots/post_button_not_found.png")
            screenshot_path.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(screenshot_path))
            print(f"  Screenshot saved: {screenshot_path}")

        await controller.close()
        return post_button is not None

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_create_ad_flow():
    """Test 4: Complete ad creation flow"""
    print("\n" + "=" * 60)
    print("TEST 4: Ad Creation Flow")
    print("=" * 60)
    print("\n⚠ WARNING: This will attempt to create a DRAFT ad")
    print("  The ad will NOT be published, only saved as draft")

    response = input("\nProceed? (yes/no): ")
    if response.lower() != 'yes':
        print("  Skipped by user")
        return True

    browser_config = BrowserConfig(cdp_url="http://127.0.0.1:9222", timeout=30000)
    controller = BrowserController(browser_config)

    try:
        page = await controller.connect()
        print("✓ Connected to browser")

        # Create automator
        automator = KleinanzeigenAutomator(
            page=page,
            base_url="https://www.kleinanzeigen.de"
        )

        # Create test ad
        test_ad = create_test_ad()
        print(f"\nTest ad created:")
        print(f"  Title: {test_ad.title}")
        print(f"  Category: {test_ad.category}")
        print(f"  Price: €{test_ad.price}")
        print(f"  Postal code: {test_ad.postal_code}")

        # Use test images from tests/products folder
        image_folder = Path("tests/products")
        image_paths = []

        try:
            # Use the helper function to collect uploadable images (excludes HEIC)
            image_paths = collect_uploadable_images(image_folder, max_images=5)
            print(f"  Images: {len(image_paths)} image(s) from {image_folder}")
            for img in image_paths:
                print(f"    - {img.name}")
        except ValueError as e:
            print(f"  ⚠ {e}")
            print("  Test will proceed without images")

        # Try to create the ad
        print("\nStarting ad creation...")
        print("  Step 1: Navigating to post ad page...")

        try:
            await automator.create_ad(test_ad, image_paths, save_as_draft=True)
            print("\n✓ PASS: Ad created successfully as draft!")

        except Exception as e:
            print(f"\n✗ FAIL at some step: {e}")

            # Take screenshot of where it failed
            screenshot_path = Path(f"logs/screenshots/failure_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
            screenshot_path.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(screenshot_path))
            print(f"  Screenshot saved: {screenshot_path}")

            # Print current URL for debugging
            print(f"  Current URL: {page.url}")

            # Try to get page content snippet
            try:
                title = await page.title()
                print(f"  Page title: {title}")
            except:
                pass

            raise

        await controller.close()
        return True

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_selector_discovery():
    """Test 5: Discover actual selectors on the page"""
    print("\n" + "=" * 60)
    print("TEST 5: Selector Discovery")
    print("=" * 60)

    config = BrowserConfig(cdp_url="http://127.0.0.1:9222")
    controller = BrowserController(config)

    try:
        page = await controller.connect()

        # First go to homepage
        print("\nGoing to homepage...")
        await page.goto("https://www.kleinanzeigen.de", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        # Click the post ad button
        print("\nClicking 'Post Ad' button (#site-mainnav-postad)...")
        try:
            post_button = await page.wait_for_selector('//*[@id="site-mainnav-postad"]', timeout=5000)
            await post_button.click()
            await asyncio.sleep(3)
            print("✓ Successfully clicked post ad button")
        except Exception as e:
            print(f"⚠ Could not click post ad button: {e}")
            print("  Trying direct navigation instead...")
            await page.goto("https://www.kleinanzeigen.de/p-anzeige-aufgeben.html", wait_until="domcontentloaded")
            await asyncio.sleep(3)

        print(f"Current URL: {page.url}")
        print(f"Page title: {await page.title()}")

        # Take screenshot
        screenshot_path = Path("logs/screenshots/post_ad_page.png")
        screenshot_path.parent.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"\n✓ Full page screenshot saved: {screenshot_path}")

        # Try to find common form elements
        print("\nLooking for form elements...")

        elements_to_find = [
            ('input[type="text"]', 'Text inputs'),
            ('input[name*="title"]', 'Title input (by name)'),
            ('input[id*="title"]', 'Title input (by id)'),
            ('textarea', 'Text areas'),
            ('textarea[name*="description"]', 'Description textarea'),
            ('select', 'Select dropdowns'),
            ('button[type="submit"]', 'Submit buttons'),
            ('button:has-text("Speichern")', 'Save buttons'),
            ('button:has-text("Weiter")', 'Next buttons'),
            ('[data-testid*="category"]', 'Category elements (data-testid)'),
            ('[id*="category"]', 'Category elements (id)'),
            ('[name*="category"]', 'Category elements (name)'),
            ('input[name*="price"]', 'Price input'),
            ('input[name*="zipCode"]', 'Postal code input'),
            ('input[name*="postcode"]', 'Postal code input (alt)'),
        ]

        for selector, description in elements_to_find:
            try:
                elements = await page.query_selector_all(selector)
                if elements:
                    print(f"  ✓ {description}: Found {len(elements)} element(s)")

                    # Get details of first 2 elements
                    for i, elem in enumerate(elements[:2]):
                        attrs = await elem.evaluate('''el => ({
                            id: el.id,
                            name: el.name,
                            class: el.className,
                            type: el.type,
                            placeholder: el.placeholder,
                            testid: el.dataset ? el.dataset.testid : null
                        })''')
                        print(f"    Element {i+1}: {attrs}")
            except Exception as e:
                print(f"  ✗ {description}: Not found or error ({str(e)[:50]})")

        await controller.close()
        print("\n✓ PASS: Discovery complete")
        print("  Review the screenshot and output above to identify correct selectors")
        return True

    except Exception as e:
        print(f"\n✗ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("=" * 60)
    print("KLEINANZEIGEN.DE AUTOMATION INTEGRATION TEST")
    print("=" * 60)
    print()
    print("Prerequisites:")
    print("  1. Brave Browser running with: --remote-debugging-port=9222")
    print("  2. Logged in to kleinanzeigen.de in that browser")
    print()

    tests = [
        ("Browser Connection", test_browser_navigation),
        ("Login Check", test_login_check),
        ("Find Post Button", test_find_post_button),
        ("Selector Discovery", test_selector_discovery),
        ("Ad Creation Flow", test_create_ad_flow),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except KeyboardInterrupt:
            print("\n\nTests interrupted by user")
            break
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")

    passed = sum(1 for _, p in results if p)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")

    return 0 if passed == total else 1


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
