import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Search, UserRound } from 'lucide-react';
import { USER_ROLE_META, type UserRole } from '@trackcontrol/shared';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NAV_ITEMS } from './sidebar';

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, users, switchUser } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const current = NAV_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/'));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/paquetes?search=${encodeURIComponent(q)}`);
    setSearch('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onMenu}>
        <Menu className="size-5" />
      </button>
      <div className="hidden min-w-0 sm:block">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">TrackControl</p>
        <p className="truncate text-sm font-semibold text-slate-800">{current?.label ?? 'Detalle'}</p>
      </div>
      <form onSubmit={submit} className="relative ml-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tracking, guía, cliente o teléfono…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
      </form>
      <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
        <Bell className="size-5" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100 focus:outline-none">
          {user ? <Avatar name={user.name} color={user.avatarColor} /> : <UserRound className="size-8 text-slate-400" />}
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold leading-tight text-slate-800">{user?.name ?? 'Cargando…'}</p>
            <p className="text-[11px] leading-tight text-slate-500">{user ? USER_ROLE_META[user.role as UserRole]?.label : ''}</p>
          </div>
          <ChevronDown className="size-4 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Cambiar usuario (demo de roles)</DropdownMenuLabel>
          {users
            .filter((u) => u.active)
            .map((u) => (
              <DropdownMenuItem key={u.id} onSelect={() => switchUser(u.id)} className="justify-between">
                <span className="flex items-center gap-2">
                  <Avatar name={u.name} color={u.avatarColor} size="sm" />
                  <span>{u.name}</span>
                </span>
                <Badge size="sm" color={USER_ROLE_META[u.role as UserRole]?.color}>
                  {USER_ROLE_META[u.role as UserRole]?.label}
                </Badge>
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/usuarios')}>Ver usuarios y permisos</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
