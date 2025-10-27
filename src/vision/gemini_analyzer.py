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
        
        # Create prompt - ALL OUTPUT IN GERMAN
        prompt = f"""WICHTIG: Alle {len(images)} Bilder zeigen DAS GLEICHE PRODUKT aus verschiedenen Blickwinkeln oder Details.
Analysiere ALLE Bilder zusammen, um dieses EINE Produkt zu beschreiben.

Falls es sich um ein Set handelt (z.B. mehrere Bücher, Spielzeuge, zusammen verkaufte Artikel), behandle das gesamte Set als EIN Produkt.
Manche Bilder zeigen eine Übersicht, andere Details - kombiniere alle Informationen.

Extrahiere die folgenden Informationen über dieses EINE Produkt IN DEUTSCHER SPRACHE:

1. Produktname (kurz und präzise, auf Deutsch)
2. Detaillierte Produktbeschreibung (Zustand, Merkmale, besondere Eigenschaften aus ALLEN Bildern, auf Deutsch)
3. Zustand (Neu, Wie Neu, Gebraucht, oder Defekt)
4. Kategorie (z.B. Elektronik, Möbel, Kleidung, Sport, Haushalt, Spielzeug)
5. Marke/Hersteller (falls erkennbar)
6. Farbe (falls relevant)
7. Wichtige Merkmale (Liste, kombiniere Informationen aus allen Bildern, auf Deutsch)
8. Vorgeschlagener Preis in EUR (realistisch für den deutschen Gebrauchtwarenmarkt)

WICHTIG: Alle Texte müssen auf DEUTSCH sein!

Antworte mit NUR EINEM JSON-Objekt (kein Array) in diesem Format:
{{
    "name": "Produktname auf Deutsch",
    "description": "Detaillierte Beschreibung auf Deutsch, die alle Bilder kombiniert...",
    "condition": "Gebraucht",
    "category": "Kategorie",
    "brand": "Marke",
    "color": "Farbe",
    "features": ["Merkmal 1 auf Deutsch", "Merkmal 2 auf Deutsch", "Merkmal 3 auf Deutsch"],
    "suggested_price": 50.00
}}

Gib NUR das JSON-Objekt zurück, sonst nichts. Gib KEIN Array von Objekten zurück."""
        
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

            # Handle case where API returns a list instead of dict (despite instructions)
            if isinstance(data, list):
                logger.warning(f"[Gemini] API returned a list despite prompt instructions. Full response: {data}")
                # If it's a list with one element, extract it
                if len(data) == 1 and isinstance(data[0], dict):
                    logger.warning(f"[Gemini] Extracting single dict from list")
                    data = data[0]
                # If it's multiple elements, this is wrong - multiple products detected
                elif len(data) > 1:
                    raise ValueError(
                        f"[Gemini] Returned {len(data)} objects - it seems Gemini analyzed each image separately. "
                        f"This is a bug. Expected one combined analysis. Response: {data[:2]}..."  # Show first 2 for debug
                    )
                else:
                    raise ValueError(f"[Gemini] Unexpected list response: {data}")

            # Ensure data is a dictionary
            if not isinstance(data, dict):
                raise ValueError(f"[Gemini] Expected dict, got {type(data)}: {data}")

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
