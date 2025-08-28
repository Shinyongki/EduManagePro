/**
 * 기관명 매칭 유틸리티
 * 다양한 형태의 기관명을 정규화하고 매칭하는 기능 제공
 */

/**
 * 기관명 정규화 함수
 * 기관명의 다양한 표기법을 통일된 형태로 변환
 */
export const normalizeInstitutionName = (name: string | undefined | null): string => {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // 1. 광역 표시 통일
  normalized = normalized
    .replace(/^\(광역\)/g, '')
    .replace(/^광역/g, '')
    .replace(/\*광역지원기관/g, '')
    .replace(/광역지원기관/g, '');
  
  // 2. 법인 형태 표시 통일
  normalized = normalized
    .replace(/\(재\)/g, '')
    .replace(/\(사\)/g, '')
    .replace(/\(주\)/g, '')
    .replace(/재단법인/g, '')
    .replace(/사단법인/g, '')
    .replace(/주식회사/g, '');
  
  // 3. 시설 유형 표기 통일
  normalized = normalized
    .replace(/종합사회복지관/g, '사회복지관')
    .replace(/노인종합복지관/g, '노인복지관')
    .replace(/장애인종합복지관/g, '장애인복지관')
    .replace(/통합지원센터/g, '지원센터');
  
  // 4. 지역명 표기 통일
  normalized = normalized
    .replace(/경상남도/g, '경남')
    .replace(/경남도/g, '경남');
  
  // 5. 공백 및 특수문자 정리
  normalized = normalized
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .replace(/[()]/g, '') // 괄호 제거
    .replace(/\./g, '') // 마침표 제거
    .replace(/,/g, ''); // 쉼표 제거
  
  // 6. 앞뒤 공백 제거
  normalized = normalized.trim();
  
  return normalized;
};

/**
 * 두 기관명이 동일한지 비교
 * 정규화 후 비교하여 다양한 표기법 허용
 */
export const isInstitutionMatch = (
  name1: string | undefined | null,
  name2: string | undefined | null
): boolean => {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeInstitutionName(name1).toLowerCase();
  const normalized2 = normalizeInstitutionName(name2).toLowerCase();
  
  // 1. 정규화된 이름이 완전히 일치
  if (normalized1 === normalized2) return true;
  
  // 2. 한쪽이 다른 쪽을 포함 (부분 매칭)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // 3. 핵심 키워드 매칭 (2개 이상 일치)
  const keywords1 = extractKeywords(normalized1);
  const keywords2 = extractKeywords(normalized2);
  
  if (keywords1.length >= 2 && keywords2.length >= 2) {
    const matchCount = keywords1.filter(k1 => 
      keywords2.some(k2 => k1 === k2 || k1.includes(k2) || k2.includes(k1))
    ).length;
    
    if (matchCount >= 2) return true;
  }
  
  // 4. 지역명 + 시설유형 매칭
  const location1 = extractLocation(normalized1);
  const location2 = extractLocation(normalized2);
  const facility1 = extractFacilityType(normalized1);
  const facility2 = extractFacilityType(normalized2);
  
  if (location1 && location2 && facility1 && facility2) {
    if (location1 === location2 && facility1 === facility2) {
      return true;
    }
  }
  
  return false;
};

/**
 * 기관명에서 핵심 키워드 추출
 */
const extractKeywords = (name: string): string[] => {
  const stopWords = ['시', '군', '구', '읍', '면', '동', '리', '및', '와', '과', '의', '를', '을', '에', '도'];
  
  const words = name.split(/[\s\-_]+/)
    .filter(word => word.length > 1)
    .filter(word => !stopWords.includes(word));
  
  return words;
};

/**
 * 기관명에서 지역명 추출 (시도, 시군구 정보 포함)
 */
const extractLocation = (name: string): string | null => {
  const locations = [
    '창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산',
    '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양',
    '거창', '합천', '경남', '경상남도'
  ];
  
  for (const location of locations) {
    if (name.includes(location.toLowerCase())) {
      return location.toLowerCase();
    }
  }
  
  return null;
};

