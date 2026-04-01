Setting up a **production-grade Prometheus monitoring stack** goes beyond just running Prometheus—you need reliability, scalability, alerting, and visualization.

Below is a **practical, step-by-step guide** with **working sample configs (Docker-based)** and production tips.

---

# 🧱 1. Architecture Overview (Production Stack)

A typical production Prometheus stack includes:

* **Prometheus** → Metrics collection & storage
* **Alertmanager** → Alert routing (Slack, email, etc.)
* **Grafana** → Dashboards & visualization
* **Exporters** → Node, app, DB metrics
* (Optional) **Long-term storage** → Thanos / Cortex / Mimir

---

# ⚙️ 2. Project Structure

```bash
prometheus-stack/
├── docker-compose.yml
├── prometheus/
│   └── prometheus.yml
├── alertmanager/
│   └── alertmanager.yml
├── grafana/
│   └── provisioning/
```

---

# 🐳 3. Docker Compose (Production-Ready Base)

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:v2.52.0
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"
    ports:
      - "9090:9090"
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:11.0.0
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    restart: unless-stopped

  node_exporter:
    image: prom/node-exporter:v1.8.1
    container_name: node_exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

---

# 📊 4. Prometheus Configuration

📄 `prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - "alertmanager:9093"

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["node_exporter:9100"]

  # Example: Node.js app
  - job_name: "app"
    static_configs:
      - targets: ["host.docker.internal:3001"]
```

---

# 🚨 5. Alert Rules

📄 `prometheus/alerts.yml`

```yaml
groups:
  - name: system-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100) > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
```

---

# 🔔 6. Alertmanager Configuration

📄 `alertmanager/alertmanager.yml`

```yaml
route:
  receiver: "email"

receivers:
  - name: "email"
    email_configs:
      - to: "your-email@example.com"
        from: "alert@example.com"
        smarthost: "smtp.gmail.com:587"
        auth_username: "your-email@example.com"
        auth_password: "your-password"
```

👉 Replace with:

* Slack webhook
* PagerDuty
* Opsgenie (recommended for production)

---

# 📈 7. Sample Node.js App with Metrics

Install:

```bash
npm install express prom-client
```

📄 `app.js`

```js
const express = require("express");
const client = require("prom-client");

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

// Custom metric
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
});

register.registerMetric(httpRequestCounter);

app.get("/", (req, res) => {
  httpRequestCounter.inc();
  res.send("Hello Prometheus!");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(3001, () => {
  console.log("App running on port 3001");
});
```

---

# 📊 8. Grafana Setup

1. Open: `http://localhost:3000`
2. Login: `admin / admin`
3. Add data source:

   * URL: `http://prometheus:9090`
4. Import dashboard:

   * Node Exporter Dashboard (ID: **1860**)

---

# 🔐 9. Production Best Practices

## 🔒 Security

* Put behind reverse proxy (e.g. Traefik or Nginx)
* Enable authentication
* Use HTTPS

## 📦 Persistence

* Use durable storage (SSD, cloud volume)
* Backup Prometheus TSDB

## 📈 Scaling

Prometheus alone is **not horizontally scalable**

Use:

* Thanos
* Grafana Mimir
* Cortex

## 🔁 High Availability

* Run **2 Prometheus instances**
* Use load balancer
* Deduplicate via Thanos

## 🧠 Retention Strategy

* Short-term: Prometheus (7–30 days)
* Long-term: Thanos/Mimir (months/years)

---

# 🚀 10. Run Everything

```bash
docker compose up -d
```

Access:

* Prometheus → [http://localhost:9090](http://localhost:9090)
* Grafana → [http://localhost:3000](http://localhost:3000)
* Alertmanager → [http://localhost:9093](http://localhost:9093)

---

# 🧩 11. Optional (Advanced Production Stack)

Add:

* **Blackbox exporter** → uptime checks
* **cAdvisor** → container metrics
* **Loki** → logs
* **Tempo** → tracing

---

# ✅ Summary

You now have:

* Metrics collection ✅
* Visualization ✅
* Alerting ✅
* App instrumentation ✅
