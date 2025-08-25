import type { EmployeeData, EducationData, EducationParticipant } from '@shared/schema';

/**
 * 통합 데이터 관리 유틸리티
 * 모든 페이지에서 일관된 데이터 처리를 위한 표준 함수들
 * 
 * 목적: 소속 회원(3349명) vs 교육통계(2553명) 불일치 해결
 */

export interface UnifiedPerson {
  id?: string;
  name: string;
  birthDate?: string;
  institution: string;
  institutionCode?: string;
  jobType?: string;
  isActive: boolean;
  resignDate?: string;
  // 교육 정보
  basicEducationStatus?: string;
  advancedEducationStatus?: string;
  finalCompletion?: string;
  // 메타 정보
  source: 'employee' | 'participant' | 'education';
  merged?: boolean;
}

/**
 * 1. 표준 재직자 판정 함수
 * 모든 페이지에서 동일한 재직자 판정 기준 적용
 * '중지', '탈퇴', '휴면상태' 등 비활성 상태는 제외
 */
export const isActiveEmployee = (
  person: any, 
  employeeData: EmployeeData[],
  referenceDate?: string // 스냅샷 날짜 기준 (YYYY-MM-DD)
): boolean => {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  
  // 비활성 상태 키워드 정의
  const inactiveStatuses = [
    '중지', '탈퇴', '휴면', '휴면상태', '정지', '퇴사', '해지', '종료',
    '중단', '비활성', 'inactive', 'suspended', 'terminated', 'resigned'
  ];
  
  // 상태 필드에서 비활성 키워드 확인
  const checkInactiveStatus = (statusField: any): boolean => {
    if (!statusField) return false;
    const status = String(statusField).toLowerCase().trim();
    return inactiveStatuses.some(keyword => 
      status.includes(keyword.toLowerCase()) || status.includes(keyword)
    );
  };
  
  // 1단계: 종사자 데이터와 매칭 (이름 + 생년월일 우선)
  const matchingEmployee = employeeData.find(emp => {
    // 정확한 매칭: 이름 + 생년월일
    if (emp.name === person.name && emp.birthDate === person.birthDate) {
      return true;
    }
    // 차선책: 이름 + ID (생년월일이 없는 경우)
    if (!person.birthDate && emp.name === person.name && emp.id === person.id) {
      return true;
    }
    return false;
  });
  
  if (matchingEmployee) {
    // 비활성 상태 확인 (종사자 데이터 우선)
    if (checkInactiveStatus(matchingEmployee.status) || 
        checkInactiveStatus(matchingEmployee.employmentStatus) ||
        checkInactiveStatus(matchingEmployee.workStatus)) {
      return false;
    }
    
    // 퇴사일 확인
    if (matchingEmployee.resignDate) {
      try {
        const resignDate = new Date(matchingEmployee.resignDate);
        const isActive = resignDate > refDate;
        if (!isActive) return false;
      } catch (error) {
        console.warn(`퇴사일 파싱 오류: ${matchingEmployee.resignDate}`);
      }
    }
    
    // isActive 필드 확인 (false인 경우 비재직자)
    if (matchingEmployee.isActive === false) {
      return false;
    }
    
    // 모든 조건 통과시 재직자로 판정
    return true;
  }
  
  // 2단계: 참가자/교육 데이터의 재직 정보 활용
  // 비활성 상태 확인
  if (checkInactiveStatus(person.status) || 
      checkInactiveStatus(person.employmentStatus) ||
      checkInactiveStatus(person.workStatus) ||
      checkInactiveStatus(person.memberStatus)) {
    return false;
  }
  
  // 퇴사일 확인
  if (person.resignDate) {
    try {
      const resignDate = new Date(person.resignDate);
      const isActive = resignDate > refDate;
      if (!isActive) return false;
    } catch (error) {
      console.warn(`퇴사일 파싱 오류: ${person.resignDate}`);
    }
  }
  
  // isActive 필드 확인
  if (person.isActive === false) {
    return false;
  }
  
  // 기본값: 재직자로 판정 (단, 명시적으로 비활성 상태가 아닌 경우)
  return true;
};

/**
 * 생년월일 정규화 함수
 * 다양한 형태의 생년월일을 표준 형태로 변환
 */