/**
 * 기관명에서 시도 정보 추출
 */
export const extractSido = (name: string | undefined): string => {
  if (!name) return '';
  
  const normalizedName = name.toLowerCase();
  
  // 시/도 매핑
  const sidoMap: Record<string, string> = {
    '서울': '서울특별시',
    '부산': '부산광역시', 
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시',
    '경기': '경기도',
    '강원': '강원특별자치도',
    '충북': '충청북도',
    '충남': '충청남도', 
    '전북': '전라북도',
    '전남': '전라남도',
    '경북': '경상북도',
    '경남': '경상남도',
    '제주': '제주특별자치도'
  };
  
  // 정확한 시도명이 포함된 경우
  for (const [key, value] of Object.entries(sidoMap)) {
    if (normalizedName.includes(key.toLowerCase()) || 
        normalizedName.includes(value.toLowerCase())) {
      return value;
    }
  }
  
  // 특정 지역명으로 시도 추정
  const regionToSido: Record<string, string> = {
    '창원': '경상남도', '진주': '경상남도', '통영': '경상남도', '사천': '경상남도',
    '김해': '경상남도', '밀양': '경상남도', '거제': '경상남도', '양산': '경상남도',
    '의령': '경상남도', '함안': '경상남도', '창녕': '경상남도', '고성': '경상남도',
    '남해': '경상남도', '하동': '경상남도', '산청': '경상남도', '함양': '경상남도',
    '거창': '경상남도', '합천': '경상남도',
    '수원': '경기도', '성남': '경기도', '안양': '경기도', '부천': '경기도',
    '안산': '경기도', '고양': '경기도', '과천': '경기도', '구리': '경기도',
    '강남': '서울특별시', '서초': '서울특별시', '송파': '서울특별시', '강동': '서울특별시'
  };
  
  for (const [region, sido] of Object.entries(regionToSido)) {
    if (normalizedName.includes(region.toLowerCase())) {
      return sido;
    }
  }
  
  return '';
};

/**
 * 기관명에서 시군구 정보 추출
 */
