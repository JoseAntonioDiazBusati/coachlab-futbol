import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EquipoActivoService } from './equipo-activo.service';
import { AuthService } from './auth.service';

export const teamGuard: CanActivateFn = (_route, state) => {
  const equipoActivo = inject(EquipoActivoService);
  const auth = inject(AuthService);
  const router = inject(Router);

  // El ojeador no gestiona equipos propios: solo accede al comparador de
  // plantillas (en /prepartido). El resto de páginas se le redirige allí.
  if (auth.esOjeador()) {
    return state.url.startsWith('/prepartido') ? true : router.createUrlTree(['/prepartido']);
  }

  if (!equipoActivo.tieneEquipo()) {
    return router.createUrlTree(['/ligas']);
  }
  return true;
};
