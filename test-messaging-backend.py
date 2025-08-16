#!/usr/bin/env python3
"""
Simple script to test messaging backend switching for Service-3
"""
import os
import sys

def test_messaging_backend():
    """Test which messaging backend would be selected"""
    
    # Test different MESSAGING_BACKEND values
    test_cases = [
        ("kafka", "Kafka"),
        ("redis", "Redis"), 
        ("REDIS", "Redis"),
        ("KAFKA", "Kafka"),
        ("invalid", "Kafka"),  # Should default to Kafka
        (None, "Kafka")        # Should default to Kafka
    ]
    
    print("🧪 Testing Messaging Backend Selection")
    print("=" * 50)
    
    for env_value, expected in test_cases:
        # Set environment variable
        if env_value is not None:
            os.environ['MESSAGING_BACKEND'] = env_value
        else:
            os.environ.pop('MESSAGING_BACKEND', None)
        
        # Import messaging service (this reads the env var)
        sys.path.append('backend/services/service-3')
        try:
            import importlib
            if 'messaging_service' in sys.modules:
                importlib.reload(sys.modules['messaging_service'])
            from messaging_service import MessagingServiceManager
            
            manager = MessagingServiceManager()
            actual = manager.get_backend_type()
            
            status = "✅" if actual == expected else "❌"
            print(f"{status} MESSAGING_BACKEND='{env_value}' → {actual} (expected: {expected})")
            
        except ImportError as e:
            print(f"⚠️  Could not import messaging service: {e}")
            print("   (This is normal if you're not in the service-3 directory)")
            break
        except Exception as e:
            print(f"❌ Error testing backend '{env_value}': {e}")
    
    print("\n📋 Configuration Summary:")
    print("• Set MESSAGING_BACKEND=kafka for Kafka pub/sub")
    print("• Set MESSAGING_BACKEND=redis for Redis pub/sub") 
    print("• Default is kafka if not specified or invalid value")
    print("\n💡 Update your infra/docker/.env file to switch backends")

if __name__ == "__main__":
    test_messaging_backend()