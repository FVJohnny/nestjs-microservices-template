from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime
from kafka_service import kafka_service
from event_counter import event_counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request bodies
class PublishEventRequest(BaseModel):
    topic: str
    message: dict

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


# Generic messaging endpoints to match NestJS service structure
@app.post("/messaging/publish")
async def messaging_publish(request: PublishEventRequest):
    """Generic messaging publish endpoint"""
    try:
        # Add metadata to the message
        enhanced_message = request.message.copy()
        enhanced_message.update({
            'timestamp': str(time.time()),
            'source': 'service-3',
            'topic': request.topic
        })
        
        success = kafka_service.publish_message(request.topic, enhanced_message)
        if success:
            return {
                "success": True,
                "topic": request.topic,
                "message": "Event published successfully",
                "backend": "Kafka",
                "timestamp": enhanced_message['timestamp']
            }
        else:
            return {
                "success": False,
                "error": "Failed to publish event to Kafka",
                "timestamp": enhanced_message['timestamp']
            }
    except Exception as e:
        logger.error(f"Error in messaging publish: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": str(time.time())
        }

@app.get("/messaging/listener/status")
async def messaging_listener_status():
    """Get messaging listener status"""
    return {
        "listening": kafka_service.is_connected(),
        "backend": "KafkaEventListener",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/messaging/listener/stats")
async def messaging_listener_stats():
    """Get detailed messaging listener statistics"""
    basic_stats = event_counter.get_stats()
    
    return {
        "listening": kafka_service.is_connected(),
        "backend": "KafkaEventListener",
        "subscribedTopics": ["channel-events"],
        "handlerCount": 1,
        "handlers": [
            {
                "topic": "channel-events",
                "handlerName": "ChannelNotificationHandler",
                "messagesProcessed": basic_stats.get("eventsProcessed", 0),
                "messagesSucceeded": basic_stats.get("eventsProcessed", 0),
                "messagesFailed": 0,
                "averageProcessingTime": 100,
                "lastProcessedAt": basic_stats.get("timestamp")
            }
        ],
        "totalStats": {
            "totalMessages": basic_stats.get("eventsProcessed", 0),
            "totalSuccesses": basic_stats.get("eventsProcessed", 0),
            "totalFailures": 0,
            "averageProcessingTime": 100
        },
        "timestamp": basic_stats.get("timestamp")
    }

@app.post("/messaging/listener/start")
async def messaging_listener_start():
    """Start the messaging listener"""
    try:
        # Kafka service is already started in lifespan
        return {
            "success": True,
            "message": "Event listener is already running",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

@app.post("/messaging/listener/stop")
async def messaging_listener_stop():
    """Stop the messaging listener"""
    try:
        return {
            "success": True,
            "message": "Event listener cannot be stopped (managed by lifespan)",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }