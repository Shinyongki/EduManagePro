/**
 * 담당자-기관 매핑 관리 유틸리티
 *
 * localStorage를 사용하여 커스텀 담당자-기관 매핑을 저장하고 관리합니다.
 * 기본 매핑과 커스텀 매핑을 병합하여 사용합니다.
 */

import { GWANGYEOK_MANAGER_MAPPING as DEFAULT_MAPPING } from '@/constants/managers';

const CUSTOM_MAPPING_KEY = 'customManagerMapping';

export interface ManagerMapping {
  [institutionCode: string]: string; // institutionCode -> managerName
}

/**
 * 커스텀 매핑 저장
 */
export function saveCustomMapping(mapping: ManagerMapping): void {
  try {
    localStorage.setItem(CUSTOM_MAPPING_KEY, JSON.stringify(mapping));
    console.log('✅ 커스텀 매핑 저장 완료:', Object.keys(mapping).length, '개 기관');
  } catch (error) {
    console.error('❌ 커스텀 매핑 저장 실패:', error);
  }
}

/**
 * 커스텀 매핑 불러오기
 */
export function loadCustomMapping(): ManagerMapping {
  try {
    const stored = localStorage.getItem(CUSTOM_MAPPING_KEY);
    if (!stored) return {};

    const mapping: ManagerMapping = JSON.parse(stored);
    console.log('✅ 커스텀 매핑 로드:', Object.keys(mapping).length, '개 기관');
    return mapping;
  } catch (error) {
    console.error('❌ 커스텀 매핑 로드 실패:', error);
    return {};
  }
}

/**
 * 기본 매핑과 커스텀 매핑을 병합하여 최종 매핑 반환
 * 커스텀 매핑이 우선합니다.
 */
export function getMergedMapping(): ManagerMapping {
  const customMapping = loadCustomMapping();
  return {
    ...DEFAULT_MAPPING,
    ...customMapping
  };
}

/**
 * 특정 기관의 담당자 업데이트
 */
export function updateInstitutionManager(
  institutionCode: string,
  managerName: string
): void {
  const customMapping = loadCustomMapping();
  customMapping[institutionCode] = managerName;
  saveCustomMapping(customMapping);
}

/**
 * 여러 기관의 담당자 일괄 업데이트
 */
export function updateMultipleInstitutions(
  updates: Array<{ institutionCode: string; managerName: string }>
): void {
  const customMapping = loadCustomMapping();

  updates.forEach(({ institutionCode, managerName }) => {
    customMapping[institutionCode] = managerName;
  });

  saveCustomMapping(customMapping);
}

/**
 * 특정 기관의 커스텀 매핑 삭제 (기본값으로 복원)
 */
export function resetInstitutionToDefault(institutionCode: string): void {
  const customMapping = loadCustomMapping();
  delete customMapping[institutionCode];
  saveCustomMapping(customMapping);
}

/**
 * 모든 커스텀 매핑 삭제 (전체 기본값으로 복원)
 */
export function resetAllToDefault(): void {
  try {
    localStorage.removeItem(CUSTOM_MAPPING_KEY);
    console.log('✅ 모든 커스텀 매핑 삭제 완료');
  } catch (error) {
    console.error('❌ 커스텀 매핑 삭제 실패:', error);
  }
}

/**
 * 특정 담당자의 기관 목록 조회
 */
export function getInstitutionsByManager(managerName: string): string[] {
  const mergedMapping = getMergedMapping();
  return Object.entries(mergedMapping)
    .filter(([_, manager]) => manager === managerName)
    .map(([code, _]) => code);
}

/**
 * 기관 코드로 담당자 조회 (병합된 매핑 사용)
 */
export function getManagerByInstitution(institutionCode: string): string | undefined {
  const mergedMapping = getMergedMapping();
  return mergedMapping[institutionCode];
}

/**
 * 커스텀 매핑 여부 확인
 */
export function isCustomMapping(institutionCode: string): boolean {
  const customMapping = loadCustomMapping();
  return institutionCode in customMapping;
}
