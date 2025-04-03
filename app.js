const http = require('http');
const { Gauge, Registry } = require('prom-client');

const AIRBYTE_URL = process.env.AIRBYTE_URL || 'http://localhost:8000';
const CLIENT_ID = process.env.CLIENT_ID || 'your_client_id';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'your_client_secret';
const PORT = process.env.PORT || 3000;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// Helper to convert ISO 8601 duration string (e.g., "PT1H27M37S") into seconds
function convertDurationToSeconds(durationStr) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function getAccessToken() {
  log(`Requesting access token from ${AIRBYTE_URL}/api/public/v1/applications/token`);
  const res = await fetch(`${AIRBYTE_URL}/api/public/v1/applications/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

// Single API call to retrieve job metrics for a connection
async function getJobMetrics(token, connectionId) {
  log(`Fetching jobs for connection ${connectionId}`);
  // Fetch up to 10 recent jobs
  const res = await fetch(`${AIRBYTE_URL}/api/public/v1/jobs?connectionId=${connectionId}&orderBy=createdAt%7CDESC&limit=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!data.data || data.data.length === 0) {
    log(`No jobs found for connection ${connectionId}`);
    return { status: null, lastSuccessDate: null, duration: null, bytesSynced: null, rowsSynced: null };
  }

  const jobs = data.data;
  const latestJobStatus = jobs[0].status;
  let lastSuccessJob = null;
  for (const job of jobs) {
    if (job.status === 'succeeded') {
      lastSuccessJob = job;
      break;
    }
  }
  log(`Connection ${connectionId}: last job status: ${latestJobStatus}, last success update: ${lastSuccessJob ? lastSuccessJob.lastUpdatedAt : null}`);
  return {
    status: latestJobStatus,
    lastSuccessDate: lastSuccessJob ? lastSuccessJob.lastUpdatedAt : null,
    duration: lastSuccessJob ? lastSuccessJob.duration : null,
    bytesSynced: lastSuccessJob ? lastSuccessJob.bytesSynced : null,
    rowsSynced: lastSuccessJob ? lastSuccessJob.rowsSynced : null
  };
}

http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    try {
      log('Metrics endpoint hit');

      // Create a new registry for this request
      const registry = new Registry();

      // Create gauges using the new registry and include the desired labels
      const lastSyncResultGauge = new Gauge({
        name: 'airbyte_last_sync_result',
        help: 'Last sync result for a connection (1=success, 0=fail)',
        labelNames: ['connection_id', 'name', 'connection_status'],
        registers: [registry]
      });
      const lastSuccessDateGauge = new Gauge({
        name: 'airbyte_last_success_date',
        help: 'Timestamp (in seconds) of the last successful job update for a connection',
        labelNames: ['connection_id', 'name', 'connection_status'],
        registers: [registry]
      });
      const lastSyncDurationGauge = new Gauge({
        name: 'airbyte_last_sync_duration',
        help: 'Duration (in seconds) of the last successful sync for a connection',
        labelNames: ['connection_id', 'name', 'connection_status'],
        registers: [registry]
      });
      const lastSyncBytesSyncedGauge = new Gauge({
        name: 'airbyte_last_sync_bytes_synced',
        help: 'Number of bytes synced in the last successful sync for a connection',
        labelNames: ['connection_id', 'name', 'connection_status'],
        registers: [registry]
      });
      const lastSyncRowsSyncedGauge = new Gauge({
        name: 'airbyte_last_sync_rows_synced',
        help: 'Number of rows synced in the last successful sync for a connection',
        labelNames: ['connection_id', 'name', 'connection_status'],
        registers: [registry]
      });

      const token = await getAccessToken();
      const connections = await listConnections(token);
      for (const c of connections) {
        const { status, lastSuccessDate, duration, bytesSynced, rowsSynced } = await getJobMetrics(token, c.connectionId);
        const syncResult = status === 'succeeded' ? 1 : status === 'failed' ? 0 : 0;
        const labels = {
          connection_id: c.connectionId,
          name: c.name,
          connection_status: c.status // "active" or "inactive"
        };
        lastSyncResultGauge.set(labels, syncResult);

        if (lastSuccessDate) {
          const timestamp = Date.parse(lastSuccessDate) / 1000;
          lastSuccessDateGauge.set(labels, timestamp);
        } else {
          lastSuccessDateGauge.set(labels, 0);
        }

        if (duration) {
          const seconds = convertDurationToSeconds(duration);
          lastSyncDurationGauge.set(labels, seconds);
        } else {
          lastSyncDurationGauge.set(labels, 0);
        }

        lastSyncBytesSyncedGauge.set(labels, bytesSynced || 0);
        lastSyncRowsSyncedGauge.set(labels, rowsSynced || 0);
      }
      log('Returning metrics');

      res.writeHead(200, { 'Content-Type': registry.contentType });
      res.end(await registry.metrics());
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
