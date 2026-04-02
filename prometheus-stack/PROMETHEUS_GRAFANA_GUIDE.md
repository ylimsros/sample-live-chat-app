# Viewing Chat Application Metrics in Grafana

This guide explains how to view the chat application metrics (connections, disconnections, and messages sent) in Grafana using Prometheus.

## Metrics Available

The application exposes the following metrics on the `/metrics` endpoint:

- **`chat_connections_total`**: Total number of user connections (Counter)
- **`chat_disconnections_total`**: Total number of user disconnections (Counter)
- **`chat_messages_sent_total`**: Total number of messages sent (Counter)

## Prerequisites

- Prometheus and Grafana should be running (using the docker-compose in `prometheus-stack/`)
- The chat application should be running on `http://localhost:3002`

## Step 1: Configure Prometheus to Scrape Metrics

Update the [prometheus-stack/prometheus/prometheus.yml](prometheus-stack/prometheus/prometheus.yml) file to include a scrape job for the chat application:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Add this section for the chat application
  - job_name: 'chat-application'
    static_configs:
      - targets: ['host.docker.internal:3002']  # or 'localhost:3002' if running locally
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Note for Docker**: If running the chat app in a container, use the appropriate hostname (e.g., `chat:3002` if using docker-compose).

### Reload Prometheus Configuration

After updating the configuration, reload Prometheus:

```bash
# Using Docker
docker exec prometheus kill -HUP 1

# Or restart the container
docker restart prometheus
```

## Step 2: Verify Metrics Collection

1. Go to **Prometheus Web UI**: http://localhost:9090
2. Navigate to **Status** → **Targets**
3. Verify that the "chat-application" target is showing as "UP"
4. Go to **Graph** tab and search for one of the metrics:
   - Type `chat_connections_total` in the query box
   - Click **Execute** to see the metric data

## Step 3: Add Prometheus Data Source to Grafana

1. Open **Grafana**: http://localhost:3000 (default password: `admin`/`admin`)
2. Go to **Configuration** (⚙️) → **Data Sources**
3. Click **Add data source**
4. Select **Prometheus**
5. Configure:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090` (or `http://localhost:9090` if running locally)
   - **Scrape interval**: `15s`
6. Click **Save & Test**

## Step 4: Create a Dashboard

### Option A: Create a Dashboard from Scratch

1. Go to **Dashboards** → **Create** → **Dashboard**
2. Click **Add a new panel**

### Option B: Import a Pre-built Dashboard

For quick visualization, create panels using these PromQL queries:

#### Panel 1: Total Connections (Gauge)

```promql
chat_connections_total
```

**Panel Settings**:
- **Title**: Total Connections
- **Visualization**: Stat
- **Unit**: Short

#### Panel 2: Total Disconnections (Gauge)

```promql
chat_disconnections_total
```

**Panel Settings**:
- **Title**: Total Disconnections
- **Visualization**: Stat
- **Unit**: Short

#### Panel 3: Total Messages Sent (Gauge)

```promql
chat_messages_sent_total
```

**Panel Settings**:
- **Title**: Total Messages Sent
- **Visualization**: Stat
- **Unit**: Short

#### Panel 4: Connection Rate (Graph)

```promql
rate(chat_connections_total[5m])
```

**Panel Settings**:
- **Title**: Connection Rate (5m)
- **Visualization**: Time Series (Graph)

#### Panel 5: Message Activity (Graph)

```promql
rate(chat_messages_sent_total[5m])
```

**Panel Settings**:
- **Title**: Message Send Rate (5m)
- **Visualization**: Time Series (Graph)

#### Panel 6: Active User Estimate

```promql
chat_connections_total - chat_disconnections_total
```

**Panel Settings**:
- **Title**: Active Users (approx)
- **Visualization**: Stat
- **Unit**: Short

## Step 5: Build Your Dashboard

1. **Add panels**: Click the "+" button to add new panels
2. **Configure queries**: Enter the PromQL queries from above
3. **Customize visualization**: Choose appropriate visualizations (Stat, Graph, Gauge, etc.)
4. **Save dashboard**: Click **Save** and give it a name (e.g., "Chat Application Metrics")

## Useful PromQL Queries

### Basic Counters
- `chat_connections_total` - Total connections ever
- `chat_disconnections_total` - Total disconnections ever
- `chat_messages_sent_total` - Total messages ever

### Rates (per second)
- `rate(chat_connections_total[5m])` - Connections per second (5-minute window)
- `rate(chat_messages_sent_total[1m])` - Messages per second (1-minute window)

### Increase (total increase in time window)
- `increase(chat_connections_total[1h])` - Connections in the last hour
- `increase(chat_messages_sent_total[10m])` - Messages in the last 10 minutes

### Active Users Estimate
- `chat_connections_total - chat_disconnections_total` - Approximation of currently active users

## Troubleshooting

### Metrics Not Showing Up

1. **Check if the application is running**:
   ```bash
   curl http://localhost:3002/metrics
   ```

2. **Verify Prometheus can scrape the endpoint**:
   - Go to Prometheus: http://localhost:9090/targets
   - Check if "chat-application" job shows "UP" status

3. **Check logs**:
   ```bash
   docker logs prometheus
   ```

### No Data in Grafana

1. Ensure the Prometheus data source is properly configured
2. Verify the PromQL queries are correct
3. Try a simple query first: `up` (should show all targets)
4. Check the query time range (top right of Grafana)

### Performance Tips

- Increase scrape interval if you're seeing performance issues
- Consider using `rate()` or `increase()` functions for better visualization
- Set appropriate time ranges for your dashboard (5m, 1h, 7d, etc.)

## Docker Compose Setup

Ensure your `prometheus-stack/docker-compose.yml` uses proper networking:

```yaml
services:
  prometheus:
    # ... existing config ...
    networks:
      - monitoring

  grafana:
    # ... existing config ...
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

For connection between Docker containers and host, use `host.docker.internal` (macOS/Windows) or configure proper networking.

## Next Steps

- Add alerting rules in `prometheus-stack/prometheus/alerts.yml`
- Create notifications in Alertmanager
- Add more metrics to track other application events
- Implement custom Grafana dashboards with templates and variables
