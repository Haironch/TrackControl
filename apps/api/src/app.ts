import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './core/http/error-handler';
import { logger } from './core/utils/logger';
import { currentUserMiddleware } from './modules/auth/auth.middleware';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCarrierRouter } from './modules/carriers/carrier.routes';
import { createCustomerRouter } from './modules/customers/customer.routes';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes';
import { createIncidentRouter } from './modules/incidents/incident.routes';
import { createReportRouter } from './modules/reports/report.routes';
import { createSettlementRouter } from './modules/settlements/settlement.routes';
import { createShipmentRouter } from './modules/shipments/shipment.routes';
import { createStatusRouter } from './modules/statuses/status.routes';
import { createUserRouter } from './modules/users/user.routes';

export function createApp(container: Container) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.corsOrigin.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (!env.isProduction) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`));
      next();
    });
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', dataSource: env.dataSource, time: new Date().toISOString() }));

  const api = express.Router();
  api.use(currentUserMiddleware(container.repos));
  api.use('/auth', createAuthRouter());
  api.use('/users', createUserRouter(container.users));
  api.use('/statuses', createStatusRouter(container.statuses));
  api.use('/carriers', createCarrierRouter(container.carriers));
  api.use('/customers', createCustomerRouter(container.customers));
  api.use('/shipments', createShipmentRouter(container.shipments));
  api.use('/incidents', createIncidentRouter(container.incidents));
  api.use('/settlements', createSettlementRouter(container.settlements));
  api.use('/dashboard', createDashboardRouter(container.dashboard));
  api.use('/reports', createReportRouter(container.reports));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
