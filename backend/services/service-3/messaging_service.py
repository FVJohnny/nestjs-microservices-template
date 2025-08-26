import os
import logging
from typing import Dict, Any, Protocol
from kafka_service import kafka_service
from redis_service import redis_service

logger = logging.getLogger(__name__)

class MessagingServiceProtocol(Protocol):
    """Protocol defining the interface for messaging services"""
    def start(self) -> None: ...
    def stop(self) -> None: ...
    def is_connected(self) -> bool: ...
    def publish_message(self, topic_or_channel: str, message: Dict[str, Any], key: str = None) -> bool: ...
    def publish_event(self, event_type: str, data: Dict[str, Any]) -> bool: ...

class MessagingServiceManager:
    """Manager that provides a unified interface for Kafka or Redis messaging"""
    
    def __init__(self):
        self.backend_type = os.getenv('MESSAGING_BACKEND', 'kafka').lower()
        self.service: MessagingServiceProtocol = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize the appropriate messaging service based on environment variable"""
        if self.backend_type == 'redis':
            logger.info("[Service-3] Using Redis messaging backend")
            self.service = redis_service
        elif self.backend_type == 'kafka':
            logger.info("[Service-3] Using Kafka messaging backend")
            self.service = kafka_service
        else:
            logger.warning(f"[Service-3] Unknown messaging backend '{self.backend_type}', defaulting to Kafka")
            self.backend_type = 'kafka'
            self.service = kafka_service
    
    def get_backend_type(self) -> str:
        """Return the current backend type"""
        return self.backend_type.title()
    
    def get_backend_class_name(self) -> str:
        """Return the backend class name for API responses"""
        if self.backend_type == 'redis':
            return 'Redis'
        else:
            return 'Kafka'
    
    def start(self):
        """Start the messaging service"""
        logger.info(f"[Service-3] Starting {self.backend_type.title()} messaging service")
        return self.service.start()
    
    def stop(self):
        """Stop the messaging service"""
        logger.info(f"[Service-3] Stopping {self.backend_type.title()} messaging service")
        return self.service.stop()
    
    def is_connected(self) -> bool:
        """Check if messaging service is connected"""
        return self.service.is_connected()
    
    def publish_message(self, topic_or_channel: str, message: Dict[str, Any], key: str = None) -> bool:
        """Publish a message (topic for Kafka, channel for Redis)"""
        if self.backend_type == 'kafka':
            return self.service.publish_message(topic_or_channel, message, key)
        else:  # Redis
            return self.service.publish_message(topic_or_channel, message)
    
    def publish_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Publish an event"""
        return self.service.publish_event(event_type, data)
    
    def get_subscribed_topics(self) -> list:
        """Get list of subscribed topics/channels"""
        if self.backend_type == 'redis':
            return ['users']  # Redis channels
        else:
            return ['users']  # Kafka topics

# Global instance
messaging_service = MessagingServiceManager()