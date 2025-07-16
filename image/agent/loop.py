"""
Agentic sampling loop that calls the Anthropic API and local implementation of anthropic-defined computer use tools.
"""

import logging
import os
import platform
from collections.abc import Callable
from datetime import datetime
from enum import StrEnum
from typing import Any, cast

import httpx
from anthropic import (
    Anthropic,
    AnthropicBedrock,
    AnthropicVertex,
    APIError,
    APIResponseValidationError,
    APIStatusError,
)
from anthropic.types.beta import (
    BetaCacheControlEphemeralParam,
    BetaContentBlockParam,
    BetaImageBlockParam,
    BetaMessage,
    BetaMessageParam,
    BetaTextBlock,
    BetaTextBlockParam,
    BetaToolResultBlockParam,
    BetaToolUseBlockParam,
)

from .tools import (
    TOOL_GROUPS_BY_VERSION,
    ToolCollection,
    ToolResult,
    ToolVersion,
)
from .timing_utils import timing_collector, time_operation

PROMPT_CACHING_BETA_FLAG = "prompt-caching-2024-07-31"


class APIProvider(StrEnum):
    ANTHROPIC = "anthropic"
    BEDROCK = "bedrock"
    VERTEX = "vertex"


# This system prompt is optimized for the Docker environment in this repository and
# specific tool combinations enabled.
# We encourage modifying this system prompt to ensure the model has context for the
# environment it is running in, and to provide any additional information that may be
# helpful for the task at hand.
SYSTEM_PROMPT = f"""<SYSTEM_CAPABILITY>
* You are utilising an Ubuntu virtual machine using {platform.machine()} architecture with internet access.
* You can feel free to install Ubuntu applications with your bash tool. Use curl instead of wget.
* To open chrome, please just click on the chrome icon.
* CRITICAL: At the start of each task, take a screenshot first to see the desktop. If you see a Chrome --no-sandbox warning dialog or notification, immediately click the X button to dismiss it before proceeding with the task. This prevents wasting cycles.
* IMPORTANT: If you need to open a browser for a task, start by clicking the Chrome icon on the desktop immediately rather than going through multiple steps. The browser should be launched as the first action after taking an initial screenshot.
* Using bash tool you can start GUI applications, but you need to set export DISPLAY=:1 and use a subshell. For example "(DISPLAY=:1 xterm &)". GUI apps run with bash tool will appear within your desktop environment, but they may take some time to appear. Take a screenshot to confirm it did.
* When using your bash tool with commands that are expected to output very large quantities of text, redirect into a tmp file and use str_replace_based_edit_tool or `grep -n -B <lines before> -A <lines after> <query> <filename>` to confirm output.
* When viewing a page it can be helpful to zoom out so that you can see everything on the page.  Either that, or make sure you scroll down to see everything before deciding something isn't available.
* When using your computer function calls, they take a while to run and send back to you.  Where possible/feasible, try to chain multiple of these calls all into one function calls request.
* The current date is {datetime.today().strftime('%A, %B %-d, %Y')}.
</SYSTEM_CAPABILITY>

<RESPONSE_FORMATTING>
* Always format your responses using rich markdown with clear structure and visual appeal
* Use **bold text** for important actions, key information, and emphasis
* Use `code formatting` for specific values, coordinates, URLs, and technical terms
* Create clear sections with headers when describing multi-step processes
* Use bullet points and numbered lists for better readability
* DO NOT use emojis in test execution reports - maintain professional QA engineer tone
* For test execution reports, use clean numbered lists with proper line breaks:
  1. **Step Name** - Result description
  2. **Next Step** - Result description
* Use clear section headers like "## Test Results Summary" and "## Key Findings"
* Keep your responses conversational but professional
* Make your text engaging and easy to scan at a glance
</RESPONSE_FORMATTING>

<CRITICAL_JSON_HANDLING>
* When you capture JSON data from network requests or any structured data, you MUST display the complete raw JSON structure in code blocks exactly as captured.
* DO NOT create summaries, interpretations, or descriptions of JSON data. Show the full JSON object with all keys and values.
* When reporting captured data to mongodb_reporter tool, preserve the complete JSON structure - do not summarize or interpret it.
* Example: Show the complete captured JSON structure, not summaries like "X items captured".
</CRITICAL_JSON_HANDLING>

<IMPORTANT>
* If the item you are looking at is a pdf, if after taking a single screenshot of the pdf it seems that you want to read the entire document instead of trying to continue to read the pdf from your screenshots + navigation, determine the URL, use curl to download the pdf, install and use pdftotext to convert it to a text file, and then read that text file directly with your str_replace_based_edit_tool.
</IMPORTANT>"""


