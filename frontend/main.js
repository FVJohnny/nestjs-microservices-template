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
      <section class="events">
        <div class="events-head">
          <div>Service Events</div>
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
      const envRes = await fetch(`${baseUrl}/health/environment`, {
        headers: { Accept: 'application/json' },
      });
      if (!envRes.ok) continue;
      const env = await envRes.json().catch(() => ({ environment: 'unknown' }));
      const svc = { id: i, name: `service-${i}`, baseUrl, env: env.environment ?? 'unknown' };
      services.push(svc);
      grid.appendChild(serviceCard(svc));

      // Update environment display after card is in DOM
      const envEl = document.getElementById(`svc-${svc.id}-env`);
      if (envEl) envEl.textContent = `env: ${svc.env}`;
    } catch {}
  }
  if (!services.length) {
    grid.appendChild(
      el('<div class="empty">No services detected. Start a service to see it here.</div>'),
    );
  }
  // Update service counter in header
  const count = document.getElementById('svc-count');
  if (count) count.textContent = String(services.length);
}

async function refreshService(svc) {
  const healthEl = document.getElementById(`svc-${svc.id}-health`);
  const listEl = document.getElementById(`svc-${svc.id}-events`);

  try {
    const statsRes = await fetch(`${svc.baseUrl}/event-tracker/stats`, {
      headers: { Accept: 'application/json' },
    });
    const stats = await statsRes.json().catch(() => ({}));

    healthEl.textContent = 'online';
    healthEl.classList.remove('err');
    healthEl.classList.add('ok');

    const events = Array.isArray(stats.eventsByType) ? stats.eventsByType : [];

    if (!events.length) {
      listEl.innerHTML = '<div class="evt empty">No events processed yet</div>';
      return;
    }

    // Group events by topic
    const eventsByTopic = {};
    events.forEach((e) => {
      if (!eventsByTopic[e.topic]) {
        eventsByTopic[e.topic] = [];
      }
      eventsByTopic[e.topic].push(e);
    });

    // Generate HTML for grouped events
    listEl.innerHTML = Object.entries(eventsByTopic)
      .map(([topic, topicEvents]) => {
        const totalSuccess = topicEvents.reduce((sum, e) => sum + (e.successCount || 0), 0);
        const totalFailure = topicEvents.reduce((sum, e) => sum + (e.failureCount || 0), 0);
        const totalCount = totalSuccess + totalFailure || 1;
        const topicPct = Math.round((totalSuccess / totalCount) * 100);

        return `
          <div class="topic-group">
            <div class="topic-header">
              <div class="topic-info">
                <span class="topic-badge">${topic}</span>
                <span class="topic-count">${topicEvents.length} event${topicEvents.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="topic-stats">
                <span class="ok">${totalSuccess}</span>
                <span class="sep">/</span>
                <span class="err">${totalFailure}</span>
              </div>
            </div>
            <div class="topic-progress">
              <div class="bar"><span class="bar-fill" style="width:${topicPct}%"></span></div>
            </div>
            <div class="topic-events">
              ${topicEvents
                .map((e) => {
                  const s = e.successCount || 0;
                  const f = e.failureCount || 0;
                  const t = s + f || 1;
                  const pct = Math.round((s / t) * 100);
                  // Only show trigger button for non-domain events
                  const showTrigger = topic.toLowerCase() !== 'domain events';
                  return `
                  <div class="evt">
                    <div class="evt-main">
                      <div class="evt-name-wrapper">
                        <span class="name">${e.eventName}</span>
                      </div>
                      <div class="evt-actions">
                        <div class="evt-stats">
                          <span class="ok">${s}</span>
                          <span class="sep">/</span>
                          <span class="err">${f}</span>
                        </div>
                        ${showTrigger ? `<button class="evt-trigger-btn" onclick="triggerEvent(event, '${svc.id}', '${e.topic}', '${e.eventName}')" title="Trigger ${e.eventName}">⚡</button>` : ''}
                      </div>
                    </div>
                    <div class="bar"><span class="bar-fill" style="width:${pct}%"></span></div>
                  </div>`;
                })
                .join('')}
            </div>
          </div>`;
      })
      .join('');
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
    const service = services.find((s) => s.id == serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // Create a test payload for the event
    const payload = {
      topic,
      message: {
        name: eventName,
        timestamp: new Date().toISOString(),
        triggeredBy: 'frontend-dashboard',
        testData: `Test event for ${eventName}`,
      },
    };

    // Try to publish via the service's messaging endpoint
    const response = await fetch(`${service.baseUrl}/integration-events/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
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
