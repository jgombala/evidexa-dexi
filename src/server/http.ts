import express, { Request, Response } from 'express';
import { ToolRunStatus } from '@prisma/client';
import { authMiddleware, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { loggingMiddleware, logger } from '../middleware/logging.js';
import { metricsHandler, metricsMiddleware } from '../middleware/metrics.js';
import { TaskOrchestrator } from '../services/taskOrchestrator.js';

export function createHttpServer(orchestrator: TaskOrchestrator) {
  const app = express();
  app.use(express.json());
  app.use(loggingMiddleware);
  app.use(metricsMiddleware);
  app.use(authMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/metrics', metricsHandler);

  app.post('/tasks', requireRoles(['orchestrator', 'admin']), async (req: AuthenticatedRequest, res) => {
    const { title, metadata, priority } = req.body ?? {};
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    try {
      const task = await orchestrator.submitTask({
        title,
        metadata,
        priority,
        createdById: req.auth?.userId,
      });
      res.status(202).json(task);
    } catch (error) {
      logger.error({ err: error }, 'failed to submit task');
      res.status(500).json({ error: 'Failed to submit task' });
    }
  });

  app.get('/tasks/:id', requireRoles(['orchestrator', 'admin', 'observer']), async (req: Request, res: Response) => {
    try {
      const task = await orchestrator.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      logger.error({ err: error }, 'failed to load task');
      res.status(500).json({ error: 'Failed to load task' });
    }
  });

  app.post(
    '/tools/:toolName/results',
    requireRoles(['tool-runner', 'admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { jobId, status, output, error } = req.body ?? {};
      const toolName = req.params.toolName;

      if (!status || !(status in ToolRunStatus)) {
        return res.status(400).json({ error: 'valid status is required' });
      }

      try {
        const toolRun = await orchestrator.recordToolResult({
          jobId,
          toolName,
          status: status as ToolRunStatus,
          output,
          error,
        });
        res.status(201).json(toolRun);
      } catch (err) {
        logger.error({ err }, 'failed to record tool result');
        res.status(500).json({ error: 'Failed to record tool result' });
      }
    },
  );

  return app;
}
