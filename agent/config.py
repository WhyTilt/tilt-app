"""
Configuration management for Tilt
Handles API keys and settings storage in MongoDB
"""
import os
from typing import Optional
from pymongo import MongoClient
from datetime import datetime, timezone


class ConfigManager:
    def __init__(self):
        self.client = MongoClient('mongodb://localhost:27017/')
        self.db = self.client.tilt
        self.config_collection = self.db.config
        
    def get_api_key(self) -> Optional[str]:
        """Get Anthropic API key from database"""
        print(f"DEBUG: Searching for API key in collection: {self.config_collection.name}")
        config = self.config_collection.find_one({"key": "anthropic_api_key"})
        print(f"DEBUG: Found config doc: {config}")
        result = config.get("value") if config else None
        print(f"DEBUG: Returning API key: {result[:20] + '...' if result else 'None'}")
        return result
    
    def set_api_key(self, api_key: str) -> bool:
        """Store Anthropic API key in database"""
        try:
            self.config_collection.update_one(
                {"key": "anthropic_api_key"},
                {
                    "$set": {
                        "key": "anthropic_api_key",
                        "value": api_key,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error storing API key: {e}")
            return False
    
    def get_setting(self, key: str, default=None):
        """Get a configuration setting"""
        config = self.config_collection.find_one({"key": key})
        return config.get("value", default) if config else default
    
    def set_setting(self, key: str, value) -> bool:
        """Store a configuration setting"""
        try:
            self.config_collection.update_one(
                {"key": key},
                {
                    "$set": {
                        "key": key,
                        "value": value,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error storing setting {key}: {e}")
            return False
    
    def is_configured(self) -> bool:
        """Check if API key is configured"""
        api_key = self.get_api_key()
        return api_key is not None and api_key.strip() != ""
    
    def get_model(self) -> str:
        """Get configured model name"""
        return self.get_setting("anthropic_model", "claude-sonnet-4-20250514")
    
    def set_model(self, model: str) -> bool:
        """Set model name"""
        return self.set_setting("anthropic_model", model)


# Global config instance
config = ConfigManager()