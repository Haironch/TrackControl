import { useQuery } from '@tanstack/react-query';
import type { CarrierView, CustomerView, ShipmentStatusDefinition, User } from '@trackcontrol/shared';
import { api } from '@/lib/api';

export function useStatuses() {
  return useQuery({
    queryKey: ['statuses'],
    queryFn: async () => (await api.get<ShipmentStatusDefinition[]>('/statuses')).data,
    staleTime: 10 * 60_000,
  });
}

export function useCarriers() {
  return useQuery({ queryKey: ['carriers'], queryFn: async () => (await api.get<CarrierView[]>('/carriers')).data });
}

export function useCarrier(id: string | undefined) {
  return useQuery({ queryKey: ['carriers', id], queryFn: async () => (await api.get<CarrierView>(`/carriers/${id}`)).data, enabled: !!id });
}

export function useCustomers(search?: string) {
  return useQuery({ queryKey: ['customers', search ?? ''], queryFn: async () => (await api.get<CustomerView[]>('/customers', { search })).data });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data, staleTime: 5 * 60_000 });
}

export function useShipmentFacets() {
  return useQuery({ queryKey: ['shipments', 'facets'], queryFn: async () => (await api.get<{ departments: { name: string; count: number }[] }>('/shipments/facets')).data });
}
