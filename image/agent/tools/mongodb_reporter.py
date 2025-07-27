import os
import json
from datetime import datetime, timezone
from typing import Literal, Any, Dict, Optional
from pymongo import MongoClient
from bson import ObjectId

from .base import BaseAnthropicTool, ToolError, ToolResult


class MongoDBReporterTool(BaseAnthropicTool):
    """
    Tool for reporting test results back to MongoDB.
    This tool allows the agent to save results, updates, and completion status
    back to the MongoDB tests collection.
    """
    
    name: Literal["mongodb_reporter"] = "mongodb_reporter"
    api_type: Literal["computer_20241022"] = "computer_20241022"
    
    def __init__(self):
        super().__init__()
        self.client = MongoClient('mongodb://localhost:27017/')
        self.db = self.client.tilt
        self.tests_collection = self.db.tests
    
    async def __call__(
        self,
        action: Literal["report_progress", "report_result", "report_error", "add_metadata"],
        data: Dict[str, Any],
        test_id: Optional[str] = None
    ) -> ToolResult:
        """
        Report test execution information back to MongoDB
        
        Args:
            action: Type of report (report_progress, report_result, report_error, add_metadata)
            data: Data to report
            test_id: Test ID (required)
        """
        try:
            # Test ID is required
            if not test_id:
                return ToolResult(error="No test ID provided - test_id parameter is required")
            
            # Validate test exists
            test = self.tests_collection.find_one({"_id": ObjectId(test_id)})
            if not test:
                return ToolResult(error=f"Test {test_id} not found")
            
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Create history entry
            history_entry = {
                "id": str(ObjectId()),
                "timestamp": timestamp,
                "status": "completed" if action == "report_result" else "error" if action == "report_error" else "running",
                "artifacts": []
            }
            
            # Extract artifacts from data if available
            if "screenshots" in data:
                import os
                import base64
                
                # Create screenshots directory
                screenshots_dir = "/home/ej-okelly/dev/tilt/tilt-app/image/nextjs/public/screenshots"
                test_dir = os.path.join(screenshots_dir, test_id)
                os.makedirs(test_dir, exist_ok=True)
                
                for i, screenshot in enumerate(data["screenshots"]):
                    if isinstance(screenshot, str) and screenshot.startswith("data:image"):
                        # Save base64 screenshot to file
                        base64_data = screenshot.split(',')[1]
                        filename = f"{i}.png"
                        file_path = os.path.join(test_dir, filename)
                        
                        with open(file_path, 'wb') as f:
                            f.write(base64.b64decode(base64_data))
                        
                        history_entry["artifacts"].append({
                            "timestamp": timestamp,
                            "screenshotPath": file_path,
                            "thought": data.get("thoughts", [{}])[i] if i < len(data.get("thoughts", [])) else None
                        })
            
            # If we have thoughts but no screenshots, add them as artifacts
            if "thoughts" in data and not history_entry["artifacts"]:
                for thought in data["thoughts"]:
                    if thought:
                        history_entry["artifacts"].append({
                            "timestamp": timestamp,
                            "thought": thought
                        })
            
            # Add simple text result if available
            if "result" in data or "message" in data:
                history_entry["artifacts"].append({
                    "timestamp": timestamp,
                    "thought": data.get("result") or data.get("message")
                })
            
            # ONLY save to database for final results - ignore progress reports
            if action not in ["report_result", "report_error"]:
                return ToolResult(output=f"Progress report ignored - only final results are saved to history")
            
            # Check if there's already execution data saved by the frontend
            existing_test = self.tests_collection.find_one({"_id": ObjectId(test_id)})
            
            if existing_test and existing_test.get("lastRun"):
                # Frontend has already saved execution data - just update the status
                update_result = self.tests_collection.update_one(
                    {"_id": ObjectId(test_id)},
                    {
                        "$set": {
                            "lastRun.status": "completed" if action == "report_result" else "error",
                            "updated_at": timestamp
                        }
                    }
                )
                
                # Also update the history entry status if it exists
                if existing_test.get("history"):
                    # Update the last history entry status
                    self.tests_collection.update_one(
                        {"_id": ObjectId(test_id)},
                        {
                            "$set": {
                                "history.$[elem].status": "completed" if action == "report_result" else "error"
                            }
                        },
                        array_filters=[{"elem.id": existing_test["lastRun"]["id"]}]
                    )
            else:
                # No existing execution data - save a minimal completion entry  
                update_result = self.tests_collection.update_one(
                    {"_id": ObjectId(test_id)},
                    {
                        "$set": {
                            "lastRun": history_entry,
                            "updated_at": timestamp
                        },
                        "$push": {
                            "history": {
                                "$each": [history_entry],
                                "$slice": -50  # Keep only last 50 runs
                            }
                        }
                    }
                )
            
            if update_result.modified_count > 0:
                return ToolResult(output=f"Test execution saved with history for test {test_id}")
            else:
                return ToolResult(error=f"Failed to update test {test_id}")
                
        except Exception as e:
            return ToolResult(error=f"MongoDB Reporter error: {str(e)}")
    
    def to_params(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": """Report test progress, results, errors, or metadata back to MongoDB.

CRITICAL: When reporting captured data structures (especially JSON from network requests), preserve the COMPLETE raw JSON structure exactly as captured. Do NOT summarize, interpret, or create descriptions - pass the full JSON objects intact.
            
Use this tool to:
- Report progress updates during test execution
- Report final results when test is complete (preserve raw JSON data structures)
- Report errors if test fails
- Add metadata or additional information

Examples:
- Report progress: action="report_progress", data={"step": "completed navigation", "screenshots": ["base64..."], "thoughts": ["Navigating to page"]}
- Report result: action="report_result", data={"success": true, "result": "Test completed successfully"}
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
                    "test_id": {
                        "type": "string",
                        "description": "Optional test ID (uses current test if not provided)"
                    }
                },
                "required": ["action", "data"]
            }
        }
    
    def __del__(self):
        if hasattr(self, 'client'):
            self.client.close()