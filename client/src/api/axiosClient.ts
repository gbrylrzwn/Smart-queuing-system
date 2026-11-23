import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = config?.url || '';

    // ניסיון חוזר אוטומטי במקרה של התעוררות שרת בענן (שגיאת רשת, Timeout או 502/503/504)
    const isWakeUpError = !error.response || status === 502 || status === 503 || status === 504;
    if (config && isWakeUpError && (config._retryCount || 0) < 4) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return axiosClient(config);
    }

    // אם האסימון פג תוקף או לא תקין (ולא מדובר בניסיון התחברות כושל) — ננקה את הזיכרון ונעביר למסך ההתחברות
    if (status === 401 && !requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/verify-otp')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
