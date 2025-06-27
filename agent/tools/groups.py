from dataclasses import dataclass
from typing import Literal

from .assert_tool import AssertTool
from .base import BaseAnthropicTool
from .bash import BashTool20241022, BashTool20250124
from .computer import ComputerTool20241022, ComputerTool20250124
from .edit import EditTool20241022, EditTool20250124, EditTool20250429
from .inspect_js import JavaScriptInspectorTool
from .inspect_network import NetworkInspectorTool
from .mongodb_reporter import MongoDBReporterTool
from .mongodb_query import MongoDBQueryTool

ToolVersion = Literal[
    "computer_use_20250124", "computer_use_20241022", "computer_use_20250429"
]
BetaFlag = Literal[
    "computer-use-2024-10-22", "computer-use-2025-01-24", "computer-use-2025-04-29"
]


@dataclass(frozen=True, kw_only=True)
class ToolGroup:
    version: ToolVersion
    tools: list[type[BaseAnthropicTool]]
    beta_flag: BetaFlag | None = None


TOOL_GROUPS: list[ToolGroup] = [
    ToolGroup(
        version="computer_use_20241022",
        tools=[ComputerTool20241022, EditTool20241022, BashTool20241022, JavaScriptInspectorTool, NetworkInspectorTool, MongoDBReporterTool, MongoDBQueryTool, AssertTool],
        beta_flag="computer-use-2024-10-22",
    ),
    ToolGroup(
        version="computer_use_20250124",
        tools=[ComputerTool20250124, EditTool20250124, BashTool20250124, JavaScriptInspectorTool, NetworkInspectorTool, MongoDBReporterTool, MongoDBQueryTool, AssertTool],
        beta_flag="computer-use-2025-01-24",
    ),
    ToolGroup(
        version="computer_use_20250429",
        tools=[ComputerTool20250124, EditTool20250429, BashTool20250124, JavaScriptInspectorTool, NetworkInspectorTool, MongoDBReporterTool, MongoDBQueryTool, AssertTool],
        beta_flag="computer-use-2025-01-24",
    ),
]

TOOL_GROUPS_BY_VERSION = {tool_group.version: tool_group for tool_group in TOOL_GROUPS}
