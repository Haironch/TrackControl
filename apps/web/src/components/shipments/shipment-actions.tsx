import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, MoreHorizontal, Pencil, RefreshCw, RotateCcw, Truck } from 'lucide-react';
import { ShipmentStatusCode, type ShipmentView } from '@trackcontrol/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ChangeStatusDialog } from './change-status-dialog';
import { IncidentDialog } from './incident-dialog';

/** Calcula el siguiente estado de "devolución" según el estado actual. */
export function nextReturnStatus(status: string): string | null {
  switch (status) {
    case ShipmentStatusCode.RECHAZADO:
      return ShipmentStatusCode.EN_RETORNO;
    case ShipmentStatusCode.EN_RETORNO:
      return ShipmentStatusCode.RECIBIDO_EN_BODEGA;
    case ShipmentStatusCode.EN_TRANSITO:
    case ShipmentStatusCode.EN_RUTA:
    case ShipmentStatusCode.CLIENTE_NO_RECIBIO:
    case ShipmentStatusCode.REINTENTO:
    case ShipmentStatusCode.INCIDENCIA:
    case ShipmentStatusCode.EN_ESPERA:
      return ShipmentStatusCode.RECHAZADO;
    default:
      return null;
  }
}

export function canMarkDelivered(status: string) {
  const codes: string[] = [ShipmentStatusCode.EN_RUTA, ShipmentStatusCode.REINTENTO, ShipmentStatusCode.INCIDENCIA, ShipmentStatusCode.EN_ESPERA];
  return codes.includes(status);
}

export function ShipmentActions({ shipment, variant = 'menu' }: { shipment: ShipmentView; variant?: 'menu' | 'buttons' }) {
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const [statusOpen, setStatusOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const canChange = can('shipments:change-status');
  const returnStatus = nextReturnStatus(shipment.status);
  const isFinal = shipment.statusDefinition.isFinal && shipment.status !== ShipmentStatusCode.ENTREGADO;

  const openStatus = (t: string | null) => {
    setTarget(t);
    setStatusOpen(true);
  };

  const dialogs = (
    <>
      <ChangeStatusDialog shipment={shipment} targetStatus={target} open={statusOpen} onOpenChange={setStatusOpen} />
      <IncidentDialog shipment={shipment} open={incidentOpen} onOpenChange={setIncidentOpen} />
    </>
  );

  if (variant === 'buttons') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {canChange && canMarkDelivered(shipment.status) ? (
          <Button variant="success" size="sm" onClick={() => openStatus(ShipmentStatusCode.ENTREGADO)}>
            <CheckCircle2 /> Marcar como entregado
          </Button>
        ) : null}
        {canChange && shipment.status === ShipmentStatusCode.NUEVO ? (
          <Button variant="secondary" size="sm" onClick={() => openStatus(ShipmentStatusCode.PREPARADO)}>
            <RefreshCw /> Marcar preparado
          </Button>
        ) : null}
        {canChange && (shipment.status === ShipmentStatusCode.PREPARADO || shipment.status === ShipmentStatusCode.NUEVO) ? (
          <Button variant="secondary" size="sm" onClick={() => openStatus(ShipmentStatusCode.ENTREGADO_A_PAQUETERIA)}>
            <Truck /> Entregar a paquetería
          </Button>
        ) : null}
        {canChange && returnStatus ? (
          <Button variant="secondary" size="sm" onClick={() => openStatus(returnStatus)}>
            <RotateCcw /> Registrar devolución
          </Button>
        ) : null}
        {canChange && !isFinal ? (
          <Button variant="outline" size="sm" onClick={() => openStatus(null)}>
            Cambiar estado…
          </Button>
        ) : null}
        {can('incidents:write') && shipment.status !== ShipmentStatusCode.RECIBIDO_EN_BODEGA ? (
          <Button variant="outline" size="sm" onClick={() => setIncidentOpen(true)}>
            <AlertTriangle /> Incidencia
          </Button>
        ) : null}
        {can('shipments:update') ? (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/paquetes/${shipment.id}/editar`)}>
            <Pencil /> Editar
          </Button>
        ) : null}
        {dialogs}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>{shipment.trackingNumber}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => navigate(`/paquetes/${shipment.id}`)}>
            <Eye /> Ver detalle
          </DropdownMenuItem>
          {can('shipments:update') ? (
            <DropdownMenuItem onSelect={() => navigate(`/paquetes/${shipment.id}/editar`)}>
              <Pencil /> Editar
            </DropdownMenuItem>
          ) : null}
          {canChange ? (
            <>
              <DropdownMenuSeparator />
              {canMarkDelivered(shipment.status) ? (
                <DropdownMenuItem onSelect={() => openStatus(ShipmentStatusCode.ENTREGADO)}>
                  <CheckCircle2 className="!text-emerald-600" /> Marcar como entregado
                </DropdownMenuItem>
              ) : null}
              {returnStatus ? (
                <DropdownMenuItem onSelect={() => openStatus(returnStatus)}>
                  <RotateCcw className="!text-rose-500" /> Registrar devolución
                </DropdownMenuItem>
              ) : null}
              {!isFinal ? (
                <DropdownMenuItem onSelect={() => openStatus(null)}>
                  <RefreshCw /> Cambiar estado…
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
          {can('incidents:write') ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIncidentOpen(true)}>
                <AlertTriangle className="!text-amber-500" /> Registrar incidencia
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}
