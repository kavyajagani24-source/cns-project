import axios from 'axios';
import type {
  DashboardStats, HealthStatus, ModelHealthStatus, PaginatedScans,
  ScanResult, SyncResponse, ThreatIntelHealthStatus,
} from '../types/api';

const BASE_URL = '/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// ── Scanning ──
export async function submitScan(url: string): Promise<ScanResult> {
  const { data } = await client.post<ScanResult>('/scan/url', { url });
  return data;
}

export async function getScan(scanId: string): Promise<ScanResult> {
  const { data } = await client.get<ScanResult>(`/scan/url/${scanId}`);
  return data;
}

// ── History ──
export async function listScans(page = 1, pageSize = 20): Promise<PaginatedScans> {
  const { data } = await client.get<PaginatedScans>('/scans', { params: { page, page_size: pageSize } });
  return data;
}

export async function deleteScan(scanId: string): Promise<void> {
  await client.delete(`/scans/${scanId}`);
}

// ── Dashboard ──
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>('/dashboard/stats');
  return data;
}

// ── Health ──
export async function getHealth(): Promise<HealthStatus> {
  const { data } = await client.get<HealthStatus>('/health');
  return data;
}

export async function getModelHealth(): Promise<ModelHealthStatus> {
  const { data } = await client.get<ModelHealthStatus>('/health/models');
  return data;
}

export async function getThreatIntelHealth(): Promise<ThreatIntelHealthStatus> {
  const { data } = await client.get<ThreatIntelHealthStatus>('/health/threat-intel');
  return data;
}

export async function triggerSync(): Promise<SyncResponse> {
  const { data } = await client.post<SyncResponse>('/threat-intel/sync');
  return data;
}

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
    return String(detail);
  }
  return String(err);
}

// ── Deepfake API ──
import type {
  DeepfakeModelHealth,
  DeepfakeScanResult,
  DeepfakePaginatedScans,
} from '../types/api';

const deepfakeClient = axios.create({
  baseURL: '/api/deepfake',
  timeout: 660000, // 11 min — inference can take ~10 min
});

export async function getDeepfakeHealth(): Promise<DeepfakeModelHealth> {
  const { data } = await deepfakeClient.get<DeepfakeModelHealth>('/health');
  return data;
}

export async function analyzeVideo(file: File): Promise<DeepfakeScanResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await deepfakeClient.post<DeepfakeScanResult>('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listDeepfakeScans(page = 1, pageSize = 20): Promise<DeepfakePaginatedScans> {
  const { data } = await deepfakeClient.get<DeepfakePaginatedScans>('/scans', {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getDeepfakeScan(scanId: string): Promise<DeepfakeScanResult> {
  const { data } = await deepfakeClient.get<DeepfakeScanResult>(`/scans/${scanId}`);
  return data;
}

export async function deleteDeepfakeScan(scanId: string): Promise<void> {
  await deepfakeClient.delete(`/scans/${scanId}`);
}
