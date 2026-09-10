import { createApp } from './app';
import { env } from './config/env';
import { createContainer } from './container';
import { logger } from './core/utils/logger';

const container = createContainer();
const app = createApp(container);

const server = app.listen(env.port, () => {
  logger.info(`TrackControl API escuchando en http://localhost:${env.port}/api (origen de datos: ${env.dataSource})`);
});

const shutdown = () => {
  logger.info('Cerrando API...');
  container.repos.flush();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
