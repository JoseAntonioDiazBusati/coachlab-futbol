import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthResponse {
  token: string;
  email: string;
  nombre: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
}

const JWT_KEY = 'coachlab_jwt';

/**
 * Servicio de autenticación HTTP.
 *
 * Almacena el JWT en localStorage (`coachlab_jwt`).
 * El token se adjunta automáticamente a cada petición autenticada
 * mediante `authInterceptor`.
 *
 * Credenciales demo: demo@coachlab.test / coachlab123
 * (creadas por el DataLoader del backend al arrancar).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/auth`;

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(JWT_KEY);
  }

  /** Credenciales del usuario demo para pre-rellenar el login en dev. */
  getDefaultUser(): { email: string; password: string } {
    return { email: 'demo@coachlab.test', password: 'coachlab123' };
  }

  /**
   * Autentica al usuario contra el backend.
   * Devuelve un Observable que, al completar, almacena el JWT.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, { email, password } as LoginRequest)
      .pipe(tap((res) => this.saveToken(res.token)));
  }

  /**
   * Registra un nuevo usuario y autentica automáticamente.
   * Devuelve un Observable que, al completar, almacena el JWT.
   */
  register(nombre: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, { nombre, email, password } as RegisterRequest)
      .pipe(tap((res) => this.saveToken(res.token)));
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(JWT_KEY);
    }
  }

  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(JWT_KEY, token);
    }
  }
}
