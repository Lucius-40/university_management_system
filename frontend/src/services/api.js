import axios from 'axios';

const NETWORK_LOADING_EVENT = 'app:network-loading';
let inFlightRequests = 0;

const emitNetworkLoading = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(NETWORK_LOADING_EVENT, {
      detail: {
        isLoading: inFlightRequests > 0,
        count: inFlightRequests,
      },
    })
  );
};

const startRequest = () => {
  inFlightRequests += 1;
  emitNetworkLoading();
};

const finishRequest = () => {
  inFlightRequests = Math.max(0, inFlightRequests - 1);
  emitNetworkLoading();
};

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    startRequest();
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    finishRequest();
    return response;
  },
  (error) => {
    finishRequest();
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
