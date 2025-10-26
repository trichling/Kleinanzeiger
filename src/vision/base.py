"""
Abstract base class for vision analyzers (Strategy Pattern).
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any
import logging
from PIL import Image

from .models import ProductInfo

logger = logging.getLogger(__name__)


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
        suffix = path.suffix.lower()
        # HEIC files are supported via automatic conversion
        return suffix in self.get_supported_formats() or suffix in ['.heic', '.heif']

    def _convert_heic_to_jpeg(self, heic_path: Path) -> Path:
        """
        Convert HEIC/HEIF image to JPEG format.

        Args:
            heic_path: Path to HEIC/HEIF file

        Returns:
            Path to converted JPEG file

        Raises:
            ImportError: If pillow-heif is not installed
            Exception: If conversion fails
        """
        try:
            # Import pillow-heif to register HEIF format with PIL
            import pillow_heif
            pillow_heif.register_heif_opener()

            # Open and convert to RGB
            img = Image.open(heic_path)

            # Convert to RGB if necessary (HEIC might have alpha channel)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Create output path in the same directory with .jpg extension
            jpeg_path = heic_path.with_suffix('.jpg')

            # Save as JPEG with high quality
            img.save(jpeg_path, 'JPEG', quality=95, optimize=True)

            logger.info(f"Converted HEIC to JPEG: {heic_path.name} -> {jpeg_path.name}")
            return jpeg_path

        except ImportError:
            logger.error("pillow-heif is not installed. Install with: pip install pillow-heif")
            raise ImportError(
                "HEIC support requires pillow-heif. Install with: pip install pillow-heif"
            )
        except Exception as e:
            logger.error(f"Failed to convert HEIC file {heic_path}: {e}")
            raise

    def _find_images(self, image_folder: Path, max_images: int = 10) -> list[Path]:
        """
        Find all supported images in a folder.
        Automatically converts HEIC/HEIF files to JPEG.

        Args:
            image_folder: Path to folder containing images
            max_images: Maximum number of images to return

        Returns:
            List of image paths (HEIC files will be converted to JPEG)

        Raises:
            ValueError: If folder doesn't exist or no images found
        """
        if not image_folder.exists():
            raise ValueError(f"Image folder not found: {image_folder}")

        image_paths = []
        converted_jpegs = set()  # Track JPEGs created from HEIC conversion

        # First pass: Convert HEIC files to JPEG
        for p in sorted(image_folder.iterdir()):
            if not p.is_file():
                continue

            # Convert HEIC files to JPEG
            if p.suffix.lower() in ['.heic', '.heif']:
                try:
                    jpeg_path = self._convert_heic_to_jpeg(p)
                    converted_jpegs.add(jpeg_path.name)
                    image_paths.append(jpeg_path)
                except Exception as e:
                    logger.warning(f"Skipping {p.name}: {e}")
                    continue

            # Stop if we've reached max_images
            if len(image_paths) >= max_images:
                break

        # Second pass: Add other supported images (skip converted JPEGs)
        if len(image_paths) < max_images:
            for p in sorted(image_folder.iterdir()):
                if not p.is_file():
                    continue

                # Skip HEIC files (already processed) and converted JPEGs
                if p.suffix.lower() in ['.heic', '.heif']:
                    continue
                if p.name in converted_jpegs:
                    continue

                # Add other supported images
                if self._is_supported_image(p):
                    image_paths.append(p)

                # Stop if we've reached max_images
                if len(image_paths) >= max_images:
                    break

        if not image_paths:
            raise ValueError(f"No supported images found in {image_folder}")

        return image_paths
    
    @property
    @abstractmethod
    def backend_name(self) -> str:
        """
        Get the name of this vision backend.
        
        Returns:
            Backend name (e.g., 'claude', 'blip2', 'openai', 'gemini')
        """
        pass
