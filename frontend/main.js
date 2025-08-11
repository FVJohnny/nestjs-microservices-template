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
    // Use kafka stats endpoint to check both health and get event count in one request
    const statsResponse = await fetch(`${service.baseUrl}/kafka/stats`, { 
      headers: { 'Accept': 'application/json' },
      timeout: 5000 
    });
    
    if (statsResponse.ok) {
      // Service is healthy and stats are available
      const statsData = await statsResponse.json();
      const eventsProcessed = statsData.eventsProcessed || 0;
      
      statusDot.className = 'status-dot ok';
      statusText.textContent = 'OK';
      statusText.className = 'status-text ok';
      eventsValue.textContent = eventsProcessed;
      eventsValue.className = 'metric-value';
    } else {
      throw new Error(`HTTP ${statsResponse.status}`);
    }
    
  } catch (error) {
    // Service is down, unreachable, or stats endpoint doesn't exist
    statusDot.className = 'status-dot error';
    statusText.textContent = 'KO';
    statusText.className = 'status-text error';
    eventsValue.textContent = 'N/A';
    eventsValue.className = 'metric-value error';
    console.error(`Service ${service.id} error:`, error.message);
  }
}

// Update service status with independent polling cycle
async function updateServiceStatusWithPolling(service) {
  const delayAfterResponse = 3000; // 3 seconds delay after each response
  
  const poll = async () => {
    await updateServiceStatus(service);
    // Wait X seconds after the response, then poll again
    setTimeout(poll, delayAfterResponse);
  };
  
  // Start the polling cycle for this service
  poll();
}

// Start independent polling for all services
function startServicePolling() {
  const lastUpdated = document.getElementById('last-updated');
  
  // Start independent polling cycles for each service
  services.forEach(service => {
    updateServiceStatusWithPolling(service);
  });
  
  // Update timestamp every 5 seconds
  setInterval(() => {
    lastUpdated.textContent = new Date().toLocaleTimeString();
  }, 5000);
}

// Legacy function for manual updates (if needed)
async function updateAllServices() {
  const lastUpdated = document.getElementById('last-updated');
  
  // Update all services in parallel (one-time update)
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
    
    const response = await fetch(`/api/service-${serviceNumber}/kafka/publish-event?topic=example-topic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test.event',
        userId: 'test-user',
        timestamp: new Date().toISOString(),
        data: { source: 'frontend-test' }
      })
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

// Initialize dashboard with independent polling for each service
startServicePolling();
