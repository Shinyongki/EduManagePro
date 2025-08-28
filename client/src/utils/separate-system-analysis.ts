/**
 * 별도 시스템 분석 유틸리티
 * 모인우리 시스템과 배움터 시스템을 독립적으로 계산
 */

interface EmployeeData {
  name?: string;
  institutionCode?: string;
  institution?: string;
  qualification?: string;
  employmentType?: string;
  workStartDate?: string;
  status?: string;
}

interface ParticipantData {
  name?: string;
  institutionCode?: string;
  institution?: string;
  position?: string;
  status?: string;
}

interface EducationData {
  name?: string;
  institutionCode?: string;
  institution?: string;
  status?: string;
  course?: string;
}

interface InstitutionData {
  code?: string;
  name?: string;
  region?: string;
  district?: string;
  totalEmployees?: number;
  socialWorkers?: number;
  lifeSupportWorkers?: number;
}

/**
 * 모인우리 시스템 분석 (종사자 + 기관현황)
 */
export const calculateMoinUriAnalysis = (
  employeeData: EmployeeData[],
  institutionData: InstitutionData[]
): Record<string, any> => {
  console.log('📊 모인우리 시스템 분석 시작:', {
    employees: employeeData.length,
    institutions: institutionData.length
  });

  // 기관코드별 그룹화
  const institutionGroups = new Map<string, {
    employees: EmployeeData[];
    institutionInfo: InstitutionData | null;
  }>();

  // 종사자 데이터 그룹화
  employeeData
    .filter(emp => emp.status !== '퇴사' && emp.status !== '휴직')
    .forEach(emp => {
      const code = emp.institutionCode || '';
      if (!institutionGroups.has(code)) {
        institutionGroups.set(code, { employees: [], institutionInfo: null });
      }
      institutionGroups.get(code)!.employees.push(emp);
    });

  // 기관 정보 매핑
  institutionData.forEach(inst => {
    const code = inst.code || '';
    if (institutionGroups.has(code)) {
      institutionGroups.get(code)!.institutionInfo = inst;
    }
  });

  const results: Record<string, any> = {};

  institutionGroups.forEach((group, institutionCode) => {
    const { employees, institutionInfo } = group;
    
    if (!institutionInfo) {
      console.warn(`⚠️ 기관 정보 없음: ${institutionCode}`);
      return;
    }

    // 담당업무별 분류 (BUG_FIX_LOG #007에 따른 포괄적 특화 담당자 판정)
    const getEmployeeDuty = (emp: EmployeeData): string => {
      return emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || (emp as any)['담당업무'] || '';
    };
    
    // 자격별 분류 + 특화 담당자 분류
    const socialWorkers = employees.filter(emp => {
      const qualification = emp.qualification || emp.jobType || '';
      return qualification.includes('사회복지사') || 
             qualification.includes('전문사회복지사') ||
             qualification.includes('전담사회복지사');
    });
    
    const lifeSupportWorkers = employees.filter(emp => {
      const qualification = emp.qualification || emp.jobType || '';
      return qualification.includes('생활지원사') ||
             qualification.includes('생활복지사');
    });
    
    // 특화 담당자 (BUG_FIX_LOG #007의 수정사항 적용)
    const specializedWorkers = employees.filter(emp => {
      const duty = getEmployeeDuty(emp);
      return duty === '특화';
    });

    // 근속 계산 (1년 이상)
    const currentDate = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

    const tenuredSocialWorkers = socialWorkers.filter(emp => {
      if (!emp.workStartDate) return false;
      const startDate = new Date(emp.workStartDate);
      return startDate <= oneYearAgo;
    });

    const tenuredLifeWorkers = lifeSupportWorkers.filter(emp => {
      if (!emp.workStartDate) return false;
      const startDate = new Date(emp.workStartDate);
      return startDate <= oneYearAgo;
    });

    results[institutionCode] = {
      institutionCode,
      institutionName: institutionInfo.name,
      region: institutionInfo.region,
      district: institutionInfo.district,
      
      // 모인우리 담당 컬럼들
      backup2_a: institutionInfo.totalEmployees || 0,
      backup2_b: institutionInfo.socialWorkers || 0,
      backup2_c: institutionInfo.lifeSupportWorkers || 0,
      backup2_total: (institutionInfo.socialWorkers || 0) + (institutionInfo.lifeSupportWorkers || 0),
      
      qualification_social: socialWorkers.length,
      qualification_life: lifeSupportWorkers.length,
      qualification_specialized: specializedWorkers.length, // 특화 담당자 추가
      qualification_total: socialWorkers.length + lifeSupportWorkers.length + specializedWorkers.length,
      
      tenure_social: tenuredSocialWorkers.length,
      tenure_life: tenuredLifeWorkers.length,
      tenure_specialized: specializedWorkers.filter(emp => {
        if (!emp.workStartDate) return false;
        const startDate = new Date(emp.workStartDate);
        return startDate <= oneYearAgo;
      }).length,
      tenure_rate: employees.length > 0 ? 
        ((tenuredSocialWorkers.length + tenuredLifeWorkers.length) / employees.length * 100) : 0
    };
  });

  console.log('✅ 모인우리 시스템 분석 완료:', Object.keys(results).length, '개 기관');
  return results;
};

