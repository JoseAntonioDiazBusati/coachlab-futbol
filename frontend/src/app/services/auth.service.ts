import { Injectable } from '@angular/core';

interface AuthUser {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usersKey = 'coachlab_users';
  private readonly sessionKey = 'coachlab_session';
  private readonly defaultUser: AuthUser = {
    name: 'Usuario Demo',
    email: 'demo@coachlab.test',
    password: 'coachlab123',
  };

  constructor() {
    this.ensureSeedUser();
  }

  isAuthenticated() {
    return this.readSession() !== null;
  }

  getDefaultUser() {
    return { email: this.defaultUser.email, password: this.defaultUser.password };
  }

  login(email: string, password: string) {
    const user = this.getUsers().find((item) => item.email === email && item.password === password);
    if (!user) {
      return false;
    }
    this.writeSession(user.email);
    return true;
  }

  register(name: string, email: string, password: string) {
    const users = this.getUsers();
    if (users.some((item) => item.email === email)) {
      return false;
    }
    users.push({ name, email, password });
    this.writeUsers(users);
    this.writeSession(email);
    return true;
  }

  logout() {
    this.clearSession();
  }

  private ensureSeedUser() {
    const users = this.getUsers();
    if (!users.length) {
      this.writeUsers([this.defaultUser]);
      return;
    }
    if (!users.some((item) => item.email === this.defaultUser.email)) {
      users.push(this.defaultUser);
      this.writeUsers(users);
    }
  }

  private getUsers(): AuthUser[] {
    const raw = this.safeStorageGet(this.usersKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as AuthUser[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: AuthUser[]) {
    this.safeStorageSet(this.usersKey, JSON.stringify(users));
  }

  private readSession() {
    return this.safeStorageGet(this.sessionKey);
  }

  private writeSession(email: string) {
    this.safeStorageSet(this.sessionKey, email);
  }

  private clearSession() {
    this.safeStorageRemove(this.sessionKey);
  }

  private safeStorageGet(key: string) {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  private safeStorageSet(key: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  private safeStorageRemove(key: string) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }
}

