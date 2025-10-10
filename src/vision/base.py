"""
Abstract base class for vision analyzers (Strategy Pattern).
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any

from .models import ProductInfo


class VisionAnalyzer(ABC):
    """
    Abstract base class for vision analysis strategies.
    
    This class defines the interface that all vision analyzer implementations
    must follow, enabling the Strategy Pattern for flexible backend switching.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the vision analyzer.
        
        Args:
            config: Configuration dictionary for the analyzer
        """
        self.config = config
    
    @abstractmethod
    async def analyze_images(self, image_folder: Path) -> ProductInfo:
        """
        Analyze images in a folder and extract product information.
        
        Args:
            image_folder: Path to folder containing product images
            
        Returns:
            ProductInfo with extracted information
            
        Raises:
            ValueError: If no supported images found or analysis fails
        """
        pass
    
    @abstractmethod
    def get_supported_formats(self) -> list[str]:
        """
        Get list of supported image formats.
        
        Returns:
            List of supported file extensions (e.g., ['.jpg', '.png'])
        """
        pass
    
    def _is_supported_image(self, path: Path) -> bool:
        """
        Check if image format is supported by this analyzer.
        
        Args:
            path: Path to image file
            
        Returns:
            True if format is supported
        """
        return path.suffix.lower() in self.get_supported_formats()
    
    def _find_images(self, image_folder: Path, max_images: int = 10) -> list[Path]:
        """
        Find all supported images in a folder.
        
        Args:
            image_folder: Path to folder containing images
            max_images: Maximum number of images to return
            
        Returns:
            List of image paths
            
        Raises:
            ValueError: If folder doesn't exist or no images found
        """
        if not image_folder.exists():
            raise ValueError(f"Image folder not found: {image_folder}")
        
        image_paths = [
            p for p in sorted(image_folder.iterdir())
            if p.is_file() and self._is_supported_image(p)
        ]
        
        if not image_paths:
            raise ValueError(f"No supported images found in {image_folder}")
        
        return image_paths[:max_images]
    
    @property
    @abstractmethod
    def backend_name(self) -> str:
        """
        Get the name of this vision backend.
        
        Returns:
            Backend name (e.g., 'claude', 'blip2', 'openai', 'gemini')
        """
        pass