async def sampling_loop(
    *,
    model: str,
    provider: APIProvider,
    system_prompt_suffix: str,
    messages: list[BetaMessageParam],
    output_callback: Callable[[BetaContentBlockParam], None],
    tool_output_callback: Callable[[ToolResult, str], None],
    api_response_callback: Callable[
        [httpx.Request, httpx.Response | object | None, Exception | None], None
    ],
    api_key: str,
    only_n_most_recent_images: int | None = None,
    max_tokens: int = 4096,
    tool_version: ToolVersion,
    thinking_budget: int | None = None,
    token_efficient_tools_beta: bool = False,
):
    """
    Agentic sampling loop for the assistant/tool interaction of computer use.
    """
    # Setup tool logging
    os.makedirs('/home/tilt/logs', exist_ok=True)
    tool_logger = logging.getLogger('tools')
    tool_handler = logging.FileHandler('/home/tilt/logs/tools.txt')
    tool_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    tool_logger.addHandler(tool_handler)
    tool_logger.setLevel(logging.INFO)
    
    tool_group = TOOL_GROUPS_BY_VERSION[tool_version]
    tool_collection = ToolCollection(*(ToolCls() for ToolCls in tool_group.tools))
    
    # Inject tool collection into computer tool for cross-tool communication
    computer_tool = next((tool for tool in tool_collection.tools if tool.name == "computer"), None)
    if computer_tool:
        computer_tool._tool_collection = tool_collection
    
    # Log available tools
    tool_logger.info(f"Available tools: {[tool.name for tool in tool_collection.tools]}")
    tool_logger.info(f"Starting sampling loop with tool version: {tool_version}")
    
    # Auto-start network monitoring if Chrome is available
    network_tool = next((tool for tool in tool_collection.tools if tool.name == "inspect_network"), None)
    if network_tool:
        try:
            import time
            import subprocess
            
            # Check if Chrome is running with remote debugging
            def check_chrome_debugging():
                try:
                    result = subprocess.run(['curl', '-s', 'http://localhost:9222/json'], 
                                          capture_output=True, timeout=2)
                    return result.returncode == 0
                except:
                    return False
            
            # Wait up to 10 seconds for Chrome to be available (should already be running from VM startup)
            tool_logger.info("Checking for Chrome with remote debugging...")
            chrome_ready = False
            for i in range(10):
                if check_chrome_debugging():
                    chrome_ready = True
                    break
                time.sleep(1)
            
            if chrome_ready:
                tool_logger.info("Chrome detected, starting network monitoring...")
                result = await network_tool(action="monitor_start")
                if result.error:
                    tool_logger.warning(f"Failed to auto-start network monitoring: {result.error}")
                else:
                    tool_logger.info("Network monitoring auto-started successfully")
            else:
                tool_logger.info("Chrome not detected with remote debugging - network monitoring will start when Chrome opens")
                
        except Exception as e:
            tool_logger.warning(f"Exception during network monitoring auto-start: {str(e)}")
    
    system = BetaTextBlockParam(
        type="text",
        text=f"{SYSTEM_PROMPT}{' ' + system_prompt_suffix if system_prompt_suffix else ''}",
    )

    while True:
        # Check for pending chat messages from user
        try:
            tool_logger.info("Checking for pending chat messages...")
            chat_messages = await _check_for_chat_messages()
            tool_logger.info(f"Chat message check completed. Found: {len(chat_messages) if chat_messages else 0} messages")
            
            if chat_messages:
                tool_logger.info(f"PROCESSING {len(chat_messages)} PENDING CHAT MESSAGES")
                # Add user messages to conversation
                for chat_msg in chat_messages:
                    messages.append({
                        "role": "user", 
                        "content": chat_msg
                    })
                    tool_logger.info(f"ADDED USER CHAT MESSAGE: {chat_msg}")
                    print(f"[CHAT] User message added to conversation: {chat_msg}")
                    
                    # Also send to output callback so it appears in the UI
                    output_callback({
                        "type": "text",
                        "text": f"**User sent:** {chat_msg}"
                    })
        except Exception as e:
            tool_logger.error(f"Error checking chat messages: {e}")
            print(f"[CHAT ERROR] {e}")
        
        enable_prompt_caching = False
        betas = [tool_group.beta_flag] if tool_group.beta_flag else []
        if token_efficient_tools_beta:
            betas.append("token-efficient-tools-2025-02-19")
        image_truncation_threshold = only_n_most_recent_images or 0
        if provider == APIProvider.ANTHROPIC:
            client = Anthropic(api_key=api_key, max_retries=4)
            enable_prompt_caching = True
        elif provider == APIProvider.VERTEX:
            client = AnthropicVertex()
        elif provider == APIProvider.BEDROCK:
            client = AnthropicBedrock()

        if enable_prompt_caching:
            betas.append(PROMPT_CACHING_BETA_FLAG)
            _inject_prompt_caching(messages)
            # Because cached reads are 10% of the price, we don't think it's
            # ever sensible to break the cache by truncating images
            only_n_most_recent_images = 0
            # Use type ignore to bypass TypedDict check until SDK types are updated
            system["cache_control"] = {"type": "ephemeral"}  # type: ignore

        if only_n_most_recent_images:
            _maybe_filter_to_n_most_recent_images(
                messages,
                only_n_most_recent_images,
                min_removal_threshold=image_truncation_threshold,
            )
        extra_body = {}
        if thinking_budget:
            # Ensure we only send the required fields for thinking
            extra_body = {
                "thinking": {"type": "enabled", "budget_tokens": thinking_budget}
            }

        # Call the API
        # we use raw_response to provide debug information. Your
        # implementation may be able call the SDK directly with:
        # `response = client.messages.create(...)` instead.
        try:
            with time_operation(timing_collector, "anthropic_call"):
                raw_response = client.beta.messages.with_raw_response.create(
                    max_tokens=max_tokens,
                    messages=messages,
                    model=model,
                    system=[system],
                    tools=tool_collection.to_params(),
                    betas=betas,
                    extra_body=extra_body,
                )
        except (APIStatusError, APIResponseValidationError) as e:
            api_response_callback(e.request, e.response, e)
            raise Exception(f"Anthropic API error: {e.status_code} - {e.message}")
        except APIError as e:
            api_response_callback(e.request, e.body, e)
            raise Exception(f"Anthropic API error: {str(e)}")

        api_response_callback(
            raw_response.http_response.request, raw_response.http_response, None
        )

        with time_operation(timing_collector, "anthropic_response"):
            response = raw_response.parse()

        response_params = _response_to_params(response)
        messages.append(
            {
                "role": "assistant",
                "content": response_params,
            }
        )

        tool_result_content: list[BetaToolResultBlockParam] = []
        for content_block in response_params:
            output_callback(content_block)
            if content_block["type"] == "tool_use":
                tool_name = content_block["name"]
                tool_input = cast(dict[str, Any], content_block["input"])
                tool_id = content_block["id"]
                
                # Log tool execution start
                tool_logger.info(f"TOOL CALL START - Tool: {tool_name}, ID: {tool_id}")
                tool_logger.info(f"Tool Input: {tool_input}")
                
                try:
                    with time_operation(timing_collector, f"tool_{tool_name}", tool_name=tool_name):
                        result = await tool_collection.run(
                            name=tool_name,
                            tool_input=tool_input,
                        )
                    
                    # Log tool execution result
                    tool_logger.info(f"TOOL CALL SUCCESS - Tool: {tool_name}, ID: {tool_id}")
                    if result.output:
                        tool_logger.info(f"Tool Output: {result.output}")
                    if result.error:
                        tool_logger.error(f"Tool Error: {result.error}")
                    if hasattr(result, 'base64_image') and result.base64_image:
                        tool_logger.info(f"Tool returned image data (base64 length: {len(result.base64_image)})")
                        
                except Exception as e:
                    tool_logger.error(f"TOOL CALL EXCEPTION - Tool: {tool_name}, ID: {tool_id}, Exception: {str(e)}")
                    raise
                
                tool_result_content.append(
                    _make_api_tool_result(result, content_block["id"])
                )
                tool_output_callback(result, content_block["id"])

        if not tool_result_content:
            return messages

        messages.append({"content": tool_result_content, "role": "user"})


