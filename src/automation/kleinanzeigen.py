"""
Kleinanzeigen.de specific automation logic.
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Optional
from playwright.async_api import Page

from ..vision.models import AdContent
from .actions import UIActions

logger = logging.getLogger(__name__)


class KleinanzeigenAutomator:
    """Automates ad posting on kleinanzeigen.de."""
    
    def __init__(self, page: Page, base_url: str = "https://www.kleinanzeigen.de"):
        """
        Initialize the KleinanzeigenAutomator.
        
        Args:
            page: Playwright page instance
            base_url: Base URL for kleinanzeigen.de
        """
        self.page = page
        self.base_url = base_url
        self.actions = UIActions(page)
    
    async def navigate_to_post_ad(self):
        """Navigate to the 'post ad' page."""
        logger.info("Navigating to post ad page")
        
        post_url = f"{self.base_url}/p-anzeige-aufgeben.html"
        await self.page.goto(post_url)
        await self.actions.wait_for_page_load()
        
        logger.info("Arrived at post ad page")
    
    async def check_login_status(self) -> bool:
        """
        Check if user is logged in.
        
        Returns:
            True if logged in, False otherwise
        """
        try:
            # Look for login indicators (this may need adjustment based on actual site)
            login_button = await self.page.query_selector('text="Einloggen"')
            is_logged_out = login_button is not None
            
            is_logged_in = not is_logged_out
            
            if is_logged_in:
                logger.info("User is logged in")
            else:
                logger.warning("User is not logged in")
            
            return is_logged_in
            
        except Exception as e:
            logger.error(f"Error checking login status: {e}")
            return False
    
    async def select_category(self, category: str, subcategory: Optional[str] = None):
        """
        Select category and subcategory.
        
        Args:
            category: Main category
            subcategory: Optional subcategory
        """
        logger.info(f"Selecting category: {category}, subcategory: {subcategory}")
        
        try:
            # This is a simplified example - actual selectors need to be determined
            # by inspecting kleinanzeigen.de's current HTML structure
            
            # Click on category selection
            category_selector = await self.page.wait_for_selector('[data-testid="category-selector"]', timeout=5000)
            await self.actions.human_click(category_selector)
            
            # Select main category
            category_option = await self.page.wait_for_selector(f'text="{category}"', timeout=5000)
            await self.actions.human_click(category_option)
            
            # Select subcategory if provided
            if subcategory:
                await asyncio.sleep(0.5)
                subcategory_option = await self.page.wait_for_selector(f'text="{subcategory}"', timeout=5000)
                await self.actions.human_click(subcategory_option)
            
            logger.info("Category selected successfully")
            
        except Exception as e:
            logger.error(f"Error selecting category: {e}")
            raise
    
    async def fill_ad_form(self, ad_content: AdContent, image_paths: List[Path]):
        """
        Fill out the ad creation form.
        
        Args:
            ad_content: Ad content to post
            image_paths: Paths to images to upload
        """
        logger.info("Filling ad form")
        
        try:
            # Title
            logger.info("Entering title")
            title_input = await self.page.wait_for_selector('input[name="title"], #postad-title', timeout=10000)
            await self.actions.human_type(title_input, ad_content.title)
            
            # Description
            logger.info("Entering description")
            description_input = await self.page.wait_for_selector(
                'textarea[name="description"], #postad-description',
                timeout=10000
            )
            await self.actions.human_type(description_input, ad_content.description)
            
            # Price
            logger.info(f"Entering price: €{ad_content.price}")
            price_input = await self.page.wait_for_selector('input[name="price"], #postad-price', timeout=10000)
            await self.actions.human_type(price_input, str(int(ad_content.price)))
            
            # Postal code
            logger.info(f"Entering postal code: {ad_content.postal_code}")
            postal_input = await self.page.wait_for_selector(
                'input[name="zipCode"], input[name="postalCode"], #postad-zip',
                timeout=10000
            )
            await self.actions.human_type(postal_input, ad_content.postal_code)
            
            # Shipping type (Nur Abholung)
            logger.info("Setting shipping to PICKUP only")
            try:
                pickup_radio = await self.page.wait_for_selector(
                    'input[value="PICKUP"], input[name="shippingType"][value="pickup"]',
                    timeout=5000
                )
                await self.actions.human_click(pickup_radio)
            except Exception as e:
                logger.warning(f"Could not set shipping type: {e}")
            
            # Upload images
            if image_paths:
                logger.info(f"Uploading {len(image_paths)} images")
                await self.upload_images(image_paths)
            
            logger.info("Form filled successfully")
            
        except Exception as e:
            logger.error(f"Error filling form: {e}")
            raise
    
    async def upload_images(self, image_paths: List[Path]):
        """
        Upload product images.
        
        Args:
            image_paths: List of image paths to upload
        """
        try:
            # Find file input
            file_input = await self.page.wait_for_selector(
                'input[type="file"][accept*="image"]',
                timeout=10000
            )
            
            # Upload all images at once
            image_path_strs = [str(p.resolve()) for p in image_paths]
            await file_input.set_input_files(image_path_strs)
            
            # Wait for upload to complete
            await asyncio.sleep(2)
            
            logger.info(f"Uploaded {len(image_paths)} images")
            
        except Exception as e:
            logger.error(f"Error uploading images: {e}")
            raise
    
    async def save_as_draft(self):
        """Save the ad as a draft instead of publishing."""
        logger.info("Saving ad as draft")
        
        try:
            # Look for "Save as draft" button (adjust selector based on actual site)
            draft_button = await self.page.wait_for_selector(
                'button:has-text("Entwurf"), button:has-text("Als Entwurf speichern")',
                timeout=10000
            )
            
            await self.actions.human_click(draft_button)
            
            # Wait for confirmation
            await asyncio.sleep(2)
            
            logger.info("Ad saved as draft successfully")
            
        except Exception as e:
            logger.error(f"Error saving draft: {e}")
            # If draft button not found, try to find regular submit and warn user
            logger.warning("Could not find draft button - ad may be published instead!")
            raise
    
    async def create_ad(self, ad_content: AdContent, image_paths: List[Path], 
                       save_as_draft: bool = True):
        """
        Create a complete ad on kleinanzeigen.de.
        
        Args:
            ad_content: Ad content
            image_paths: Product images
            save_as_draft: Whether to save as draft (default True)
        """
        logger.info("Starting ad creation process")
        
        # Navigate to post ad page
        await self.navigate_to_post_ad()
        
        # Check login status
        if not await self.check_login_status():
            logger.error("User not logged in - manual login required")
            raise Exception("User must be logged in to post ads")
        
        # Select category
        await self.select_category(ad_content.category, ad_content.subcategory)
        
        # Fill form
        await self.fill_ad_form(ad_content, image_paths)
        
        # Scroll randomly to appear human
        await self.actions.scroll_randomly()
        
        # Save as draft or publish
        if save_as_draft:
            await self.save_as_draft()
        else:
            logger.warning("Publishing ad directly (not implemented - defaults to draft)")
            await self.save_as_draft()
        
        logger.info("Ad creation completed successfully")
