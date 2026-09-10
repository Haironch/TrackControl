import { toast } from 'sonner';
import { Check, Minus, Power, ShieldCheck } from 'lucide-react';
import { ROLE_PERMISSIONS, USER_ROLE_META, UserRole } from '@trackcontrol/shared';
import { useUsers } from '@/hooks/use-catalogs';
import { useToggleUser } from '@/hooks/use-operations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const PERMISSIONS = [
  ['shipments:read', 'Ver paquetes'],
  ['shipments:create', 'Crear paquetes'],
  ['shipments:update', 'Editar paquetes'],
  ['shipments:change-status', 'Cambiar estados'],
  ['customers:write', 'Gestionar clientes'],
  ['incidents:write', 'Gestionar incidencias'],
  ['settlements:read', 'Ver liquidaciones'],
  ['settlements:write', 'Registrar liquidaciones'],
  ['carriers:write', 'Gestionar paqueterías'],
  ['reports:read', 'Ver reportes'],
  ['users:write', 'Gestionar usuarios'],
] as const;

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { user: me, can, switchUser } = useCurrentUser();
  const toggle = useToggleUser();
  const roles = Object.values(UserRole);

  return (
    <div className="space-y-5">
      <PageHeader title="Usuarios" description="Roles y permisos. El prototipo usa un usuario simulado; la arquitectura está lista para autenticación real." />
      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatarColor} />
                      <div>
                        <p className="font-medium text-slate-900">
                          {u.name} {me?.id === u.id ? <span className="ml-1 text-[10px] font-semibold uppercase text-brand-700">(tú)</span> : null}
                        </p>
                        <p className="text-[11px] text-slate-400">{u.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    <Badge color={USER_ROLE_META[u.role as UserRole]?.color}>{USER_ROLE_META[u.role as UserRole]?.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={u.active ? 'emerald' : 'slate'} dot>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 tabular">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.active && me?.id !== u.id ? (
                        <Button variant="ghost" size="sm" onClick={() => switchUser(u.id)}>
                          Usar este usuario
                        </Button>
                      ) : null}
                      {can('users:write') && me?.id !== u.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={u.active ? 'Desactivar' : 'Activar'}
                          onClick={async () => {
                            try {
                              await toggle.mutateAsync(u.id);
                              toast.success('Usuario actualizado');
                            } catch (e) {
                              toast.error(errorMessage(e));
                            }
                          }}
                        >
                          <Power className={u.active ? 'text-emerald-600' : 'text-slate-400'} />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-600" /> Matriz de permisos por rol
          </CardTitle>
          <CardDescription>Definida en el paquete compartido y aplicada por el backend en cada endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permiso</TableHead>
                {roles.map((r) => (
                  <TableHead key={r} className="text-center">
                    {USER_ROLE_META[r].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map(([perm, label]) => (
                <TableRow key={perm}>
                  <TableCell>
                    <p className="font-medium text-slate-800">{label}</p>
                    <p className="text-[11px] text-slate-400">{perm}</p>
                  </TableCell>
                  {roles.map((r) => {
                    const ok = ROLE_PERMISSIONS[r].includes('*') || ROLE_PERMISSIONS[r].includes(perm);
                    return (
                      <TableCell key={r} className="text-center">
                        {ok ? <Check className="mx-auto size-4 text-emerald-600" /> : <Minus className="mx-auto size-4 text-slate-300" />}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
