"""
Product image analyzer - now supports multiple vision backends.
"""

import logging
from pathlib import Path
from typing import Dict, Any

from .factory import VisionAnalyzerFactory
from .models import ProductInfo

logger = logging.getLogger(__name__)


class ProductAnalyzer:
    """
    Main product analyzer that delegates to specific vision backends.
    
    This class now acts as a facade, using the Strategy Pattern to
    support multiple vision backends (Claude, BLIP-2, OpenAI, Gemini).
    """
    
    def __init__(self, vision_settings: Dict[str, Any]):
        """
        Initialize the ProductAnalyzer.
        
        Args:
            vision_settings: Vision configuration from settings.yaml
        """
        self.backend = VisionAnalyzerFactory.create_from_settings(
            {'vision': vision_settings}
        )
        logger.info(f"ProductAnalyzer initialized with backend: {self.backend.backend_name}")
    
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze all images in a folder and extract product information.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
        """
        return await self.backend.analyze_images(image_folder)
    
    @property
    def backend_name(self) -> str:
        """Get the name of the current vision backend."""
        return self.backend.backend_name
