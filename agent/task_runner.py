import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pymongo import MongoClient
from pymongo.collection import Collection
from bson import ObjectId

logger = logging.getLogger(__name__)


class TaskModel:
    def __init__(self, data: Dict[str, Any]):
        self._id = data.get('_id')
        self.task_id = str(data.get('_id', ''))
        # Support both 'instruction' and 'instructions' fields
        self.instructions = data.get('instructions', data.get('instruction', ''))
        self.label = data.get('label', '')  # Optional task label
        self.js_expression = data.get('js_expression', '')
        self.tool_use = data.get('tool_use', {})
        self.status = data.get('status', 'pending')  # pending, running, completed, error
        self.created_at = data.get('created_at', datetime.now(timezone.utc))
        self.started_at = data.get('started_at')
        self.completed_at = data.get('completed_at')
        self.result = data.get('result')
        self.error = data.get('error')
        self.metadata = data.get('metadata', {})

    def to_dict(self) -> Dict[str, Any]:
        return {
            '_id': self._id,
            'instructions': self.instructions,
            'label': self.label,
            'js_expression': self.js_expression,
            'tool_use': self.tool_use,
            'status': self.status,
            'created_at': self.created_at,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'result': self.result,
            'error': self.error,
            'metadata': self.metadata
        }
    
    def get_formatted_instructions(self) -> str:
        """Get properly formatted instructions for execution"""
        formatted_instructions = self.instructions
        
        # Handle legacy js_expression field
        if self.js_expression:
            formatted_instructions += "\n\n"
            formatted_instructions += "Use the js_inspector tool to execute this JavaScript expression:\n"
            formatted_instructions += f"```javascript\n{self.js_expression}\n```"
        
        # Handle new tool_use format
        elif self.tool_use:
            tool_name = self.tool_use.get('tool', '')
            arguments = self.tool_use.get('arguments', [])
            
            if tool_name == 'js_inspector' and arguments:
                formatted_instructions += "\n\n"
                formatted_instructions += f"Use the {tool_name} tool to execute this JavaScript code:\n"
                formatted_instructions += f"```javascript\n{arguments[0]}\n```"
            else:
                # Generic tool usage format
                formatted_instructions += "\n\n"
                formatted_instructions += f"Use the {tool_name} tool"
                if arguments:
                    formatted_instructions += f" with arguments: {arguments}"
            
        return formatted_instructions


class MongoDBConnection:
    def __init__(self, connection_string: str):
        self.client = MongoClient(connection_string)
        self.db = self.client.get_default_database()
        self.tasks_collection: Collection = self.db.tasks
        
    def get_next_task(self) -> Optional[TaskModel]:
        """Get the next pending task that hasn't been completed"""
        task_data = self.tasks_collection.find_one(
            {
                "$and": [
                    {"status": "pending"},
                    {"completed_at": {"$exists": False}},  # Exclude tasks that have been completed
                    {"$or": [
                        {"started_at": {"$exists": False}},  # Never started
                        {"started_at": None}  # Explicitly null
                    ]}
                ]
            },
            sort=[("created_at", 1)]
        )
        if task_data:
            return TaskModel(task_data)
        return None
    
    def update_task_status(self, task_id: str, status: str, **kwargs) -> bool:
        """Update task status and additional fields"""
        update_data: Dict[str, Any] = {"status": status}
        
        if status == "running":
            update_data["started_at"] = datetime.now(timezone.utc)
        elif status in ["completed", "error"]:
            update_data["completed_at"] = datetime.now(timezone.utc)
            
        # Add any additional fields
        update_data.update(kwargs)
        
        result = self.tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    def save_task_result(self, task_id: str, result: Any, error: Optional[str] = None) -> bool:
        """Save task execution result"""
        status = "error" if error else "completed"
        return self.update_task_status(
            task_id=task_id,
            status=status,
            result=result,
            error=error
        )
    
    def get_task_by_id(self, task_id: str) -> Optional[TaskModel]:
        """Get task by ID"""
        task_data = self.tasks_collection.find_one({"_id": ObjectId(task_id)})
        if task_data:
            return TaskModel(task_data)
        return None
    
    def get_all_tasks(self, status: Optional[str] = None) -> List[TaskModel]:
        """Get all tasks, optionally filtered by status"""
        query = {}
        if status:
            query["status"] = status
            
        tasks = []
        for task_data in self.tasks_collection.find(query).sort("created_at", 1):
            tasks.append(TaskModel(task_data))
        return tasks
    
    def close(self):
        """Close the MongoDB connection"""
        self.client.close()


