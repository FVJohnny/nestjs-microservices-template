import threading
from datetime import datetime
from typing import Dict, Any

class EventCounter:
    """Thread-safe event counter for tracking processed Kafka events"""
    
    def __init__(self):
        self._counter = 0
        self._lock = threading.Lock()
    
    def increment(self) -> None:
        """Increment the event counter"""
        with self._lock:
            self._counter += 1
    
    def get_count(self) -> int:
        """Get the current event count"""
        with self._lock:
            return self._counter
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive stats including count and metadata"""
        with self._lock:
            return {
                "service": "service-3",
                "eventsProcessed": self._counter,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
    
    def reset(self) -> None:
        """Reset the counter to zero"""
        with self._lock:
            self._counter = 0

# Global singleton instance
event_counter = EventCounter()
