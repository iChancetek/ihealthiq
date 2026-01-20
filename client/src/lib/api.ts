import { apiRequest } from './queryClient';

// Patient API
export const patientApi = {
  getAll: () => fetch('/api/patients').then(res => res.json()),
  getById: (id: number) => fetch(`/api/patients/${id}`).then(res => res.json()),
  create: (data: any) => apiRequest('POST', '/api/patients', data).then(res => res.json()),
  update: (id: number, data: any) => apiRequest('PATCH', `/api/patients/${id}`, data).then(res => res.json()),
};

// Referral API
export const referralApi = {
  getAll: () => fetch('/api/referrals').then(res => res.json()),
  create: (data: any) => apiRequest('POST', '/api/referrals', data).then(res => res.json()),
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return fetch('/api/referrals/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(res => res.json());
  },
};

// Eligibility API
export const eligibilityApi = {
  verify: (data: { patientId: number; insuranceType: string; patientInfo: any }) =>
    apiRequest('POST', '/api/eligibility/verify', data).then(res => res.json()),
  getByPatient: (patientId: number) =>
    fetch(`/api/eligibility/${patientId}`).then(res => res.json()),
};

// Homebound API
export const homeboundApi = {
  assess: (data: { patientId: number; assessmentData: any }) =>
    apiRequest('POST', '/api/homebound/assess', data).then(res => res.json()),
  getByPatient: (patientId: number) =>
    fetch(`/api/homebound/${patientId}`).then(res => res.json()),
};

// Scheduling API
export const schedulingApi = {
  optimize: (data: { patientLocation: any; appointmentType: string; preferredDates: string[] }) =>
    apiRequest('POST', '/api/schedule/optimize', data).then(res => res.json()),
  createAppointment: (data: any) =>
    apiRequest('POST', '/api/appointments', data).then(res => res.json()),
  getAppointments: () => fetch('/api/appointments').then(res => res.json()),
};

// Task API
export const taskApi = {
  getAll: (params?: { status?: string; priority?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    const url = queryParams.toString() ? `/api/tasks?${queryParams}` : '/api/tasks';
    return fetch(url).then(res => res.json());
  },
  create: (data: any) => apiRequest('POST', '/api/tasks', data).then(res => res.json()),
  update: (id: number, data: any) => apiRequest('PATCH', `/api/tasks/${id}`, data).then(res => res.json()),
};

// Consent API
export const consentApi = {
  getByPatient: async (patientId: number) => {
    const res = await fetch(`/api/consent/${patientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }
    return res.json();
  },
  create: async (data: any) => {
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }
    return res.json();
  },
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => fetch('/api/dashboard/metrics').then(res => res.json()),
  getRecentReferrals: () => fetch('/api/dashboard/recent-referrals').then(res => res.json()),
  getTasks: () => fetch('/api/dashboard/tasks').then(res => res.json()),
};

// Voice API
export const voiceApi = {
  getSessions: () => fetch('/api/voice/sessions').then(res => res.json()),
};
