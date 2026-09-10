import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { CurrentUserProvider } from '@/hooks/use-current-user';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { ShipmentsPage } from '@/pages/ShipmentsPage';
import { ShipmentDetailPage } from '@/pages/ShipmentDetailPage';
import { ShipmentFormPage } from '@/pages/ShipmentFormPage';
import { CarriersPage } from '@/pages/CarriersPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { SettlementsPage } from '@/pages/SettlementsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="paquetes" element={<ShipmentsPage />} />
                <Route path="paquetes/nuevo" element={<ShipmentFormPage />} />
                <Route path="paquetes/:id" element={<ShipmentDetailPage />} />
                <Route path="paquetes/:id/editar" element={<ShipmentFormPage />} />
                <Route path="paqueterias" element={<CarriersPage />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route path="liquidaciones" element={<SettlementsPage />} />
                <Route path="incidencias" element={<IncidentsPage />} />
                <Route path="reportes" element={<ReportsPage />} />
                <Route path="usuarios" element={<UsersPage />} />
                <Route path="configuracion" element={<SettingsPage />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }} />
        </TooltipProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  );
}