/**
 * 배움터 시스템 분석 (소속회원 + 교육데이터)
 */
export const calculateBaeumteoAnalysis = (
  participantData: ParticipantData[],
  basicEducationData: EducationData[],
  advancedEducationData: EducationData[]
): Record<string, any> => {
  console.log('📚 배움터 시스템 분석 시작:', {
    participants: participantData.length,
    basicEducation: basicEducationData.length,
    advancedEducation: advancedEducationData.length
  });

  // 기관코드별 그룹화
  const institutionGroups = new Map<string, {
    participants: ParticipantData[];
    basicCompleted: EducationData[];
    advancedCompleted: EducationData[];
  }>();

  // 소속회원 데이터 그룹화
  participantData
    .filter(part => part.status !== '중지' && part.status !== '탈퇴')
    .forEach(part => {
      const code = part.institutionCode || '';
      if (!institutionGroups.has(code)) {
        institutionGroups.set(code, { 
          participants: [], 
          basicCompleted: [], 
          advancedCompleted: [] 
        });
      }
      institutionGroups.get(code)!.participants.push(part);
    });

  // 기초교육 이수자 그룹화
  basicEducationData
    .filter(edu => edu.status === '수료')
    .forEach(edu => {
      const code = edu.institutionCode || '';
      if (institutionGroups.has(code)) {
        institutionGroups.get(code)!.basicCompleted.push(edu);
      }
    });

  // 심화교육 이수자 그룹화
  advancedEducationData
    .filter(edu => edu.status === '수료')
    .forEach(edu => {
      const code = edu.institutionCode || '';
      if (institutionGroups.has(code)) {
        institutionGroups.get(code)!.advancedCompleted.push(edu);
      }
    });

  const results: Record<string, any> = {};

  institutionGroups.forEach((group, institutionCode) => {
    const { participants, basicCompleted, advancedCompleted } = group;
    
    // 직무교육 이수 확인 (기초 + 심화 모두 이수)
    const completedNames = new Set([
      ...basicCompleted.map(edu => edu.name),
      ...advancedCompleted.map(edu => edu.name)
    ]);

    const jobTrainingCompleted = participants.filter(part => 
      basicCompleted.some(basic => basic.name === part.name) &&
      advancedCompleted.some(advanced => advanced.name === part.name)
    );

    // 직군별 분류
    const socialWorkerParticipants = participants.filter(part =>
      part.position?.includes('사회복지사') ||
      part.position?.includes('전문사회복지사')
    );

    const lifeSupportParticipants = participants.filter(part =>
      part.position?.includes('생활지원사') ||
      part.position?.includes('생활복지사')
    );

    // 교육 완료자 직급별 분류
    const socialWorkerCompleted = jobTrainingCompleted.filter(part =>
      part.position?.includes('사회복지사') ||
      part.position?.includes('전문사회복지사')
    );
    
    const lifeSupportCompleted = jobTrainingCompleted.filter(part =>
      part.position?.includes('생활지원사') ||
      part.position?.includes('생활복지사')
    );

    results[institutionCode] = {
      institutionCode,
      
      // 배움터 담당 컬럼들
      backup1_total: participants.length,
      backup1_social: socialWorkerParticipants.length,
      backup1_life: lifeSupportParticipants.length,
      
      dLevel_social: socialWorkerParticipants.length, // D급 처리 로직 추가 필요
      dLevel_life: lifeSupportParticipants.length,    // D급 처리 로직 추가 필요
      dLevel_total: socialWorkerParticipants.length + lifeSupportParticipants.length,
      
      // 교육 완료 관련 데이터
      education_f: jobTrainingCompleted.length,
      education_completed_social: socialWorkerCompleted.length,
      education_completed_life: lifeSupportCompleted.length,
      education_rate_fb: participants.length > 0 ? 
        (jobTrainingCompleted.length / participants.length * 100) : 0,
      education_rate_social: socialWorkerParticipants.length > 0 ?
        (socialWorkerCompleted.length / socialWorkerParticipants.length * 100) : 0,
      education_rate_life: lifeSupportParticipants.length > 0 ?
        (lifeSupportCompleted.length / lifeSupportParticipants.length * 100) : 0,
      education_warning: Math.max(0, participants.length - jobTrainingCompleted.length),
      education_g: basicCompleted.length + advancedCompleted.length,
      
      // 교육 대상자 수 (현재 근무자와 동일)
      education_target_total: participants.length,
      education_target_social: socialWorkerParticipants.length,
      education_target_life: lifeSupportParticipants.length
    };
  });

  console.log('✅ 배움터 시스템 분석 완료:', Object.keys(results).length, '개 기관');
  return results;
};

