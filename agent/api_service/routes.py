from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .models import *
from ..loop import sampling_loop, APIProvider
from ..tools import ToolCollection, ToolResult, TOOL_GROUPS_BY_VERSION
import asyncio
import json
import os
from typing import Dict

router = APIRouter()


@router.options("/chat/stream")
async def chat_stream_options():
    return {
        "Allow": "POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }

@router.post("/chat/stream")
async def chat_completion_stream(request: ChatRequest):
    async def event_stream():
        try:
            # Get API key and model configuration from environment
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")
            
            # Get model and provider from environment, with defaults
            model = os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
            provider_str = os.getenv('API_PROVIDER', 'anthropic')
            
            print(f"Starting new stream request with {len(request.messages)} messages")
            print(f"Last message: {request.messages[-1] if request.messages else 'None'}")
            print(f"Model: {model}, Provider: {provider_str}")
            print(f"API key present: {'Yes' if api_key else 'No'}")
            print(f"All messages: {[f'Role: {msg.role}, Content preview: {str(msg.content)[:100]}...' for msg in request.messages]}")
            # Convert request to format expected by sampling_loop
            provider = APIProvider(provider_str)
            
            # Storage for tool results
            tool_state: Dict[str, ToolResult] = {}
            # Track tool names by tool_id for frontend processing
            tool_names: Dict[str, str] = {}
            
            # Use a queue to handle streaming
            message_queue = asyncio.Queue()
            
            def sync_output_callback(content):
                """Handle assistant output - add to queue"""
                if isinstance(content, dict):
                    if content.get("type") == "text":
                        event_data = {
                            "type": "message",
                            "role": "assistant",
                            "content": content["text"]
                        }
                        message_queue.put_nowait(f"data: {json.dumps(event_data)}\n\n")
                    elif content.get("type") == "tool_use":
                        # Track tool name for later use in tool_result callback
                        tool_names[content["id"]] = content["name"]
                        event_data = {
                            "type": "tool_use",
                            "tool_name": content["name"],
                            "tool_input": content["input"]
                        }
                        message_queue.put_nowait(f"data: {json.dumps(event_data)}\n\n")
            
            def sync_tool_output_callback(tool_output: ToolResult, tool_id: str):
                """Handle tool output - add to queue"""
                tool_state[tool_id] = tool_output
                event_data = {
                    "type": "tool_result",
                    "tool_id": tool_id,
                    "tool_name": tool_names.get(tool_id, "unknown"),  # Include tool name
                    "output": tool_output.output,
                    "error": tool_output.error,
                    "base64_image": tool_output.base64_image
                }
                message_queue.put_nowait(f"data: {json.dumps(event_data)}\n\n")
            
            def api_response_callback(
                request,
                response,
                error
            ):
                """Handle API response - just store for debugging"""
                pass
            
            # Yield initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Starting...'})}\n\n"
            
            # Start the sampling loop in a background task
            async def run_sampling_loop():
                try:
                    print("Starting sampling_loop execution")
                    result_messages = await sampling_loop(
                        system_prompt_suffix=request.system_prompt_suffix or "",
                        model=model,
                        provider=provider,
                        messages=[msg.model_dump() for msg in request.messages],
                        output_callback=sync_output_callback,
                        tool_output_callback=sync_tool_output_callback,
                        api_response_callback=api_response_callback,
                        api_key=api_key,
                        only_n_most_recent_images=request.only_n_most_recent_images,
                        tool_version=request.tool_version,
                        max_tokens=request.max_tokens,
                        thinking_budget=request.thinking_budget,
                        token_efficient_tools_beta=request.token_efficient_tools_beta,
                    )
                    print(f"Sampling loop completed with {len(result_messages)} messages")
                    if len(result_messages) <= len(request.messages):
                        print("WARNING: No new messages generated by AI!")
                        print(f"Input messages: {len(request.messages)}, Output messages: {len(result_messages)}")
                    else:
                        print(f"AI generated {len(result_messages) - len(request.messages)} new messages")
                    
                    # Add a small delay to ensure all tool results are processed by frontend
                    print("Waiting briefly for frontend to process final tool results...")
                    await asyncio.sleep(0.5)
                    
                    # Signal completion
                    await message_queue.put(f"data: {json.dumps({'type': 'done', 'messages': [msg for msg in result_messages]})}\n\n")
                except Exception as e:
                    print(f"Error in sampling_loop: {e}")
                    import traceback
                    traceback.print_exc()
                    # Send error details to frontend
                    error_details = f"Sampling loop error: {str(e)}"
                    print(f"Full error details: {error_details}")
                    await message_queue.put(f"data: {json.dumps({'type': 'error', 'message': error_details})}\n\n")
                finally:
                    # Always signal end of stream, regardless of success or failure
                    print("Signaling end of stream")
                    await message_queue.put(None)
            
            # Start the sampling loop
            loop_task = asyncio.create_task(run_sampling_loop())
            
            try:
                # Stream messages from the queue
                while True:
                    try:
                        message = await asyncio.wait_for(message_queue.get(), timeout=1.0)
                        if message is None:  # End of stream signal
                            break
                        yield message
                    except asyncio.TimeoutError:
                        # Send keepalive and check if loop task is still running
                        if not loop_task.done():
                            yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"
                        else:
                            # Loop task finished, check for any remaining messages
                            try:
                                message = message_queue.get_nowait()
                                if message is None:
                                    break
                                yield message
                            except asyncio.QueueEmpty:
                                break
                        continue
                    except Exception as e:
                        print(f"Error in message queue processing: {e}")
                        break
                
                # Ensure the sampling loop task is complete
                if not loop_task.done():
                    await loop_task
            except GeneratorExit:
                # Client disconnected
                print("Client disconnected during stream")
                if not loop_task.done():
                    loop_task.cancel()
                    try:
                        await loop_task
                    except asyncio.CancelledError:
                        pass
                raise
            except Exception as e:
                print(f"Error in streaming loop: {e}")
                # Cancel the loop task if still running
                if not loop_task.done():
                    loop_task.cancel()
                    try:
                        await loop_task
                    except asyncio.CancelledError:
                        pass
                # Send error message before terminating
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            
        except Exception as e:
            print(f"Top-level stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    print("Creating StreamingResponse...")
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

@router.post("/tools/execute", response_model=ToolExecuteResponse)
async def execute_tool(request: ToolExecuteRequest):
    try:
        # Get tools for the specified version
        tool_group = TOOL_GROUPS_BY_VERSION[request.tool_version]
        tool_collection = ToolCollection(*(ToolCls() for ToolCls in tool_group.tools))
        
        # Execute tool directly
        result = await tool_collection.run(
            name=request.tool_name, 
            tool_input=request.tool_input
        )
        
        return ToolExecuteResponse(result={"output": result.output, "error": result.error})
    except Exception as e:
        return ToolExecuteResponse(
            result={}, 
            error=str(e)
        )


def get_mongodb_connection():
    """Helper function to get MongoDB connection"""
    import os
    from pymongo import MongoClient
    
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise Exception("MONGODB_URI not configured")
    
    client = MongoClient(mongodb_uri)
    db = client.get_default_database()
    return db.tasks

@router.get("/tasks")
async def get_all_tasks():
    """Get all tasks from MongoDB"""
    try:
        tasks_collection = get_mongodb_connection()
        
        tasks = []
        for task in tasks_collection.find().sort("created_at", 1):
            # Get instructions, preserving array format if it exists
            instructions = task.get('instructions')
            if instructions is None:
                # Fallback to old 'instruction' field for backwards compatibility
                instruction = task.get('instruction')
                if instruction:
                    instructions = [instruction] if isinstance(instruction, str) else instruction
                else:
                    instructions = []
            
            formatted_task = {
                "id": str(task["_id"]),
                "instructions": instructions,
                "label": task.get('label'),
                "status": task.get('status', 'pending'),
                "created_at": task.get('created_at'),
                "started_at": task.get('started_at'),
                "completed_at": task.get('completed_at'),
                "last_run": task.get('last_run') or task.get('started_at') or task.get('created_at'),
                "result": task.get('result'),
                "error": task.get('error'),
                "tool_use": task.get('tool_use'),
                "execution_report": task.get('execution_report')
            }
            tasks.append(formatted_task)
        
        return {"tasks": tasks}
        
    except Exception as e:
        return {"error": f"Failed to fetch tasks: {str(e)}"}

@router.get("/next-task")
async def get_next_task():
    """Get the next pending task from MongoDB"""
    try:
        tasks_collection = get_mongodb_connection()
        
        # Get the first pending task with non-empty instructions
        task = tasks_collection.find_one({
            "status": "pending",
            "instructions": {"$exists": True, "$ne": [], "$ne": None}
        }, sort=[("created_at", 1)])
        
        if not task:
            return {"task": None, "message": "No pending tasks with valid instructions"}
        
        # Get instructions, preserving array format if it exists
        instructions = task.get('instructions')
        if instructions is None:
            # Fallback to old 'instruction' field for backwards compatibility
            instruction = task.get('instruction')
            if instruction:
                instructions = [instruction] if isinstance(instruction, str) else instruction
            else:
                # Skip tasks with no instructions
                return {"task": None, "message": "No pending tasks with valid instructions"}
        
        tool_use = task.get('tool_use', {})
        
        formatted_task = {
            "id": str(task["_id"]),
            "instructions": instructions,
            "status": task.get('status', 'pending'),
            "created_at": task.get('created_at'),
            "tool_use": tool_use
        }
        
        return {"task": formatted_task}
        
    except Exception as e:
        return {"error": f"Failed to fetch task: {str(e)}"}

@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, request_data: dict):
    """Mark task as completed"""
    try:
        from bson import ObjectId
        from datetime import datetime, timezone
        
        tasks_collection = get_mongodb_connection()
        
        # Use status from request if provided, otherwise default to 'passed'
        status = request_data.get("status", "passed")
        
        update_data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc),
            "result": request_data.get("result"),
            "last_run": datetime.now(timezone.utc)
        }
        
        # Add execution report if provided
        if "execution_report" in request_data:
            update_data["execution_report"] = request_data["execution_report"]
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to complete task: {str(e)}"}

