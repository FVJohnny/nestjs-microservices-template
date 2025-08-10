const btn = document.getElementById('ping');
const out = document.getElementById('output');
const kafkaBtns = document.querySelectorAll('.kafka-btn');

async function ping(url){
  try{
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    return `${url} → ${res.status}\n${text.slice(0, 300)}${text.length>300?'…':''}`;
  }catch(e){
    return `${url} → ERROR: ${e.message}`;
  }
}

async function pingAll(){
  out.textContent = 'Pinging...';
  const urls = [
    '/api/service-1/',
    '/api/service-2/',
    '/api/service-3/'
  ];
  const results = await Promise.all(urls.map(ping));
  const ts = new Date().toLocaleTimeString();
  out.textContent = `[${ts}]\n\n` + results.join('\n\n');
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
      
      // Show success in output area
      const timestamp = new Date().toLocaleTimeString();
      out.textContent = `[${timestamp}] Service ${serviceNumber}: Kafka event published successfully!\n\n${out.textContent}`;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    button.textContent = '❌ Failed';
    console.error(`Service ${serviceNumber} Kafka event error:`, error);
    
    // Show error in output area
    const timestamp = new Date().toLocaleTimeString();
    out.textContent = `[${timestamp}] Service ${serviceNumber}: Kafka event failed - ${error.message}\n\n${out.textContent}`;
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

btn?.addEventListener('click', pingAll);

// Auto-ping every 5 seconds
pingAll();
setInterval(pingAll, 2000);
