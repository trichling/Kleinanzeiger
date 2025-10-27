"""
Content generator for classified ads.
Supports multiple AI backends: Claude (Anthropic), Gemini (Google), OpenAI, and simple template-based generation.
"""

import logging
from typing import Optional

from ..vision.models import ProductInfo, AdContent

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates optimized content for kleinanzeigen.de ads using configurable AI backends."""

    def __init__(self, backend: str = "simple", api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the ContentGenerator.

        Args:
            backend: Backend to use ('claude', 'gemini', 'openai', 'simple')
            api_key: API key for the selected backend (not required for 'simple')
            model: Model name to use (backend-specific)
        """
        self.backend = backend.lower()
        self.api_key = api_key
        self.model = model
        self.client = None

        # Initialize the appropriate client based on backend
        if self.backend == "claude":
            from anthropic import Anthropic
            if not api_key:
                raise ValueError("API key required for Claude backend")
            self.client = Anthropic(api_key=api_key)
            self.model = model or "claude-3-5-sonnet-20241022"

        elif self.backend == "gemini":
            import google.generativeai as genai
            if not api_key:
                raise ValueError("API key required for Gemini backend")
            logger.debug(f"ContentGenerator: Configuring Gemini with API key: {api_key[:20] if api_key else 'NONE'}... (length: {len(api_key) if api_key else 0})")
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel(model or "gemini-pro")
            self.model = model or "gemini-pro"

        elif self.backend == "openai":
            from openai import OpenAI
            if not api_key:
                raise ValueError("API key required for OpenAI backend")
            self.client = OpenAI(api_key=api_key)
            self.model = model or "gpt-4-turbo-preview"

        elif self.backend == "simple":
            # No client needed for simple template-based generation
            logger.info("Using simple template-based content generation (no AI)")

        else:
            raise ValueError(f"Unsupported backend: {backend}. Choose from: claude, gemini, openai, simple")

        logger.info(f"ContentGenerator initialized with backend: {self.backend}")
    
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
        Enhance product description for better appeal using the configured backend.

        Args:
            product_info: Product information

        Returns:
            Enhanced description
        """
        # For simple backend, use basic template
        if self.backend == "simple":
            return self._simple_description(product_info)

        # Build the prompt for AI backends
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
            if self.backend == "claude":
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1000,
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }]
                )
                enhanced = response.content[0].text.strip()

            elif self.backend == "gemini":
                response = self.client.generate_content(prompt)
                enhanced = response.text.strip()

            elif self.backend == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }],
                    max_tokens=1000
                )
                enhanced = response.choices[0].message.content.strip()

            else:
                # Fallback to simple
                enhanced = self._simple_description(product_info)

            logger.info(f"Description enhanced successfully using {self.backend}")
            return enhanced

        except Exception as e:
            logger.error(f"Error enhancing description with {self.backend}: {e}")
            # Fallback to simple template
            return self._simple_description(product_info)

    def _simple_description(self, product_info: ProductInfo) -> str:
        """
        Generate a simple template-based description without AI.

        Args:
            product_info: Product information

        Returns:
            Simple description
        """
        parts = []

        # Start with original description if available
        if product_info.description:
            parts.append(product_info.description)
        else:
            parts.append(f"Zum Verkauf: {product_info.name}")

        # Add details
        details = []
        if product_info.brand:
            details.append(f"Marke: {product_info.brand}")
        if product_info.color:
            details.append(f"Farbe: {product_info.color}")
        details.append(f"Zustand: {product_info.condition}")

        if details:
            parts.append("\n\n" + "\n".join(details))

        # Add features
        if product_info.features:
            parts.append("\n\nMerkmale:")
            for feature in product_info.features:
                parts.append(f"- {feature}")

        return "\n".join(parts)
    
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

        Since Gemini now outputs German content, we simply:
        1. Use the title directly from vision analysis
        2. Use the condition directly from vision analysis
        3. Use the suggested price (or override)
        4. Format features into a cohesive description
        5. Let kleinanzeigen.de auto-detect category from the title

        Args:
            product_info: Product information from analysis (in German from Gemini)
            postal_code: Postal code for ad location
            category: Category (optional, auto-detected from title by kleinanzeigen.de)
            subcategory: Optional subcategory
            price_override: Optional price override

        Returns:
            Complete AdContent ready for posting
        """
        logger.info(f"Generating ad content for: {product_info.name}")

        # Use title directly from vision analysis (already in German)
        title = product_info.name[:65]  # Ensure max 65 chars
        logger.info(f"Using vision-generated title: {title}")

        # Format features into a cohesive description
        description = self._format_description_from_features(product_info)

        # Determine price
        price = price_override if price_override is not None else (
            product_info.suggested_price or 10.0
        )

        # Use category from vision analysis, fallback to provided one
        final_category = category or product_info.category or "Sonstiges"

        # Create AdContent
        ad_content = AdContent(
            title=title,
            description=description,
            price=price,
            category=final_category,
            subcategory=subcategory,
            condition=product_info.condition,
            shipping_type="PICKUP",
            postal_code=postal_code
        )

        logger.info(f"Ad content generated: '{ad_content.title}' - €{ad_content.price}")
        return ad_content

    def _format_description_from_features(self, product_info: ProductInfo) -> str:
        """
        Format the vision analysis output into a cohesive ad description.
        Combines the description and features from vision analysis.

        Args:
            product_info: Product information from vision analysis

        Returns:
            Formatted description for the ad
        """
        # Start with the vision-generated description
        description_parts = [product_info.description]

        # Add features as bullet points if available
        if product_info.features:
            description_parts.append("\nMerkmale:")
            for feature in product_info.features:
                description_parts.append(f"• {feature}")

        # Add brand info if available
        if product_info.brand:
            description_parts.append(f"\nMarke: {product_info.brand}")

        # Add color if available
        if product_info.color:
            description_parts.append(f"Farbe: {product_info.color}")

        # Add standard pickup notice
        description_parts.append("\nNur Abholung möglich.")

        return "\n".join(description_parts)
