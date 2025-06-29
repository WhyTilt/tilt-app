import os
import json
from datetime import datetime, timezone
from typing import Literal, Any, Dict, Optional
from pymongo import MongoClient
from bson import ObjectId

from .base import BaseAnthropicTool, ToolError, ToolResult


class MongoDBReporterTool(BaseAnthropicTool):
    """
    Tool for reporting task results back to MongoDB.
    This tool allows the agent to save results, updates, and completion status
    back to the MongoDB tasks collection.
    """
    
    name: Literal["mongodb_reporter"] = "mongodb_reporter"
    api_type: Literal["computer_20241022"] = "computer_20241022"
    
    def __init__(self):
        super().__init__()
        # Use local MongoDB connection since MongoDB runs in the same container
        self.mongodb_uri = "mongodb://localhost:27017/tilt"
        
        self.client = MongoClient(self.mongodb_uri)
        self.db = self.client.tilt  # Use 'tilt' database
        self.tasks_collection = self.db.tasks
        
    
    async def __call__(
        self,
        action: Literal["report_progress", "report_result", "report_error", "add_metadata"],
        data: Dict[str, Any],
        task_id: Optional[str] = None
    ) -> ToolResult:
        """
        Report information back to MongoDB
        
        Args:
            action: Type of report (report_progress, report_result, report_error, add_metadata)
            data: Data to report
            task_id: Task ID (uses current task if not provided, creates one-off task for standalone execution)
        """
        try:
            # Handle one-off tasks by creating a temporary task record
            if not task_id:
                # Check for environment variable first
                task_id = os.getenv('CURRENT_TASK_ID')
                
                if not task_id:
                    # Create a one-off task record for standalone execution
                    timestamp = datetime.now(timezone.utc)
                    one_off_task = {
                        "type": "one_off",
                        "status": "running",
                        "created_at": timestamp,
                        "last_update": timestamp,
                        "description": f"One-off task execution - {action}",
                        "metadata": {
                            "execution_mode": "standalone",
                            "initial_action": action
                        }
                    }
                    
                    result = self.tasks_collection.insert_one(one_off_task)
                    task_id = str(result.inserted_id)
            
            # Validate task exists
            task = self.tasks_collection.find_one({"_id": ObjectId(task_id)})
            if not task:
                return ToolResult(error=f"Task {task_id} not found")
            
            timestamp = datetime.now(timezone.utc)
            
            if action == "report_progress":
                # Update progress information
                update_data = {
                    "last_update": timestamp,
                    "progress": data
                }
                
                # Add to progress history
                self.tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {
                        "$set": update_data,
                        "$push": {
                            "progress_history": {
                                "timestamp": timestamp,
                                "data": data
                            }
                        }
                    }
                )
                
                return ToolResult(output=f"Progress reported for task {task_id}")
                
            elif action == "report_result":
                # Report final result and mark as passed
                update_data = {
                    "status": "passed",
                    "completed_at": timestamp,
                    "result": data,
                    "last_update": timestamp
                }
                
                self.tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$set": update_data}
                )
                
                return ToolResult(output=f"Result reported and task {task_id} marked as passed")
                
            elif action == "report_error":
                # Report error and mark task as failed
                update_data = {
                    "status": "error",
                    "completed_at": timestamp,
                    "error": data.get("error", "Unknown error"),
                    "error_details": data,
                    "last_update": timestamp
                }
                
                self.tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$set": update_data}
                )
                
                return ToolResult(output=f"Error reported for task {task_id}")
                
            elif action == "add_metadata":
                # Add metadata to task
                self.tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {
                        "$set": {
                            f"metadata.{key}": value for key, value in data.items()
                        },
                        "$set": {"last_update": timestamp}
                    }
                )
                
                return ToolResult(output=f"Metadata added to task {task_id}")
                
            else:
                return ToolResult(error=f"Unknown action: {action}")
                
        except Exception as e:
            return ToolResult(error=f"MongoDB Reporter error: {str(e)}")
    
    def to_params(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": """Report task progress, results, errors, or metadata back to MongoDB.

CRITICAL: When reporting captured data structures (especially JSON from network requests), preserve the COMPLETE raw JSON structure exactly as captured. Do NOT summarize, interpret, or create descriptions - pass the full JSON objects intact.
            
Use this tool to:
- Report progress updates during task execution
- Report final results when task is complete (preserve raw JSON data structures)
- Report errors if task fails
- Add metadata or additional information

Examples:
- Report progress: action="report_progress", data={"step": "completed navigation", "screenshot": "base64..."}
- Report result with raw JSON: action="report_result", data={"success": true, "raw_analytics_json": {"complete": "json structure here"}}
- Report error: action="report_error", data={"error": "Failed to find element", "details": "..."}
- Add metadata: action="add_metadata", data={"browser": "firefox", "execution_time": 45}
            """,
            "input_schema": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["report_progress", "report_result", "report_error", "add_metadata"],
                        "description": "Type of report to make"
                    },
                    "data": {
                        "type": "object",
                        "description": "Data to report - structure depends on action type"
                    },
                    "task_id": {
                        "type": "string",
                        "description": "Optional task ID (uses current task if not provided)"
                    }
                },
                "required": ["action", "data"]
            }
        }
    
    def __del__(self):
        if hasattr(self, 'client'):
            self.client.close()