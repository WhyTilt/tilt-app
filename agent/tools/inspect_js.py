import asyncio
import json
import logging
import pychrome
import warnings
from typing import Dict, Any, Optional
from anthropic.types.beta import BetaToolUnionParam
from .base import BaseAnthropicTool, ToolResult

# Suppress pychrome WebSocket warnings/errors during cleanup
logging.getLogger('pychrome.tab').setLevel(logging.CRITICAL)
warnings.filterwarnings('ignore', module='pychrome')


class JavaScriptInspectorTool(BaseAnthropicTool):
    """Tool to execute JavaScript code in Chromium using pychrome library."""
    
    name: str = "inspect_js"
    
    def to_params(self) -> BetaToolUnionParam:
        return {
            "name": self.name,
            "description": "Execute JavaScript code in the current Chromium browser tab to inspect page elements, extract data, or interact with web APIs. Use this when you need to access browser-specific data like window objects, DOM elements, or execute JavaScript that returns values from the page. Chromium must be running with remote debugging enabled on port 9222.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "JavaScript code to execute in the browser context"
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Timeout in seconds (default: 10)",
                        "default": 10
                    }
                },
                "required": ["code"]
            }
        }
    
    def _get_chromium_browser(self) -> Optional[pychrome.Browser]:
        """Get Chromium browser instance."""
        try:
            browser = pychrome.Browser(url="http://localhost:9222")
            return browser
        except Exception:
            return None
    
    def _execute_javascript(self, code: str, timeout: int = 10) -> Dict[str, Any]:
        """Execute JavaScript code via pychrome and return the result."""
        browser = self._get_chromium_browser()
        if not browser:
            return {"error": "Chromium remote debugging not available. Ensure Chromium is running with --remote-debugging-port=9222"}
        
        tab = None
        try:
            # Get the first tab
            tabs = browser.list_tab()
            if not tabs:
                return {"error": "No Chromium tabs available"}
            
            tab = tabs[0]
            tab.start()
            
            # Execute the JavaScript code
            result = tab.Runtime.evaluate(expression=code, returnByValue=True, awaitPromise=True)
            
            # Check for exceptions
            if "exceptionDetails" in result:
                exception = result["exceptionDetails"]
                error_msg = exception.get("text", "JavaScript execution error")
                if "exception" in exception and "description" in exception["exception"]:
                    error_msg = exception["exception"]["description"]
                return {"error": f"JavaScript Error: {error_msg}"}
            
            # Get the result value
            if "result" in result:
                value = result["result"]
                if "value" in value:
                    return {"output": str(value["value"])}
                elif "description" in value:
                    return {"output": value["description"]}
                else:
                    return {"output": str(value.get("type", "undefined"))}
            
            return {"error": "No result returned from JavaScript execution"}
            
        except Exception as e:
            return {"error": f"Execution failed: {str(e)}"}
        finally:
            # Always clean up the tab connection
            if tab:
                try:
                    # First disable Runtime to stop receiving events
                    tab.Runtime.disable()
                    # Give it a moment to process the disable
                    import time
                    time.sleep(0.1)
                    # Stop the tab connection
                    tab.stop()
                    # Wait for the connection to properly close
                    time.sleep(0.1)
                except Exception:
                    pass  # Ignore cleanup errors
    
    async def __call__(self, **kwargs) -> ToolResult:
        code = kwargs.get("code", "")
        timeout = kwargs.get("timeout", 10)
        
        if not code.strip():
            return ToolResult(error="JavaScript code cannot be empty")
        
        # Execute the JavaScript code
        result = self._execute_javascript(code, timeout)
        
        if "error" in result:
            return ToolResult(error=result["error"])
        
        return ToolResult(output=result.get("output", ""))


# Global instance for reuse
inspect_js = JavaScriptInspectorTool()