/**
 * 두 시스템 결과 통합 (매칭 없이)
 */
export const mergeSeparateAnalysis = (
  moinUriResults: Record<string, any>,
  baeumteoResults: Record<string, any>
): any[] => {
  console.log('🔄 시스템별 결과 통합 시작');
  
  // 모든 기관코드 수집
  const allInstitutionCodes = new Set([
    ...Object.keys(moinUriResults),
    ...Object.keys(baeumteoResults)
  ]);

  const mergedResults = [];

  allInstitutionCodes.forEach(code => {
    const moinUri = moinUriResults[code] || {};
    const baeumteo = baeumteoResults[code] || {};

    // 기관 기본 정보 (모인우리 우선, 없으면 배움터)
    const institutionName = moinUri.institutionName || 
      baeumteo.institutionName || 
      `기관코드: ${code}`;
    
    const region = moinUri.region || baeumteo.region || '';
    const district = moinUri.district || baeumteo.district || '';

    mergedResults.push({
      id: code,
      management: region.includes('경남') ? '경남광역' : region,
      region,
      district,
      institutionCode: code,
      institutionName,
      
      // 배움터 시스템 데이터
      backup1_total: baeumteo.backup1_total || 0,
      backup1_social: baeumteo.backup1_social || 0,
      backup1_life: baeumteo.backup1_life || 0,
      dLevel_social: baeumteo.dLevel_social || 0,
      dLevel_life: baeumteo.dLevel_life || 0,
      dLevel_total: baeumteo.dLevel_total || 0,
      education_f: baeumteo.education_f || 0,
      education_rate_fb: baeumteo.education_rate_fb || 0,
      education_warning: baeumteo.education_warning || 0,
      education_g: baeumteo.education_g || 0,
      
      // 모인우리 시스템 데이터
      backup2_a: moinUri.backup2_a || 0,
      backup2_b: moinUri.backup2_b || 0,
      backup2_c: moinUri.backup2_c || 0,
      backup2_total: moinUri.backup2_total || 0,
      qualification_social: moinUri.qualification_social || 0,
      qualification_life: moinUri.qualification_life || 0,
      qualification_total: moinUri.qualification_total || 0,
      tenure_social: moinUri.tenure_social || 0,
      tenure_life: moinUri.tenure_life || 0,
      tenure_rate: moinUri.tenure_rate || 0,
      
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  console.log('✅ 시스템별 결과 통합 완료:', mergedResults.length, '개 기관');
  return mergedResults;
};