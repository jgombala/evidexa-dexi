import { config } from '../config.js';
import { createHttpServer } from './http.js';
import { createGrpcServer, startGrpcServer } from './grpc.js';
import { TaskOrchestrator } from '../services/taskOrchestrator.js';
import { logger } from '../middleware/logging.js';

async function bootstrap() {
  const orchestrator = new TaskOrchestrator();

  const app = createHttpServer(orchestrator);
  app.listen(config.http.port, () => {
    logger.info({ port: config.http.port }, 'HTTP server listening');
  });

  const grpcServer = createGrpcServer(orchestrator);
  await startGrpcServer(grpcServer, config.grpc.port);
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'failed to bootstrap servers');
  process.exit(1);
});
