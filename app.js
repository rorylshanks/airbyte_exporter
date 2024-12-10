const http = require('http');
const { Gauge, register } = require('prom-client');

const AIRBYTE_URL = process.env.AIRBYTE_URL || 'http://localhost:8000';
const CLIENT_ID = process.env.CLIENT_ID || 'your_client_id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'your_client_secret';
const PORT = process.env.PORT || 3000;

const connectionStatusGauge = new Gauge({
  name: 'airbyte_connection_status',
  help: 'Status of last job for a connection (1=success,0=fail)',
  labelNames: ['connection_id', 'name']
});

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function getAccessToken() {
  log(`Requesting access token from ${AIRBYTE_URL}/api/public/v1/applications/token`);
  const res = await fetch(`${AIRBYTE_URL}/api/public/v1/applications/token`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const data = await res.json();
  log('Received access token');
  return data.access_token;
}

async function listConnections(token) {
  log('Listing connections');
  const res = await fetch(`${AIRBYTE_URL}/api/public/v1/connections`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  log(`Found ${data.data ? data.data.length : 0} connections`);
  return data.data || [];
}

async function getLastJobStatus(token, connectionId) {
  log(`Fetching last job status for connection ${connectionId}`);
  const res = await fetch(`${AIRBYTE_URL}/api/public/v1/jobs?connectionId=${connectionId}&orderBy=createdAt%7CDESC&limit=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const status = data.data && data.data.length > 0 ? data.data[0].status : null;
  log(`Connection ${connectionId} last job status: ${status}`);
  return status;
}

http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    try {
      log('Metrics endpoint hit');
      const token = await getAccessToken();
      const connections = await listConnections(token);
      for (const c of connections) {
        const status = await getLastJobStatus(token, c.connectionId);
        const val = status === 'succeeded' ? 1 : status === 'failed' ? 0 : 0;
        connectionStatusGauge.set({connection_id: c.connectionId, name: c.name}, val);
      }
      log('Returning metrics');
      res.writeHead(200, {'Content-Type': register.contentType});
      res.end(await register.metrics());
    } catch (e) {
      log(`Error: ${e}`);
      res.writeHead(500);
      res.end('Error\n');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found\n');
  }
}).listen(PORT, () => {
  log(`Listening on port ${PORT}`);
});
