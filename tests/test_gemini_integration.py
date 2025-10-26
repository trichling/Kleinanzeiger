#!/usr/bin/env python
"""Test the full flow to reproduce the API key issue"""

import asyncio
import os
import sys
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, 'src')

from vision.analyzer import ProductAnalyzer

def expand_env_var(value):
    """Expand ${VAR} to environment variable value."""
    if isinstance(value, str) and value.startswith('${') and value.endswith('}'):
        env_var = value[2:-1]
        env_value = os.getenv(env_var)
        if not env_value:
            return None
        return env_value
    return value

def load_config(config_path: Path) -> dict:
    """Load config like main.py does"""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # Expand environment variables for vision backends
    selected_backend = config.get('vision', {}).get('backend', 'blip2')

    if 'vision' in config:
        for backend in ['claude', 'openai', 'gemini']:
            if backend in config['vision'] and 'api_key' in config['vision'][backend]:
                original_value = config['vision'][backend]['api_key']
                expanded = expand_env_var(original_value)
                config['vision'][backend]['api_key'] = expanded

    return config

async def main():
    # Load env
    project_root = Path.cwd()
    env_path = project_root / '.env'
    load_dotenv(env_path)

    print(f"1. Environment variable:")
    api_key = os.getenv('GEMINI_API_KEY')
    print(f"   GEMINI_API_KEY: {api_key[:20] if api_key else 'NOT FOUND'}...")

    # Load config like main.py does
    config_path = project_root / 'config' / 'settings.yaml'
    config = load_config(config_path)

    print(f"\n2. After load_config:")
    print(f"   vision.backend: {config['vision']['backend']}")
    print(f"   vision.gemini.api_key: {config['vision']['gemini']['api_key'][:20] if config['vision']['gemini'].get('api_key') else 'NOT FOUND'}...")

    # Create analyzer like main.py does
    print(f"\n3. Creating ProductAnalyzer...")
    analyzer = ProductAnalyzer(vision_settings=config.get('vision', {}))
    print(f"   Backend: {analyzer.backend_name}")

    # Get the actual backend config that was used
    print(f"\n4. Checking GeminiVisionAnalyzer internals...")
    print(f"   Type: {type(analyzer.backend)}")
    print(f"   Has client: {hasattr(analyzer.backend, 'model')}")

    if hasattr(analyzer.backend, 'config'):
        print(f"   Config api_key: {analyzer.backend.config.get('api_key', 'NOT IN CONFIG')[:20] if analyzer.backend.config.get('api_key') else 'NONE'}...")

    # Try to analyze images
    print(f"\n5. Analyzing images...")
    image_folder = Path('./products/Playmobil 4140 City Life/')

    try:
        product_info = await analyzer.analyze_images(image_folder)
        print(f"   ✓ SUCCESS: {product_info.name}")
    except Exception as e:
        print(f"   ✗ FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