@router.post("/tasks/{task_id}/error")
async def error_task(task_id: str, request_data: dict):
    """Mark task as failed"""
    try:
        from bson import ObjectId
        from datetime import datetime, timezone
        
        tasks_collection = get_mongodb_connection()
        
        update_data = {
            "status": "error",
            "completed_at": datetime.now(timezone.utc),
            "error": request_data.get("error"),
            "last_run": datetime.now(timezone.utc)
        }
        
        # Add execution report if provided
        if "execution_report" in request_data:
            update_data["execution_report"] = request_data["execution_report"]
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to mark task as error: {str(e)}"}

@router.post("/tasks/{task_id}/start")
async def start_task(task_id: str):
    """Mark task as running"""
    try:
        from bson import ObjectId
        from datetime import datetime, timezone
        
        tasks_collection = get_mongodb_connection()
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "running",
                    "started_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to start task: {str(e)}"}

@router.post("/tasks/{task_id}/stop")
async def stop_task(task_id: str):
    """Stop/cancel a running task and reset to pending"""
    try:
        from bson import ObjectId
        
        tasks_collection = get_mongodb_connection()
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "pending"
                },
                "$unset": {
                    "started_at": "",
                    "completed_at": "",
                    "error": ""
                }
            }
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to stop task: {str(e)}"}

