/**
 * 담당자 선택 정보 관리 유틸리티
 *
 * localStorage를 사용하여 선택된 담당자 정보를 저장하고 관리합니다.
 */

const MANAGER_STORAGE_KEY = 'selectedManager';

export interface SelectedManager {
  name: string; // 담당자 이름 ('all', '이정혜', '이연숙', '김수연', '신용기')
  timestamp: number; // 선택된 시각
}

/**
 * 선택된 담당자 정보 저장
 */
export function saveSelectedManager(managerName: string): void {
  const data: SelectedManager = {
    name: managerName,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('담당자 정보 저장 실패:', error);
  }
}

/**
 * 저장된 담당자 정보 불러오기
 */
export function loadSelectedManager(): string {
  try {
    const stored = localStorage.getItem(MANAGER_STORAGE_KEY);
    if (!stored) return 'all';

    const data: SelectedManager = JSON.parse(stored);
    return data.name || 'all';
  } catch (error) {
    console.error('담당자 정보 불러오기 실패:', error);
    return 'all';
  }
}

/**
 * 담당자 선택 정보 삭제
 */
export function clearSelectedManager(): void {
  try {
    localStorage.removeItem(MANAGER_STORAGE_KEY);
  } catch (error) {
    console.error('담당자 정보 삭제 실패:', error);
  }
}

/**
 * 담당자 선택이 유효한지 확인
 */
export function isValidManager(managerName: string): boolean {
  const validManagers = ['all', '이정혜', '이연숙', '김수연', '신용기'];
  return validManagers.includes(managerName);
}
