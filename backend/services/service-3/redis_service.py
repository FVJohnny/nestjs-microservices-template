import os
import json
import asyncio
import logging
import threading
import time
from typing import Dict, Any
import redis
from event_counter import event_counter

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_password = os.getenv('REDIS_PASSWORD')
        self.redis_username = os.getenv('REDIS_USERNAME', 'default')
        self.redis_db = int(os.getenv('REDIS_DB', 0))
        self.redis_tls = os.getenv('REDIS_TLS', 'false').lower() == 'true'
        
        self.publisher_client = None
        self.subscriber_client = None
        self.pubsub = None
        self.subscriber_thread = None
        self.running = False
        
    def start(self):
        """Initialize Redis publisher and subscriber clients"""
        try:
            # Base configuration
            redis_config = {
                'host': self.redis_host,
                'port': self.redis_port,
                'db': self.redis_db,
                'decode_responses': True,
                'socket_timeout': 30,
                'socket_connect_timeout': 30,
                'retry_on_timeout': True,
                'health_check_interval': 30
            }
            
            # Add authentication if provided
            if self.redis_password:
                redis_config['password'] = self.redis_password
                
            if self.redis_username and self.redis_username != 'default':
                redis_config['username'] = self.redis_username
            
            # Add TLS configuration if enabled
            if self.redis_tls:
                redis_config['ssl'] = True
                redis_config['ssl_cert_reqs'] = None
                redis_config['ssl_check_hostname'] = False
            
            logger.info(f"[Service-3] Connecting to Redis: {self.redis_host}:{self.redis_port}")
            logger.info(f"[Service-3] Redis TLS: {'enabled' if self.redis_tls else 'disabled'}")
            logger.info(f"[Service-3] Redis auth: {'enabled' if self.redis_password else 'disabled'}")
            
            # Create separate clients for publishing and subscribing
            self.publisher_client = redis.Redis(**redis_config)
            self.subscriber_client = redis.Redis(**redis_config)
            
            # Test connections
            self.publisher_client.ping()
            self.subscriber_client.ping()
            
            logger.info("[Service-3] Redis publisher client initialized")
            logger.info("[Service-3] Redis subscriber client initialized")
            
            # Initialize pubsub and subscribe to users channel (matching Kafka)
            self.pubsub = self.subscriber_client.pubsub()
            self.pubsub.subscribe('users')  # Subscribe to users channel like Kafka
            
            self.running = True
            
            # Pre-register events that have handlers (so they show at 0 count)
            self._pre_register_handled_events()
            
            # Start subscriber in separate thread
            self.subscriber_thread = threading.Thread(target=self._consume_messages)
            self.subscriber_thread.daemon = True
            self.subscriber_thread.start()
            
            logger.info("[Service-3] Redis connected and consuming messages")
            
        except Exception as e:
            logger.error(f"[Service-3] Failed to initialize Redis: {e}")
            logger.error(f"[Service-3] Redis config - host: {self.redis_host}:{self.redis_port}")
            logger.error(f"[Service-3] Redis config - TLS: {self.redis_tls}")
            logger.error(f"[Service-3] Redis config - auth: {'enabled' if self.redis_password else 'disabled'}")
            raise
            
    def stop(self):
        """Stop Redis publisher and subscriber"""
        self.running = False
        
        if self.pubsub:
            self.pubsub.close()
            
        if self.subscriber_client:
            self.subscriber_client.close()
            
        if self.publisher_client:
            self.publisher_client.close()
            
        if self.subscriber_thread:
            self.subscriber_thread.join(timeout=5)
            
        logger.info("[Service-3] Redis connections closed")
    
    def is_connected(self):
        """Check if Redis service is connected and running"""
        try:
            return (self.running and 
                   self.publisher_client is not None and 
                   self.subscriber_client is not None and
                   self.publisher_client.ping())
        except:
            return False
    
    def _consume_messages(self):
        """Consumer loop running in separate thread"""
        try:
            while self.running:
                try:
                    # Listen for messages with timeout
                    message = self.pubsub.get_message(timeout=1.0)
                    
                    if message and message['type'] == 'message':
                        if not self.running:
                            return
                            
                        try:
                            # Parse JSON message
                            event_data = json.loads(message['data'])
                            logger.info(f"[Service-3] Received message from {message['channel']}: {event_data}")
                            
                            # Add channel information to event data for tracking
                            if isinstance(event_data, dict):
                                event_data['_redisChannel'] = message['channel']
                            
                            # Process the event
                            self._handle_event(event_data)
                            
                        except json.JSONDecodeError as e:
                            logger.error(f"[Service-3] Failed to parse message JSON: {e}")
                        except Exception as e:
                            logger.error(f"[Service-3] Error processing message: {e}")
                            
                except Exception as e:
                    logger.error(f"[Service-3] Error getting messages: {e}")
                    # Small delay before retrying
                    time.sleep(1)
                    
        except Exception as e:
            logger.error(f"[Service-3] Error in subscriber loop: {e}")
        finally:
            logger.info("[Service-3] Subscriber loop ended")
    
    def _pre_register_handled_events(self):
        """Pre-register events that have handlers so they show at 0 count"""
        # Only register events that actually have handler methods
        handled_events = [
            {"name": "user.created", "topic": "users"},
            # Add more handled events here as needed
        ]
        
        for event_info in handled_events:
            event_counter.track_event_with_zero_count(
                event_info["name"], 
                event_info["topic"]
            )
            logger.info(f"[Service-3] Pre-registered handler event: {event_info['name']}@{event_info['topic']}")
    
    def _handle_event(self, event_data: Dict[str, Any]):
        event_name = event_data.get('name', 'Unknown')
        # Use redis channel if available, otherwise fall back to event topic or default
        topic = event_data.get('_redisChannel', event_data.get('topic', 'users'))
        logger.info(f"[Service-3] Processing event: {event_name} from topic: {topic}")
        
        if event_name == 'user.created':
            self._handle_user_created(event_data)
            # Track the event ONLY if we handled it
            event_counter.track_event(event_name, topic)
            logger.info(f"[Service-3] Event tracked: {event_name}@{topic}, total count: {event_counter.get_count()}")
        else:
            logger.warning(f"[Service-3] Unknown event type (not tracking): {event_name}")
    
    def _handle_user_created(self, event_data: Dict[str, Any]):
        """Handle user created events from Service-1"""
        # Extract userId from nested data structure
        user_data = event_data.get('data', {})
        user_id = user_data.get('userId')
        email = user_data.get('email')
        username = user_data.get('username')
        
        logger.info(f"[Service-3] Processing user created - User ID: {user_id}, Email: {email}, Username: {username}")
        
        time.sleep(0.1)  # Simulate processing time
        
        logger.info(f"[Service-3] ✅ User created processed successfully for user {user_id} ({email})")
    
    def publish_message(self, channel: str, message: Dict[str, Any]):
        """Publish a message to Redis channel"""
        try:
            if not self.publisher_client:
                raise Exception("Redis publisher client not initialized")
                
            # Serialize message to JSON
            message_json = json.dumps(message)
            
            # Publish to Redis channel
            result = self.publisher_client.publish(channel, message_json)
            
            logger.info(f"[Service-3] Published message to {channel}: {message} (subscribers: {result})")
            return True
            
        except Exception as e:
            logger.error(f"[Service-3] Failed to publish message to {channel}: {e}")
            return False
    
    def publish_event(self, event_type: str, data: Dict[str, Any]):
        """Publish notification requests"""
        message_data = {
            'type': event_type,
            'data': data,
            'timestamp': str(time.time()),
            'source': 'service-3'
        }
        return self.publish_message('channels', message_data)

# Global instance
redis_service = RedisService()