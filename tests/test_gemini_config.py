#!/usr/bin/env python
"""Test configuration loading to debug API key issue"""

import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Load env
project_root = Path.cwd()
env_path = project_root / '.env'
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

# Check env var
api_key_from_env = os.getenv('GEMINI_API_KEY')
print(f"\nDirect from environment:")
print(f"  GEMINI_API_KEY: {api_key_from_env[:20] if api_key_from_env else 'NOT FOUND'}...")
print(f"  Length: {len(api_key_from_env) if api_key_from_env else 0}")
print(f"  Type: {type(api_key_from_env)}")

# Load config
config_path = project_root / 'config' / 'settings.yaml'
with open(config_path, 'r') as f:
    config = yaml.safe_load(f)

print(f"\nFrom YAML (before expansion):")
print(f"  vision.gemini.api_key: {config['vision']['gemini']['api_key']}")

# Simulate expand_env_var function
def expand_env_var(value):
    """Expand ${VAR} to environment variable value."""
    if isinstance(value, str) and value.startswith('${') and value.endswith('}'):
        env_var = value[2:-1]
        env_value = os.getenv(env_var)
        if not env_value:
            return None
        return env_value
    return value

# Expand
expanded_key = expand_env_var(config['vision']['gemini']['api_key'])
print(f"\nAfter expansion:")
print(f"  api_key: {expanded_key[:20] if expanded_key else 'NOT FOUND'}...")
print(f"  Length: {len(expanded_key) if expanded_key else 0}")
print(f"  Type: {type(expanded_key)}")
print(f"  Has whitespace: {expanded_key and (' ' in expanded_key or '\\t' in expanded_key or '\\n' in expanded_key)}")

# Test with Gemini API directly
print("\n" + "=" * 60)
print("Testing with Gemini API:")
print("=" * 60)

try:
    import google.generativeai as genai
    genai.configure(api_key=expanded_key)

    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say hello")
    print(f"✓ SUCCESS: {response.text}")
except Exception as e:
    print(f"✗ FAILED: {e}")
