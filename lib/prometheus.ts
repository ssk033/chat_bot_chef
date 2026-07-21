import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

export const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"],
});

export const requestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP Request Duration",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

register.registerMetric(httpRequestCounter);
register.registerMetric(requestDuration);

export default register;