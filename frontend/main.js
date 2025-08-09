const btn = document.getElementById('ping');
const out = document.getElementById('output');

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
    'http://localhost:3001/',
    'http://localhost:3002/',
    'http://localhost:3003/'
  ];
  const results = await Promise.all(urls.map(ping));
  const ts = new Date().toLocaleTimeString();
  out.textContent = `[${ts}]\n\n` + results.join('\n\n');
}

btn?.addEventListener('click', pingAll);

// Auto-ping every 5 seconds
pingAll();
setInterval(pingAll, 2000);
