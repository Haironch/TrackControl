import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  CreateCarrierDto,
  CreateCustomerDto,
  CreateIncidentDto,
  CreateSettlementDto,
  CarrierView,
  CustomerView,
  IncidentStatus,
  IncidentType,
  IncidentView,
  ReportQuery,
  ReportTable,
  SettlementStatus,
  SettlementView,
  ShipmentView,
  UpdateCarrierDto,
  UpdateCustomerDto,
  UpdateIncidentDto,
} from '@trackcontrol/shared';
import { api } from '@/lib/api';
import { invalidateAll } from '@/lib/query-client';

// ---------- Incidencias ----------
export function useIncidents(filter: { status?: IncidentStatus; type?: IncidentType } = {}) {
  return useQuery({ queryKey: ['incidents', filter], queryFn: async () => (await api.get<IncidentView[]>('/incidents', filter)).data });
}
export function useCreateIncident() {
  return useMutation({ mutationFn: async (dto: CreateIncidentDto) => (await api.post<IncidentView>('/incidents', dto)).data, onSuccess: invalidateAll });
}
export function useUpdateIncident() {
  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateIncidentDto & { id: string }) => (await api.patch<IncidentView>(`/incidents/${id}`, dto)).data,
    onSuccess: invalidateAll,
  });
}

// ---------- Liquidaciones ----------
export function useSettlements(filter: { carrierId?: string; status?: SettlementStatus } = {}) {
  return useQuery({ queryKey: ['settlements', filter], queryFn: async () => (await api.get<SettlementView[]>('/settlements', filter)).data });
}
export function useSettlement(id: string | undefined) {
  return useQuery({ queryKey: ['settlements', 'detail', id], queryFn: async () => (await api.get<SettlementView>(`/settlements/${id}`)).data, enabled: !!id });
}
export function useSettlementSummary() {
  return useQuery({
    queryKey: ['settlements', 'summary'],
    queryFn: async () => (await api.get<{ carrier: { id: string; name: string; color: string }; delivered: number; collected: number; settled: number; pending: number }[]>('/settlements/summary')).data,
  });
}
export function usePendingSettlementShipments(carrierId?: string) {
  return useQuery({
    queryKey: ['settlements', 'pending', carrierId ?? ''],
    queryFn: async () => (await api.get<ShipmentView[]>('/settlements/pending-shipments', { carrierId })).data,
  });
}
export function useCreateSettlement() {
  return useMutation({ mutationFn: async (dto: CreateSettlementDto) => (await api.post<SettlementView>('/settlements', dto)).data, onSuccess: invalidateAll });
}
export function useConfirmSettlement() {
  return useMutation({ mutationFn: async (id: string) => (await api.patch<SettlementView>(`/settlements/${id}/confirm`)).data, onSuccess: invalidateAll });
}
export function useCancelSettlement() {
  return useMutation({ mutationFn: async (id: string) => (await api.patch<SettlementView>(`/settlements/${id}/cancel`)).data, onSuccess: invalidateAll });
}

// ---------- Paqueterías ----------
export function useCreateCarrier() {
  return useMutation({ mutationFn: async (dto: CreateCarrierDto) => (await api.post<CarrierView>('/carriers', dto)).data, onSuccess: invalidateAll });
}
export function useUpdateCarrier() {
  return useMutation({ mutationFn: async ({ id, ...dto }: UpdateCarrierDto & { id: string }) => (await api.put<CarrierView>(`/carriers/${id}`, dto)).data, onSuccess: invalidateAll });
}
export function useToggleCarrier() {
  return useMutation({ mutationFn: async (id: string) => (await api.patch<CarrierView>(`/carriers/${id}/toggle-active`)).data, onSuccess: invalidateAll });
}

// ---------- Clientes ----------
export function useCreateCustomer() {
  return useMutation({ mutationFn: async (dto: CreateCustomerDto) => (await api.post<CustomerView>('/customers', dto)).data, onSuccess: invalidateAll });
}
export function useUpdateCustomer() {
  return useMutation({ mutationFn: async ({ id, ...dto }: UpdateCustomerDto & { id: string }) => (await api.put<CustomerView>(`/customers/${id}`, dto)).data, onSuccess: invalidateAll });
}

// ---------- Reportes ----------
export function useReportDefinitions() {
  return useQuery({ queryKey: ['reports', 'definitions'], queryFn: async () => (await api.get<{ id: string; title: string; description: string }[]>('/reports')).data, staleTime: Infinity });
}
export function useReport(id: string | undefined, query: ReportQuery) {
  return useQuery({ queryKey: ['reports', id, query], queryFn: async () => (await api.get<ReportTable>(`/reports/${id}`, { ...query })).data, enabled: !!id });
}

// ---------- Usuarios ----------
export function useToggleUser() {
  return useMutation({ mutationFn: async (id: string) => (await api.patch(`/users/${id}/toggle-active`)).data, onSuccess: invalidateAll });
}
