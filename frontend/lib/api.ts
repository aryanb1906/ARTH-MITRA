import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface ChatResponse {
  response: string;
  sources: string[];
}

export interface UploadResponse {
  status: string;
  message: string;
}

export interface StatusResponse {
  initialized: boolean;
  documents_indexed: number;
  model: string | null;
}

// API Functions


function normalizeApiError(error: unknown, defaultMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
    const apiMessage = axiosError.response?.data?.message || axiosError.response?.data?.detail;

    if (apiMessage) {
      return new Error(apiMessage);
    }

    if (axiosError.code === 'ECONNABORTED') {
      return new Error('The request timed out. Please try again.');
    }

    if (!axiosError.response) {
      return new Error('Unable to reach the server. Please check your connection and try again.');
    }

    return new Error(defaultMessage);
  }

  return error instanceof Error ? error : new Error(defaultMessage);
}
export async function sendMessage(message: string): Promise<ChatResponse> {
  try {
    const { data } = await api.post<ChatResponse>('/api/chat', { message });

    // Handle response format (may have nested structure from Gemini)
    if (Array.isArray(data.response)) {
      // Extract text from Gemini's response format
      const textContent = data.response.find((item: any) => item.type === 'text');
      return {
        response: textContent?.text || 'No response',
        sources: data.sources,
      };
    }

    return data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to send message. Please try again.');
  }
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await api.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to upload document. Please try again.');
  }
}

export async function getStatus(): Promise<StatusResponse> {
  const { data } = await api.get<StatusResponse>('/api/status');
  return data;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const { data } = await api.get('/ping');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export default api;
