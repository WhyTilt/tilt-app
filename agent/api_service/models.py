from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from agent.tools import ToolVersion

class ChatMessage(BaseModel):
    role: str
    content: str | List[Dict[str, Any]]

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt_suffix: Optional[str] = ""
    only_n_most_recent_images: int = 3
    tool_version: ToolVersion = "computer_use_20241022"
    max_tokens: int = 4096
    thinking_budget: Optional[int] = None
    token_efficient_tools_beta: bool = False

class ChatResponse(BaseModel):
    messages: List[ChatMessage]
    tool_results: Dict[str, Any]

class ToolExecuteRequest(BaseModel):
    tool_name: str
    tool_input: Dict[str, Any]
    tool_version: ToolVersion = "computer_use_20241022"

class ToolExecuteResponse(BaseModel):
    result: Dict[str, Any]
    error: Optional[str] = None

class ConfigRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None

class ConfigResponse(BaseModel):
    is_configured: bool
    model: str
    message: Optional[str] = None