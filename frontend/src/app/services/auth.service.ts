import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type Rol = 'ENTRENADOR' | 'OJEADOR';

interface AuthResponse {
  token: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export interface CurrentUser {
  email: string;
  nombre: string;
  rol: Rol;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

const JWT_KEY = 'coachlab_jwt';
const USER_KEY = 'coachlab_user';

/**
 * Servicio de autenticación HTTP.
 *
 * Almacena el JWT en localStorage (`coachlab_jwt`).
 * El token se adjunta automáticamente a cada petición autenticada
 * mediante `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.readUser());
  /** Usuario autenticado (nombre/email) o null. */
  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  /** Rol del usuario autenticado (ENTRENADOR por defecto si no hay sesión). */
  get rol(): Rol {
    return this.currentUserSubject.value?.rol ?? 'ENTRENADOR';
  }

  esEntrenador(): boolean {
    return this.rol === 'ENTRENADOR';
  }

  esOjeador(): boolean {
    return this.rol === 'OJEADOR';
  }

  /** True si hay token y no está caducado (según el claim `exp` del JWT). */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.tokenCaducado(token);
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(JWT_KEY);
  }

  /** Decodifica el payload del JWT; null si no es válido. */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json) as { exp?: number };
    } catch {
      return null;
    }
  }

  /** True si el token tiene `exp` y ya ha pasado. Si no se puede leer `exp`, se asume vigente. */
  private tokenCaducado(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  }

  /**
   * Autentica al usuario contra el backend.
   * Devuelve un Observable que, al completar, almacena el JWT.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, { email, password } as LoginRequest)
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  /**
   * Registra un nuevo usuario y autentica automáticamente.
   * Devuelve un Observable que, al completar, almacena el JWT.
   */
  register(
    nombre: string,
    email: string,
    password: string,
    rol: Rol = 'ENTRENADOR',
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, { nombre, email, password, rol } as RegisterRequest)
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(JWT_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
    this.currentUserSubject.next(null);
  }

  /** Actualiza el usuario en memoria/almacenamiento (tras editar el perfil). */
  setCurrentUser(user: CurrentUser): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }

  private guardarSesion(res: AuthResponse): void {
    this.saveToken(res.token);
    this.setCurrentUser({ email: res.email, nombre: res.nombre, rol: res.rol ?? 'ENTRENADOR' });
  }

  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(JWT_KEY, token);
    }
  }

  private readUser(): CurrentUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}
