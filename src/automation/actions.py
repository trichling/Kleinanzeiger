"""
Human-like UI interaction helpers.
"""

import asyncio
import random
import logging
from typing import Optional
from playwright.async_api import Page, Locator

from ..vision.models import DelaysConfig

logger = logging.getLogger(__name__)


class UIActions:
    """Provides human-like interaction methods for browser automation."""
    
    def __init__(self, page: Page, delays_config: Optional[DelaysConfig] = None):
        """
        Initialize UIActions.
        
        Args:
            page: Playwright page instance
            delays_config: Configuration for delays
        """
        self.page = page
        self.config = delays_config or DelaysConfig()
    
    async def _random_delay(self, min_ms: int, max_ms: int):
        """Add a random delay."""
        delay = random.randint(min_ms, max_ms) / 1000.0
        await asyncio.sleep(delay)
    
    async def human_type(self, element, text: str, clear_first: bool = True):
        """
        Type text in a human-like manner.

        Args:
            element: Playwright locator or element handle for input field
            text: Text to type
            clear_first: Whether to clear field first
        """
        if clear_first:
            # Clear the field - works for both Locator and ElementHandle
            await element.fill('')
            await self._random_delay(100, 200)

        # Type character by character with random delays
        for char in text:
            await element.type(char, delay=random.randint(
                self.config.min_typing,
                self.config.max_typing
            ))
    
    async def human_click(self, element):
        """
        Click element with human-like delay.

        Args:
            element: Playwright locator or element handle
        """
        # Move to element first
        await element.scroll_into_view_if_needed()
        await self._random_delay(self.config.min_click, self.config.max_click)

        # Click
        await element.click()
        await self._random_delay(200, 400)
    
    async def select_dropdown(self, element, value: str):
        """
        Select dropdown option.

        Args:
            element: Playwright locator or element handle for select element
            value: Value to select
        """
        await element.scroll_into_view_if_needed()
        await self._random_delay(self.config.min_click, self.config.max_click)
        await element.select_option(value)
        await self._random_delay(self.config.form_field, self.config.form_field + 200)
    
    async def upload_file(self, locator: Locator, file_path: str):
        """
        Upload file to input element.
        
        Args:
            locator: Playwright locator for file input
            file_path: Path to file
        """
        await locator.scroll_into_view_if_needed()
        await self._random_delay(200, 400)
        await locator.set_input_files(file_path)
        await self._random_delay(500, 800)
    
    async def wait_for_page_load(self):
        """Wait for page to load completely."""
        await asyncio.sleep(self.config.page_load / 1000.0)
    
    async def take_screenshot(self, path: str):
        """
        Take a screenshot.
        
        Args:
            path: Path to save screenshot
        """
        await self.page.screenshot(path=path, full_page=True)
        logger.info(f"Screenshot saved: {path}")
    
    async def scroll_randomly(self):
        """Scroll page randomly to appear more human-like."""
        # Scroll down a bit
        scroll_amount = random.randint(100, 400)
        await self.page.evaluate(f"window.scrollBy(0, {scroll_amount})")
        await self._random_delay(500, 1000)
        
        # Sometimes scroll back up a little
        if random.random() < 0.3:
            scroll_back = random.randint(50, 150)
            await self.page.evaluate(f"window.scrollBy(0, -{scroll_back})")
            await self._random_delay(300, 600)
