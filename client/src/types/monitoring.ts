/**
 * 모니터링 데이터 타입 정의
 */

// 진행 상태 타입
export type MonitoringStatus =
  | '점검완료'
  | '입력완료'
  | '점검제출'
  | '입력중'
  | '점검중'
  | '미입력';

// 기관 정보
export interface InstitutionMonitoring {
  id: string; // 기관 코드 (예: A48310001)
  name: string; // 기관명
  city: string; // 시군구
  status: MonitoringStatus; // 진행 상태
}

// 모니터링 데이터셋
export interface MonitoringDataset {
  year: string; // 연도 (예: "24년", "25년")
  type: '시군구' | '광역'; // 평가 유형
  institutions: InstitutionMonitoring[]; // 기관 목록
  lastUpdated: string; // 마지막 업데이트 날짜 (ISO 8601)
  updatedBy?: string; // 업데이트한 사용자 (선택)
}

// 모니터링 데이터 키
export type MonitoringDataKey = `${string}-${'시군구' | '광역'}`;

// 모니터링 통계
export interface MonitoringStats {
  점검완료: number;
  입력완료: number;
  점검제출: number;
  입력중: number;
  점검중: number;
  미입력: number;
  total: number;
}