class TaskRunner:
    def __init__(self, mongodb_uri: str):
        self.db = MongoDBConnection(mongodb_uri)
        self.is_running = False
        self.pause_after_completion = True  # Default to pause for inspection
        
    async def run_continuous(self):
        """Continuously process tasks from MongoDB"""
        self.is_running = True
        logger.info("Starting continuous task processing...")
        
        while self.is_running:
            try:
                task = self.db.get_next_task()
                if task:
                    logger.info(f"Processing task {task.task_id}: {task.instructions[:50]}...")
                    await self.process_task(task)
                    
                    # Check if we should pause after completion
                    if self.pause_after_completion:
                        logger.info("Pausing after task completion for inspection")
                        break  # Exit loop to pause for inspection
                else:
                    # No tasks available, wait before checking again
                    await asyncio.sleep(5)
                    
            except Exception as e:
                logger.error(f"Error in task processing loop: {e}")
                await asyncio.sleep(10)
    
    async def process_task(self, task: TaskModel):
        """Process a single task"""
        try:
            # Mark task as running
            self.db.update_task_status(task.task_id, "running")
            
            # Set the current task ID in environment for MongoDBReporter tool
            os.environ['CURRENT_TASK_ID'] = task.task_id
            
            # Import here to avoid circular imports
            from .loop import sampling_loop, APIProvider
            
            # Set up API provider
            api_provider = APIProvider.ANTHROPIC
            
            # Create initial message in proper format
            from anthropic.types.beta import BetaMessageParam
            
            messages: list[BetaMessageParam] = [
                {
                    "role": "user",
                    "content": task.get_formatted_instructions()
                }
            ]
            
            # Define callbacks for the sampling loop
            def output_callback(content_block):
                logger.debug(f"Output callback: {content_block}")
            
            def tool_output_callback(tool_result, tool_name):
                logger.debug(f"Tool output callback - {tool_name}: {tool_result}")
            
            def api_response_callback(request, response, error):
                if error:
                    logger.error(f"API response error: {error}")
                else:
                    logger.debug("API response successful")
            
            # Get API key and validate
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")
            
            # Run the sampling loop
            try:
                result_messages = await sampling_loop(
                    model="claude-3-5-sonnet-20241022",
                    provider=api_provider,
                    system_prompt_suffix="You are an autonomous task execution agent. When displaying captured data from tools (especially network requests and JSON structures), show the complete raw data in code blocks exactly as captured, without interpretation or summarization. Use the mongodb_reporter tool to report progress and results.",
                    messages=messages,
                    output_callback=output_callback,
                    tool_output_callback=tool_output_callback,
                    api_response_callback=api_response_callback,
                    api_key=api_key,
                    tool_version="computer_use_20250124",
                    only_n_most_recent_images=10,
                    max_tokens=8192
                )
            except Exception as loop_error:
                logger.error(f"Sampling loop error: {loop_error}")
                raise
            
            # Save successful result (if not already saved by MongoDBReporter)
            current_task = self.db.get_task_by_id(task.task_id)
            if current_task and current_task.status == "running":
                self.db.save_task_result(task.task_id, {
                    "messages": result_messages,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Task {task.task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing task {task.task_id}: {e}")
            self.db.save_task_result(task.task_id, None, str(e))
        finally:
            # Clean up environment variable
            os.environ.pop('CURRENT_TASK_ID', None)
    
    def stop(self):
        """Stop the task runner"""
        self.is_running = False
    
    def set_pause_mode(self, pause: bool):
        """Set whether to pause after task completion"""
        self.pause_after_completion = pause
        logger.info(f"Pause mode set to: {pause}")
    
    async def continue_processing(self):
        """Continue processing next task (used after pause)"""
        if not self.is_running:
            await self.run_continuous()
        
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()