export const extractSigungu = (name: string | undefined): string => {
  if (!name) return '';
  
  const normalizedName = name.toLowerCase();
  
  // 시/군/구 키워드 매핑
  const sigunguPatterns = [
    // 서울특별시 구
    '강남구', '서초구', '송파구', '강동구', '마포구', '종로구', '중구', '용산구',
    '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구', '도봉구', '노원구',
    '은평구', '서대문구', '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
    
    // 경기도 시/군
    '수원시', '성남시', '안양시', '부천시', '광명시', '평택시', '동두천시', '안산시',
    '고양시', '과천시', '구리시', '남양주시', '오산시', '시흥시', '군포시', '의왕시',
    '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시', '광주시',
    '양주시', '포천시', '여주시', '연천군', '가평군', '양평군',
    
    // 경상남도 시/군
    '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시',
    '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군',
    '거창군', '합천군',
    
    // 기타 주요 시군구
    '부산시', '대구시', '인천시', '광주시', '대전시', '울산시'
  ];
  
  // 정확한 매칭 우선
  for (const pattern of sigunguPatterns) {
    if (normalizedName.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  
  // 부분 매칭 (시, 군, 구 제거)
  const partialPatterns = sigunguPatterns.map(p => p.replace(/(시|군|구)$/, ''));
  for (let i = 0; i < partialPatterns.length; i++) {
    if (normalizedName.includes(partialPatterns[i].toLowerCase())) {
      return sigunguPatterns[i];
    }
  }
  
  return '';
};

/**
 * 기관명에서 시설 유형 추출
 */
const extractFacilityType = (name: string): string | null => {
  const facilityTypes = [
    { pattern: '사회복지관', type: '사회복지관' },
    { pattern: '복지관', type: '복지관' },
    { pattern: '노인복지', type: '노인복지' },
    { pattern: '장애인복지', type: '장애인복지' },
    { pattern: '지원센터', type: '지원센터' },
    { pattern: '요양원', type: '요양원' },
    { pattern: '요양병원', type: '요양병원' },
    { pattern: '재활원', type: '재활원' },
    { pattern: '보호작업장', type: '보호작업장' },
    { pattern: '주간보호', type: '주간보호' },
    { pattern: '단기보호', type: '단기보호' },
    { pattern: '공동생활가정', type: '공동생활가정' },
    { pattern: '그룹홈', type: '그룹홈' },
    { pattern: '쉼터', type: '쉼터' },
    { pattern: '상담소', type: '상담소' }
  ];
  
  for (const { pattern, type } of facilityTypes) {
    if (name.includes(pattern.toLowerCase())) {
      return type;
    }
  }
  
  return null;
};

/**
 * 기관 코드 매칭
 * 기관 코드가 있는 경우 우선적으로 사용
 */
export const isInstitutionCodeMatch = (
  code1: string | undefined | null,
  code2: string | undefined | null
): boolean => {
  if (!code1 || !code2) return false;
  
  // 코드 정규화 (공백, 특수문자 제거)
  const normalized1 = code1.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalized2 = code2.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  return normalized1 === normalized2;
};

/**
 * 종합 기관 매칭 함수
 * 코드와 이름을 모두 고려하여 매칭
 */
export const matchInstitution = (
  inst1: { code?: string; name?: string },
  inst2: { code?: string; name?: string }
): boolean => {
  // 1. 코드가 둘 다 있으면 코드로 매칭 (최우선)
  if (inst1.code && inst2.code) {
    return isInstitutionCodeMatch(inst1.code, inst2.code);
  }
  
  // 2. 이름으로 매칭 (코드가 없는 경우)
  return isInstitutionMatch(inst1.name, inst2.name);
};

/**
 * 기관 리스트에서 가장 유사한 기관 찾기
 */
export const findBestMatchingInstitution = <T extends { code?: string; name?: string }>(
  target: { code?: string; name?: string },
  institutions: T[]
): T | null => {
  // 1. 코드로 정확히 매칭되는 기관 찾기
  if (target.code) {
    const codeMatch = institutions.find(inst => 
      isInstitutionCodeMatch(inst.code, target.code)
    );
    if (codeMatch) return codeMatch;
  }
  
  // 2. 이름으로 매칭되는 기관 찾기
  if (target.name) {
    const nameMatch = institutions.find(inst => 
      isInstitutionMatch(inst.name, target.name)
    );
    if (nameMatch) return nameMatch;
  }
  
  // 3. 유사도가 가장 높은 기관 찾기 (옵션)
  // TODO: 레벤슈타인 거리 등을 이용한 유사도 계산 추가 가능
  
  return null;
};

/**
 * 디버깅용: 기관명 매칭 상세 정보 출력
 */
export const debugInstitutionMatch = (
  name1: string,
  name2: string
): {
  match: boolean;
  normalized1: string;
  normalized2: string;
  keywords1: string[];
  keywords2: string[];
  location1: string | null;
  location2: string | null;
  facility1: string | null;
  facility2: string | null;
} => {
  const normalized1 = normalizeInstitutionName(name1).toLowerCase();
  const normalized2 = normalizeInstitutionName(name2).toLowerCase();
  
  return {
    match: isInstitutionMatch(name1, name2),
    normalized1,
    normalized2,
    keywords1: extractKeywords(normalized1),
    keywords2: extractKeywords(normalized2),
    location1: extractLocation(normalized1),
    location2: extractLocation(normalized2),
    facility1: extractFacilityType(normalized1),
    facility2: extractFacilityType(normalized2)
  };
};

// ===== 기관 분류 시스템 =====

export interface InstitutionAnalysis {
  totalInstitutions: number;
  managedInstitutions: string[];
  specifiedUnmanagedInstitutions: string[];
  unmanagedInstitutions: string[];
  closedInstitutions: string[];
  summary: {
    managed: number;
    specifiedUnmanaged: number;
    unmanaged: number;
    closed: number;
    target: number;
  };
}

// 기관 분류 타입
export type InstitutionCategory = 'managed' | 'specified-unmanaged' | 'unmanaged' | 'closed' | 'unknown';

// 기관 분석 결과를 로드하는 함수
let cachedAnalysis: InstitutionAnalysis | null = null;

export async function loadInstitutionAnalysis(): Promise<InstitutionAnalysis | null> {
  if (cachedAnalysis) {
    return cachedAnalysis;
  }

  try {
    const response = await fetch('/data/institution-analysis.json');
    if (response.ok) {
      cachedAnalysis = await response.json();
      return cachedAnalysis;
    }
  } catch (error) {
    console.warn('Failed to load institution analysis:', error);
  }
  
  return null;
}

// 기관명을 통해 카테고리를 분류하는 함수
export async function categorizeInstitution(institutionName: string): Promise<InstitutionCategory> {
  const analysis = await loadInstitutionAnalysis();
  
  if (!analysis || !institutionName) {
    return 'unknown';
  }

  // 정확히 매칭되는지 확인
  if (analysis.managedInstitutions.includes(institutionName)) {
    return 'managed';
  }
  
  if (analysis.specifiedUnmanagedInstitutions?.includes(institutionName)) {
    return 'specified-unmanaged';
  }
  
  if (analysis.unmanagedInstitutions.includes(institutionName)) {
    return 'unmanaged';
  }
  
  if (analysis.closedInstitutions?.includes(institutionName)) {
    return 'closed';
  }

  return 'unknown';
}

// 기관 목록을 카테고리별로 필터링하는 함수
export async function filterInstitutionsByCategory(
  institutions: string[], 
  category: InstitutionCategory | InstitutionCategory[]
): Promise<string[]> {
  const analysis = await loadInstitutionAnalysis();
  
  if (!analysis) {
    return institutions;
  }

  const categories = Array.isArray(category) ? category : [category];
  const filtered: string[] = [];
  
  for (const institution of institutions) {
    const institutionCategory = await categorizeInstitution(institution);
    if (categories.includes(institutionCategory)) {
      filtered.push(institution);
    }
  }
  
  return filtered;
}

// 관리 기관만 필터링
export async function getManagedInstitutions(institutions: string[]): Promise<string[]> {
  return filterInstitutionsByCategory(institutions, 'managed');
}

// 비관리 기관만 필터링
export async function getUnmanagedInstitutions(institutions: string[]): Promise<string[]> {
  return filterInstitutionsByCategory(institutions, ['specified-unmanaged', 'unmanaged']);
}

// 종료/폐지 기관 제외하고 필터링
export async function getActiveInstitutions(institutions: string[]): Promise<string[]> {
  return filterInstitutionsByCategory(institutions, ['managed', 'specified-unmanaged', 'unmanaged']);
}

// 기관 통계 정보 제공
export async function getInstitutionStats(): Promise<InstitutionAnalysis['summary'] | null> {
  const analysis = await loadInstitutionAnalysis();
  return analysis?.summary || null;
}

// 캐시 리셋 (데이터 업데이트 시 사용)
export function resetInstitutionAnalysisCache(): void {
  cachedAnalysis = null;
}

// 퇴사자 필터링 함수 (근무종료 관련 문제 해결)
export function filterActiveEmployees<T extends { 
  isActive?: boolean; 
  resignDate?: string | null; 
  notes?: string;
  remarks?: string;
  note?: string;
}>(employees: T[]): T[] {
  return employees.filter(emp => {
    // isActive가 명시적으로 false인 경우 제외
    if (emp.isActive === false) {
      return false;
    }
    
    // 퇴사일이 있는 경우 제외
    if (emp.resignDate && emp.resignDate.trim() !== '') {
      return false;
    }
    
    // 비고에 종료/퇴사 관련 키워드가 있는 경우 제외
    const notes = [emp.notes, emp.remarks, emp.note].filter(Boolean).join(' ').toLowerCase();
    if (notes.includes('종료') || notes.includes('퇴사') || notes.includes('퇴사함') || notes.includes('계약종료')) {
      return false;
    }
    
    return true;
  });
}