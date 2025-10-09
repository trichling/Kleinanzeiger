"""
Unit tests for category mapping functionality.
"""

import pytest
from pathlib import Path
import json
import tempfile

from src.content.categories import CategoryMapper


@pytest.fixture
def categories_data():
    """Fixture for test categories data."""
    return {
        "categories": {
            "Elektronik": {
                "subcategories": {
                    "Audio & HiFi": ["Lautsprecher", "Kopfhörer"],
                    "Computer & Zubehör": ["Laptops", "Monitore"]
                }
            },
            "Möbel & Wohnen": {
                "subcategories": {
                    "Wohnzimmer": ["Sofas", "Couchtische"]
                }
            },
            "Sonstiges": {
                "subcategories": {
                    "Verschiedenes": ["Sonstiges"]
                }
            }
        },
        "keywords": {
            "Elektronik": ["elektronik", "laptop", "computer", "kopfhörer"],
            "Möbel & Wohnen": ["möbel", "sofa", "tisch"]
        }
    }


@pytest.fixture
def temp_categories_file(categories_data):
    """Create temporary categories file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(categories_data, f)
        temp_path = Path(f.name)
    
    yield temp_path
    
    # Cleanup
    temp_path.unlink()


def test_category_mapper_initialization(temp_categories_file):
    """Test CategoryMapper initialization."""
    mapper = CategoryMapper(temp_categories_file)
    assert mapper.categories is not None
    assert mapper.keywords is not None
    assert "Elektronik" in mapper.categories


def test_keyword_matching(temp_categories_file):
    """Test keyword matching."""
    mapper = CategoryMapper(temp_categories_file)
    
    # Test with laptop keyword
    category, subcategory = mapper.map_category("Gaming Laptop", "Powerful laptop for gaming")
    assert category == "Elektronik"
    
    # Test with sofa keyword
    category, subcategory = mapper.map_category("Bequemes Sofa", "Großes Sofa für Wohnzimmer")
    assert category == "Möbel & Wohnen"


def test_subcategory_matching(temp_categories_file):
    """Test subcategory matching."""
    mapper = CategoryMapper(temp_categories_file)
    
    category, subcategory = mapper.map_category("Laptop", "Dell Laptop 15 Zoll")
    assert subcategory == "Computer & Zubehör"


def test_fallback_to_sonstiges(temp_categories_file):
    """Test fallback to Sonstiges category."""
    mapper = CategoryMapper(temp_categories_file)
    
    category, subcategory = mapper.map_category("Random Thing", "Something unusual")
    assert category == "Sonstiges"


def test_detected_category_override(temp_categories_file):
    """Test using detected category."""
    mapper = CategoryMapper(temp_categories_file)
    
    category, subcategory = mapper.map_category(
        "Some product",
        "Description",
        detected_category="Elektronik"
    )
    assert category == "Elektronik"


def test_get_all_categories(temp_categories_file):
    """Test getting all categories."""
    mapper = CategoryMapper(temp_categories_file)
    
    all_categories = mapper.get_all_categories()
    assert "Elektronik" in all_categories
    assert "Möbel & Wohnen" in all_categories
