export interface AnalysisControlsConfig {
  referenceDate: Date;
  analysisScope: '전체 기관' | '특정 기관' | '지역별';
  matchingCriteria: 'ID 기반' | '이름 기반' | '기관+이름';
  selectedInstitutions?: string[];
  selectedRegions?: string[];
}

export interface AnalysisMetrics {
  matchingSuccessRate: number;
  completionRate: number;
  incompleteCount: number;
  totalAnalyzed: number;
  perfectScoreCount: number;
  partialCompletionCount: number;
}

export interface AnalysisResultTableRow {
  name: string;
  institution: string;
  jobType: string;
  basicEducation: '완료' | '미완료' | '진행중' | '해당없음';
  advancedEducation: '완료' | '미완료' | '진행중' | '해당없음';
  overallCompletionRate: number;
  status: '우수' | '미완료' | '진행중';
  matchStatus: '매칭성공' | '매칭실패' | '수동확인필요';
  remarks?: string;
}

export interface MatchingCriteria {
  primary: 'id' | 'name' | 'institution_name';
  fallback?: 'similarity' | 'manual_review';
  threshold?: number;
}

export interface AnalysisProgress {
  step: 'initializing' | 'matching' | 'calculating' | 'generating' | 'complete';
  percentage: number;
  currentItem?: string;
  estimatedTime?: number;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  includeCharts: boolean;
  includeDetailedReport: boolean;
  includeSummaryStats: boolean;
  customFilename?: string;
}

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type MatchStatus = '매칭성공' | '매칭실패' | '수동확인필요';
export type EducationStatus = '완료' | '미완료' | '진행중' | '해당없음';
export type OverallStatus = '우수' | '미완료' | '진행중';
