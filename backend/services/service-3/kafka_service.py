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
        self.kafka_brokers = os.getenv('KAFKA_BROKERS', 'localhost:9092').split(',')
        self.kafka_username = os.getenv('KAFKA_USERNAME')
        self.kafka_password = os.getenv('KAFKA_PASSWORD')
        self.producer = None
        self.consumer = None
        self.consumer_thread = None
        self.running = False
        
    def start(self):
        """Initialize Kafka producer and consumer"""
        try:
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
            
            self.consumer = KafkaConsumer('service-3-events', **consumer_config)
            logger.info("[Service-3] Kafka consumer initialized")
            
            self.running = True
            
            # Start consumer in separate thread
            self.consumer_thread = threading.Thread(target=self._consume_messages)
            self.consumer_thread.daemon = True
            self.consumer_thread.start()
            
            logger.info("[Service-3] Kafka connected and consuming messages")
            
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
                                    self._handle_event(message.value)
                                    
                except Exception as e:
                    logger.error(f"[Service-3] Error polling messages: {e}")
                    # Small delay before retrying
                    threading.Event().wait(1)
                    
        except Exception as e:
            logger.error(f"[Service-3] Error in consumer loop: {e}")
        finally:
            logger.info("[Service-3] Consumer loop ended")
    
    def _handle_event(self, event_data: Dict[str, Any]):
        """Handle events from Service-2"""
        event_name = event_data.get('eventName', 'Unknown')
        logger.info(f"[Service-3] Processing event: {event_name}")
        
        # Handle ChannelNotificationEvent from Service-2
        if event_name == 'ChannelNotificationEvent':
            self._handle_channel_notification(event_data)
        else:
            logger.warn(f"[Service-3] Unknown event type: {event_name}")
        
        # Increment the event counter
        event_counter.increment()
        logger.info(f"[Service-3] Event counter incremented to {event_counter.get_count()}")
    
    def _handle_channel_notification(self, event_data: Dict[str, Any]):
        """Handle channel notification events from Service-2"""
        channel_id = event_data.get('channelId')
        channel_name = event_data.get('channelName')
        channel_type = event_data.get('channelType')
        user_id = event_data.get('userId')
        notification_type = event_data.get('notificationType')
        message = event_data.get('message')
        
        logger.info(f"[Service-3] Processing channel notification - Channel: {channel_name} ({channel_type}), User: {user_id}, Type: {notification_type}")
        logger.info(f"[Service-3] Notification message: {message}")
        
        # Service-3 business logic for notifications:
        # - Send email notifications
        # - Update user dashboards
        # - Log notification events
        # - Create notification records
        
        # Simulate notification processing
        import time
        time.sleep(0.1)  # Simulate processing time
        
        logger.info(f"[Service-3] ✅ Channel notification processed successfully for channel {channel_id}")
    
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
