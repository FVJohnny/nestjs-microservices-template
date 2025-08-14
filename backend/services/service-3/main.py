from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
import time
from kafka_service import kafka_service
from event_counter import event_counter

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

@app.get("/health")
async def root():
    return {"service": "service-3", "status": "ok"}

@app.get("/kafka/consumer-stats")
async def get_consumer_stats():
    """Get detailed consumer statistics compatible with NestJS services"""
    basic_stats = event_counter.get_stats()
    
    # Transform to match NestJS consumer stats format
    return {
        "consumerId": "service-3-consumer",
        "handlerCount": 1,
        "topics": ["channel-events"],
        "handlers": [
            {
                "topic": "channel-events",
                "handlerName": "ChannelNotificationHandler",
                "messagesProcessed": basic_stats.get("eventsProcessed", 0),
                "messagesSucceeded": basic_stats.get("eventsProcessed", 0),
                "messagesFailed": 0,
                "totalProcessingTime": basic_stats.get("eventsProcessed", 0) * 100,  # Simulate 100ms per message
                "averageProcessingTime": 100,
                "lastProcessedAt": basic_stats.get("timestamp")
            }
        ],
        "totalMessages": basic_stats.get("eventsProcessed", 0),
        "totalSuccesses": basic_stats.get("eventsProcessed", 0),
        "totalFailures": 0,
        "uptime": int(time.time() * 1000),  # Current timestamp in ms
        "startedAt": basic_stats.get("timestamp")
    }

@app.post("/kafka/publish-event")
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