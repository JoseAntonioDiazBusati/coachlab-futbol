import { HttpInterceptorFn } from '@angular/common/http';

const JWT_KEY = 'coachlab_jwt';

/**
 * Adjunta el JWT de CoachLab a todas las peticiones HTTP salientes.
 *
 * El token sólo se añade si existe en localStorage, por lo que las
 * peticiones a endpoints públicos (/api/auth/login, /api/auth/register)
 * también se procesan correctamente (el backend simplemente lo ignora).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(JWT_KEY)
      : null;

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
