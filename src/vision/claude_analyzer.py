"""
Claude Vision API implementation of VisionAnalyzer.
"""

import base64
import json
import logging
from pathlib import Path
from typing import Dict, Any
from anthropic import Anthropic
from PIL import Image
import io

from .base import VisionAnalyzer
from .models import ProductInfo

logger = logging.getLogger(__name__)


class ClaudeVisionAnalyzer(VisionAnalyzer):
    """Vision analyzer using Anthropic's Claude Vision API."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Claude Vision analyzer.
        
        Args:
            config: Configuration with 'api_key', 'model', 'max_tokens', etc.
        """
        super().__init__(config)
        self.client = Anthropic(api_key=config['api_key'])
        self.model = config.get('model', 'claude-3-5-sonnet-20241022')
        self.max_tokens = config.get('max_tokens', 2000)
        self.temperature = config.get('temperature', 0.7)
        self.max_images = config.get('max_images_per_ad', 10)
        self.resize_threshold = config.get('resize_threshold', 5242880)  # 5MB
    
    def get_supported_formats(self) -> list[str]:
        """Claude supports JPG, PNG, WEBP."""
        return ['.jpg', '.jpeg', '.png', '.webp']
    
    @property
    def backend_name(self) -> str:
        return 'claude'
    
    def _resize_image_if_needed(self, image_path: Path) -> bytes:
        """Resize image if it exceeds the threshold."""
        file_size = image_path.stat().st_size
        
        if file_size <= self.resize_threshold:
            return image_path.read_bytes()
        
        logger.info(f"Resizing large image: {image_path.name} ({file_size} bytes)")
        
        with Image.open(image_path) as img:
            # Convert RGBA to RGB if necessary
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            
            # Calculate new dimensions (maintain aspect ratio)
            max_dimension = 2048
            ratio = min(max_dimension / img.width, max_dimension / img.height)
            
            if ratio < 1:
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            return buffer.getvalue()
    
    def _encode_image(self, image_path: Path) -> dict:
        """Encode image to base64 for Claude API."""
        image_data = self._resize_image_if_needed(image_path)
        encoded = base64.standard_b64encode(image_data).decode('utf-8')
        
        # Determine media type
        suffix = image_path.suffix.lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        }
        media_type = media_type_map.get(suffix, 'image/jpeg')
        
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": encoded
            }
        }
    
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze images using Claude Vision API.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
        """
        image_paths = self._find_images(image_folder, self.max_images)
        logger.info(f"[Claude] Analyzing {len(image_paths)} images from {image_folder}")
        
        # Prepare messages for Claude
        content = []
        
        # Add all images
        for img_path in image_paths:
            try:
                content.append(self._encode_image(img_path))
            except Exception as e:
                logger.error(f"Error encoding image {img_path}: {e}")
                continue
        
        if not content:
            raise ValueError("No images could be encoded successfully")
        
        # Add analysis prompt
        content.append({
            "type": "text",
            "text": """Analysiere diese Produktbilder und extrahiere folgende Informationen:

1. Produktname (kurz und präzise)
2. Detaillierte Produktbeschreibung (Zustand, Eigenschaften, Besonderheiten)
3. Zustand (Neu, Wie neu, Gebraucht, Defekt)
4. Kategorie (z.B. Elektronik, Möbel, Kleidung, Sport, Haushalt)
5. Marke/Hersteller (falls erkennbar)
6. Farbe (falls relevant)
7. Wichtige Merkmale (Liste)
8. Preisvorschlag in EUR (realistisch für deutschen Gebrauchtmarkt)

Antworte im folgenden JSON-Format:
{
    "name": "Produktname",
    "description": "Detaillierte Beschreibung...",
    "condition": "Gebraucht",
    "category": "Kategorie",
    "brand": "Marke",
    "color": "Farbe",
    "features": ["Merkmal 1", "Merkmal 2"],
    "suggested_price": 50.00
}

Sei präzise und beschreibe den Zustand ehrlich basierend auf den Bildern."""
        })
        
        # Call Claude API
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[{
                    "role": "user",
                    "content": content
                }]
            )
            
            # Extract JSON from response
            response_text = response.content[0].text
            logger.debug(f"Claude response: {response_text}")
            
            # Parse JSON (handle potential markdown code blocks)
            json_str = response_text
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()
            
            data = json.loads(json_str)
            
            # Create ProductInfo
            product_info = ProductInfo(
                name=data.get("name", "Unbekanntes Produkt"),
                description=data.get("description", ""),
                condition=data.get("condition", "Gebraucht"),
                category=data.get("category"),
                brand=data.get("brand"),
                color=data.get("color"),
                features=data.get("features", []),
                suggested_price=data.get("suggested_price"),
                image_paths=image_paths
            )
            
            logger.info(f"[Claude] Successfully analyzed product: {product_info.name}")
            return product_info
            
        except Exception as e:
            logger.error(f"[Claude] Error calling API: {e}")
            raise
