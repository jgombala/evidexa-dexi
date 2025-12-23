import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Count of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

client.collectDefaultMetrics();

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const end = httpRequestDuration.startTimer({ method: req.method, path: req.path });

  res.on('finish', () => {
    const labels = { method: req.method, path: req.path, status: String(res.statusCode) };
    httpRequestCounter.inc(labels);
    end(labels);
  });

  next();
};

export const metricsHandler = async (_req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
};
