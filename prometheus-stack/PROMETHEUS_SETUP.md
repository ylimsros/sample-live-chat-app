# Prometheus Metrics Setup - Quick Start

## What Was Changed

### 1. **server.ts** - Added Prometheus Metrics
- Imported `prom-client` library
- Created 3 counters:
  - `chat_connections_total` - Incremented on each new connection
  - `chat_disconnections_total` - Incremented on each disconnection
  - `chat_messages_sent_total` - Incremented on each message sent
- Added `/metrics` endpoint that Prometheus can scrape

### 2. **package.json** - Added Dependency
- Added `prom-client` ^15.1.0 to dependencies

### 3. **prometheus-stack/prometheus/prometheus.yml** - Updated Config
- Added chat-application scrape job pointing to `host.docker.internal:3002`

## Quick Setup Instructions

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Chat Application
```bash
npm run dev
# or
npm start
```

The application will start on `http://localhost:3002` and expose metrics at `http://localhost:3002/metrics`

### Step 3: Test Metrics Endpoint
```bash
curl http://localhost:3002/metrics
```

You should see output like:
```
# HELP chat_connections_total Total number of user connections
# TYPE chat_connections_total counter
chat_connections_total 0

# HELP chat_disconnections_total Total number of user disconnections
# TYPE chat_disconnections_total counter
chat_disconnections_total 0

# HELP chat_messages_sent_total Total number of messages sent
# TYPE chat_messages_sent_total counter
chat_messages_sent_total 0
```

### Step 4: Start Prometheus & Grafana
```bash
cd prometheus-stack
docker-compose up -d
```

### Step 5: Access Services
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Chat App**: http://localhost:3002

### Step 6: Verify Prometheus Scraping
1. Go to http://localhost:9090/targets
2. Check that "chat-application" job shows "UP" status
3. If it shows "DOWN", check your network configuration (see PROMETHEUS_GRAFANA_GUIDE.md)

### Step 7: Create Grafana Dashboard
Follow the detailed guide in [PROMETHEUS_GRAFANA_GUIDE.md](PROMETHEUS_GRAFANA_GUIDE.md) for:
- Adding Prometheus as a data source in Grafana
- Creating dashboard panels with the provided PromQL queries
- Visualizing connections, disconnections, and message activity

## Metrics You Can Track

| Metric | Query | Use Case |
|--------|-------|----------|
| Total Connections | `chat_connections_total` | Monitor total user engagement |
| Total Disconnections | `chat_disconnections_total` | Track session completions |
| Total Messages | `chat_messages_sent_total` | Measure chat activity |
| Connection Rate | `rate(chat_connections_total[5m])` | Real-time connection frequency |
| Message Rate | `rate(chat_messages_sent_total[5m])` | Real-time message frequency |
| Active Users | `chat_connections_total - chat_disconnections_total` | Estimated current users |

## Troubleshooting

### Prometheus can't reach the application
- Check if app is running: `curl http://localhost:3002`
- If running in Docker, you might need to use `localhost:3002` instead of `host.docker.internal:3002`
- Check prometheus.yml configuration

### Grafana doesn't show data
- Verify Prometheus data source is configured correctly
- Check that time range is not set to a period before metrics were collected
- Try a query like `up` in Grafana to test the connection

### Application won't start
- Make sure `prom-client` is installed: `npm install`
- Check for port conflicts (3002 might be in use)
- Review server.ts for any import errors

## Next Steps

1. Create custom dashboards in Grafana with the metrics
2. Set up alerting rules for thresholds (high connections, low activity, etc.)
3. Add more metrics to track (e.g., message latency, user retention)
4. Integrate with your deployment pipeline to monitor production metrics
