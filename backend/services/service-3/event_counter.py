import threading
from datetime import datetime
from typing import Dict, Any, List
from collections import defaultdict

class EventStats:
    """Individual event statistics"""
    def __init__(self, event_type: str, topic: str):
        self.event_type = event_type
        self.topic = topic
        self.count = 0
        self.last_processed = None

class EventCounter:
    """Thread-safe event counter for tracking processed Kafka events"""
    
    def __init__(self):
        self._event_counts: Dict[str, EventStats] = {}
        self._lock = threading.Lock()
    
    def track_event(self, event_type: str, topic: str) -> None:
        """Track an event by type and topic"""
        key = f"{event_type}@{topic}"
        
        with self._lock:
            if key not in self._event_counts:
                self._event_counts[key] = EventStats(event_type, topic)
            
            self._event_counts[key].count += 1
            self._event_counts[key].last_processed = datetime.utcnow()
    
    def increment(self, event_type: str = "Unknown", topic: str = "unknown") -> None:
        """Increment the event counter (backward compatibility)"""
        self.track_event(event_type, topic)
    
    def get_count(self) -> int:
        """Get the total event count"""
        with self._lock:
            return sum(stats.count for stats in self._event_counts.values())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive stats including individual event types"""
        with self._lock:
            events_by_type = []
            
            # Add tracked events
            for stats in self._event_counts.values():
                events_by_type.append({
                    "eventType": stats.event_type,
                    "topic": stats.topic,
                    "count": stats.count,
                    "lastProcessed": stats.last_processed.isoformat() + "Z" if stats.last_processed else None
                })
            
            
            # Sort by count (descending)
            events_by_type.sort(key=lambda x: x["count"], reverse=True)
            
            # Calculate total count without calling get_count() to avoid deadlock
            total_count = sum(stats.count for stats in self._event_counts.values())
            
            return {
                "service": "service-3",
                "totalEventsProcessed": total_count,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "eventsByType": events_by_type,
            }
    
    def track_event_with_zero_count(self, event_type: str, topic: str) -> None:
        """Pre-register an event with 0 count (for events that have handlers)"""
        key = f"{event_type}@{topic}"
        
        with self._lock:
            if key not in self._event_counts:
                self._event_counts[key] = EventStats(event_type, topic)
                # Keep count at 0, last_processed as None
    
    def reset(self) -> None:
        """Reset all counters to zero"""
        with self._lock:
            self._event_counts.clear()

# Global singleton instance
event_counter = EventCounter()
