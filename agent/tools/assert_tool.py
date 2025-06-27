import json
from typing import Any
from anthropic.types.beta import BetaToolUnionParam
from .base import BaseAnthropicTool, ToolResult


class AssertTool(BaseAnthropicTool):
    """Tool to validate JSON data against assertions and extract specific values."""
    
    name: str = "assert"
    
    def to_params(self) -> BetaToolUnionParam:
        return {
            "name": self.name,
            "description": "Validate JSON data against assertions and extract specific values",
            "input_schema": {
                "type": "object",
                "properties": {
                    "json_data": {
                        "type": "string",
                        "description": "JSON string to validate and extract data from"
                    },
                    "assertion": {
                        "type": "string",
                        "description": "JavaScript-like assertion expression to evaluate (e.g., 'parseInt(events.xdm._experience.analytics.event101to200.event118.value) === 1')"
                    }
                },
                "required": ["json_data", "assertion"]
            }
        }
    
    def __call__(self, **kwargs) -> ToolResult:
        json_data = kwargs.get("json_data", "")
        assertion = kwargs.get("assertion", "")
        
        if not json_data.strip():
            return ToolResult(error="JSON data cannot be empty")
        
        if not assertion.strip():
            return ToolResult(error="Assertion cannot be empty")
        
        try:
            # Parse the JSON data
            data = json.loads(json_data)
            
            # Extract the path from the assertion
            # For example: "parseInt(events.xdm._experience.analytics.event101to200.event118.value) === 1"
            # We need to extract the value at that path
            
            result = self._evaluate_assertion(data, assertion)
            
            output = {
                "assertion": assertion,
                "result": result["success"],
                "extracted_value": result["value"],
                "message": result["message"]
            }
            
            return ToolResult(output=json.dumps(output, indent=2))
            
        except json.JSONDecodeError as e:
            return ToolResult(error=f"Invalid JSON data: {str(e)}")
        except Exception as e:
            return ToolResult(error=f"Error evaluating assertion: {str(e)}")
    
    def _evaluate_assertion(self, data: Any, assertion: str) -> dict:
        """Evaluate the assertion against the data."""
        try:
            # Handle common assertion patterns
            if "parseInt(" in assertion and "===" in assertion:
                # Extract the path and expected value
                parts = assertion.split("===")
                if len(parts) != 2:
                    return {"success": False, "value": None, "message": "Invalid assertion format"}
                
                path_part = parts[0].strip()
                expected_value = int(parts[1].strip())
                
                # Extract the path from parseInt(path)
                if path_part.startswith("parseInt(") and path_part.endswith(")"):
                    path = path_part[9:-1]  # Remove "parseInt(" and ")"
                    
                    # Navigate through the data structure
                    value = self._get_nested_value(data, path)
                    
                    if value is None:
                        return {"success": False, "value": None, "message": f"Path '{path}' not found in data"}
                    
                    # Convert to int and compare
                    try:
                        actual_value = int(value)
                        success = actual_value == expected_value
                        return {
                            "success": success, 
                            "value": actual_value, 
                            "message": f"Expected {expected_value}, got {actual_value}"
                        }
                    except (ValueError, TypeError):
                        return {"success": False, "value": value, "message": f"Cannot convert '{value}' to integer"}
                        
            return {"success": False, "value": None, "message": "Unsupported assertion format"}
            
        except Exception as e:
            return {"success": False, "value": None, "message": f"Error: {str(e)}"}
    
    def _get_nested_value(self, data: Any, path: str) -> Any:
        """Get a nested value from data using dot notation."""
        try:
            keys = path.split('.')
            current = data
            
            for key in keys:
                if isinstance(current, dict):
                    current = current.get(key)
                else:
                    return None
                    
                if current is None:
                    return None
                    
            return current
        except Exception:
            return None


# Global instance for reuse
assert_tool = AssertTool()