"""
Unit tests for data models.
"""

import pytest
from pathlib import Path

from src.vision.models import ProductInfo, AdContent, BrowserConfig, VisionConfig


def test_product_info_creation():
    """Test ProductInfo model creation."""
    product = ProductInfo(
        name="Test Laptop",
        description="A great laptop",
        condition="Gebraucht",
        suggested_price=500.0
    )
    
    assert product.name == "Test Laptop"
    assert product.description == "A great laptop"
    assert product.suggested_price == 500.0


def test_product_info_negative_price():
    """Test ProductInfo validates negative prices."""
    with pytest.raises(ValueError):
        ProductInfo(
            name="Test",
            description="Test",
            suggested_price=-10.0
        )


def test_ad_content_creation():
    """Test AdContent model creation."""
    ad = AdContent(
        title="Gaming Laptop",
        description="Powerful gaming laptop",
        price=600.0,
        category="Elektronik",
        postal_code="10115"
    )
    
    assert ad.title == "Gaming Laptop"
    assert ad.price == 600.0
    assert ad.postal_code == "10115"


def test_ad_content_title_length():
    """Test AdContent validates title length."""
    with pytest.raises(ValueError):
        AdContent(
            title="A" * 70,  # Too long
            description="Test",
            price=100.0,
            category="Test",
            postal_code="12345"
        )


def test_ad_content_postal_code_validation():
    """Test AdContent validates postal codes."""
    # Invalid: not 5 digits
    with pytest.raises(ValueError):
        AdContent(
            title="Test",
            description="Test",
            price=100.0,
            category="Test",
            postal_code="123"
        )
    
    # Invalid: contains letters
    with pytest.raises(ValueError):
        AdContent(
            title="Test",
            description="Test",
            price=100.0,
            category="Test",
            postal_code="1234A"
        )


def test_browser_config_defaults():
    """Test BrowserConfig default values."""
    config = BrowserConfig()
    
    assert config.cdp_url == "http://localhost:9222"
    assert config.headless is False
    assert config.timeout == 30000
    assert config.screenshot_on_error is True


def test_vision_config_defaults():
    """Test VisionConfig default values."""
    config = VisionConfig()
    
    assert ".jpg" in config.supported_formats
    assert config.max_images_per_ad == 10
    assert config.resize_threshold == 5242880
