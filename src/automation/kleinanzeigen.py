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


def collect_uploadable_images(image_folder: Path, max_images: int = 10) -> List[Path]:
    """
    Collect all uploadable images from a folder (excludes HEIC files).

    Args:
        image_folder: Path to folder containing images
        max_images: Maximum number of images to collect

    Returns:
        List of image paths (excluding HEIC/HEIF files)

    Raises:
        ValueError: If folder doesn't exist or no uploadable images found
    """
    if not image_folder.exists():
        raise ValueError(f"Image folder not found: {image_folder}")

    # Supported web image formats (excludes HEIC/HEIF which are not web-compatible)
    supported_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

    image_paths = []

    for p in sorted(image_folder.iterdir()):
        if not p.is_file():
            continue

        # Only include web-compatible image formats
        if p.suffix.lower() in supported_extensions:
            image_paths.append(p)

        # Stop if we've reached max_images
        if len(image_paths) >= max_images:
            break

    if not image_paths:
        raise ValueError(f"No uploadable images found in {image_folder}")

    return image_paths


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
        """Navigate to the 'post ad' page (step 2 - the form)."""
        logger.info("Navigating to post ad page")

        # Check if we're already on step 2 (the form)
        current_url = self.page.url
        if 'p-anzeige-aufgeben-schritt2' in current_url:
            logger.info("Already on step 2 (form page), skipping navigation")
            return

        # Check if we're on step 1 (category selection)
        if 'p-anzeige-aufgeben.html' in current_url or 'p-anzeige-aufgeben-schritt1' in current_url:
            logger.info("On step 1, clicking to go to step 2")
            try:
                # Click the post ad button to proceed to step 2
                post_button = await self.page.wait_for_selector('//*[@id="site-mainnav-postad"]', timeout=5000)
                await post_button.click()
                await self.actions.wait_for_page_load()

                # Check if we made it to step 2
                if 'schritt2' in self.page.url:
                    logger.info("Successfully navigated to step 2")
                    return
            except Exception as e:
                logger.warning(f"Could not click button on step 1: {e}")

        # Navigate directly to step 2 (most reliable approach)
        logger.info("Navigating directly to step 2 (form page)")
        await self.page.goto(f"{self.base_url}/p-anzeige-aufgeben-schritt2.html")
        await self.actions.wait_for_page_load()

        # Verify we're on the correct page
        if 'schritt2' in self.page.url:
            logger.info("Successfully arrived at step 2 (form page)")
        else:
            logger.warning(f"May not be on correct page. Current URL: {self.page.url}")
    
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

    async def select_condition(self, condition: str):
        """
        Select product condition by opening the dialog and choosing the appropriate radio button.

        Args:
            condition: Product condition (Neu, Wie neu, Gebraucht, Defekt, etc.)
        """
        logger.info(f"Selecting condition: {condition}")

        try:
            # Map German condition values to radio button indices
            condition_mapping = {
                'Neu': 1,           # New
                'Wie neu': 2,       # Like new
                'Gut': 3,           # OK/Good
                'Gebraucht': 3,     # Used -> map to OK/Good
                'Akzeptabel': 4,    # Alright/Acceptable
                'Defekt': 4         # Defective -> map to Alright (closest option)
            }

            # Get the radio button index (default to 3 = OK/Good if not found)
            button_index = condition_mapping.get(condition, 3)
            logger.info(f"Mapping '{condition}' to radio button index {button_index}")

            # Step 1: Click the button to open the condition dialog
            logger.info("Opening condition selection dialog")
            dialog_trigger = await self.page.wait_for_selector(
                '//*[@id="j-post-listing-frontend-conditions"]/div/div/div/div[1]/div[2]/div/button',
                timeout=10000
            )
            await self.actions.human_click(dialog_trigger)

            # Wait for dialog to appear
            await asyncio.sleep(0.5)

            # Step 2: Select the appropriate radio button
            logger.info(f"Selecting condition radio button {button_index}")
            condition_radio = await self.page.wait_for_selector(
                f'//*[@id="condition-selector"]/div/label[{button_index}]',
                timeout=10000
            )
            await self.actions.human_click(condition_radio)

            # Small delay to let selection register
            await asyncio.sleep(0.3)

            # Step 3: Confirm selection by clicking the confirmation button
            logger.info("Confirming condition selection")
            confirm_button = await self.page.wait_for_selector(
                '//*[@id="j-post-listing-frontend-conditions"]/div/div/div/div[1]/div[2]/div/dialog/div/footer/button[2]',
                timeout=10000
            )
            await self.actions.human_click(confirm_button)

            # Wait for dialog to close
            await asyncio.sleep(0.5)

            logger.info(f"Condition '{condition}' selected successfully")

        except Exception as e:
            logger.error(f"Error selecting condition: {e}")
            raise

    async def select_shipping_method(self, shipping_type: str = "PICKUP"):
        """
        Select shipping method (pickup or shipping).

        Args:
            shipping_type: Shipping type (PICKUP, SHIPPING, or BOTH)
        """
        logger.info(f"Selecting shipping method: {shipping_type}")

        try:
            # Map shipping types to radio button indices
            # Currently only implementing pickup as requested
            shipping_mapping = {
                'PICKUP': 2,     # Pickup only (Abholung)
                'SHIPPING': 1,   # Shipping (Versand) - if needed later
                'BOTH': 3        # Both options - if needed later
            }

            # Get the radio button index (default to 2 = PICKUP if not found)
            button_index = shipping_mapping.get(shipping_type, 2)
            logger.info(f"Mapping '{shipping_type}' to radio button index {button_index}")

            # Select the shipping method radio button
            logger.info("Selecting pickup option")
            shipping_radio = await self.page.wait_for_selector(
                f'//*[@id="shipping-pickup-selector"]/div/label[{button_index}]',
                timeout=10000
            )
            await self.actions.human_click(shipping_radio)

            # Small delay to let selection register
            await asyncio.sleep(0.3)

            logger.info(f"Shipping method '{shipping_type}' selected successfully")

        except Exception as e:
            logger.error(f"Error selecting shipping method: {e}")
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
            # Step 1: Fill title (category auto-selected after leaving field)
            logger.info(f"Entering title: {ad_content.title}")
            title_input = await self.page.wait_for_selector('//*[@id="postad-title"]', timeout=10000)
            await self.actions.human_type(title_input, ad_content.title)

            # Press Tab to trigger category auto-selection (more reliable than blur event)
            logger.info("Pressing Tab key to trigger category auto-selection")
            await title_input.press('Tab')
            await asyncio.sleep(2)  # Wait for category auto-selection to complete
            logger.info("Title entered, category should be auto-selected")

            # Step 2: Select condition (after category auto-selection)
            logger.info(f"Selecting condition: {ad_content.condition}")
            await self.select_condition(ad_content.condition)

            # Step 3: Select shipping method
            logger.info(f"Selecting shipping method: {ad_content.shipping_type}")
            await self.select_shipping_method(ad_content.shipping_type)

            # Step 4: Fill price
            logger.info(f"Entering price: €{ad_content.price}")
            price_input = await self.page.wait_for_selector('//*[@id="micro-frontend-price"]', timeout=10000)
            await self.actions.human_type(price_input, str(int(ad_content.price)))

            # Step 5: Select VB (Verhandlungsbasis)
            logger.info("Selecting 'Verhandlungsbasis' (VB)")
            price_type_select = await self.page.wait_for_selector('//*[@id="micro-frontend-price-type"]', timeout=10000)
            await price_type_select.select_option(value='NEGOTIABLE')  # VB = NEGOTIABLE

            # Step 6: Fill description
            logger.info("Entering description")
            description_input = await self.page.wait_for_selector('//*[@id="pstad-descrptn"]', timeout=10000)
            await self.actions.human_type(description_input, ad_content.description)

            # Step 7: Upload images if provided
            if image_paths:
                logger.info(f"Uploading {len(image_paths)} image(s)")
                await self.upload_images(image_paths)

            # Note: Skipping postal code - may be auto-filled from profile

            logger.info("Form filled successfully")

        except Exception as e:
            logger.error(f"Error filling form: {e}")
            raise
    
    async def upload_images(self, image_paths: List[Path]):
        """
        Upload product images by clicking the upload icon and selecting files.
        Skips HEIC files automatically.

        Args:
            image_paths: List of image paths to upload (should not include .heic files)
        """
        try:
            # Filter out HEIC files (shouldn't be in the list, but double-check)
            uploadable_images = [
                p for p in image_paths
                if p.suffix.lower() not in ['.heic', '.heif']
            ]

            if not uploadable_images:
                logger.warning("No uploadable images found (HEIC files are not supported)")
                return

            logger.info(f"Preparing to upload {len(uploadable_images)} image(s)")

            # Find the hidden file input element (the actual input that handles file selection)
            # Kleinanzeigen uses a hidden file input that gets triggered by clicking the icon
            file_input = await self.page.wait_for_selector(
                'input[type="file"][accept*="image"]',
                timeout=10000,
                state='attached'  # Element might be hidden, so just check if attached
            )

            # Upload all images at once using the file input
            # Convert Path objects to absolute string paths
            image_path_strs = [str(p.resolve()) for p in uploadable_images]
            logger.info(f"Uploading images: {[p.name for p in uploadable_images]}")

            await file_input.set_input_files(image_path_strs)

            # Wait for uploads to complete (give more time for multiple images)
            wait_time = min(2 + len(uploadable_images) * 0.5, 10)  # 2s base + 0.5s per image, max 10s
            logger.info(f"Waiting {wait_time:.1f}s for upload to complete")
            await asyncio.sleep(wait_time)

            logger.info(f"Successfully uploaded {len(uploadable_images)} image(s)")

        except Exception as e:
            logger.error(f"Error uploading images: {e}")
            raise
    
    async def save_as_draft(self, auto_confirm: bool = False) -> tuple[bool, bool]:
        """
        Save the ad as a draft instead of publishing.

        Args:
            auto_confirm: If True, skip confirmation prompt and save immediately

        Returns:
            Tuple of (saved: bool, keep_browser_open: bool)
            - saved: True if draft was saved, False if user cancelled
            - keep_browser_open: True if browser should stay open for manual review
        """
        logger.info("Saving ad as draft")

        try:
            # Show current page info
            logger.info(f"Current URL: {self.page.url}")
            logger.info("Ad form has been filled and is ready to be saved as draft.")

            # Check if confirmation is needed
            if not auto_confirm:
                # Add confirmation prompt - wait for user input
                logger.warning("=" * 60)
                logger.warning("CONFIRMATION: Ready to save ad as draft!")
                logger.warning("=" * 60)

                # Wait for user confirmation
                user_input = input("Type 'yes' to proceed with saving the draft (anything else to skip): ").strip().lower()

                if user_input != 'yes':
                    logger.info(f"User cancelled draft save (typed '{user_input}'). Skipping save.")
                    logger.info("Browser tab will remain open for manual review.")
                    logger.info("Test completed successfully - form was filled correctly.")
                    return (False, True)  # Not saved, keep browser open

                logger.info("Confirmation received, proceeding with save...")
            else:
                logger.info("Auto-confirm enabled, proceeding with save without confirmation...")

            # Click "Entwurf speichern" (Save Draft) button
            logger.info("Clicking 'Entwurf speichern' button")
            draft_button = await self.page.wait_for_selector(
                '//*[@id="j-post-listing-frontend-draft-button"]/div/div/button',
                timeout=10000
            )

            await self.actions.human_click(draft_button)

            # Wait for confirmation/redirect
            await asyncio.sleep(3)

            logger.info("Ad saved as draft successfully")
            logger.info(f"Current URL: {self.page.url}")
            return (True, False)  # Saved, can close browser

        except Exception as e:
            logger.error(f"Error saving draft: {e}")
            logger.warning("Could not find draft button at expected location")
            raise
    
    async def create_ad(self, ad_content: AdContent, image_paths: List[Path],
                       save_as_draft: bool = True, auto_confirm: bool = False) -> bool:
        """
        Create a complete ad on kleinanzeigen.de.

        Args:
            ad_content: Ad content
            image_paths: Product images
            save_as_draft: Whether to save as draft (default True)
            auto_confirm: Skip confirmation prompt before saving (default False)

        Returns:
            True if browser should be kept open for manual review, False otherwise
        """
        logger.info("Starting ad creation process")

        # Navigate to post ad page
        await self.navigate_to_post_ad()

        # Check login status (optional - mainly for debugging)
        # The site will show login if needed
        try:
            if not await self.check_login_status():
                logger.warning("User may not be logged in - proceeding anyway")
        except Exception as e:
            logger.debug(f"Login check failed: {e}, continuing anyway")

        # Fill form (category auto-selected from title)
        await self.fill_ad_form(ad_content, image_paths)

        # Scroll randomly to appear human
        await self.actions.scroll_randomly()

        # Save as draft or publish
        if save_as_draft:
            saved, keep_open = await self.save_as_draft(auto_confirm=auto_confirm)
            if not saved:
                logger.info("Draft save skipped by user - ad creation process completed")
                return keep_open
        else:
            logger.warning("Publishing ad directly (not implemented - defaults to draft)")
            saved, keep_open = await self.save_as_draft(auto_confirm=auto_confirm)
            if not saved:
                logger.info("Draft save skipped by user - ad creation process completed")
                return keep_open

        logger.info("Ad creation completed successfully")
        return False  # Draft saved, can close browser
