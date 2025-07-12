"""
Utility functions for the tilt-agent system.
"""
import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.collection import Collection

logger = logging.getLogger(__name__)


def get_api_key_from_mongodb(connection_string: str = 'mongodb://localhost:27017/') -> Optional[str]:
    """
    Get the Anthropic API key from MongoDB instead of environment variables.
    
    Args:
        connection_string: MongoDB connection string
        
    Returns:
        API key if found, None otherwise
        
    Raises:
        ValueError: If no API key is found in the database
    """
    try:
        client = MongoClient(connection_string)
        db = client.tilt
        
        # Look for API key in settings collection
        settings_collection: Collection = db.settings
        config_doc = settings_collection.find_one({"key": "anthropic_key"})
        
        if config_doc and config_doc.get("value"):
            api_key = config_doc["value"]
            logger.info("Successfully retrieved API key from MongoDB")
            return api_key
        
        logger.error("No API key found in MongoDB")
        return None
        
    except Exception as e:
        logger.error(f"Error retrieving API key from MongoDB: {e}")
        return None


def validate_api_key(api_key: Optional[str]) -> bool:
    """
    Validate that the API key is present and has a reasonable format.
    
    Args:
        api_key: The API key to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not api_key:
        return False
        
    # Basic validation - Anthropic API keys start with 'sk-ant-'
    if not api_key.startswith('sk-ant-'):
        logger.warning("API key does not have expected format")
        return False
        
    # Check minimum length
    if len(api_key) < 20:
        logger.warning("API key appears to be too short")
        return False
        
    return True


def store_api_key_in_mongodb(api_key: str, connection_string: str = 'mongodb://localhost:27017/') -> bool:
    """
    Store the API key in MongoDB for future use.
    
    Args:
        api_key: The API key to store
        connection_string: MongoDB connection string
        
    Returns:
        True if successfully stored, False otherwise
    """
    try:
        if not validate_api_key(api_key):
            logger.error("Invalid API key format")
            return False
            
        client = MongoClient(connection_string)
        db = client.tilt
        
        # Store or update the API key in settings collection
        settings_collection: Collection = db.settings
        settings_collection.replace_one(
            {"key": "anthropic_key"},
            {"key": "anthropic_key", "value": api_key},
            upsert=True
        )
        
        logger.info("Successfully stored API key in MongoDB")
        return True
        
    except Exception as e:
        logger.error(f"Error storing API key in MongoDB: {e}")
        return False