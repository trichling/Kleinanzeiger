"""
Pydantic models for data structures used throughout the application.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from pathlib import Path


class ProductInfo(BaseModel):
    """Information extracted from product images."""
    
    name: str = Field(..., description="Product name")
    description: str = Field(..., description="Detailed product description")
    condition: str = Field(default="Gebraucht", description="Product condition")
    category: Optional[str] = Field(None, description="Detected category")
    subcategory: Optional[str] = Field(None, description="Detected subcategory")
    suggested_price: Optional[float] = Field(None, description="Suggested price in EUR")
    brand: Optional[str] = Field(None, description="Product brand if detected")
    color: Optional[str] = Field(None, description="Product color if applicable")
    features: List[str] = Field(default_factory=list, description="Key features")
    image_paths: List[Path] = Field(default_factory=list, description="Paths to product images")
    
    @field_validator('suggested_price')
    @classmethod
    def validate_price(cls, v):
        if v is not None and v < 0:
            raise ValueError("Price must be positive")
        return v


class AdContent(BaseModel):
    """Generated content for a classified ad."""
    
    title: str = Field(..., max_length=65, description="Ad title (max 65 chars)")
    description: str = Field(..., description="Ad description")
    price: float = Field(..., ge=0, description="Price in EUR")
    category: str = Field(..., description="Category for the ad")
    subcategory: Optional[str] = Field(None, description="Subcategory for the ad")
    condition: str = Field(default="Gebraucht", description="Product condition")
    shipping_type: str = Field(default="PICKUP", description="Shipping type")
    postal_code: str = Field(..., description="Postal code for location")
    
    @field_validator('title')
    @classmethod
    def validate_title_length(cls, v):
        if len(v) > 65:
            raise ValueError(f"Title too long: {len(v)} chars (max 65)")
        return v
    
    @field_validator('postal_code')
    @classmethod
    def validate_postal_code(cls, v):
        if not v.isdigit() or len(v) != 5:
            raise ValueError("Postal code must be 5 digits")
        return v


class BrowserConfig(BaseModel):
    """Browser automation configuration."""
    
    cdp_url: str = Field(default="http://localhost:9222")
    headless: bool = Field(default=False)
    timeout: int = Field(default=30000, description="Timeout in milliseconds")
    screenshot_on_error: bool = Field(default=True)


class AnthropicConfig(BaseModel):
    """Anthropic API configuration."""
    
    api_key: str = Field(..., description="Anthropic API key")
    model: str = Field(default="claude-3-5-sonnet-20241022")
    max_tokens: int = Field(default=2000)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)


class DelaysConfig(BaseModel):
    """Configuration for human-like delays."""
    
    min_typing: int = Field(default=50, description="Min typing delay in ms")
    max_typing: int = Field(default=150, description="Max typing delay in ms")
    min_click: int = Field(default=100, description="Min click delay in ms")
    max_click: int = Field(default=300, description="Max click delay in ms")
    page_load: int = Field(default=2000, description="Page load wait in ms")
    form_field: int = Field(default=500, description="Form field delay in ms")


class VisionConfig(BaseModel):
    """Vision/image analysis configuration."""
    
    supported_formats: List[str] = Field(
        default=[".jpg", ".jpeg", ".png", ".webp"]
    )
    max_images_per_ad: int = Field(default=10)
    resize_threshold: int = Field(default=5242880, description="5MB in bytes")
