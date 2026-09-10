import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  PackagePlus,
  Settings,
  Users,
  UserSquare2,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard:read' },
  { to: '/paquetes', label: 'Paquetes', icon: Package, permission: 'shipments:read' },
  { to: '/paquetes/nuevo', label: 'Crear envío', icon: PackagePlus, permission: 'shipments:create' },
  { to: '/paqueterias', label: 'Paqueterías', icon: Building2, permission: 'carriers:read' },
  { to: '/clientes', label: 'Clientes', icon: UserSquare2, permission: 'customers:read' },
  { to: '/liquidaciones', label: 'Liquidaciones', icon: Wallet, permission: 'settlements:read' },
  { to: '/incidencias', label: 'Incidencias', icon: AlertTriangle, permission: 'incidents:read' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, permission: 'reports:read' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'users:read' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, permission: 'settings:read' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { can } = useCurrentUser();
  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} /> : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-slate-300 transition-transform duration-200 ease-out lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 ring-1 ring-brand-400/30">
            <Boxes className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-white">TrackControl</p>
            <p className="text-[11px] text-slate-500">Control de envíos</p>
          </div>
          <button className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white/10 lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Operación</p>
          {NAV_ITEMS.map((item) => {
            const disabled = !can(item.permission);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-sidebar-active text-white' : 'text-slate-400 hover:bg-sidebar-hover hover:text-white',
                    disabled && 'opacity-40',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} />
                    {item.label}
                    {disabled ? <span className="ml-auto text-[9px] uppercase tracking-wide text-slate-500">Sin acceso</span> : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-[11px] font-semibold text-slate-300">Prototipo · v0.1</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Datos simulados en JSON. Arquitectura lista para PostgreSQL + Prisma.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
