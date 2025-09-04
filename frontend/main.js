const kafkaBtns = document.querySelectorAll('.kafka-btn');

// Service configuration - dynamically detect services
const services = [];

// Auto-detect services by checking their health endpoints
async function discoverServices() {
  const maxServices = 10; // Check up to service-10
  
  for (let i = 1; i <= maxServices; i++) {
    try {
      const response = await fetch(`/api/service-${i}/health`, { 
        method: 'GET',
        timeout: 1000
      });
      
      if (response.ok) {
        services.push({
          id: i,
          name: `Service ${i}`,
          type: 'NestJS',
          baseUrl: `/api/service-${i}`
        });
        
        // Create HTML elements for this service
        createServiceCard(i);
      }
    } catch (error) {
      // Service doesn't exist or is not responding, skip it
      continue;
    }
  }
  
  if (services.length === 0) {
    document.querySelector('.services-grid').innerHTML = '<div class="no-services">No services detected. Make sure at least one service is running.</div>';
  }
}

// Create service card HTML dynamically
function createServiceCard(serviceId) {
  const servicesGrid = document.querySelector('.services-grid');
  
  const cardHTML = `
    <div class="service-card" id="service-${serviceId}-card">
      <div class="service-header">
        <h3>Service ${serviceId}</h3>
        <span class="service-type">NestJS</span>
      </div>
      <div class="service-status">
        <div class="status-indicator" id="service-${serviceId}-status">
          <span class="status-dot"></span>
          <span class="status-text">Checking...</span>
        </div>
      </div>
      <div class="service-metrics">
        <div class="metric-details" id="service-${serviceId}-details">
          <div class="topics-breakdown">
            <!-- Topic details will be populated by JavaScript -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  servicesGrid.insertAdjacentHTML('beforeend', cardHTML);
}

// Update service status and metrics using generic messaging endpoints
async function updateServiceStatus(service) {
  const statusDot = document.querySelector(`#service-${service.id}-status .status-dot`);
  const statusText = document.querySelector(`#service-${service.id}-status .status-text`);
  const detailsContainer = document.getElementById(`service-${service.id}-details`);
  
  try {
    // Fetch both stats and environment data in parallel
    const [statsResponse, envResponse] = await Promise.all([
      fetch(`${service.baseUrl}/integration-events/listener/stats`, { 
        headers: { 'Accept': 'application/json' },
        timeout: 5000 
      }),
      fetch(`${service.baseUrl}/health/environment`, {
        headers: { 'Accept': 'application/json' },
        timeout: 5000
      })
    ]);
    
    if (statsResponse.ok) {
      // Service is healthy and detailed stats are available
      const statsData = await statsResponse.json();
      
      // Get environment data if available
      let envData = null;
      if (envResponse.ok) {
        envData = await envResponse.json();
      }
      
      statusDot.className = 'status-dot ok';
      statusText.textContent = 'OK';
      statusText.className = 'status-text ok';
      
      // Update detailed breakdown with environment info
      updateEventDetails(statsData, detailsContainer, envData);
      
      // Store additional metrics for potential future display
      service.lastStats = statsData;
      service.lastEnv = envData;
    } else {
      throw new Error(`HTTP ${statsResponse.status}`);
    }
    
  } catch (error) {
    // Service is down or unreachable
    statusDot.className = 'status-dot error';
    statusText.textContent = 'KO';
    statusText.className = 'status-text error';
    console.error(`Service ${service.id} error:`, error.message);
  }
}

