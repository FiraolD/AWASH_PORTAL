export const environment = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1',
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
  appName: 'Awash Insurance',
  appTagline: 'We Flow With You',
};