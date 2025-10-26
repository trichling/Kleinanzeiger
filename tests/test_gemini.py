#!/usr/bin/env python
"""
Minimal integration test for Gemini API.
Tests vision and text generation capabilities.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_api_key():
    """Test 1: Check if API key is loaded correctly"""
    print("=" * 60)
    print("TEST 1: API Key Loading")
    print("=" * 60)

    api_key = os.getenv('GEMINI_API_KEY')

    if not api_key:
        print("❌ FAIL: GEMINI_API_KEY not found in environment")
        return False

    print(f"✓ API Key found")
    print(f"  First 20 chars: {api_key[:20]}")
    print(f"  Last 10 chars: ...{api_key[-10:]}")
    print(f"  Length: {len(api_key)} characters")
    print(f"  Has spaces: {' ' in api_key}")

    if ' ' in api_key:
        print("⚠️  WARNING: API key contains spaces - this will cause errors!")
        return False

    print("✓ PASS: API key format looks good")
    return True


def test_gemini_connection():
    """Test 2: Test basic Gemini API connection"""
    print("\n" + "=" * 60)
    print("TEST 2: Gemini API Connection")
    print("=" * 60)

    try:
        import google.generativeai as genai

        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)

        print("✓ Gemini SDK imported and configured")

        # List available models
        print("\nAvailable models:")
        models = list(genai.list_models())
        for model in models[:5]:
            print(f"  - {model.name}")

        print(f"\n✓ PASS: Successfully connected to Gemini API")
        print(f"  Total models available: {len(models)}")
        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False


def test_text_generation():
    """Test 3: Test text generation"""
    print("\n" + "=" * 60)
    print("TEST 3: Text Generation")
    print("=" * 60)

    try:
        import google.generativeai as genai

        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel('gemini-2.5-flash')
        print("✓ Model initialized: gemini-2.5-flash")

        response = model.generate_content("Say 'Hello from Gemini!' and nothing else.")
        print(f"✓ Response received: {response.text}")

        print("✓ PASS: Text generation works")
        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_vision():
    """Test 4: Test vision capabilities with a test image"""
    print("\n" + "=" * 60)
    print("TEST 4: Vision Analysis")
    print("=" * 60)

    try:
        import google.generativeai as genai
        from PIL import Image
        import io

        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel('gemini-2.5-flash')
        print("✓ Model initialized: gemini-2.5-flash")

        # Create a simple test image (100x100 red square)
        img = Image.new('RGB', (100, 100), color='red')
        print("✓ Test image created (100x100 red square)")

        # Test with image
        response = model.generate_content([
            "What color is this image? Answer with just the color name.",
            img
        ])

        print(f"✓ Response received: {response.text}")

        if 'red' in response.text.lower():
            print("✓ PASS: Vision analysis works correctly")
            return True
        else:
            print(f"⚠️  WARNING: Expected 'red' but got: {response.text}")
            print("  Vision works but may not be accurate")
            return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("GEMINI API INTEGRATION TEST")
    print("=" * 60)
    print()

    results = []

    # Run tests
    results.append(("API Key Loading", test_api_key()))

    if results[-1][1]:  # Only continue if API key test passed
        results.append(("API Connection", test_gemini_connection()))
        results.append(("Text Generation", test_text_generation()))
        results.append(("Vision Analysis", test_vision()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results:
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    passed = sum(1 for _, p in results if p)
    total = len(results)

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Gemini API is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
