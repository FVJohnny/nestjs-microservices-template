import os
import json
import asyncio
import logging
from typing import Dict, Any
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import threading

logger = logging.getLogger(__name__)

class KafkaService:
    def __init__(self):
        self.kafka_brokers = os.getenv('KAFKA_BROKERS', 'localhost:9092').split(',')
        self.producer = None
        self.consumer = None
        self.consumer_thread = None
        self.running = False
        
    def start(self):
        """Initialize Kafka producer and consumer"""
        try:
            # Initialize producer
            self.producer = KafkaProducer(
                bootstrap_servers=self.kafka_brokers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            
            # Initialize consumer
            self.consumer = KafkaConsumer(
                'example-topic',
                bootstrap_servers=self.kafka_brokers,
                group_id='service-3-group',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
                auto_offset_reset='latest'
            )
            
            self.running = True
            
            # Start consumer in separate thread
            self.consumer_thread = threading.Thread(target=self._consume_messages)
            self.consumer_thread.daemon = True
            self.consumer_thread.start()
            
            logger.info("[Service-3] Kafka connected and consuming messages")
            
        except Exception as e:
            logger.error(f"[Service-3] Failed to initialize Kafka: {e}")
            
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
            for message in self.consumer:
                if not self.running:
                    break
                    
                logger.info(f"[Service-3] Received message from {message.topic}: {message.value}")
                
                # Process different event types
                if message.value:
                    self._handle_event(message.value)
                    
        except Exception as e:
            logger.error(f"[Service-3] Error consuming messages: {e}")
    
    def _handle_event(self, event_data: Dict[str, Any]):
        """Handle events"""
        logger.info(f"[Service-3] Processing event: {event_data.get('type')}")
        # Add your business logic here
    
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
