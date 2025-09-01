import os
import json
import asyncio
import logging
from typing import Dict, Any
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import threading
from event_counter import event_counter

logger = logging.getLogger(__name__)

class KafkaService:
    def __init__(self):
        # Only set configuration, don't initialize connections on import
        self.kafka_brokers = None
        self.kafka_username = None
        self.kafka_password = None
        self.producer = None
        self.consumer = None
        self.consumer_thread = None
        self.running = False
        self.initialized = False
        
    def start(self):
        """Initialize Kafka producer and consumer"""
        try:
            # Initialize configuration only when starting
            if not self.initialized:
                self.kafka_brokers = os.getenv('KAFKA_BROKERS', 'localhost:9092').split(',')
                self.kafka_username = os.getenv('KAFKA_USERNAME')
                self.kafka_password = os.getenv('KAFKA_PASSWORD')
                self.initialized = True
            
            # Base configuration
            producer_config = {
                'bootstrap_servers': self.kafka_brokers,
                'value_serializer': lambda v: json.dumps(v).encode('utf-8'),
                'key_serializer': lambda k: k.encode('utf-8') if k else None
            }
            
            consumer_config = {
                'bootstrap_servers': self.kafka_brokers,
                'group_id': 'service-3-group',
                'value_deserializer': lambda m: json.loads(m.decode('utf-8')) if m else None,
                'auto_offset_reset': 'earliest',
                'enable_auto_commit': True,
                'max_poll_records': 100,
                'session_timeout_ms': 20000,
                'heartbeat_interval_ms': 3000
            }
            
            # Add authentication if credentials are provided (for cloud Kafka)
            if self.kafka_username and self.kafka_password:
                auth_config = {
                    'security_protocol': 'SASL_SSL',
                    'sasl_mechanism': 'SCRAM-SHA-256',
                    'sasl_plain_username': self.kafka_username,
                    'sasl_plain_password': self.kafka_password,
                    # Additional connection settings for cloud Kafka
                    'ssl_check_hostname': False,
                    'ssl_cafile': None,
                    'request_timeout_ms': 30000,
                    'connections_max_idle_ms': 540000,
                    'reconnect_backoff_ms': 50,
                    'reconnect_backoff_max_ms': 1000
                }
                producer_config.update(auth_config)
                consumer_config.update(auth_config)
            
            # Initialize producer and consumer with better error handling
            logger.info(f"[Service-3] Connecting to Kafka brokers: {self.kafka_brokers}")
            logger.info(f"[Service-3] Using authentication: {'Yes' if self.kafka_username else 'No'}")
            
            self.producer = KafkaProducer(**producer_config)
            logger.info("[Service-3] Kafka producer initialized")
            
            # Initialize consumer in background to avoid blocking startup
            self.running = True
            
            # Start consumer in separate thread
            self.consumer_thread = threading.Thread(target=self._initialize_and_consume, args=(consumer_config,))
            self.consumer_thread.daemon = True
            self.consumer_thread.start()
            
            logger.info("[Service-3] Kafka initialization started in background")
            
        except Exception as e:
            logger.error(f"[Service-3] Failed to initialize Kafka: {e}")
            logger.error(f"[Service-3] Kafka config - brokers: {self.kafka_brokers}")
            logger.error(f"[Service-3] Kafka config - auth: {'enabled' if self.kafka_username else 'disabled'}")
            raise
            
    def stop(self):
        """Stop Kafka producer and consumer"""
        self.running = False
        
        if self.consumer:
            self.consumer.close()
            
        if self.producer:
            self.producer.close()
            
        if self.consumer_thread:
            self.consumer_thread.join(timeout=5)
            
        logger.info("[Service-3] Kafka connections closed")
    
    def is_connected(self):
        """Check if Kafka service is connected and running"""
        return self.running and self.producer is not None and self.consumer is not None
    
    def _initialize_and_consume(self, consumer_config):
        """Initialize consumer and start consuming in background"""
        try:
            logger.info("[Service-3] Initializing Kafka consumer in background...")
            self.consumer = KafkaConsumer('users', **consumer_config)
            logger.info("[Service-3] Kafka consumer initialized")
            logger.info("[Service-3] Kafka connected and consuming messages")
            
            # Pre-register events that have handlers (so they show at 0 count)
            self._pre_register_handled_events()
            
            self._consume_messages()
        except Exception as e:
            logger.error(f"[Service-3] Failed to initialize consumer: {e}")
            self.running = False
    
    def _consume_messages(self):
        """Consumer loop running in separate thread"""
        try:
            while self.running:
                try:
                    # Poll for messages with a short timeout
                    message_pack = self.consumer.poll(timeout_ms=1000)
                    
                    if message_pack:
                        for topic_partition, messages in message_pack.items():
                            for message in messages:
                                if not self.running:
                                    return
                                    
                                logger.info(f"[Service-3] Received message from {message.topic}: {message.value}")
                                
                                # Process different event types
                                if message.value:
                                    # Add topic information to event data for tracking
                                    event_data = message.value.copy() if isinstance(message.value, dict) else message.value
                                    if isinstance(event_data, dict):
                                        event_data['_kafkaTopic'] = message.topic
                                    self._handle_event(event_data)
                                    
                except Exception as e:
                    logger.error(f"[Service-3] Error polling messages: {e}")
                    # Small delay before retrying
                    threading.Event().wait(1)
                    
        except Exception as e:
            logger.error(f"[Service-3] Error in consumer loop: {e}")
        finally:
            logger.info("[Service-3] Consumer loop ended")
    
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
        # Use kafka topic if available, otherwise fall back to event topic or default
        topic = event_data.get('_kafkaTopic', event_data.get('topic', 'channels'))
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
        
        import time
        time.sleep(0.1)  # Simulate processing time
        
        logger.info(f"[Service-3] ✅ User created processed successfully for user {user_id} ({email})")
    
    def publish_message(self, topic: str, message: Dict[str, Any], key: str = None):
        """Publish a message to Kafka topic"""
        try:
            if not self.producer:
                raise Exception("Kafka producer not initialized")
                
            future = self.producer.send(topic, value=message, key=key)
            self.producer.flush()  # Ensure message is sent
            
            logger.info(f"[Service-3] Published message to {topic}: {message}")
            return True
            
        except KafkaError as e:
            logger.error(f"[Service-3] Failed to publish message to {topic}: {e}")
            return False
    
    def publish_event(self, event_type: str, data: Dict[str, Any]):
        """Publish notification requests"""
        message_data = {
            'type': event_type,
            'data': data,
            'timestamp': str(asyncio.get_event_loop().time()),
            'source': 'service-3'
        }
        return self.publish_message('example-topic', message_data)

# Global instance
kafka_service = KafkaService()
