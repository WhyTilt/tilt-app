from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
import uvicorn
import logging
import sys

app = FastAPI(
    title="Computer Use API",
    description="API service for Claude computer use tools",
    version="1.0.0"
)

# Add CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

# Configure logging
import os
os.makedirs('/home/computeragent/logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/home/computeragent/logs/api-detailed.log')
    ]
)

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Computer Use API service...")
    uvicorn.run(
        "agent.api_service.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )