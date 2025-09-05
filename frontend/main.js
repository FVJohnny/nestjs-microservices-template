const POLL_MS = 3000;
let services = [];

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function serviceCard(svc) {
  return el(`
    <article class="card" id="svc-${svc.id}">
      <header class="card-head">
        <div class="card-title">
          <div class="name" id="svc-${svc.id}-name">${svc.name ?? `service-${svc.id}`}</div>
          <div class="env" id="svc-${svc.id}-env">env: —</div>
        </div>
        <div class="chip" id="svc-${svc.id}-health">checking…</div>
      </header>
      <section class="stats">
        <div class="kpi">
          <div class="kpi-label">Total Events</div>
          <div class="kpi-value" id="svc-${svc.id}-total">0</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Success</div>
          <div class="kpi-value ok" id="svc-${svc.id}-succ">0</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Errors</div>
          <div class="kpi-value err" id="svc-${svc.id}-err">0</div>
        </div>
      </section>
      <section class="events">
        <div class="events-head">
          <div>Integration Event Handlers</div>
        </div>
        <div class="events-list" id="svc-${svc.id}-events"></div>
      </section>
    </article>
  `);
}

async function discoverServices(max = 10) {
  const grid = document.getElementById('services-grid');
  grid.innerHTML = '';
  services = [];
  for (let i = 1; i <= max; i++) {
    const baseUrl = `/api/service-${i}`;
    try {
      const envRes = await fetch(`${baseUrl}/health/environment`, { headers: { Accept: 'application/json' } });
      if (!envRes.ok) continue;
      const env = await envRes.json().catch(() => ({ environment: 'unknown' }));
      const svc = { id: i, name: `service-${i}`, baseUrl, env: env.environment ?? 'unknown' };
      services.push(svc);
      grid.appendChild(serviceCard(svc));
      
      // Update environment display after card is in DOM
      const envEl = document.getElementById(`svc-${svc.id}-env`);
      if (envEl) envEl.textContent = `env: ${svc.env}`;
    } catch { }
  }
  if (!services.length) {
    grid.appendChild(el('<div class="empty">No services detected. Start a service to see it here.</div>'));
  }
  // Update service counter in header
  const count = document.getElementById('svc-count');
  if (count) count.textContent = String(services.length);
}

async function refreshService(svc) {
  const healthEl = document.getElementById(`svc-${svc.id}-health`);
  const totalEl = document.getElementById(`svc-${svc.id}-total`);
  const succEl = document.getElementById(`svc-${svc.id}-succ`);
  const errEl = document.getElementById(`svc-${svc.id}-err`);
  const listEl = document.getElementById(`svc-${svc.id}-events`);

  try {
    const statsRes = await fetch(`${svc.baseUrl}/integration-events/listener/stats`, { headers: { Accept: 'application/json' } });
    const stats = await statsRes.json().catch(() => ({}));

    healthEl.textContent = 'online';
    healthEl.classList.remove('err');
    healthEl.classList.add('ok');

    const events = Array.isArray(stats.eventsByType) ? stats.eventsByType : [];
    const total = events.reduce((a, e) => a + (e.successCount || 0) + (e.failureCount || 0), 0);
    const succ = events.reduce((a, e) => a + (e.successCount || 0), 0);
    const err = events.reduce((a, e) => a + (e.failureCount || 0), 0);
    totalEl.textContent = total;
    succEl.textContent = succ;
    errEl.textContent = err;

    listEl.innerHTML = events.length
      ? events
        .map((e) => {
          const s = e.successCount || 0;
          const f = e.failureCount || 0;
          const t = s + f || 1;
          const pct = Math.round((s / t) * 100);
          return `
            <div class="evt">
              <div class="evt-main">
                <div>
                  <span class="topic">${e.topic}</span>
                  <span class="name">${e.eventName}</span>
                </div>
                <div class="evt-actions">
                  <div class="evt-stats">
                    <span class="ok">${s}</span>
                    <span class="sep">/</span>
                    <span class="err">${f}</span>
                  </div>
                  <button class="evt-trigger-btn" onclick="triggerEvent(event, '${svc.id}', '${e.topic}', '${e.eventName}')" title="Trigger ${e.eventName}">⚡</button>
                </div>
              </div>
              <div class="bar"><span class="bar-fill" style="width:${pct}%"></span></div>
            </div>`;
        })
        .join('')
      : '<div class="evt empty">No events processed yet</div>';
  } catch (e) {
    healthEl.textContent = 'offline';
    healthEl.classList.remove('ok');
    healthEl.classList.add('err');
    listEl.innerHTML = '<div class="evt empty">Unable to load stats</div>';
  }
}

async function refreshAll() {
  const ts = new Date().toLocaleTimeString();
  document.getElementById('last-updated').textContent = `Last updated ${ts}`;
  await Promise.all(services.map((s) => refreshService(s)));
}

async function triggerEvent(evt, serviceId, topic, eventName) {
  const btn = evt.target;
  const originalText = btn.textContent;

  try {
    btn.textContent = '⏳';
    btn.disabled = true;

    // Find the service to get its baseUrl
    const service = services.find(s => s.id == serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // Create a test payload for the event
    const payload = {
      topic,
      message: {
        name: eventName,
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        triggeredBy: 'frontend-dashboard',
        testData: `Test event for ${eventName}`
      }
    };

    // Try to publish via the service's messaging endpoint
    const response = await fetch(`${service.baseUrl}/integration-events/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      btn.textContent = '✅';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);

      // Refresh the service stats after a short delay
      setTimeout(() => refreshService(service), 1000);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

  } catch (error) {
    console.error('Failed to trigger event:', error);
    btn.textContent = '❌';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

async function init() {
  await discoverServices(10);
  await refreshAll();
  setInterval(refreshAll, POLL_MS);
  document.getElementById('refresh-now').addEventListener('click', refreshAll);
}

init();
