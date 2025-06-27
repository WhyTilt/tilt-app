import json
import os
from datetime import datetime
from typing import Any, Dict, Literal

from anthropic.types.beta import BetaToolUnionParam
from bson import ObjectId
from bson.decimal128 import Decimal128
from bson.binary import Binary
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from .base import BaseAnthropicTool, ToolError, ToolResult


class MongoDBQueryTool(BaseAnthropicTool):
    """
    Tool for querying MongoDB databases to retrieve data based on specified criteria.
    Useful for verifying database operations, checking data integrity, and retrieving records.
    """
    name: Literal["mongodb_query"] = "mongodb_query"

    def __init__(self):
        super().__init__()
        self.client = None
        self.db = None
    
    def _serialize_doc(self, doc):
        """Convert MongoDB document to JSON-serializable format"""
        if isinstance(doc, dict):
            return {key: self._serialize_doc(value) for key, value in doc.items()}
        elif isinstance(doc, list):
            return [self._serialize_doc(item) for item in doc]
        elif isinstance(doc, ObjectId):
            return str(doc)
        elif isinstance(doc, datetime):
            return doc.isoformat()
        elif isinstance(doc, Decimal128):
            return str(doc)
        elif isinstance(doc, Binary):
            return str(doc)
        else:
            return doc

    async def __call__(
        self,
        connection_string: str,
        collection: str,
        query: Dict[str, Any] = None,
        projection: Dict[str, Any] = None,
        limit: int = 10,
        sort: Dict[str, Any] = None,
        **kwargs
    ) -> ToolResult:
        """
        Execute a MongoDB query and return the results.
        
        Args:
            connection_string: MongoDB connection string (URI)
            collection: Name of the collection to query
            query: MongoDB query filter (default: {} - all documents)
            projection: Fields to include/exclude in results
            limit: Maximum number of documents to return (default: 10)
            sort: Sort specification as dict (e.g., {"created_at": -1})
        """
        try:
            # Connect to MongoDB using ONLY the provided connection string
            if not connection_string:
                raise ToolError("MongoDB connection string is required")
            
            # Ensure we use ONLY the provided connection string, not environment variables
            self.client = MongoClient(connection_string)
            
            # Parse database name from the connection string
            # Format: mongodb+srv://user:pass@host/database?params
            if "/" in connection_string and "?" in connection_string:
                # Extract database name between the last "/" and first "?"
                db_part = connection_string.split("/")[-1].split("?")[0]
                if db_part:
                    self.db = self.client[db_part]
                else:
                    self.db = self.client.get_default_database()
            else:
                self.db = self.client.get_default_database()
            
            # Test connection
            self.client.admin.command('ping')
            
            # Get collection
            coll = self.db[collection]
            
            # Prepare query parameters
            query = query or {}
            
            # Build query cursor
            cursor = coll.find(query)
            
            # Apply projection if specified
            if projection:
                cursor = cursor.projection(projection)
            
            # Apply sort if specified
            if sort:
                cursor = cursor.sort(list(sort.items()))
            
            # Apply limit
            cursor = cursor.limit(limit)
            
            # Execute query and convert to list
            results = list(cursor)
            
            # Convert all MongoDB types to JSON-serializable format
            serialized_results = [self._serialize_doc(doc) for doc in results]
            
            # Prepare response
            response = {
                "collection": collection,
                "query": query,
                "count": len(serialized_results),
                "limit": limit,
                "results": serialized_results
            }
            
            return ToolResult(output=json.dumps(response, indent=2))
            
        except PyMongoError as e:
            return ToolResult(error=f"MongoDB error: {str(e)}")
        except Exception as e:
            return ToolResult(error=f"MongoDB Query error: {str(e)}")
        finally:
            # Clean up connection
            if self.client:
                self.client.close()

    def to_params(self) -> BetaToolUnionParam:
        return {
            "name": self.name,
            "description": """Query a MongoDB database to retrieve documents matching specified criteria. 
            Useful for verifying data was inserted correctly, checking database state, or finding specific records.
            Returns JSON-formatted results with document data.""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "connection_string": {
                        "type": "string",
                        "description": "MongoDB connection string URI (e.g., mongodb+srv://user:pass@cluster.mongodb.net/dbname)"
                    },
                    "collection": {
                        "type": "string", 
                        "description": "Name of the MongoDB collection to query"
                    },
                    "query": {
                        "type": "object",
                        "description": "MongoDB query filter as JSON object. Use {} for all documents. Example: {'email': 'user@example.com'} or {'name': {'$regex': 'John', '$options': 'i'}}"
                    },
                    "projection": {
                        "type": "object",
                        "description": "Fields to include/exclude. Example: {'name': 1, 'email': 1, '_id': 0} to include name and email but exclude _id"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of documents to return (default: 10, max: 100)",
                        "minimum": 1,
                        "maximum": 100
                    },
                    "sort": {
                        "type": "object", 
                        "description": "Sort specification. Example: {'created_at': -1} for newest first, {'name': 1} for alphabetical"
                    }
                },
                "required": ["connection_string", "collection"]
            }
        }