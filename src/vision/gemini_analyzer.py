"""
Google Gemini Vision implementation of VisionAnalyzer.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any
import google.generativeai as genai
from PIL import Image

from .base import VisionAnalyzer
from .models import ProductInfo

logger = logging.getLogger(__name__)


class GeminiVisionAnalyzer(VisionAnalyzer):
    """Vision analyzer using Google's Gemini Vision API."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Gemini Vision analyzer.

        Args:
            config: Configuration with 'api_key', 'model', etc.
        """
        super().__init__(config)
        api_key = config.get('api_key')

        # Debug logging
        if api_key:
            logger.debug(f"Gemini API key present: {api_key[:20]}... (length: {len(api_key)})")
        else:
            logger.error("No API key provided in config!")
            raise ValueError("Gemini API key is required but not provided in config")

        genai.configure(api_key=api_key)
        self.model_name = config.get('model', 'gemini-pro-vision')
        self.model = genai.GenerativeModel(self.model_name)
        self.max_images = config.get('max_images_per_ad', 10)
        logger.debug(f"Gemini analyzer initialized with model: {self.model_name}")
    
    def get_supported_formats(self) -> list[str]:
        """Gemini supports JPG, PNG, WEBP."""
        return ['.jpg', '.jpeg', '.png', '.webp']
    
    @property
    def backend_name(self) -> str:
        return 'gemini'
    
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze images using Google Gemini Vision API.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
        """
        image_paths = self._find_images(image_folder, self.max_images)
        logger.info(f"[Gemini] Analyzing {len(image_paths)} images from {image_folder}")
        
        # Load images
        images = []
        for img_path in image_paths:
            try:
                img = Image.open(img_path)
                images.append(img)
            except Exception as e:
                logger.error(f"Error loading image {img_path}: {e}")
                continue
        
        if not images:
            raise ValueError("No images could be loaded successfully")
        
        # Create prompt
        prompt = """Analyze these product images and extract the following information:

1. Product name (short and precise)
2. Detailed product description (condition, features, notable characteristics)
3. Condition (New, Like New, Used, Defective)
4. Category (e.g., Electronics, Furniture, Clothing, Sports, Household)
5. Brand/Manufacturer (if identifiable)
6. Color (if relevant)
7. Key features (list)
8. Suggested price in EUR (realistic for German second-hand market)

Respond in the following JSON format:
{
    "name": "Product name",
    "description": "Detailed description...",
    "condition": "Used",
    "category": "Category",
    "brand": "Brand",
    "color": "Color",
    "features": ["Feature 1", "Feature 2"],
    "suggested_price": 50.00
}

Be precise and describe the condition honestly based on the images."""
        
        # Call Gemini API
        try:
            # Prepare content with prompt and images
            content = [prompt] + images
            
            response = self.model.generate_content(content)
            response_text = response.text
            
            logger.debug(f"Gemini response: {response_text}")
            
            # Parse JSON (handle potential markdown code blocks)
            json_str = response_text
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()
            
            data = json.loads(json_str)
            
            # Create ProductInfo
            product_info = ProductInfo(
                name=data.get("name", "Unknown Product"),
                description=data.get("description", ""),
                condition=data.get("condition", "Used"),
                category=data.get("category"),
                brand=data.get("brand"),
                color=data.get("color"),
                features=data.get("features", []),
                suggested_price=data.get("suggested_price"),
                image_paths=image_paths
            )
            
            logger.info(f"[Gemini] Successfully analyzed product: {product_info.name}")
            return product_info
            
        except Exception as e:
            logger.error(f"[Gemini] Error calling API: {e}")
            raise
