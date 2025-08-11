const kafkaBtns = document.querySelectorAll('.kafka-btn');

// Service configuration
const services = [
  { id: 1, name: 'Service 1', type: 'NestJS', baseUrl: '/api/service-1' },
  { id: 2, name: 'Service 2', type: 'NestJS', baseUrl: '/api/service-2' },
  { id: 3, name: 'Service 3', type: 'FastAPI', baseUrl: '/api/service-3' }
];

// Update service status and metrics
async function updateServiceStatus(service) {
  const statusDot = document.querySelector(`#service-${service.id}-status .status-dot`);
  const statusText = document.querySelector(`#service-${service.id}-status .status-text`);
  const eventsValue = document.getElementById(`service-${service.id}-events`);
  
  try {
    // Check service health
    const healthResponse = await fetch(`${service.baseUrl}/`, { 
      headers: { 'Accept': 'application/json' },
      timeout: 5000 
    });
    
    let eventsProcessed = 0;
    
    // For NestJS and FastAPI services, try to get stats (events processed)
    try {
        const statsResponse = await fetch(`${service.baseUrl}/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          eventsProcessed = statsData.eventsProcessed || 0;
        }
      } catch (e) {
        // Stats endpoint might not exist, that's ok
        console.log(`Stats not available for ${service.name}:`, e.message);
      }
    
    // Update UI based on health check
    if (healthResponse.ok) {
      statusDot.className = 'status-dot ok';
      statusText.textContent = 'OK';
      statusText.className = 'status-text ok';
      eventsValue.textContent = eventsProcessed;
      eventsValue.className = 'metric-value';
    } else {
      throw new Error(`HTTP ${healthResponse.status}`);
    }
    
  } catch (error) {
    // Service is down or unreachable
    statusDot.className = 'status-dot error';
    statusText.textContent = 'KO';
    statusText.className = 'status-text error';
    eventsValue.textContent = 'N/A';
    eventsValue.className = 'metric-value error';
    console.error(`Service ${service.id} error:`, error.message);
  }
}

// Update all services
async function updateAllServices() {
  const lastUpdated = document.getElementById('last-updated');
  
  // Update all services in parallel
  await Promise.all(services.map(updateServiceStatus));
  
  // Update timestamp
  lastUpdated.textContent = new Date().toLocaleTimeString();
}

// Function to trigger Kafka event for a specific service
async function triggerKafkaEvent(serviceNumber) {
  const button = document.querySelector(`[data-service="${serviceNumber}"]`);
  const originalText = button.textContent;
  
  try {
    button.textContent = '⏳ Sending...';
    button.disabled = true;
    
    const response = await fetch(`/api/service-${serviceNumber}/publish-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      button.textContent = '✅ Event Sent!';
      console.log(`Service ${serviceNumber} Kafka event result:`, result);
      
      // Immediately update the service status to reflect the new event count
      const service = services.find(s => s.id == serviceNumber);
      if (service) {
        setTimeout(() => updateServiceStatus(service), 500);
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    button.textContent = '❌ Failed';
    console.error(`Service ${serviceNumber} Kafka event error:`, error);
  } finally {
    // Reset button after 2 seconds
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
}

// Add event listeners to Kafka buttons
kafkaBtns.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const serviceNumber = button.getAttribute('data-service');
    triggerKafkaEvent(serviceNumber);
  });
});

// Initialize dashboard and start auto-refresh
updateAllServices();
setInterval(updateAllServices, 2000);
