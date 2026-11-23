import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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
  (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

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

