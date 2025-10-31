/**
 * 모니터링 데이터 저장소
 *
 * IndexedDB를 사용하여 연도별/유형별 모니터링 데이터를 저장하고 관리합니다.
 */

import { IndexedDBStorage } from './indexeddb';
import type {
  MonitoringDataset,
  MonitoringDataKey,
  InstitutionMonitoring,
  MonitoringStats,
} from '@/types/monitoring';

const MONITORING_KEY_PREFIX = 'monitoring-';

/**
 * 모니터링 데이터 키 생성
 */
export function createMonitoringKey(
  year: string,
  type: '시군구' | '광역'
): MonitoringDataKey {
  return `${year}-${type}` as MonitoringDataKey;
}

/**
 * 모니터링 데이터 저장
 */
export async function saveMonitoringData(
  dataset: MonitoringDataset
): Promise<void> {
  try {
    const db = new IndexedDBStorage();
    const key = `${MONITORING_KEY_PREFIX}${createMonitoringKey(dataset.year, dataset.type)}`;

    await db.setItem(key, dataset);
    console.log(`✅ 모니터링 데이터 저장: ${dataset.year} ${dataset.type} (${dataset.institutions.length}개 기관)`);
  } catch (error) {
    console.error('❌ 모니터링 데이터 저장 실패:', error);
    throw new Error('모니터링 데이터 저장에 실패했습니다.');
  }
}

/**
 * 모니터링 데이터 불러오기
 */
export async function loadMonitoringData(
  year: string,
  type: '시군구' | '광역'
): Promise<MonitoringDataset | null> {
  try {
    const db = new IndexedDBStorage();
    const key = `${MONITORING_KEY_PREFIX}${createMonitoringKey(year, type)}`;

    const dataset = await db.getItem<MonitoringDataset>(key);
    if (dataset) {
      console.log(`✅ 모니터링 데이터 로드: ${year} ${type} (${dataset.institutions.length}개 기관)`);
      return dataset;
    }

    console.log(`⚠️ 모니터링 데이터 없음: ${year} ${type}`);
    return null;
  } catch (error) {
    console.error('❌ 모니터링 데이터 로드 실패:', error);
    return null;
  }
}

/**
 * 모든 모니터링 데이터 불러오기
 */
export async function loadAllMonitoringData(): Promise<MonitoringDataset[]> {
  const years = ['24년', '25년'];
  const types: ('시군구' | '광역')[] = ['시군구', '광역'];
  const datasets: MonitoringDataset[] = [];

  for (const year of years) {
    for (const type of types) {
      const dataset = await loadMonitoringData(year, type);
      if (dataset) {
        datasets.push(dataset);
      }
    }
  }

  return datasets;
}

/**
 * 특정 기관의 상태 업데이트
 */
export async function updateInstitutionStatus(
  year: string,
  type: '시군구' | '광역',
  institutionId: string,
  newStatus: MonitoringDataset['institutions'][0]['status']
): Promise<void> {
  const dataset = await loadMonitoringData(year, type);
  if (!dataset) {
    throw new Error('모니터링 데이터를 찾을 수 없습니다.');
  }

  const institution = dataset.institutions.find(inst => inst.id === institutionId);
  if (!institution) {
    throw new Error('기관을 찾을 수 없습니다.');
  }

  institution.status = newStatus;
  dataset.lastUpdated = new Date().toISOString();

  await saveMonitoringData(dataset);
}

/**
 * 여러 기관의 상태 일괄 업데이트
 */
export async function updateMultipleInstitutionStatuses(
  year: string,
  type: '시군구' | '광역',
  updates: Array<{ institutionId: string; status: InstitutionMonitoring['status'] }>
): Promise<void> {
  const dataset = await loadMonitoringData(year, type);
  if (!dataset) {
    throw new Error('모니터링 데이터를 찾을 수 없습니다.');
  }

  updates.forEach(({ institutionId, status }) => {
    const institution = dataset.institutions.find(inst => inst.id === institutionId);
    if (institution) {
      institution.status = status;
    }
  });

  dataset.lastUpdated = new Date().toISOString();
  await saveMonitoringData(dataset);
}

/**
 * 모니터링 데이터 삭제
 */
export async function deleteMonitoringData(
  year: string,
  type: '시군구' | '광역'
): Promise<void> {
  try {
    const db = new IndexedDBStorage();
    const key = `${MONITORING_KEY_PREFIX}${createMonitoringKey(year, type)}`;

    await db.removeItem(key);
    console.log(`✅ 모니터링 데이터 삭제: ${year} ${type}`);
  } catch (error) {
    console.error('❌ 모니터링 데이터 삭제 실패:', error);
    throw new Error('모니터링 데이터 삭제에 실패했습니다.');
  }
}

/**
 * 통계 계산
 */
export function calculateStats(dataset: MonitoringDataset): MonitoringStats {
  const stats: MonitoringStats = {
    점검완료: 0,
    입력완료: 0,
    점검제출: 0,
    입력중: 0,
    점검중: 0,
    미입력: 0,
    total: dataset.institutions.length,
  };

  dataset.institutions.forEach(inst => {
    stats[inst.status]++;
  });

  return stats;
}

/**
 * Excel/CSV 데이터를 모니터링 데이터셋으로 변환
 */
export function parseMonitoringData(
  rawData: any[],
  year: string,
  type: '시군구' | '광역'
): MonitoringDataset {
  const institutions: InstitutionMonitoring[] = rawData
    .filter(row => row.id && row.name && row.city && row.status)
    .map(row => ({
      id: String(row.id).trim(),
      name: String(row.name).trim(),
      city: String(row.city).trim(),
      status: String(row.status).trim() as InstitutionMonitoring['status'],
    }));

  return {
    year,
    type,
    institutions,
    lastUpdated: new Date().toISOString(),
  };
}
