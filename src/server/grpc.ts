import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { writeFileSync } from 'fs';
import path from 'path';
import { ToolRunStatus } from '@prisma/client';
import { TaskOrchestrator } from '../services/taskOrchestrator.js';
import { logger } from '../middleware/logging.js';

const proto = `
syntax = "proto3";
package orchestration;

message HealthRequest {}
message HealthResponse { string status = 1; }

message SubmitTaskRequest {
  string title = 1;
  string createdById = 2;
  string metadataJson = 3;
  int32 priority = 4;
}

message TaskResponse {
  string id = 1;
  string status = 2;
}

message ToolResultRequest {
  string jobId = 1;
  string toolName = 2;
  string status = 3;
  string outputJson = 4;
  string error = 5;
}

message ToolResultResponse {
  string id = 1;
  string status = 2;
}

service Orchestration {
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc SubmitTask(SubmitTaskRequest) returns (TaskResponse);
  rpc ReportToolResult(ToolResultRequest) returns (ToolResultResponse);
}
`;

const protoPath = path.join(process.cwd(), 'orchestration.proto');
writeFileSync(protoPath, proto);

const packageDefinition = loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [process.cwd()],
  protobufjsVersion: 7,
});

const protoDescriptor = loadPackageDefinition(packageDefinition) as any;
const orchestration = protoDescriptor.orchestration;

export function createGrpcServer(orchestrator: TaskOrchestrator) {
  const server = new Server();

  server.addService(orchestration.Orchestration.service, {
    Health: (_: unknown, callback: any) => {
      callback(null, { status: 'ok' });
    },
    SubmitTask: async (call: any, callback: any) => {
      try {
        const metadata = call.request.metadataJson ? JSON.parse(call.request.metadataJson) : undefined;
        const priority = call.request.priority ?? 0;
        const task = await orchestrator.submitTask({
          title: call.request.title,
          createdById: call.request.createdById,
          metadata,
          priority,
        });

        callback(null, { id: task.id, status: task.status });
      } catch (error) {
        logger.error({ err: error }, 'gRPC submitTask failed');
        callback(error);
      }
    },
    ReportToolResult: async (call: any, callback: any) => {
      try {
        const output = call.request.outputJson ? JSON.parse(call.request.outputJson) : undefined;
        const status = call.request.status as ToolRunStatus;

        if (!Object.values(ToolRunStatus).includes(status)) {
          return callback(new Error('Invalid tool run status'));
        }
        const toolRun = await orchestrator.recordToolResult({
          jobId: call.request.jobId,
          toolName: call.request.toolName,
          status,
          output,
          error: call.request.error,
        });

        callback(null, { id: toolRun.id, status: toolRun.status });
      } catch (error) {
        logger.error({ err: error }, 'gRPC reportToolResult failed');
        callback(error);
      }
    },
  });

  return server;
}

export async function startGrpcServer(server: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${port}`, ServerCredentials.createInsecure(), (err, bindPort) => {
      if (err) {
        return reject(err);
      }
      server.start();
      logger.info({ port: bindPort }, 'gRPC server started');
      resolve();
    });
  });
}
