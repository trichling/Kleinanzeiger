"""
Main CLI application for Kleinanzeiger.
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Optional
import yaml
from dotenv import load_dotenv

from .vision.analyzer import ProductAnalyzer
from .vision.models import VisionConfig, BrowserConfig, DelaysConfig
from .content.generator import ContentGenerator
from .content.categories import CategoryMapper
from .automation.browser import BrowserController
from .automation.kleinanzeigen import KleinanzeigenAutomator


def setup_logging(log_level: str, log_dir: Path):
    """
    Setup logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_dir: Directory for log files
    """
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create formatters and handlers
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Console handler - output to stdout with color-friendly format
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    console_formatter = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_formatter)
    
    # File handler
    file_handler = logging.FileHandler(log_dir / 'kleinanzeiger.log')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)


def load_config(config_path: Path) -> dict:
    """
    Load configuration from YAML file.

    Args:
        config_path: Path to config file

    Returns:
        Configuration dictionary
    """
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # Expand environment variables for vision backends
    def expand_env_var(value):
        """Expand ${VAR} to environment variable value."""
        if isinstance(value, str) and value.startswith('${') and value.endswith('}'):
            env_var = value[2:-1]
            env_value = os.getenv(env_var)
            if not env_value:
                return None  # Return None if not set, handle later
            return env_value
        return value

    # Get selected backends
    selected_vision_backend = config.get('vision', {}).get('backend', 'blip2')
    selected_content_backend = config.get('content', {}).get('backend', 'simple')

    # Expand environment variables for all vision backends
    if 'vision' in config:
        for backend in ['claude', 'openai', 'gemini']:
            if backend in config['vision'] and 'api_key' in config['vision'][backend]:
                original_value = config['vision'][backend]['api_key']
                expanded = expand_env_var(original_value)
                config['vision'][backend]['api_key'] = expanded

                # Only raise error if this is the selected backend and key is missing
                if backend == selected_vision_backend and not expanded:
                    env_var_name = original_value
                    if isinstance(env_var_name, str) and env_var_name.startswith('${'):
                        env_var_name = env_var_name[2:-1]
                    raise ValueError(
                        f"Environment variable '{env_var_name}' for vision backend not set.\n"
                        f"Please add '{env_var_name}=your-key' to your .env file,\n"
                        f"or choose a different backend in config/settings.yaml (e.g., 'blip2' requires no API key)"
                    )

    # Expand environment variables for all content backends
    if 'content' in config:
        for backend in ['claude', 'openai', 'gemini']:
            if backend in config['content'] and 'api_key' in config['content'][backend]:
                original_value = config['content'][backend]['api_key']
                expanded = expand_env_var(original_value)
                config['content'][backend]['api_key'] = expanded

                # Only raise error if this is the selected backend and key is missing
                if backend == selected_content_backend and not expanded:
                    env_var_name = original_value
                    if isinstance(env_var_name, str) and env_var_name.startswith('${'):
                        env_var_name = env_var_name[2:-1]
                    raise ValueError(
                        f"Environment variable '{env_var_name}' for content backend not set.\n"
                        f"Please add '{env_var_name}=your-key' to your .env file,\n"
                        f"or choose a different backend in config/settings.yaml (e.g., 'simple' requires no API key)"
                    )

    # Legacy anthropic config (kept for backwards compatibility)
    if 'anthropic' in config and 'api_key' in config['anthropic']:
        expanded = expand_env_var(config['anthropic']['api_key'])
        config['anthropic']['api_key'] = expanded

    return config


async def main_async(args: argparse.Namespace):
    """
    Main async function.

    Args:
        args: Parsed command line arguments
    """
    print("Starting Kleinanzeiger...")  # Early feedback before logging setup

    # Determine paths
    project_root = Path(__file__).parent.parent

    # Load environment variables from .env file in project root
    env_path = project_root / '.env'
    load_dotenv(env_path)

    config_path = project_root / 'config' / 'settings.yaml'
    categories_path = project_root / 'config' / 'categories.json'

    # Load configuration
    config = load_config(config_path)
    
    # Setup logging
    log_dir = project_root / config['logging']['log_dir']
    screenshot_dir = project_root / config['logging']['screenshot_dir']
    setup_logging(config['logging']['level'], log_dir)
    
    logger = logging.getLogger(__name__)
    logger.info("=" * 80)
    logger.info("Kleinanzeiger - Automated Classified Ad Generator")
    logger.info("=" * 80)
    
    # Parse arguments
    image_folder = Path(args.image_folder).expanduser().resolve()
    postal_code = args.postal_code
    price_override = args.price if args.price else None
    
    logger.info(f"Image folder: {image_folder}")
    logger.info(f"Postal code: {postal_code}")
    if price_override:
        logger.info(f"Price override: €{price_override}")
    
    try:
        # Initialize components
        logger.info("Initializing components...")
        
        browser_config = BrowserConfig(**config['browser'])
        delays_config = DelaysConfig(**config['delays'])
        
        # Product analyzer - uses configurable vision backend
        analyzer = ProductAnalyzer(vision_settings=config.get('vision', {}))
        logger.info(f"Using vision backend: {analyzer.backend_name}")

        # Content generator - uses configurable content backend
        content_config = config.get('content', {})
        content_backend = content_config.get('backend', 'simple')

        # Get API key and model based on selected backend
        content_api_key = None
        content_model = None

        if content_backend != 'simple':
            backend_config = content_config.get(content_backend, {})
            content_api_key = backend_config.get('api_key')
            content_model = backend_config.get('model')

        generator = ContentGenerator(
            backend=content_backend,
            api_key=content_api_key,
            model=content_model
        )
        logger.info(f"Using content generation backend: {content_backend}")
        
        # Category mapper
        category_mapper = CategoryMapper(categories_path)
        
        # Step 1: Analyze images
        logger.info("Step 1: Analyzing product images...")
        product_info = await analyzer.analyze_images(image_folder)
        logger.info(f"Product identified: {product_info.name}")
        logger.info(f"Suggested price: €{product_info.suggested_price}")
        
        # Step 2: Map category
        logger.info("Step 2: Mapping category...")
        category, subcategory = category_mapper.map_category(
            product_info.name,
            product_info.description,
            product_info.category
        )
        logger.info(f"Category: {category}, Subcategory: {subcategory}")
        
        # Step 3: Generate ad content
        logger.info("Step 3: Generating ad content...")
        ad_content = generator.generate_ad_content(
            product_info,
            postal_code,
            category,
            subcategory,
            price_override
        )
        logger.info(f"Ad title: {ad_content.title}")
        logger.info(f"Ad price: €{ad_content.price}")
        
        # Step 4: Connect to browser
        logger.info("Step 4: Connecting to browser...")
        logger.info("Make sure Brave is running with: brave --remote-debugging-port=9222")
        
        browser_controller = BrowserController(browser_config)
        
        try:
            page = await browser_controller.connect()
            
            # Step 5: Create ad
            logger.info("Step 5: Creating ad on kleinanzeigen.de...")
            automator = KleinanzeigenAutomator(page, config['kleinanzeigen']['base_url'])
            
            await automator.create_ad(
                ad_content,
                product_info.image_paths,
                save_as_draft=config['kleinanzeigen']['draft_mode']
            )
            
            # Take success screenshot
            await browser_controller.take_screenshot("success.png", screenshot_dir)
            
            logger.info("=" * 80)
            logger.info("SUCCESS! Ad created successfully")
            logger.info("=" * 80)
            
        except Exception as e:
            logger.error(f"Error during automation: {e}")
            await browser_controller.handle_error(e, screenshot_dir)
            raise
        
        finally:
            await browser_controller.close()
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Kleinanzeiger - Automated Classified Ad Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m src.main --image-folder ./products/laptop --postal-code 10115
  python -m src.main --image-folder ./products/bike --postal-code 80331 --price 150

Before running:
  1. Set ANTHROPIC_API_KEY environment variable
  2. Start Brave browser with: brave --remote-debugging-port=9222
  3. Login to kleinanzeigen.de manually in the browser
        """
    )
    
    parser.add_argument(
        '--image-folder',
        required=True,
        help='Path to folder containing product images'
    )
    
    parser.add_argument(
        '--postal-code',
        required=True,
        help='5-digit postal code for ad location'
    )
    
    parser.add_argument(
        '--price',
        type=float,
        help='Override suggested price (in EUR)'
    )
    
    parser.add_argument(
        '--category',
        help='Override category detection (optional)'
    )
    
    parser.add_argument(
        '--draft',
        action='store_true',
        default=True,
        help='Save as draft instead of publishing (default: True)'
    )
    
    args = parser.parse_args()
    
    # Validate postal code
    if not args.postal_code.isdigit() or len(args.postal_code) != 5:
        parser.error("Postal code must be exactly 5 digits")
    
    # Run async main
    asyncio.run(main_async(args))


if __name__ == '__main__':
    main()
