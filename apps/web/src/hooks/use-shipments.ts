import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type {
  ChangeStatusDto,
  CreateShipmentDto,
  ShipmentDetailView,
  ShipmentHistoryView,
  ShipmentQuery,
  ShipmentView,
  UpdateShipmentDto,
} from '@trackcontrol/shared';
import { api } from '@/lib/api';
import { invalidateAll } from '@/lib/query-client';

export function useShipments(query: ShipmentQuery) {
  return useQuery({
    queryKey: ['shipments', 'list', query],
    queryFn: async () => {
      const res = await api.get<ShipmentView[]>('/shipments', query as Record<string, string | number | undefined>);
      return { data: res.data, meta: res.meta! };
    },
    placeholderData: keepPreviousData,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({ queryKey: ['shipments', 'detail', id], queryFn: async () => (await api.get<ShipmentDetailView>(`/shipments/${id}`)).data, enabled: !!id });
}

export function useCreateShipment() {
  return useMutation({
    mutationFn: async (dto: CreateShipmentDto) => (await api.post<ShipmentView>('/shipments', dto)).data,
    onSuccess: invalidateAll,
  });
}

export function useUpdateShipment(id: string) {
  return useMutation({
    mutationFn: async (dto: UpdateShipmentDto) => (await api.put<ShipmentView>(`/shipments/${id}`, dto)).data,
    onSuccess: invalidateAll,
  });
}

export function useChangeStatus() {
  return useMutation({
    mutationFn: async ({ id, ...dto }: ChangeStatusDto & { id: string; force?: boolean }) => (await api.patch<ShipmentDetailView>(`/shipments/${id}/status`, dto)).data,
    onSuccess: invalidateAll,
  });
}

export function useAddNote() {
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => (await api.post<ShipmentHistoryView[]>(`/shipments/${id}/notes`, { comment })).data,
    onSuccess: invalidateAll,
  });
}
