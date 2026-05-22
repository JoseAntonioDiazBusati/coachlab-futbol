// Environment configuration for Docker Compose local deployment.
// Angular calls /api/* which nginx proxies to the backend container on the internal network.
export const environment = {
  production: true,
  apiBase: '/api',
  fdApiBase: '/api/fd',
} as const;
