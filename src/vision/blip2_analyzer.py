"""
BLIP-2 local vision model implementation of VisionAnalyzer.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any
import torch
from PIL import Image
from transformers import Blip2Processor, Blip2ForConditionalGeneration

from .base import VisionAnalyzer
from .models import ProductInfo

logger = logging.getLogger(__name__)


class BLIP2VisionAnalyzer(VisionAnalyzer):
    """
    Vision analyzer using local BLIP-2 model.
    
    This provides a free, offline alternative to API-based analyzers.
    Note: First run will download the model (~15GB).
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize BLIP-2 Vision analyzer.
        
        Args:
            config: Configuration with 'model_name', 'device', etc.
        """
        super().__init__(config)
        self.model_name = config.get('model_name', 'Salesforce/blip2-opt-2.7b')
        self.device = config.get('device', 'cuda' if torch.cuda.is_available() else 'cpu')
        self.max_images = config.get('max_images_per_ad', 10)
        self.max_new_tokens = config.get('max_new_tokens', 500)
        
        logger.info(f"[BLIP-2] Loading model {self.model_name} on {self.device}...")
        logger.info("[BLIP-2] First run may take time to download model (~15GB)")
        
        # Load model and processor
        self.processor = Blip2Processor.from_pretrained(self.model_name)
        self.model = Blip2ForConditionalGeneration.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == 'cuda' else torch.float32
        )
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"[BLIP-2] Model loaded successfully on {self.device}")
    
    def get_supported_formats(self) -> list[str]:
        """BLIP-2 supports common image formats."""
        return ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    
    @property
    def backend_name(self) -> str:
        return 'blip2'
    
    def _analyze_single_image(self, image_path: Path, prompt: str) -> str:
        """
        Analyze a single image with BLIP-2.
        
        Args:
            image_path: Path to image
            prompt: Question/prompt for the model
            
        Returns:
            Model's response
        """
        try:
            image = Image.open(image_path).convert('RGB')
            
            inputs = self.processor(
                images=image,
                text=prompt,
                return_tensors="pt"
            ).to(self.device, torch.float16 if self.device == 'cuda' else torch.float32)
            
            with torch.no_grad():
                generated_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=self.max_new_tokens
                )
            
            generated_text = self.processor.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            return generated_text
            
        except Exception as e:
            logger.error(f"[BLIP-2] Error analyzing {image_path}: {e}")
            return ""
    
    def _extract_product_info(self, image_paths: list[Path]) -> Dict[str, Any]:
        """
        Extract product information using multiple targeted prompts.
        
        Args:
            image_paths: List of image paths to analyze
            
        Returns:
            Dictionary with extracted information
        """
        # Use first image for main analysis
        main_image = image_paths[0]
        
        logger.info(f"[BLIP-2] Analyzing {len(image_paths)} images...")
        
        # Ask multiple targeted questions
        prompts = {
            'name': "Question: What is this product? Answer briefly:",
            'description': "Question: Describe this product in detail, including its condition and notable features. Answer:",
            'condition': "Question: What is the condition of this product? Is it new, like new, used, or defective? Answer:",
            'category': "Question: What category does this product belong to? (electronics, furniture, clothing, sports, household, etc.) Answer:",
            'brand': "Question: What brand or manufacturer is this product? Answer:",
            'color': "Question: What is the main color of this product? Answer:",
        }
        
        results = {}
        for key, prompt in prompts.items():
            response = self._analyze_single_image(main_image, prompt)
            results[key] = response
            logger.debug(f"[BLIP-2] {key}: {response}")
        
        # Extract features from description
        features = []
        if results.get('description'):
            # Simple feature extraction from description
            desc_words = results['description'].split()
            if len(desc_words) > 5:
                features = [results['description'][:100]]  # First part as feature
        
        # Estimate price based on category and condition
        suggested_price = self._estimate_price(
            results.get('category', ''),
            results.get('condition', ''),
            results.get('name', '')
        )
        
        return {
            'name': results.get('name', 'Unknown Product')[:100],
            'description': results.get('description', 'No description available'),
            'condition': self._normalize_condition(results.get('condition', 'used')),
            'category': results.get('category', '').title(),
            'brand': results.get('brand', '') if 'unknown' not in results.get('brand', '').lower() else None,
            'color': results.get('color', '') if results.get('color') else None,
            'features': features,
            'suggested_price': suggested_price
        }
    
    def _normalize_condition(self, condition: str) -> str:
        """Normalize condition string to standard values."""
        condition_lower = condition.lower()
        
        if any(word in condition_lower for word in ['new', 'neu', 'brand new']):
            return 'Neu'
        elif any(word in condition_lower for word in ['like new', 'wie neu', 'excellent']):
            return 'Wie neu'
        elif any(word in condition_lower for word in ['defect', 'broken', 'defekt', 'kaputt']):
            return 'Defekt'
        else:
            return 'Gebraucht'
    
    def _estimate_price(self, category: str, condition: str, name: str) -> float:
        """
        Estimate a reasonable price based on category and condition.
        
        This is a simple heuristic. For real use, consider integrating
        with a price estimation API or database.
        """
        base_prices = {
            'electronics': 100.0,
            'elektronik': 100.0,
            'furniture': 80.0,
            'möbel': 80.0,
            'clothing': 20.0,
            'kleidung': 20.0,
            'sports': 40.0,
            'sport': 40.0,
            'household': 30.0,
            'haushalt': 30.0,
        }
        
        # Get base price
        base = 50.0  # default
        for key, value in base_prices.items():
            if key in category.lower():
                base = value
                break
        
        # Adjust for condition
        condition_multipliers = {
            'Neu': 1.5,
            'Wie neu': 1.2,
            'Gebraucht': 0.7,
            'Defekt': 0.3
        }
        
        multiplier = condition_multipliers.get(condition, 0.7)
        estimated = base * multiplier
        
        # Round to reasonable values
        if estimated < 10:
            return round(estimated, 1)
        elif estimated < 100:
            return round(estimated / 5) * 5  # Round to nearest 5
        else:
            return round(estimated / 10) * 10  # Round to nearest 10
    
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze images using BLIP-2 local model.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
        """
        image_paths = self._find_images(image_folder, self.max_images)
        logger.info(f"[BLIP-2] Analyzing {len(image_paths)} images from {image_folder}")
        
        # Extract information
        data = self._extract_product_info(image_paths)
        
        # Create ProductInfo
        product_info = ProductInfo(
            name=data['name'],
            description=data['description'],
            condition=data['condition'],
            category=data['category'],
            brand=data['brand'],
            color=data['color'],
            features=data['features'],
            suggested_price=data['suggested_price'],
            image_paths=image_paths
        )
        
        logger.info(f"[BLIP-2] Successfully analyzed product: {product_info.name}")
        return product_info