// Function to update detailed event breakdown
function updateEventDetails(statsData, container, envData = null) {
  console.log('updateEventDetails called:', {
    hasEventsByType: !!(statsData.eventsByType && statsData.eventsByType.length > 0),
    hasHandlers: !!(statsData.handlers && statsData.handlers.length > 0),
    handlers: statsData.handlers,
    container: container.id
  });
  
  // Handle both new structure (with eventsByType) and legacy structure (with handlers)
  const hasNewEvents = statsData.eventsByType && statsData.eventsByType.length > 0;
  const hasHandlers = statsData.handlers && statsData.handlers.length > 0;
  
  // Show UI if we have new event tracking, or if we have handlers (even with 0 messages)
  const hasEvents = hasNewEvents || hasHandlers;
  
  if (!hasEvents) {
    container.innerHTML = '<div class="no-events">No integration event handlers configured</div>';
    return;
  }

  const breakdown = document.createElement('div');
  breakdown.className = 'topics-breakdown';
  
  // Add summary info
  const summary = document.createElement('div');
  summary.className = 'summary-info';
  
  // Determine backend type and CSS class
  const backend = statsData.backend || 'Unknown';
  const backendClass = backend.toLowerCase().includes('redis') ? 'backend-redis' : 
                      backend.toLowerCase().includes('kafka') ? 'backend-kafka' : 'backend-unknown';
  
  // Determine environment class
  const environment = envData?.environment || 'unknown';
  const envClass = environment === 'production' ? 'env-production' : 'env-development';
  
  // Get topics info - support both new and legacy structure
  let topicsInfo = 'None';
  if (statsData.topicSummary) {
    topicsInfo = Object.keys(statsData.topicSummary).join(', ');
  } else if (statsData.subscribedTopics) {
    topicsInfo = statsData.subscribedTopics.join(', ');
  }
  
  // Total events from new or legacy structure
  const totalEvents = statsData.totalEventsProcessed || 
                     (statsData.totalStats?.totalMessages) || 
                     (statsData.eventsProcessed) || 0;
  
  summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Service:</span>
      <span class="summary-value">${statsData.service || 'Unknown'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Total Events:</span>
      <span class="summary-value">${totalEvents}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Environment:</span>
      <span class="summary-value environment-type ${envClass}">${environment}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Backend:</span>
      <span class="summary-value backend-type ${backendClass}">${backend}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Listening:</span>
      <span class="summary-value">${statsData.listening !== false ? '✅ Yes' : '❌ No'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Topics:</span>
      <span class="summary-value" style="font-size: 0.8rem;">${topicsInfo}</span>
    </div>
  `;
  breakdown.appendChild(summary);

  // Add event details - support both new and legacy structures
  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'events-container';
  
  if (statsData.eventsByType) {
    // New structure: individual events tracking
    const eventsHeader = document.createElement('div');
    eventsHeader.innerHTML = '<h4 style="margin: 1rem 0 0.5rem 0; color: var(--text-primary);">Integration Event Handlers</h4>';
    eventsContainer.appendChild(eventsHeader);
    
    statsData.eventsByType.forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.className = 'event-item';
      
      
      const lastProcessed = event.lastProcessed ? new Date(event.lastProcessed).toLocaleTimeString() : 'Never';
      
      eventElement.innerHTML = `
        <div class="event-header">
          <div class="event-name-topic">
            <span class="event-name" title="${event.eventName}">${event.eventName}</span>
            <span class="event-topic" style="color: var(--text-muted); font-size: 0.7rem;">@ ${event.topic}</span>
          </div>
          <div class="event-actions">
            <span class="event-count">${event.successCount}</span>
            <span class="event-count-error">${event.failureCount}</span>
            <button class="trigger-event-btn" data-topic="${event.topic}" data-event="${event.eventName}" data-service-id="${statsData.service}">
              🚀 Trigger
            </button>
          </div>
        </div>
        ${event.lastProcessed ? `
          <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 0.3rem; text-align: right;">
            Last: ${lastProcessed}
          </div>
        ` : ''}
      `;
      
      eventsContainer.appendChild(eventElement);
    });
    
  } else if (statsData.handlers) {
    // Legacy structure: handler-based tracking
    statsData.handlers.forEach(handler => {
      const topicElement = document.createElement('div');
      topicElement.className = 'topic-item';
      
      const lastProcessed = handler.lastProcessedAt ? new Date(handler.lastProcessedAt).toLocaleTimeString() : 'Never';
      
      topicElement.innerHTML = `
        <div class="topic-header">
          <span class="topic-name">${handler.topic}</span>
          <span class="topic-count">${handler.messagesProcessed}</span>
        </div>
        <div class="handler-name" style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.4rem; font-style: italic;">
          ${handler.handlerName}
        </div>
        <div class="topic-details">
          <div class="topic-stat">
            <span class="stat-label">✓ Success</span>
            <span class="stat-value">${handler.messagesSucceeded}</span>
          </div>
          <div class="topic-stat">
            <span class="stat-label">✗ Failed</span>
            <span class="stat-value">${handler.messagesFailed}</span>
          </div>
          <div class="topic-stat">
            <span class="stat-label">⚡ Avg</span>
            <span class="stat-value">${handler.averageProcessingTime}ms</span>
          </div>
        </div>
        ${handler.lastProcessedAt ? `
          <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 0.3rem; text-align: right;">
            Last: ${lastProcessed}
          </div>
        ` : ''}
      `;
      
      eventsContainer.appendChild(topicElement);
    });
  }
  
  breakdown.appendChild(eventsContainer);
  
  // Replace existing content or create new if none exists
  const existingBreakdown = container.querySelector('.topics-breakdown');
  if (existingBreakdown) {
    existingBreakdown.replaceWith(breakdown);
  } else {
    container.appendChild(breakdown);
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

// Function to trigger a specific event for a specific topic and event type
async function triggerSpecificEvent(topic, name, serviceId, buttonElement) {
  const button = buttonElement;
  const originalText = button.textContent;
  
  try {
    button.textContent = '⏳ Sending...';
    button.disabled = true;
    
    // Extract service number from service ID string
    const match = serviceId.match(/service-(\d+)/i);
    const serviceNum = match ? match[1] : null;
    
    if (!serviceNum) {
      throw new Error(`Unable to determine service number from: ${serviceId}`);
    }
    
    const endpoint = `/api/service-${serviceNum}/integration-events/publish`;
    
    const payload = {
      topic: topic,
      message: {
        name: name,
      }
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      button.textContent = '✅ Sent!';
      console.log(`Event ${name} on topic ${topic} sent successfully:`, result);
      
      // Update service status to reflect the new event count
      const service = services.find(s => s.id == serviceNum);
      if (service) {
        setTimeout(() => updateServiceStatus(service), 1000);
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    button.textContent = '❌ Failed';
    console.error(`Failed to trigger event ${name} on topic ${topic}:`, error);
  } finally {
    // Reset button after 2 seconds
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
}

// Function to trigger messaging event for a specific service using generic endpoints
async function triggerKafkaEvent(serviceNumber) {
  const button = document.querySelector(`[data-service="${serviceNumber}"]`);
  const originalText = button.textContent;
  
  try {
    button.textContent = '⏳ Sending...';
    button.disabled = true;
    
    // Use generic messaging endpoint for any service
    const endpoint = `/api/service-${serviceNumber}/integration-events/publish`;
    const payload = {
      topic: "users",
      message: {
        name: "user.example",
      }
    };
    
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

// Add event listeners to individual trigger event buttons (using event delegation)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('trigger-event-btn')) {
    e.preventDefault();
    const topic = e.target.getAttribute('data-topic');
    const name = e.target.getAttribute('data-event');
    const serviceId = e.target.getAttribute('data-service-id');
    triggerSpecificEvent(topic, name, serviceId, e.target);
  }
});

// Initialize dashboard
async function initializeDashboard() {
  // First discover available services
  await discoverServices();
  
  // Then start polling for discovered services
  if (services.length > 0) {
    startServicePolling();
  }
}

// Initialize dashboard with service discovery
initializeDashboard();