import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

type HttpLabelValues = {
  method: string;
  route: string;
  status_code: number | string;
  service: string;
};

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  readonly contentType: string;

  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;

  private readonly serviceName: string;

  constructor() {
    this.registry = new Registry();
    this.serviceName = process.env.SERVICE_NAME || process.env.KAFKA_SERVICE_ID || 'service-1';
    this.registry.setDefaultLabels({ service: this.serviceName });

    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'] as const,
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.contentType = this.registry.contentType;
  }

  startHttpRequestTimer(labels: Partial<HttpLabelValues>) {
    const fullLabels = {
      method: labels.method || 'GET',
      route: labels.route || 'unknown',
      status_code: (labels.status_code ?? '200').toString(),
      service: this.serviceName,
    } as const;
    return this.httpRequestDuration.startTimer(fullLabels);
  }

  observeHttpRequest(labels: Partial<HttpLabelValues>, durationSeconds: number) {
    const fullLabels = {
      method: labels.method || 'GET',
      route: labels.route || 'unknown',
      status_code: (labels.status_code ?? 200).toString(),
      service: this.serviceName,
    } as const;
    this.httpRequestsTotal.inc(fullLabels);
    this.httpRequestDuration.observe(fullLabels, durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}
