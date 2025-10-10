"""
OpenAI GPT-4 Vision implementation of VisionAnalyzer.
"""

import base64
import json
import logging
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI

from .base import VisionAnalyzer
from .models import ProductInfo

logger = logging.getLogger(__name__)


class OpenAIVisionAnalyzer(VisionAnalyzer):
    """Vision analyzer using OpenAI's GPT-4 Vision API."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize OpenAI Vision analyzer.
        
        Args:
            config: Configuration with 'api_key', 'model', 'max_tokens', etc.
        """
        super().__init__(config)
        self.client = OpenAI(api_key=config['api_key'])
        self.model = config.get('model', 'gpt-4-vision-preview')
        self.max_tokens = config.get('max_tokens', 2000)
        self.max_images = config.get('max_images_per_ad', 10)
    
    def get_supported_formats(self) -> list[str]:
        """OpenAI supports JPG, PNG, WEBP, GIF."""
        return ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    
    @property
    def backend_name(self) -> str:
        return 'openai'
    
    def _encode_image(self, image_path: Path) -> str:
        """Encode image to base64."""
        with open(image_path, 'rb') as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze images using OpenAI GPT-4 Vision API.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
        """
        image_paths = self._find_images(image_folder, self.max_images)
        logger.info(f"[OpenAI] Analyzing {len(image_paths)} images from {image_folder}")
        
        # Prepare messages
        content = []
        
        # Add all images
        for img_path in image_paths:
            try:
                base64_image = self._encode_image(img_path)
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                })
            except Exception as e:
                logger.error(f"Error encoding image {img_path}: {e}")
                continue
        
        if not content:
            raise ValueError("No images could be encoded successfully")
        
        # Add text prompt
        content.append({
            "type": "text",
            "text": """Analyze these product images and extract the following information:

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
        })
        
        # Call OpenAI API
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": content
                }],
                max_tokens=self.max_tokens
            )
            
            # Extract JSON from response
            response_text = response.choices[0].message.content
            logger.debug(f"OpenAI response: {response_text}")
            
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
            
            logger.info(f"[OpenAI] Successfully analyzed product: {product_info.name}")
            return product_info
            
        except Exception as e:
            logger.error(f"[OpenAI] Error calling API: {e}")
            raise
