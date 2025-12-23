import { JobStatus, ToolRunStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../db/client.js';

export interface TaskSubmission {
  title: string;
  metadata?: Record<string, unknown>;
  priority?: number;
  createdById?: string | undefined;
}

export interface ToolResultPayload {
  jobId?: string;
  toolName: string;
  status: ToolRunStatus;
  output?: unknown;
  error?: string;
}

export class TaskOrchestrator {
  async submitTask(payload: TaskSubmission) {
    const { title, metadata, priority = 0, createdById } = payload;
    const task = await prisma.task.create({
      data: {
        title,
        metadata,
        priority,
        createdById,
        status: TaskStatus.PENDING,
        jobs: {
          create: {
            status: JobStatus.QUEUED,
          },
        },
      },
      include: { jobs: true },
    });

    return task;
  }

  async recordToolResult(result: ToolResultPayload) {
    const tool = await prisma.tool.upsert({
      where: { name: result.toolName },
      update: {},
      create: { name: result.toolName },
    });

    const jobId = result.jobId;
    let job = null;
    if (jobId) {
      job = await prisma.job.findUnique({ where: { id: jobId } });
    }

    const toolRun = await prisma.toolRun.create({
      data: {
        toolId: tool.id,
        jobId: job?.id,
        status: result.status,
        output: result.output as any,
        error: result.error,
      },
    });

    if (job && (result.status === ToolRunStatus.SUCCEEDED || result.status === ToolRunStatus.FAILED)) {
      const newStatus =
        result.status === ToolRunStatus.SUCCEEDED ? JobStatus.SUCCEEDED : JobStatus.FAILED;
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: newStatus,
          completedAt: new Date(),
          result: result.output as any,
        },
      });
    }

    return toolRun;
  }

  async getTask(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: { jobs: { include: { toolRuns: true } }, createdBy: true },
    });
  }
}
