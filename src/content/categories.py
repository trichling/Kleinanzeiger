"""
Category detection and mapping for kleinanzeigen.de.
"""

import json
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class CategoryMapper:
    """Maps product information to kleinanzeigen.de categories."""
    
    def __init__(self, categories_file: Path):
        """
        Initialize the CategoryMapper.
        
        Args:
            categories_file: Path to categories.json file
        """
        with open(categories_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        
        self.categories = self.data['categories']
        self.keywords = self.data['keywords']
    
    def _match_keywords(self, text: str) -> Optional[str]:
        """Match text against category keywords."""
        text_lower = text.lower()
        
        best_match = None
        max_matches = 0
        
        for category, keywords in self.keywords.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > max_matches:
                max_matches = matches
                best_match = category
        
        return best_match if max_matches > 0 else None
    
    def _find_subcategory(self, category: str, text: str) -> Optional[str]:
        """Find best matching subcategory within a category."""
        if category not in self.categories:
            return None
        
        text_lower = text.lower()
        subcategories = self.categories[category]['subcategories']
        
        # Check each subcategory and its items
        for subcat, items in subcategories.items():
            # Check if subcategory name matches
            if subcat.lower() in text_lower:
                return subcat
            
            # Check if any items match
            for item in items:
                if item.lower() in text_lower:
                    return subcat
        
        # Return first subcategory as fallback
        return list(subcategories.keys())[0] if subcategories else None
    
    def map_category(self, product_name: str, product_description: str, 
                     detected_category: Optional[str] = None) -> Tuple[str, Optional[str]]:
        """
        Map product to kleinanzeigen.de category and subcategory.
        
        Args:
            product_name: Product name
            product_description: Product description
            detected_category: Category detected by vision analysis
            
        Returns:
            Tuple of (category, subcategory)
        """
        combined_text = f"{product_name} {product_description}"
        
        # Try to use detected category first
        category = None
        if detected_category:
            # Check if detected category matches our categories
            for cat in self.categories.keys():
                if cat.lower() in detected_category.lower() or detected_category.lower() in cat.lower():
                    category = cat
                    break
        
        # If no match, use keyword matching
        if not category:
            category = self._match_keywords(combined_text)
        
        # Fallback to "Sonstiges"
        if not category:
            category = "Sonstiges"
            logger.warning(f"Could not determine category, using fallback: {category}")
        
        # Find subcategory
        subcategory = self._find_subcategory(category, combined_text)
        
        logger.info(f"Mapped to category: {category}, subcategory: {subcategory}")
        return category, subcategory
    
    def get_all_categories(self) -> dict:
        """Get all available categories and subcategories."""
        return self.categories
