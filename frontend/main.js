const kafkaBtns = document.querySelectorAll('.kafka-btn');

// Service configuration
const services = [
  { id: 1, name: 'Service 1', type: 'NestJS', baseUrl: '/api/service-1' },
  { id: 3, name: 'Service 3', type: 'FastAPI', baseUrl: '/api/service-3' }
];

// Update service status and metrics using consumer stats endpoints
async function updateServiceStatus(service) {
  const statusDot = document.querySelector(`#service-${service.id}-status .status-dot`);
  const statusText = document.querySelector(`#service-${service.id}-status .status-text`);
  const eventsValue = document.getElementById(`service-${service.id}-events`);
  const detailsContainer = document.getElementById(`service-${service.id}-details`);
  
  try {
    // Use consumer-stats endpoint for detailed metrics
    const statsResponse = await fetch(`${service.baseUrl}/kafka/consumer-stats`, { 
      headers: { 'Accept': 'application/json' },
      timeout: 5000 
    });
    
    if (statsResponse.ok) {
      // Service is healthy and detailed stats are available
      const statsData = await statsResponse.json();
      const totalMessages = statsData.totalMessages || 0;
      
      statusDot.className = 'status-dot ok';
      statusText.textContent = 'OK';
      statusText.className = 'status-text ok';
      eventsValue.textContent = totalMessages;
      eventsValue.className = 'metric-value';
      
      // Update detailed breakdown
      updateEventDetails(statsData, detailsContainer);
      
      // Store additional metrics for potential future display
      service.lastStats = statsData;
    } else {
      throw new Error(`HTTP ${statsResponse.status}`);
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

// Function to update detailed event breakdown
function updateEventDetails(statsData, container) {
  if (!statsData.handlers || statsData.handlers.length === 0) {
    container.innerHTML = '<div class="no-events">No events processed yet</div>';
    return;
  }

  const breakdown = document.createElement('div');
  breakdown.className = 'topics-breakdown';
  
  // Add summary info
  const summary = document.createElement('div');
  summary.className = 'summary-info';
  summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Consumer:</span>
      <span class="summary-value">${statsData.consumerId}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Success Rate:</span>
      <span class="summary-value">${statsData.totalMessages > 0 ? Math.round((statsData.totalSuccesses / statsData.totalMessages) * 100) : 0}%</span>
    </div>
  `;
  breakdown.appendChild(summary);

  // Add topic details
  const topicsContainer = document.createElement('div');
  topicsContainer.className = 'topics-container';
  
  statsData.handlers.forEach(handler => {
    const topicElement = document.createElement('div');
    topicElement.className = 'topic-item';
    
    const avgTime = handler.averageProcessingTime > 0 ? `${Math.round(handler.averageProcessingTime)}ms` : '-';
    const lastProcessed = handler.lastProcessedAt ? new Date(handler.lastProcessedAt).toLocaleTimeString() : 'Never';
    
    topicElement.innerHTML = `
      <div class="topic-header">
        <span class="topic-name">${handler.topic}</span>
        <span class="topic-count">${handler.messagesProcessed}</span>
      </div>
      <div class="topic-details">
        <div class="topic-stat">
          <span class="stat-label">Handler:</span>
          <span class="stat-value">${handler.handlerName}</span>
        </div>
        <div class="topic-stat">
          <span class="stat-label">Success:</span>
          <span class="stat-value">${handler.messagesSucceeded}</span>
        </div>
        <div class="topic-stat">
          <span class="stat-label">Failed:</span>
          <span class="stat-value">${handler.messagesFailed}</span>
        </div>
        <div class="topic-stat">
          <span class="stat-label">Avg Time:</span>
          <span class="stat-value">${avgTime}</span>
        </div>
        <div class="topic-stat">
          <span class="stat-label">Last Processed:</span>
          <span class="stat-value">${lastProcessed}</span>
        </div>
      </div>
    `;
    
    topicsContainer.appendChild(topicElement);
  });
  
  breakdown.appendChild(topicsContainer);
  container.querySelector('.topics-breakdown').replaceWith(breakdown);
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

// Function to trigger Kafka event for a specific service using test endpoints
async function triggerKafkaEvent(serviceNumber) {
  const button = document.querySelector(`[data-service="${serviceNumber}"]`);
  const originalText = button.textContent;
  
  try {
    button.textContent = '⏳ Sending...';
    button.disabled = true;
    
    // Use service-specific test endpoints
    let endpoint, payload;
    
    switch(serviceNumber) {
      case '1':
        // Service 1: Use centralized Kafka endpoint
        endpoint = `/api/service-1/kafka/publish-event?topic=trading-signals`;
        payload = {
          channelType: "telegram",
          name: "nombresito",
          userId: "usuariooo",
          connectionConfig: {}
        }
        break;
      case '3':
        // Service 3: Do nothing for now
        button.textContent = '⚠️ Disabled';
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 2000);
        return;
      default:
        throw new Error(`Unknown service number: ${serviceNumber}`);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      button.textContent = '✅ Event Sent!';
      console.log(`Service ${serviceNumber} test event result:`, result);
      
      // Immediately update the service status to reflect the new event count
      const service = services.find(s => s.id == serviceNumber);
      if (service) {
        setTimeout(() => updateServiceStatus(service), 1000);
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    button.textContent = '❌ Failed';
    console.error(`Service ${serviceNumber} test event error:`, error);
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