def _maybe_filter_to_n_most_recent_images(
    messages: list[BetaMessageParam],
    images_to_keep: int,
    min_removal_threshold: int,
):
    """
    With the assumption that images are screenshots that are of diminishing value as
    the conversation progresses, remove all but the final `images_to_keep` tool_result
    images in place, with a chunk of min_removal_threshold to reduce the amount we
    break the implicit prompt cache.
    """
    if images_to_keep is None:
        return messages

    tool_result_blocks = cast(
        list[BetaToolResultBlockParam],
        [
            item
            for message in messages
            for item in (
                message["content"] if isinstance(message["content"], list) else []
            )
            if isinstance(item, dict) and item.get("type") == "tool_result"
        ],
    )

    total_images = sum(
        1
        for tool_result in tool_result_blocks
        for content in tool_result.get("content", [])
        if isinstance(content, dict) and content.get("type") == "image"
    )

    images_to_remove = total_images - images_to_keep
    # for better cache behavior, we want to remove in chunks
    images_to_remove -= images_to_remove % min_removal_threshold

    for tool_result in tool_result_blocks:
        if isinstance(tool_result.get("content"), list):
            new_content = []
            for content in tool_result.get("content", []):
                if isinstance(content, dict) and content.get("type") == "image":
                    if images_to_remove > 0:
                        images_to_remove -= 1
                        continue
                new_content.append(content)
            tool_result["content"] = new_content


