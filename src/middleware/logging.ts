import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  name: config.observability.serviceName,
  level: process.env.LOG_LEVEL || 'info',
});

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id']?.toString() ?? randomUUID();
  res.setHeader('x-correlation-id', correlationId);

  const child = logger.child({ correlationId, path: req.path, method: req.method });
  (req as any).logger = child;

  child.info({ message: 'request.start' });
  res.on('finish', () => {
    child.info({
      message: 'request.end',
      status: res.statusCode,
      contentLength: res.getHeader('content-length'),
    });
  });

  next();
};
