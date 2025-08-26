from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime
from messaging_service import messaging_service
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
    try:
        messaging_service.start()
        logger.info("Service-3 messaging service started successfully")
    except Exception as e:
        logger.error(f"Failed to start messaging service: {e}")
        # Don't block startup if messaging fails
    yield
    # Shutdown
    logger.info("Shutting down Service-3...")
    try:
        messaging_service.stop()
    except Exception as e:
        logger.error(f"Error stopping messaging service: {e}")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def root():
    return {"service": "service-3", "status": "ok"}

@app.get("/health/environment")
async def get_environment():
    import os
    environment = os.getenv("NODE_ENV", "development")
    return {
        "environment": environment,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


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
        
        success = messaging_service.publish_message(request.topic, enhanced_message)
        if success:
            return {
                "success": True,
                "topic": request.topic,
                "message": "Event published successfully",
                "backend": messaging_service.get_backend_type(),
                "timestamp": enhanced_message['timestamp']
            }
        else:
            return {
                "success": False,
                "error": f"Failed to publish event to {messaging_service.get_backend_type()}",
                "timestamp": enhanced_message['timestamp']
            }
    except Exception as e:
        logger.error(f"Error in messaging publish: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": str(time.time())
        }

@app.get("/integration-events/listener/status")
async def messaging_listener_status():
    """Get messaging listener status"""
    return {
        "listening": messaging_service.is_connected(),
        "backend": messaging_service.get_backend_class_name(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/integration-events/listener/stats")
async def messaging_listener_stats():
    """Get detailed messaging listener statistics"""
    try:
        basic_stats = event_counter.get_stats()
        subscribed_topics = messaging_service.get_subscribed_topics()
        
        # Return new eventsByType format matching NestJS Service-1
        return {
            # New event tracking format
            "service": basic_stats.get("service", "service-3"),
            "totalEventsProcessed": basic_stats.get("totalEventsProcessed", 0),
            "eventsByType": basic_stats.get("eventsByType", []),
            "timestamp": basic_stats.get("timestamp"),
            
            # Legacy format for backward compatibility
            "listening": messaging_service.is_connected(),
            "backend": messaging_service.get_backend_class_name(),
            "subscribedTopics": subscribed_topics,
            "handlerCount": len(basic_stats.get("eventsByType", [])),
            "handlers": basic_stats.get("eventsByType", []),
            "totalStats": {
                "totalMessages": basic_stats.get("totalEventsProcessed", 0),
                "totalSuccesses": basic_stats.get("totalEventsProcessed", 0),
                "totalFailures": 0,
                "averageProcessingTime": 0
            }
        }
    except Exception as e:
        logger.error(f"Error in messaging_listener_stats: {e}")
        return {
            "error": str(e),
            "service": "service-3",
            "totalEventsProcessed": 0,
            "eventsByType": [],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

@app.post("/integration-events/listener/start")
async def messaging_listener_start():
    """Start the messaging listener"""
    try:
        # Messaging service is already started in lifespan
        return {
            "success": True,
            "message": f"{messaging_service.get_backend_type()} event listener is already running",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

@app.post("/integration-events/listener/stop")
async def messaging_listener_stop():
    """Stop the messaging listener"""
    try:
        return {
            "success": True,
            "message": f"{messaging_service.get_backend_type()} event listener cannot be stopped (managed by lifespan)",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }