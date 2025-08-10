from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
import time
from kafka_service import kafka_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request bodies
class GenericEvent(BaseModel):
    class Config:
        extra = "allow"  # Allow additional fields beyond what's defined

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Service-3...")
    kafka_service.start()
    yield
    # Shutdown
    logger.info("Shutting down Service-3...")
    kafka_service.stop()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    return {"service": "service-3", "status": "ok"}

@app.post("/publish-event")
async def publish_event(event: GenericEvent = None):
    """Publish generic events to Kafka"""
    try:
        # Create default event data if no event provided
        if event is None:
            message = {
                'type': 'USER_ACTION',
                'action': 'frontend_trigger',
                'timestamp': str(time.time()),
                'source': 'service-3'
            }
        else:
            # Use the entire event data as the message, adding metadata
            message = event.dict()
            message.update({
                'timestamp': str(time.time()),
                'source': 'service-3'
            })
        
        success = kafka_service.publish_message('example-topic', message)
        if success:
            return {"message": "Event published to Kafka", "data": message}
        else:
            raise HTTPException(status_code=500, detail="Failed to publish event")
    except Exception as e:
        logger.error(f"Error publishing event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
