"""
API routes for timing statistics and reporting.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Import timing collector with fallback
try:
    from ..timing_utils import timing_collector
except ImportError:
    logger.warning("Timing utilities not available")
    timing_collector = None

router = APIRouter()

@router.get("/timing/statistics")
async def get_timing_statistics() -> Dict[str, Any]:
    """Get comprehensive timing statistics for all steps."""
    if not timing_collector:
        raise HTTPException(status_code=503, detail="Timing collection not available")
    
    try:
        stats = timing_collector.get_statistics()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        logger.error(f"Error getting timing statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timing/history")
async def get_timing_history() -> Dict[str, Any]:
    """Get detailed timing history for all completed steps."""
    if not timing_collector:
        raise HTTPException(status_code=503, detail="Timing collection not available")
    
    try:
        history = timing_collector.get_step_history()
        return {
            "status": "success",
            "data": {
                "steps": history,
                "count": len(history)
            }
        }
    except Exception as e:
        logger.error(f"Error getting timing history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timing/summary")
async def get_timing_summary() -> Dict[str, Any]:
    """Get a concise timing summary with key metrics."""
    if not timing_collector:
        raise HTTPException(status_code=503, detail="Timing collection not available")
    
    try:
        stats = timing_collector.get_statistics()
        
        if stats["total_steps"] == 0:
            return {
                "status": "success",
                "data": {
                    "message": "No completed steps yet",
                    "total_steps": 0
                }
            }
        
        summary = {
            "total_steps": stats["total_steps"],
            "average_step_time": round(stats["average_step_time"], 3),
            "longest_step": {
                "step_number": stats["longest_step"]["step_number"],
                "duration": round(stats["longest_step"]["duration"], 3)
            },
            "total_time": round(stats["total_time"], 3)
        }
        
        # Add sub-timing averages if available
        if "avg_screenshot_time" in stats:
            summary["avg_screenshot_time"] = round(stats["avg_screenshot_time"], 3)
        if "avg_anthropic_time" in stats:
            summary["avg_anthropic_time"] = round(stats["avg_anthropic_time"], 3)
        if "avg_tool_time" in stats:
            summary["avg_tool_time"] = round(stats["avg_tool_time"], 3)
            
        return {
            "status": "success", 
            "data": summary
        }
    except Exception as e:
        logger.error(f"Error getting timing summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/timing/reset")
async def reset_timing_data() -> Dict[str, Any]:
    """Reset all timing data and start fresh."""
    if not timing_collector:
        raise HTTPException(status_code=503, detail="Timing collection not available")
    
    try:
        # Reset the collector by creating a new instance
        from ..timing_utils import TimingCollector
        # Replace the global collector
        import sys
        module = sys.modules['agent.timing_utils']
        module.timing_collector = TimingCollector()
        
        return {
            "status": "success",
            "message": "Timing data reset successfully"
        }
    except Exception as e:
        logger.error(f"Error resetting timing data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/timing/log")
async def log_timing_statistics() -> Dict[str, Any]:
    """Force logging of current timing statistics."""
    if not timing_collector:
        raise HTTPException(status_code=503, detail="Timing collection not available")
    
    try:
        timing_collector.log_statistics()
        return {
            "status": "success",
            "message": "Timing statistics logged successfully"
        }
    except Exception as e:
        logger.error(f"Error logging timing statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))