@router.post("/tasks/{task_id}/reset")
async def reset_task(task_id: str):
    """Reset task status to pending"""
    try:
        from bson import ObjectId
        
        tasks_collection = get_mongodb_connection()
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "pending"
                },
                "$unset": {
                    "started_at": "",
                    "completed_at": "",
                    "error": ""
                }
            }
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to reset task: {str(e)}"}

@router.post("/tasks")
async def create_task(request_data: dict):
    """Create a new task"""
    try:
        from datetime import datetime, timezone
        
        tasks_collection = get_mongodb_connection()
        
        # Validate instructions
        instructions = request_data.get("instructions")
        if not instructions or (isinstance(instructions, list) and len(instructions) == 0):
            return {"error": "Task instructions cannot be empty"}
        
        # Filter out empty instruction lines
        if isinstance(instructions, list):
            instructions = [inst.strip() for inst in instructions if inst.strip()]
            if len(instructions) == 0:
                return {"error": "Task instructions cannot be empty"}
        
        # Auto-generate label if not provided
        if "label" in request_data and request_data["label"]:
            label = request_data["label"]
        else:
            # Auto-generate label from first instruction
            if isinstance(instructions, list) and len(instructions) > 0:
                first_instruction = instructions[0]
                # Truncate to reasonable length for display
                label = first_instruction[:50] + ("..." if len(first_instruction) > 50 else "")
            else:
                label = "Task"
        
        task_doc = {
            "instructions": instructions,
            "label": label,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        }
        
        if "tool_use" in request_data:
            task_doc["tool_use"] = request_data["tool_use"]
            
        result = tasks_collection.insert_one(task_doc)
        
        return {"success": True, "task_id": str(result.inserted_id)}
        
    except Exception as e:
        return {"error": f"Failed to create task: {str(e)}"}

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    try:
        from bson import ObjectId
        
        tasks_collection = get_mongodb_connection()
        
        # Check if task exists
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not task:
            return {"error": "Task not found"}
        
        # Don't allow deletion of running tasks
        if task.get("status") == "running":
            return {"error": "Cannot delete running task"}
        
        # Delete the task
        result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Task deleted successfully"}
        else:
            return {"error": "Failed to delete task"}
        
    except Exception as e:
        return {"error": f"Failed to delete task: {str(e)}"}

