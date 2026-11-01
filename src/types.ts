export type TabType = 'upload' | 'schema' | 'methodology' | 'workspace';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ColumnDictionary {
  column_name: string;
  inferred_type: string;
  description: string;
  cleaning_recommendation: string;
  risk_flag: RiskLevel;
}

export interface DataDictionaryResult {
  dataset_summary: string;
  columns: ColumnDictionary[];
  overall_data_quality_score: number;
}

export interface ColumnStat {
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
}

export interface DatasetSummary {
  filename: string;
  columns: string[];
  dtypes: Record<string, string>;
  stats?: Record<string, ColumnStat>;
  preview: Record<string, any>[];
  row_count: number;
  col_count: number;
  uploaded_at: string;
}

export interface SessionState {
  activeTab: TabType;
  connectionStatus: 'online' | 'offline' | 'checking';
  fileSummary: DatasetSummary | null;
  dictionary: DataDictionaryResult | null;
  cleaningNotes: string;
  methodologyText: string;
  lastUpdated: string;
}