const normalizeBirthDate = (birthDate: any): string | null => {
  if (!birthDate) return null;
  
  const dateStr = birthDate.toString().trim();
  if (!dateStr || dateStr === '-' || dateStr === 'undefined' || dateStr === 'null') return null;
  
  // 숫자만 추출 (YYYYMMDD 형태로 정규화)
  const numbersOnly = dateStr.replace(/[^0-9]/g, '');
  
  // 8자리 숫자인지 확인
  if (numbersOnly.length === 8) {
    const year = parseInt(numbersOnly.substring(0, 4));
    const month = parseInt(numbersOnly.substring(4, 6));
    const day = parseInt(numbersOnly.substring(6, 8));
    
    // 유효한 날짜인지 검증
    if (year >= 1900 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return numbersOnly;
    }
  }
  
  // 6자리 숫자인 경우 (YYMMDD → YYYYMMDD)
  if (numbersOnly.length === 6) {
    const year = parseInt(numbersOnly.substring(0, 2));
    const fullYear = year >= 30 ? 1900 + year : 2000 + year; // 30 이상이면 19xx, 미만이면 20xx
    const month = parseInt(numbersOnly.substring(2, 4));
    const day = parseInt(numbersOnly.substring(4, 6));
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${fullYear}${numbersOnly.substring(2)}`;
    }
  }
  
  return null;
};

/**
 * 2. 표준 중복 제거 함수 (개선된 버전)
 * 이름+생년월일 조합을 우선으로 하는 엄격한 중복 제거
 */
export const getUniquePersons = <T extends any>(persons: T[]): T[] => {
  const uniqueMap = new Map<string, T>();
  const debugCounts = { 
    processed: 0, 
    skipped: 0, 
    duplicates: 0,
    nameOnlyMatches: 0, // 이름만 일치하는 경우 (동명이인 가능성)
    exactMatches: 0     // 이름+생년월일 정확 일치
  };
  
  persons.forEach(person => {
    debugCounts.processed++;
    
    // 이름이 없으면 스킵
    if (!person.name || typeof person.name !== 'string' || person.name.trim().length === 0) {
      debugCounts.skipped++;
      return;
    }
    
    const name = person.name.trim();
    const normalizedBirthDate = normalizeBirthDate(person.birthDate);
    
    // 매칭 키 생성 (우선순위별)
    const matchingKeys = [];
    
    // 1순위: 이름 + 생년월일 (가장 신뢰할 수 있는 매칭)
    if (normalizedBirthDate) {
      matchingKeys.push({
        key: `${name}_${normalizedBirthDate}`,
        type: 'exact',
        priority: 1
      });
    }
    
    // 2순위: 이름 + ID (생년월일이 없는 경우)
    if (person.id && person.id.toString().trim() !== '') {
      matchingKeys.push({
        key: `${name}_ID_${person.id}`,
        type: 'id_based',
        priority: 2
      });
    }
    
    // 매칭 키가 없으면 이름으로만 임시 키 생성 (경고와 함께)
    if (matchingKeys.length === 0) {
      matchingKeys.push({
        key: `${name}_NAME_ONLY`,
        type: 'name_only',
        priority: 3
      });
    }
    
    // 가장 높은 우선순위 키부터 확인
    let foundMatch = false;
    
    for (const { key, type, priority } of matchingKeys) {
      const existing = uniqueMap.get(key);
      
      if (existing) {
        debugCounts.duplicates++;
        foundMatch = true;
        
        if (type === 'exact') {
          debugCounts.exactMatches++;
        } else if (type === 'name_only') {
          debugCounts.nameOnlyMatches++;
          console.warn(`⚠️ 동명이인 가능성: ${name} (생년월일 정보 없음)`);
        }
        
        // 중복된 경우 더 완전한 데이터를 선택
        const currentScore = getDataCompletenessScore(person);
        const existingScore = getDataCompletenessScore(existing);
        
        if (currentScore > existingScore) {
          uniqueMap.set(key, person);
          console.log(`🔄 중복 데이터 교체: ${name} (${type}, 점수 ${currentScore} > ${existingScore})`);
        } else {
          console.log(`🔄 기존 데이터 유지: ${name} (${type}, 점수 ${existingScore} >= ${currentScore})`);
        }
        break;
      }
    }
    
    // 중복이 발견되지 않으면 새로 추가 (가장 높은 우선순위 키로)
    if (!foundMatch) {
      const bestKey = matchingKeys[0];
      uniqueMap.set(bestKey.key, person);
      
      if (bestKey.type === 'name_only') {
        console.warn(`⚠️ 이름만으로 등록: ${name} (생년월일, ID 정보 없음)`);
      }
    }
  });
  
  const result = Array.from(uniqueMap.values());
  console.log(`🧹 개선된 중복 제거 완료:`);
  console.log(`  - 처리: ${debugCounts.processed}개`);
  console.log(`  - 유지: ${result.length}개`);
  console.log(`  - 중복 제거: ${debugCounts.duplicates}개`);
  console.log(`  - 정확 매칭(이름+생년월일): ${debugCounts.exactMatches}개`);
  console.log(`  - 이름만 매칭(동명이인 위험): ${debugCounts.nameOnlyMatches}개`);
  console.log(`  - 스킵: ${debugCounts.skipped}개`);
  
  return result;
};

/**
 * 데이터 완전성 점수 계산 (높을수록 더 완전한 데이터)
 */
const getDataCompletenessScore = (person: any): number => {
  let score = 0;
  
  // 기본 정보
  if (person.name) score += 1;
  if (person.birthDate) score += 2; // 생년월일은 더 중요
  if (person.id) score += 1;
  if (person.institution) score += 1;
  if (person.jobType) score += 1;
  
  // 재직 정보
  if (person.isActive !== undefined) score += 1;
  if (person.resignDate) score += 1;
  
  // 교육 정보
  if (person.basicEducationStatus || person.basicTraining) score += 1;
  if (person.advancedEducationStatus || person.advancedEducation) score += 1;
  
  return score;
};

/**
 * 3. 통합 데이터 생성 함수
 * 모든 데이터 소스를 하나로 통합하여 일관된 기준 적용
 */
export const createUnifiedDataSource = (
  employeeData: EmployeeData[],
  participantData: EducationParticipant[],
  basicEducationData: EducationData[],
  advancedEducationData: EducationData[],
  referenceDate?: string
): UnifiedPerson[] => {
  console.log('\n🔄 통합 데이터 소스 생성 시작');
  
  // 배열 안전성 검증
  const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
  const safeParticipantData = Array.isArray(participantData) ? participantData : [];
  const safeBasicEducationData = Array.isArray(basicEducationData) ? basicEducationData : [];
  const safeAdvancedEducationData = Array.isArray(advancedEducationData) ? advancedEducationData : [];
  
  console.log(`- 종사자: ${safeEmployeeData.length}명`);
  console.log(`- 참가자: ${safeParticipantData.length}명`);
  console.log(`- 기초교육: ${safeBasicEducationData.length}건`);
  console.log(`- 심화교육: ${safeAdvancedEducationData.length}건`);
  console.log(`- 기준일: ${referenceDate || '현재'}`);
  
  const allPersons: any[] = [];
  
  // 1단계: 종사자 데이터를 기본으로 추가
  safeEmployeeData.forEach(emp => {
    allPersons.push({
      ...emp,
      source: 'employee',
      isActive: isActiveEmployee(emp, safeEmployeeData, referenceDate)
    });
  });
  
  // 2단계: 참가자 데이터 추가
  safeParticipantData.forEach(participant => {
    allPersons.push({
      ...participant,
      basicEducationStatus: participant.basicTraining,
      advancedEducationStatus: participant.advancedEducation,
      source: 'participant',
      isActive: isActiveEmployee(participant, safeEmployeeData, referenceDate)
    });
  });
  
  // 3단계: 교육 데이터에서 누락된 사람들 추가
  [...safeBasicEducationData, ...safeAdvancedEducationData].forEach(edu => {
    const person = {
      ...edu,
      basicEducationStatus: safeBasicEducationData.find(b => 
        (b.id === edu.id || b.name === edu.name))?.status,
      advancedEducationStatus: safeAdvancedEducationData.find(a => 
        (a.id === edu.id || a.name === edu.name))?.status,
      source: 'education',
      isActive: isActiveEmployee(edu, safeEmployeeData, referenceDate)
    };
    
    allPersons.push(person);
  });
  
  // 4단계: 중복 제거
  const uniquePersons = getUniquePersons(allPersons);
  
  console.log(`✅ 통합 완료: ${uniquePersons.length}명 (중복 제거 전: ${allPersons.length}명)`);
  
  return uniquePersons.map(person => ({
    id: person.id,
    name: person.name,
    birthDate: person.birthDate,
    institution: person.institution,
    institutionCode: person.institutionCode,
    jobType: person.jobType,
    isActive: person.isActive,
    resignDate: person.resignDate,
    basicEducationStatus: person.basicEducationStatus || person.basicTraining,
    advancedEducationStatus: person.advancedEducationStatus || person.advancedEducation,
    finalCompletion: person.finalCompletion,
    source: person.source,
    merged: person.source !== 'employee'
  }));
};

/**
 * 4. 재직자만 필터링하는 표준 함수
 */
export const getActivePersons = (
  persons: UnifiedPerson[]
): UnifiedPerson[] => {
  const activePersons = persons.filter(person => person.isActive);
  
  console.log(`👥 재직자 필터링: ${activePersons.length}명/${persons.length}명`);
  
  return activePersons;
};

/**
 * 5. 통계 계산용 표준 함수
 * 모든 페이지에서 동일한 통계 기준 적용
 */
export const calculateEducationStats = (persons: UnifiedPerson[]) => {
  const activePersons = getActivePersons(persons);
  
  const stats = {
    total: activePersons.length,
    complete: 0, // 기초+심화 모두 수료
    partial: 0,  // 기초 또는 심화 중 하나만 수료
    inProgress: 0, // 진행중
    none: 0      // 미수료
  };
  
  activePersons.forEach(person => {
    const basicCompleted = person.basicEducationStatus === '수료' || 
                          person.basicEducationStatus === '완료';
    const advancedCompleted = person.advancedEducationStatus === '수료' || 
                             person.advancedEducationStatus === '완료' ||
                             person.finalCompletion === '수료';
    
    if (basicCompleted && advancedCompleted) {
      stats.complete++;
    } else if (basicCompleted || advancedCompleted) {
      stats.partial++;
    } else if (person.basicEducationStatus || person.advancedEducationStatus) {
      stats.inProgress++;
    } else {
      stats.none++;
    }
  });
  
  console.log('📊 교육 통계:', stats);
  
  return stats;
};

/**
 * 6. 기관별 통계 계산
 */
export const calculateInstitutionStats = (persons: UnifiedPerson[]) => {
  const activePersons = getActivePersons(persons);
  const institutionMap = new Map();
  
  activePersons.forEach(person => {
    const key = person.institution;
    if (!institutionMap.has(key)) {
      institutionMap.set(key, {
        institutionName: person.institution,
        institutionCode: person.institutionCode,
        total: 0,
        socialWorkers: 0,
        lifeSupport: 0,
        completed: 0
      });
    }
    
    const inst = institutionMap.get(key);
    inst.total++;
    
    if (person.jobType?.includes('전담') || person.jobType === '전담사회복지사') {
      inst.socialWorkers++;
    } else if (person.jobType?.includes('생활지원') || person.jobType === '생활지원사') {
      inst.lifeSupport++;
    }
    
    const basicCompleted = person.basicEducationStatus === '수료' || 
                          person.basicEducationStatus === '완료';
    const advancedCompleted = person.advancedEducationStatus === '수료' || 
                             person.advancedEducationStatus === '완료' ||
                             person.finalCompletion === '수료';
    
    if (basicCompleted || advancedCompleted) {
      inst.completed++;
    }
  });
  
  return Array.from(institutionMap.values());
};

/**
 * 7. 소속회원 데이터 기준 통합 통계 계산 (정확한 인원 수)
 * 소속회원 데이터를 기준으로 하고, '정상' 상태만 필터링
 */
export const createParticipantBasedStats = (
  participantData: EducationParticipant[],
  basicEducationData: EducationData[],
  advancedEducationData: EducationData[],
  referenceDate?: string
) => {
  console.log('\n🎯 소속회원 기준 통합 통계 계산 시작');
  
  // 배열 안전성 검증
  const safeParticipantData = Array.isArray(participantData) ? participantData : [];
  const safeBasicEducationData = Array.isArray(basicEducationData) ? basicEducationData : [];
  const safeAdvancedEducationData = Array.isArray(advancedEducationData) ? advancedEducationData : [];
  
  console.log(`📊 기준 데이터: 소속회원 ${safeParticipantData.length}명`);
  console.log(`📚 매칭 데이터: 기초교육 ${safeBasicEducationData.length}건, 심화교육 ${safeAdvancedEducationData.length}건`);

  // '정상' 상태만 필터링 (퇴직자 제외)
  const activeParticipants = safeParticipantData.filter(participant => {
    // 상태가 '정상'인 경우만 포함
    const isNormalStatus = participant.status === '정상' || participant.status === 'normal' || !participant.status;
    
    // 추가 비활성 상태 확인
    const inactiveStatuses = ['중지', '탈퇴', '휴면', '휴면상태', '휴면대상', '정지', '퇴사', '해지', '종료', '중단', '비활성'];
    const hasInactiveStatus = inactiveStatuses.some(status => 
      participant.status?.includes(status) || 
      participant.memberStatus?.includes(status)
    );
    
    // 퇴사일 확인
    let hasValidResignDate = true;
    if (participant.resignDate && referenceDate) {
      try {
        const resignDate = new Date(participant.resignDate);
        const refDate = new Date(referenceDate);
        hasValidResignDate = resignDate > refDate;
      } catch (error) {
        console.warn(`퇴사일 파싱 오류: ${participant.resignDate}`);
      }
    }
    
    const isActive = isNormalStatus && !hasInactiveStatus && hasValidResignDate;
    
    if (!isActive) {
      console.log(`❌ 제외: ${participant.name} (상태: ${participant.status})`);
    }
    
    return isActive;
  });

  console.log(`✅ 정상 상태 필터링: ${safeParticipantData.length}명 → ${activeParticipants.length}명`);

  // 교육 이수 정보 매칭
  const participantWithEducation = activeParticipants.map(participant => {
    // 교육 데이터에서 매칭 (더 유연한 매칭 로직)
    const basicEducation = safeBasicEducationData.find(b => {
      // 1차: 이름 + ID 매칭 (가장 확실한 방법)
      if (b.name === participant.name && b.id === participant.id && b.id && participant.id) return true;
      // 2차: 이름 + 생년월일 완전 매칭 (생년월일이 있는 경우)
      if (b.name === participant.name && b.birthDate === participant.birthDate && b.birthDate && participant.birthDate) return true;
      // 3차: 이름 + 기관 매칭 (생년월일이 없는 경우 사용)
      if (b.name === participant.name && b.institution && participant.institution && 
          b.institution.replace(/\s+/g, '') === participant.institution.replace(/\s+/g, '')) return true;
      return false;
    });
    
    const advancedEducation = safeAdvancedEducationData.find(a => {
      // 1차: 이름 + ID 매칭 (가장 확실한 방법)
      if (a.name === participant.name && a.id === participant.id && a.id && participant.id) return true;
      // 2차: 이름 + 생년월일 완전 매칭 (생년월일이 있는 경우)
      if (a.name === participant.name && a.birthDate === participant.birthDate && a.birthDate && participant.birthDate) return true;
      // 3차: 이름 + 기관 매칭 (생년월일이 없는 경우 사용)
      if (a.name === participant.name && a.institution && participant.institution && 
          a.institution.replace(/\s+/g, '') === participant.institution.replace(/\s+/g, '')) return true;
      return false;
    });
    
    // 최종 수료 상태 계산
    const basicCompleted = basicEducation?.status === '수료' || 
                          basicEducation?.status === '완료' || 
                          participant.basicTraining === '수료' ||
                          participant.basicTraining === '완료';
    const advancedCompleted = advancedEducation?.status === '수료' || 
                             advancedEducation?.status === '완료' ||
                             participant.advancedEducation === '수료' ||
                             participant.advancedEducation === '완료';
    
    let finalCompletion = 'none';
    if (basicCompleted && advancedCompleted) {
      finalCompletion = 'complete';
    } else if (basicCompleted || advancedCompleted) {
      finalCompletion = 'partial';
    } else if (basicEducation || advancedEducation || participant.basicTraining || participant.advancedEducation) {
      finalCompletion = 'in_progress';
    }

    return {
      ...participant,
      basicEducationStatus: basicEducation?.status || participant.basicTraining,
      advancedEducationStatus: advancedEducation?.status || participant.advancedEducation,
      finalCompletion: finalCompletion,
      source: 'participant',
      isActive: true // 이미 필터링됨
    };
  });
  
  console.log(`🎯 소속회원 기준 최종 통계: ${activeParticipants.length}명 (전체 ${safeParticipantData.length}명 중)`);
  
  return {
    allParticipants: participantWithEducation,
    activeParticipants: participantWithEducation,
    totalCount: safeParticipantData.length,
    activeCount: activeParticipants.length
  };
};

/**
 * 8. 종사자 데이터 기준 통합 통계 계산 (소속회원 페이지용)
 * 종사자 데이터만을 기준으로 하고, 교육 이수 정보를 매칭
 */
export const createEmployeeBasedStats = (
  employeeData: EmployeeData[],
  participantData: EducationParticipant[],
  basicEducationData: EducationData[],
  advancedEducationData: EducationData[],
  referenceDate?: string
) => {
  console.log('\n🎯 종사자 기준 통합 통계 계산 시작');
  
  // 배열 안전성 검증
  const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
  const safeParticipantData = Array.isArray(participantData) ? participantData : [];
  const safeBasicEducationData = Array.isArray(basicEducationData) ? basicEducationData : [];
  const safeAdvancedEducationData = Array.isArray(advancedEducationData) ? advancedEducationData : [];
  
  console.log(`📊 기준 데이터: 종사자 ${safeEmployeeData.length}명`);
  console.log(`📚 매칭 데이터: 참가자 ${safeParticipantData.length}명, 기초교육 ${safeBasicEducationData.length}건, 심화교육 ${safeAdvancedEducationData.length}건`);

  // 종사자 데이터를 기준으로 교육 이수 정보 매칭
  const employeeWithEducation = safeEmployeeData.map(employee => {
    const isActive = isActiveEmployee(employee, safeEmployeeData, referenceDate);
    
    // 참가자 데이터에서 매칭
    const matchingParticipant = safeParticipantData.find(p => 
      (p.name === employee.name && p.birthDate === employee.birthDate) ||
      (p.name === employee.name && p.id === employee.id)
    );
    
    // 교육 데이터에서 매칭
    const basicEducation = safeBasicEducationData.find(b => 
      (b.name === employee.name && b.birthDate === employee.birthDate) ||
      (b.name === employee.name && b.id === employee.id)
    );
    
    const advancedEducation = safeAdvancedEducationData.find(a => 
      (a.name === employee.name && a.birthDate === employee.birthDate) ||
      (a.name === employee.name && a.id === employee.id)
    );
    
    return {
      ...employee,
      isActive,
      basicEducationStatus: basicEducation?.status || matchingParticipant?.basicTraining,
      advancedEducationStatus: advancedEducation?.status || matchingParticipant?.advancedEducation,
      source: 'employee'
    };
  });

  const activeEmployees = employeeWithEducation.filter(emp => emp.isActive);
  
  console.log(`✅ 종사자 기준 통계: 전체 ${safeEmployeeData.length}명, 재직자 ${activeEmployees.length}명`);
  
  return {
    allEmployees: employeeWithEducation,
    activeEmployees: activeEmployees,
    totalCount: safeEmployeeData.length,
    activeCount: activeEmployees.length
  };
};

/**
 * 8. 교육 데이터 기준 고유 참여자 계산 (기존 교육통계 페이지 방식과 호환)
 */
export const calculateEducationParticipants = (
  basicEducationData: EducationData[],
  advancedEducationData: EducationData[],
  employeeData: EmployeeData[],
  includeRetired: boolean = false,
  referenceDate?: string
): number => {
  // 배열 안전성 검증
  const safeBasicEducationData = Array.isArray(basicEducationData) ? basicEducationData : [];
  const safeAdvancedEducationData = Array.isArray(advancedEducationData) ? advancedEducationData : [];
  const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
  
  const allEducationData = [...safeBasicEducationData, ...safeAdvancedEducationData];
  
  // 퇴직자 필터링 (기존 filterByRetirement 로직과 동일)
  const filteredData = includeRetired ? allEducationData : allEducationData.filter(item => {
    return isActiveEmployee(item, safeEmployeeData, referenceDate);
  });
  
  // 중복 제거 (이름 + ID 기준)
  const uniqueSet = filteredData.reduce((acc, item) => {
    const personKey = `${item.name}_${item.id}`;
    acc.add(personKey);
    return acc;
  }, new Set());
  
  return uniqueSet.size;
};