@router.put("/tasks/{task_id}")
async def update_task(task_id: str, request_data: dict):
    """Update a task"""
    try:
        from bson import ObjectId
        
        tasks_collection = get_mongodb_connection()
        
        set_data = {}
        unset_data = {}
        
        # Update instructions if provided
        if "instructions" in request_data:
            set_data["instructions"] = request_data["instructions"]
            
        # Update label if provided
        if "label" in request_data:
            if request_data["label"]:
                set_data["label"] = request_data["label"]
            else:
                # If label is empty string or None, remove the field
                unset_data["label"] = ""
            
        # Update other fields if provided
        if "tool_use" in request_data:
            set_data["tool_use"] = request_data["tool_use"]
            
        if not set_data and not unset_data:
            return {"error": "No valid fields to update"}
        
        # Build update query
        update_query = {}
        if set_data:
            update_query["$set"] = set_data
        if unset_data:
            update_query["$unset"] = unset_data
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            update_query
        )
        
        return {"success": result.modified_count > 0}
        
    except Exception as e:
        return {"error": f"Failed to update task: {str(e)}"}

@router.post("/cleanup-browser")
async def cleanup_browser():
    """Clean up browser processes and state between tasks"""
    try:
        import subprocess
        import time
        
        cleanup_results = []
        
       
        # Kill any remaining browser-related processes
        browsers = ["chromium"]
        for browser in browsers:
            try:
                result = subprocess.run(
                    ["pkill", "-f", browser], 
                    capture_output=True, 
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    cleanup_results.append(f"{browser} processes terminated")
            except Exception:
                pass  # Ignore errors for optional browsers
        
        # Clear browser temp files and cache
        temp_paths = [
            "/tmp/.mozilla",
            "/home/computeragent/.cache/mozilla"
        ]
        
        for path in temp_paths:
            try:
                subprocess.run(
                    ["rm", "-rf", path], 
                    capture_output=True, 
                    timeout=5
                )
            except Exception:
                pass  # Ignore cleanup errors
        
        cleanup_results.append("Browser temp files cleared")
        
        # Wait for processes to fully terminate
        time.sleep(2)
        
        # Reset VNC display and start fresh chrome session
        try:
            # Kill any existing VNC viewers that might be hanging
            subprocess.run(
                ["pkill", "-f", "vncviewer"], 
                capture_output=True, 
                timeout=5
            )
            cleanup_results.append("VNC viewers cleared")
            
            
            time.sleep(5)  
            
            # Take a screenshot to ensure VNC is responsive
            try:
                subprocess.run(
                    ["sh", "-c", "DISPLAY=:1 scrot /tmp/vnc_test.png"],
                    capture_output=True,
                    timeout=5
                )
                cleanup_results.append("VNC display verified")
            except Exception:
                cleanup_results.append("VNC display verification failed")
                
        except Exception as e:
            cleanup_results.append(f"Failed to start vnc: {str(e)}")
        
        return {
            "success": True, 
            "message": "Browser cleanup completed",
            "details": cleanup_results
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Browser cleanup failed: {str(e)}"
        }

@router.get("/panels")
async def get_panel_preferences():
    """Get panel preferences from MongoDB"""
    try:
        import os
        from pymongo import MongoClient
        from datetime import datetime, timezone
        
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            # Return default preferences if no MongoDB configured
            return {
                "preferences": {
                    "thinking": {
                        "visible": False,
                        "position": {"x": 9, "y": 5},
                        "size": {"width": 400, "height": 300},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                    "actions": {
                        "visible": False,
                        "position": {"x": 1513, "y": 657},
                        "size": {"width": 400, "height": 300},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                    "inspector": {
                        "visible": False,
                        "position": {"x": 439, "y": 9},
                        "size": {"width": 500, "height": 400},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                }
            }
        
        client = MongoClient(mongodb_uri)
        db = client.get_default_database()
        preferences_collection = db.panel_preferences
        
        # Get the latest preferences document
        prefs_doc = preferences_collection.find_one(sort=[("updated_at", -1)])
        
        if not prefs_doc:
            # Check if this is first run and create better defaults
            first_run_file = "/home/computeragent/.automagicit_first_run"
            is_first_run = not os.path.exists(first_run_file)
            
            if is_first_run:
                # Create first run marker file
                try:
                    with open(first_run_file, 'w') as f:
                        f.write(f"First run: {datetime.now(timezone.utc).isoformat()}\n")
                    print("✅ First run detected - created marker file")
                except Exception as e:
                    print(f"Failed to create first run marker: {e}")
            
            # Return optimized default preferences for first-time users (extracted from actual usage)
            default_prefs = {
                "preferences": {
                    "thinking": {
                        "visible": False,
                        "position": {"x": 9, "y": 5},
                        "size": {"width": 400, "height": 300},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                    "actions": {
                        "visible": False,
                        "position": {"x": 1513, "y": 657},
                        "size": {"width": 400, "height": 300},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                    "inspector": {
                        "visible": False,
                        "position": {"x": 439, "y": 9},
                        "size": {"width": 500, "height": 400},
                        "isMaximized": False,
                        "isLocked": False,
                    },
                },
                "isFirstRun": is_first_run
            }
            
            # Auto-save these defaults for first-time users
            if is_first_run:
                try:
                    prefs_doc = {
                        "preferences": default_prefs["preferences"],
                        "updated_at": datetime.now(timezone.utc)
                    }
                    preferences_collection.replace_one({}, prefs_doc, upsert=True)
                    print("✅ First run: saved default preferences to database")
                except Exception as e:
                    print(f"Failed to save first run defaults: {e}")
            
            return default_prefs
        
        return {"preferences": prefs_doc.get("preferences", {})}
        
    except Exception as e:
        return {"error": f"Failed to fetch panel preferences: {str(e)}"}

@router.post("/panels")
async def save_panel_preferences(request_data: dict):
    """Save panel preferences to MongoDB"""
    try:
        import os
        from pymongo import MongoClient
        from datetime import datetime, timezone
        
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            return {"success": True, "message": "No MongoDB configured, preferences not persisted"}
        
        preferences = request_data.get("preferences")
        if not preferences:
            return {"error": "Missing preferences data"}
        
        client = MongoClient(mongodb_uri)
        db = client.get_default_database()
        preferences_collection = db.panel_preferences
        
        # Create or update preferences document
        prefs_doc = {
            "preferences": preferences,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Replace the existing preferences document (we only keep the latest)
        result = preferences_collection.replace_one(
            {},  # Match any document (we only store one)
            prefs_doc,
            upsert=True  # Create if doesn't exist
        )
        
        return {"success": True, "upserted": result.upserted_id is not None}
        
    except Exception as e:
        return {"error": f"Failed to save panel preferences: {str(e)}"}

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "computer-use-api"}