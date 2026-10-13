// CyberShield AI — shared TypeScript types

export type RiskCategory = 'phishing' | 'suspicious' | 'safe' | 'inconclusive';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TLSStatus = 'valid' | 'invalid' | 'unavailable' | 'not_applicable';
export type ThreatIntelSyncStatus = 'synced' | 'syncing' | 'failed' | 'never_synced' | 'stale';

export interface URLFeatures {
  url_length: number;
  hostname_length: number;
  path_length: number;
  num_subdomains: number;
  num_dots: number;
  num_hyphens: number;
  num_digits: number;
  num_special_chars: number;
  is_ip_address: boolean;
  uses_https: boolean;
  has_at_sign: boolean;
  num_query_params: number;
  num_path_segments: number;
  has_suspicious_tokens: boolean;
  has_encoded_chars: boolean;
  has_punycode: boolean;
  has_misleading_hostname: boolean;
  has_double_slash_redirect: boolean;
}

export interface MLModelResult {
  available: boolean;
  prediction?: string;
  model_score?: number;
  probability_phishing?: number;
  model_version?: string;
  model_name?: string;
  error?: string;
}

export interface ThreatIntelResult {
  checked: boolean;
  matched: boolean;
  matched_entry?: string;
  source_name?: string;
  source_url?: string;
  list_version?: string;
  entry_count?: number;
  error?: string;
}

export interface DNSFindings {
  hostname?: string;
  a_records: string[];
  aaaa_records: string[];
  mx_records: string[];
  ns_records: string[];
  cname?: string;
  resolution_successful?: boolean;
  lookup_latency_ms?: number;
  error?: string;
  available: boolean;
}

export interface DomainRegistrationInfo {
  domain?: string;
  creation_date?: string;
  domain_age_days?: number;
  registrar?: string;
  data_source?: string;
  lookup_timestamp?: string;
  available: boolean;
  error?: string;
}

export interface TLSFindings {
  hostname?: string;
  status: TLSStatus;
  is_valid?: boolean;
  subject_cn?: string;
  issuer?: string;
  not_before?: string;
  not_after?: string;
  days_until_expiry?: number;
  hostname_matches?: boolean;
  error?: string;
}

export interface ScanResult {
  scan_id: string;
  scan_type: string;
  status: ScanStatus;
  risk_category?: RiskCategory;
  normalized_hostname?: string;
  url_features?: URLFeatures;
  ml_result?: MLModelResult;
  threat_intel_result?: ThreatIntelResult;
  dns_findings?: DNSFindings;
  domain_registration?: DomainRegistrationInfo;
  tls_findings?: TLSFindings;
  key_evidence: string[];
  missing_data: string[];
  recommended_actions: string[];
  explanations: string[];
  created_at?: string;
  completed_at?: string;
  processing_duration_ms?: number;
  error?: string;
}

export interface ScanSummary {
  scan_id: string;
  status: ScanStatus;
  risk_category?: RiskCategory;
  normalized_hostname?: string;
  created_at?: string;
  processing_duration_ms?: number;
  threat_intel_matched: boolean;
  ml_score?: number;
}

export interface PaginatedScans {
  items: ScanSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardStats {
  total_scans: number;
  phishing_count: number;
  suspicious_count: number;
  safe_count: number;
  inconclusive_count: number;
  threat_intel_matches: number;
  recent_scans: ScanSummary[];
  model_available: boolean;
  model_version?: string;
  threat_intel_status?: string;
  threat_intel_entry_count?: number;
  threat_intel_last_updated?: string;
}

export interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
  version: string;
}

export interface ModelHealthStatus {
  model_name: string;
  available: boolean;
  version?: string;
  model_type?: string;
  artifact_path?: string;
  last_check?: string;
  error?: string;
}

export interface ThreatIntelHealthStatus {
  source_name: string;
  source_url: string;
  sync_status: ThreatIntelSyncStatus;
  last_attempted?: string;
  last_successful?: string;
  entry_count?: number;
  content_hash?: string;
  in_memory_count?: number;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  entry_count?: number;
  content_hash?: string;
  duration_seconds?: number;
}

// ── Deepfake Types ──
export type DeepfakeStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DeepfakeClassification = 'likely_real' | 'likely_manipulated' | 'inconclusive';
export type ModelInitStatus =
  | 'ready'
  | 'weights_missing'
  | 'dependencies_missing'
  | 'initializing'
  | 'error'
  | 'unavailable';

export interface DeepfakeFinding {
  label: string;
  value: string;
  detail?: string;
}

export interface DeepfakeScanResult {
  scan_id: string;
  status: DeepfakeStatus;
  classification?: DeepfakeClassification;
  score?: number;
  confidence_score?: number;
  primary_reason?: string;
  score_type?: string;
  score_interpretation?: string;
  model_name?: string;
  model_version?: string;
  inference_device?: string;
  processing_duration_ms?: number;
  video_duration_seconds?: number;
  frames_processed?: number;
  clips_processed?: number;
  findings: DeepfakeFinding[];
  warnings: string[];
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

export interface DeepfakeScanSummary {
  scan_id: string;
  status: DeepfakeStatus;
  classification?: DeepfakeClassification;
  score?: number;
  model_name?: string;
  video_duration_seconds?: number;
  frames_processed?: number;
  processing_duration_ms?: number;
  created_at?: string;
  completed_at?: string;
}

export interface DeepfakePaginatedScans {
  items: DeepfakeScanSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeepfakeModelHealth {
  detector_name: string;
  init_status: ModelInitStatus;
  checkpoint_available: boolean;
  checkpoint_path?: string;
  dependencies_available: boolean;
  device?: string;
  model_version?: string;
  last_successful_inference?: string;
  error_detail?: string;
  paper?: string;
  license?: string;
  attribution?: string;
  setup_instructions?: string;
}
