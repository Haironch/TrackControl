import { ArrowRight, Barcode, Bot, Database, Globe, MessageCircle, Plug, ShoppingBag, Smartphone } from 'lucide-react';
import { FINANCIAL_STATUS_META, STATUS_CATEGORY_META } from '@trackcontrol/shared';
import { useStatuses } from '@/hooks/use-catalogs';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const FUTURE = [
  { icon: Plug, title: 'Integraciones con paqueterías', text: 'API, tracking automático y webhooks por paquetería.' },
  { icon: MessageCircle, title: 'WhatsApp / SMS', text: 'Notificaciones automáticas al cliente en cada cambio de estado.' },
  { icon: Barcode, title: 'Escaneo QR y código de barras', text: 'Salida y recepción de paquetes en bodega con lector.' },
  { icon: Smartphone, title: 'Aplicación móvil', text: 'Foto de entrega, firma digital y GPS del repartidor.' },
  { icon: ShoppingBag, title: 'Tiendas online', text: 'Importar pedidos desde WooCommerce y Shopify.' },
  { icon: Bot, title: 'Inteligencia artificial', text: 'Predicción de devoluciones y rutas de reparto.' },
  { icon: Database, title: 'Facturación y conciliación bancaria', text: 'Cruce automático de depósitos con liquidaciones.' },
];

export function SettingsPage() {
  const { data: statuses } = useStatuses();
  return (
    <div className="space-y-5">
      <PageHeader title="Configuración" description="Catálogos del sistema y módulos previstos." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estados operativos del envío</CardTitle>
            <CardDescription>Catálogo configurable. Cada estado define su etapa, color y las transiciones permitidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!statuses ? (
              <Skeleton className="h-64" />
            ) : (
              statuses.map((s) => (
                <div key={s.code} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center">
                  <div className="w-52 shrink-0">
                    <Badge color={s.color} dot className="uppercase tracking-wide">
                      {s.label}
                    </Badge>
                    <p className="mt-1 text-[11px] text-slate-400">{s.code}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-600">{s.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge color={STATUS_CATEGORY_META[s.category].color} size="sm">
                        {STATUS_CATEGORY_META[s.category].label}
                      </Badge>
                      {s.isFinal ? (
                        <Badge color="zinc" size="sm">
                          Final
                        </Badge>
                      ) : null}
                      {s.nextStatuses.length ? <ArrowRight className="size-3 text-slate-300" /> : null}
                      {s.nextStatuses.map((n) => (
                        <span key={n} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {statuses.find((x) => x.code === n)?.label ?? n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estados financieros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(FINANCIAL_STATUS_META).map(([code, m]) => (
                <div key={code} className="flex items-start gap-3">
                  <Badge color={m.color} className="w-24 justify-center uppercase">
                    {m.label}
                  </Badge>
                  <p className="text-xs text-slate-500">{m.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="size-4 text-brand-600" /> Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-600">
              <p><span className="text-slate-400">Nombre:</span> Mi Empresa S.A. (demo)</p>
              <p><span className="text-slate-400">Moneda:</span> Quetzal (GTQ)</p>
              <p><span className="text-slate-400">Origen de datos:</span> JSON (preparado para PostgreSQL)</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulos previstos</CardTitle>
          <CardDescription>La arquitectura deja preparados estos puntos de extensión; no forman parte del prototipo actual.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FUTURE.map((f) => (
            <div key={f.title} className="rounded-lg border border-dashed border-slate-200 p-4">
              <f.icon className="size-5 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">{f.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{f.text}</p>
              <Badge color="zinc" size="sm" className="mt-2">
                Próximamente
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
