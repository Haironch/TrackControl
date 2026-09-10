import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return <EmptyState title="Página no encontrada" description="La ruta que intentas abrir no existe." action={<Button onClick={() => navigate('/')}>Ir al dashboard</Button>} />;
}
