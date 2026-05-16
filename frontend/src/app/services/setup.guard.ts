import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EquipoActivoService } from './equipo-activo.service';

export const setupGuard: CanActivateFn = () => {
  const equipoActivo = inject(EquipoActivoService);
  const router = inject(Router);

  if (equipoActivo.tieneEquipo()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
