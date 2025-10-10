"""
Factory for creating vision analyzer instances.
"""

import logging
from typing import Dict, Any, Optional

from .base import VisionAnalyzer
from .claude_analyzer import ClaudeVisionAnalyzer
from .blip2_analyzer import BLIP2VisionAnalyzer
from .openai_analyzer import OpenAIVisionAnalyzer
from .gemini_analyzer import GeminiVisionAnalyzer

logger = logging.getLogger(__name__)


class VisionAnalyzerFactory:
    """
    Factory class for creating vision analyzer instances.
    
    Supports multiple backends: Claude, BLIP-2, OpenAI, Gemini.
    """
    
    # Registry of available analyzers
    ANALYZERS = {
        'claude': ClaudeVisionAnalyzer,
        'blip2': BLIP2VisionAnalyzer,
        'openai': OpenAIVisionAnalyzer,
        'gemini': GeminiVisionAnalyzer,
    }
    
    @classmethod
    def create(cls, backend: str, config: Dict[str, Any]) -> VisionAnalyzer:
        """
        Create a vision analyzer instance.
        
        Args:
            backend: Backend name ('claude', 'blip2', 'openai', 'gemini')
            config: Configuration dictionary for the analyzer
            
        Returns:
            VisionAnalyzer instance
            
        Raises:
            ValueError: If backend is not supported
        """
        backend_lower = backend.lower()
        
        if backend_lower not in cls.ANALYZERS:
            available = ', '.join(cls.ANALYZERS.keys())
            raise ValueError(
                f"Unsupported vision backend: {backend}. "
                f"Available backends: {available}"
            )
        
        analyzer_class = cls.ANALYZERS[backend_lower]
        logger.info(f"Creating {backend_lower} vision analyzer")
        
        try:
            analyzer = analyzer_class(config)
            return analyzer
        except Exception as e:
            logger.error(f"Failed to create {backend_lower} analyzer: {e}")
            raise
    
    @classmethod
    def get_available_backends(cls) -> list[str]:
        """
        Get list of available vision backends.
        
        Returns:
            List of backend names
        """
        return list(cls.ANALYZERS.keys())
    
    @classmethod
    def create_from_settings(cls, settings: Dict[str, Any]) -> VisionAnalyzer:
        """
        Create analyzer from settings dictionary.
        
        Expected settings structure:
        {
            'vision': {
                'backend': 'claude',  # or 'blip2', 'openai', 'gemini'
                'claude': {'api_key': '...', 'model': '...'},
                'blip2': {'model_name': '...', 'device': '...'},
                'openai': {'api_key': '...', 'model': '...'},
                'gemini': {'api_key': '...', 'model': '...'},
                # ... common settings ...
            }
        }
        
        Args:
            settings: Full settings dictionary
            
        Returns:
            VisionAnalyzer instance
        """
        vision_settings = settings.get('vision', {})
        backend = vision_settings.get('backend', 'claude')
        
        # Get backend-specific config
        backend_config = vision_settings.get(backend, {})
        
        # Merge with common vision settings
        common_settings = {
            k: v for k, v in vision_settings.items()
            if k not in ['backend', 'claude', 'blip2', 'openai', 'gemini']
        }
        config = {**common_settings, **backend_config}
        
        return cls.create(backend, config)