def _response_to_params(
    response: BetaMessage,
) -> list[BetaContentBlockParam]:
    res: list[BetaContentBlockParam] = []
    for block in response.content:
        if isinstance(block, BetaTextBlock):
            if block.text:
                res.append(BetaTextBlockParam(type="text", text=block.text))
            elif getattr(block, "type", None) == "thinking":
                # Handle thinking blocks - include signature field
                thinking_block = {
                    "type": "thinking",
                    "thinking": getattr(block, "thinking", None),
                }
                if hasattr(block, "signature"):
                    thinking_block["signature"] = getattr(block, "signature", None)
                res.append(cast(BetaContentBlockParam, thinking_block))
        else:
            # Handle tool use blocks normally
            res.append(cast(BetaToolUseBlockParam, block.model_dump()))
    return res


def _inject_prompt_caching(
    messages: list[BetaMessageParam],
):
    """
    Set cache breakpoints for the 3 most recent turns
    one cache breakpoint is left for tools/system prompt, to be shared across sessions
    """

    breakpoints_remaining = 3
    for message in reversed(messages):
        if message["role"] == "user" and isinstance(
            content := message["content"], list
        ):
            if breakpoints_remaining:
                breakpoints_remaining -= 1
                # Use type ignore to bypass TypedDict check until SDK types are updated
                content[-1]["cache_control"] = BetaCacheControlEphemeralParam(  # type: ignore
                    {"type": "ephemeral"}
                )
            else:
                content[-1].pop("cache_control", None)
                # we'll only every have one extra turn per loop
                break


def _make_api_tool_result(
    result: ToolResult, tool_use_id: str
) -> BetaToolResultBlockParam:
    """Convert an agent ToolResult to an API ToolResultBlockParam."""
    tool_result_content: list[BetaTextBlockParam | BetaImageBlockParam] | str = []
    is_error = False
    if result.error:
        is_error = True
        tool_result_content = _maybe_prepend_system_tool_result(result, result.error)
    else:
        if result.output:
            tool_result_content.append(
                {
                    "type": "text",
                    "text": _maybe_prepend_system_tool_result(result, result.output),
                }
            )
        if result.base64_image:
            tool_result_content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": result.base64_image,
                    },
                }
            )
    return {
        "type": "tool_result",
        "content": tool_result_content,
        "tool_use_id": tool_use_id,
        "is_error": is_error,
    }


def _maybe_prepend_system_tool_result(result: ToolResult, result_text: str):
    if result.system:
        result_text = f"<system>{result.system}</system>\n{result_text}"
    return result_text


async def _check_for_chat_messages():
    """Check for pending chat messages from user and return them"""
    try:
        from pymongo import MongoClient
        
        print("[CHAT DEBUG] Connecting to MongoDB...")
        # Connect to MongoDB
        client = MongoClient("mongodb://localhost:27017/")
        db = client.tilt
        interrupts_collection = db.interrupts
        print("[CHAT DEBUG] Connected to MongoDB successfully")
        
        # Get ALL unprocessed messages (since we don't have test ID context here yet)
        # This is simple but works - we'll process any pending chat messages
        print("[CHAT DEBUG] Querying for unprocessed messages...")
        messages = list(interrupts_collection.find({
            "processed": False
        }).sort("created_at", 1))
        
        print(f"[CHAT DEBUG] Found {len(messages)} total unprocessed messages in database")
        
        if not messages:
            print("[CHAT DEBUG] No pending messages found")
            return []
        
        for i, msg in enumerate(messages):
            print(f"[CHAT DEBUG] Message {i+1}: test_id={msg.get('test_id')}, message='{msg.get('message')}', processed={msg.get('processed')}")
        
        print(f"[CHAT DEBUG] Marking {len(messages)} messages as processed")
        
        # Mark messages as processed
        message_ids = [msg["_id"] for msg in messages]
        interrupts_collection.update_many(
            {"_id": {"$in": message_ids}},
            {"$set": {"processed": True}}
        )
        
        # Return just the message text
        result = [msg["message"] for msg in messages]
        print(f"[CHAT DEBUG] Returning {len(result)} messages: {result}")
        return result
        
    except Exception as e:
        print(f"[CHAT DEBUG] Error checking for chat messages: {e}")
        import traceback
        traceback.print_exc()
        return []
