"""
Content generator for classified ads.
"""

import logging
from typing import Optional
from anthropic import Anthropic

from ..vision.models import ProductInfo, AdContent

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates optimized content for kleinanzeigen.de ads."""
    
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        """
        Initialize the ContentGenerator.
        
        Args:
            api_key: Anthropic API key
            model: Claude model to use
        """
        self.client = Anthropic(api_key=api_key)
        self.model = model
    
    def _generate_title(self, product_info: ProductInfo) -> str:
        """
        Generate a compelling ad title (max 65 characters).
        
        Args:
            product_info: Product information
            
        Returns:
            Optimized title
        """
        # Build title components
        components = []
        
        if product_info.brand:
            components.append(product_info.brand)
        
        components.append(product_info.name)
        
        if product_info.color:
            components.append(product_info.color)
        
        # Join and truncate if needed
        title = " ".join(components)
        
        if len(title) > 65:
            # Truncate intelligently
            title = title[:62] + "..."
        
        return title
    
    def _enhance_description(self, product_info: ProductInfo) -> str:
        """
        Enhance product description for better appeal.
        
        Args:
            product_info: Product information
            
        Returns:
            Enhanced description
        """
        prompt = f"""Erstelle eine ansprechende Kleinanzeigen-Beschreibung für folgendes Produkt:

Produkt: {product_info.name}
Zustand: {product_info.condition}
Marke: {product_info.brand or 'Unbekannt'}
Farbe: {product_info.color or 'Nicht spezifiziert'}
Merkmale: {', '.join(product_info.features) if product_info.features else 'Keine besonderen Merkmale'}

Originalbeschreibung:
{product_info.description}

Erstelle eine verbesserte Beschreibung die:
- Ehrlich den Zustand beschreibt
- Wichtige Merkmale hervorhebt
- Freundlich und professionell klingt
- Typisch für deutsche Kleinanzeigen ist
- Zwischen 100-300 Wörtern lang ist

Schreibe nur die Beschreibung, ohne zusätzliche Erklärungen."""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            enhanced = response.content[0].text.strip()
            logger.info("Description enhanced successfully")
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing description: {e}")
            # Fallback to original description
            return product_info.description
    
    def generate_ad_content(
        self,
        product_info: ProductInfo,
        postal_code: str,
        category: str,
        subcategory: Optional[str] = None,
        price_override: Optional[float] = None
    ) -> AdContent:
        """
        Generate complete ad content from product information.
        
        Args:
            product_info: Product information from analysis
            postal_code: Postal code for ad location
            category: Category for the ad
            subcategory: Optional subcategory
            price_override: Optional price override
            
        Returns:
            Complete AdContent ready for posting
        """
        logger.info(f"Generating ad content for: {product_info.name}")
        
        # Generate title
        title = self._generate_title(product_info)
        
        # Enhance description
        description = self._enhance_description(product_info)
        
        # Determine price
        price = price_override if price_override is not None else (
            product_info.suggested_price or 10.0
        )
        
        # Create AdContent
        ad_content = AdContent(
            title=title,
            description=description,
            price=price,
            category=category,
            subcategory=subcategory,
            condition=product_info.condition,
            shipping_type="PICKUP",
            postal_code=postal_code
        )
        
        logger.info(f"Ad content generated: '{ad_content.title}' - €{ad_content.price}")
        return ad_content
