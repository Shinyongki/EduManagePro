import type { EmployeeData, InstitutionData, EducationData, EducationParticipant, IntegratedAnalysisData } from '@shared/schema';

export interface AnalysisRow {
  id: string;
  management: string; // 광역명
  region: string; // 시도
  district: string; // 시군구
  institutionCode: string; // 기관코드
  institutionName: string; // 기관명
  
  // 배정인원(수기관리 등록기준) - 3컬럼
  backup1_total: number; // 전체 종사자(=①+②)
  backup1_social: number; // 전담사회복지사①
  backup1_life: number; // 생활지원사②
  
  // 배정인원(예산내시 등록기준) - 3컬럼
  backup2_a: number; // A 전체 종사자(=①+②)
  backup2_b: number; // B 전담사회복지사①
  backup2_c: number; // C 생활지원사②
  
  // D 채용인원(수기관리 등록기준) - 3컬럼
  dLevel_all: number; // 전체 종사자(=①+②)
  dLevel_social: number; // 전담사회복지사①
  dLevel_life: number; // 생활지원사②
  
  // (1-1-2) 종사자 채용현황 - 8컬럼
  employment_total: number; // E채용인원(=①+②)
  employment_rate: number; // (E/A) 채용률
  employment_social: number; // F채용인원①
  employment_social_rate: number; // (F/B) 채용률
  employment_reference?: string; // (참고)충원률기준시점
  employment_life: number; // G채용인원②
  employment_life_rate: number; // (G/C) 채용률
  employment_life_reference?: string; // (참고)충원률 기준시점
  
  // (1-1-3) 종사자 근속현황 - 2컬럼
  tenure_social: number; // 전담사회복지사 평균 근속기간(년)
  tenure_life: number; // 생활지원사 평균 근속기간(년)
  
  // (1-4-1) 종사자 직무교육 이수율 - 12컬럼
  education_target_total: number; // H 직무교육 대상인원(실제 채용기준) - 전체
  education_target_social: number; // H 직무교육 대상인원(실제 채용기준) - 전담사회복지사
  education_target_life: number; // H 직무교육 대상인원(실제 채용기준) - 생활지원사
  education_completed_total: number; // I 직무교육 이수인원 - 전체
  education_completed_social: number; // I 직무교육 이수인원 - 전담사회복지사
  education_completed_life: number; // I 직무교육 이수인원 - 생활지원사
  education_rate_total: number; // (I/H) 직무교육 이수율 - 전체
  education_rate_social: number; // (I/H) 직무교육 이수율 - 전담사회복지사
  education_rate_life: number; // (I/H) 직무교육 이수율 - 생활지원사
  education_d_rate_total: number; // (I/D) 직무교육 이수율 - 전체
  education_d_rate_social: number; // (I/D) 직무교육 이수율 - 전담사회복지사
  education_d_rate_life: number; // (I/D) 직무교육 이수율 - 생활지원사
}

export class IntegratedDataAnalyzer {
  static generateAnalysisFromRealData(
    employeeData: EmployeeData[],
    institutionData: InstitutionData[],
    basicEducationData: EducationData[],
    advancedEducationData: EducationData[],
    participantData: EducationParticipant[]
  ): AnalysisRow[] {
    
    const analysisRows: AnalysisRow[] = [];
    
    // 기관별로 데이터 집계
    console.log(`\n🏢 기관 데이터 분석 시작: ${institutionData.length}개 기관`);
    console.log(`👥 종사자 데이터: ${employeeData.length}명`);
    
    for (const institution of institutionData) {
      // 해당 기관의 종사자 데이터 필터링 (다양한 매칭 방법 시도)
      const institutionEmployees = employeeData.filter(emp => {
        // 기관명 완전 일치
        if (emp.institution === institution.name) return true;
        // 기관명 부분 일치
        if (emp.institution?.includes(institution.name)) return true;
        // 기관 코드 일치
        if (emp.institutionCode === institution.code) return true;
        // 기관명을 포함하는 경우
        if (institution.name?.includes(emp.institution)) return true;
        
        return false;
      });
      
      // 기관별 매칭 결과 로깅
      if (institutionEmployees.length > 0 || institution.name?.includes('센터') || institution.name?.includes('복지')) {
        console.log(`\n🏢 [${institution.name}] (코드: ${institution.code})`);
        console.log(`   매칭된 종사자: ${institutionEmployees.length}명`);
        
        if (institutionEmployees.length === 0) {
          // 매칭 실패한 경우 유사한 기관명 찾기
          const similarEmployees = employeeData.filter(emp => {
            const empInst = emp.institution?.toLowerCase() || '';
            const instName = institution.name?.toLowerCase() || '';
            return empInst.includes(instName.split(' ')[0]) || instName.includes(empInst.split(' ')[0]);
          });
          
          if (similarEmployees.length > 0) {
            console.log(`   ⚠️ 유사한 기관명의 종사자 발견: ${similarEmployees.length}명`);
            const instNames = [...new Set(similarEmployees.map(emp => emp.institution))];
            console.log(`   유사 기관명:`, instNames);
          }
        }
      }
      
      // 재직자만 필터링
      const activeEmployees = institutionEmployees.filter(emp => emp.isActive);
      
      // 직무별 분류 (디버깅 추가)
      const socialWorkers = activeEmployees.filter(emp => 
        emp.jobType === '전담사회복지사' || 
        emp.jobType === '선임전담사회복지사' ||
        emp.jobType?.includes('전담')
      );
      
      const lifeSupport = activeEmployees.filter(emp => 
        emp.jobType === '생활지원사' ||
        emp.jobType?.includes('생활지원') ||
        emp.jobType?.includes('요양') ||
        emp.jobType?.includes('돌봄') ||
        emp.jobType?.includes('케어') ||
        emp.jobType?.includes('특화') ||
        // 전담사회복지사가 아닌 모든 직무를 생활지원사로 분류
        (!emp.jobType?.includes('전담') && !emp.jobType?.includes('사회복지사') && emp.jobType && emp.jobType !== '전담사회복지사' && emp.jobType !== '선임전담사회복지사')
      );
      
      // 디버깅: 직무별 분류 결과 확인
      if (activeEmployees.length > 0) {
        console.log(`\n=== [${institution.name}] 직무 분류 분석 ===`);
        console.log(`전체 재직자: ${activeEmployees.length}명`);
        console.log(`- 전담사회복지사: ${socialWorkers.length}명`);
        console.log(`- 생활지원사: ${lifeSupport.length}명`);
        
        const jobTypes = [...new Set(activeEmployees.map(emp => emp.jobType).filter(Boolean))];
        console.log(`\n발견된 직무유형 (${jobTypes.length}개):`, jobTypes);
        
        // 각 직무유형별 인원수 상세 분석
        const jobTypeStats = {};
        activeEmployees.forEach(emp => {
          const jobType = emp.jobType || '미분류';
          jobTypeStats[jobType] = (jobTypeStats[jobType] || 0) + 1;
        });
        
        console.log(`\n직무유형별 인원수:`);
        Object.entries(jobTypeStats).forEach(([type, count]) => {
          console.log(`  - "${type}": ${count}명`);
        });
        
        // 입사일 있는 직원 확인
        const socialWorkersWithHire = socialWorkers.filter(emp => emp.hireDate);
        const lifeSupportWithHire = lifeSupport.filter(emp => emp.hireDate);
        console.log(`\n입사일 보유 현황:`);
        console.log(`- 전담사회복지사: ${socialWorkersWithHire.length}/${socialWorkers.length}명`);
        console.log(`- 생활지원사: ${lifeSupportWithHire.length}/${lifeSupport.length}명`);
        
        // 생활지원사 관련 키워드가 포함된 직무 찾기
        const lifeRelatedJobs = jobTypes.filter(job => 
          job.includes('생활') || job.includes('지원') || job.includes('요양') || 
          job.includes('돌봄') || job.includes('케어') || job.includes('간병')
        );
        
        if (lifeRelatedJobs.length > 0) {
          console.log(`\n생활지원 관련 키워드 발견:`, lifeRelatedJobs);
        }
        
        console.log(`===============================\n`);
      }
      
      // 교육 참가자 데이터 필터링 (디버깅 추가)
      const institutionParticipants = participantData.filter(p => 
        p.institution?.includes(institution.name) ||
        p.institutionCode === institution.code ||
        p.institution === institution.name
      );
      
      // 거제노인통합지원센터 검증을 위한 디버깅
      if (institution.code === 'A48310001' || institution.name?.includes('거제노인통합지원센터')) {
        console.log(`\n🔍 [${institution.name}] 교육 참가자 검증`);
        console.log(`기관코드: ${institution.code}`);
        console.log(`전체 참가자: ${institutionParticipants.length}명`);
        
        const socialParticipants = institutionParticipants.filter(p => 
          p.jobType?.includes('전담') || p.jobType === '전담사회복지사'
        );
        console.log(`전담사회복지사 참가자: ${socialParticipants.length}명`);
        
        // 전담사회복지사 참가자 상세 정보
        socialParticipants.forEach((p, idx) => {
          console.log(`  ${idx + 1}. 이름: ${p.name}, 직군: ${p.jobType}, 기관: ${p.institution}, 기관코드: ${p.institutionCode}`);
        });
        
        // 참가자 데이터에서 발견된 직무유형들
        const jobTypes = [...new Set(institutionParticipants.map(p => p.jobType).filter(Boolean))];
        console.log(`발견된 직무유형:`, jobTypes);
        
        // 기관명 매칭 상세 분석
        const nameMatches = participantData.filter(p => p.institution?.includes('거제'));
        console.log(`"거제" 포함 참가자: ${nameMatches.length}명`);
        const codeMatches = participantData.filter(p => p.institutionCode === 'A48310001');
        console.log(`코드 "A48310001" 매칭 참가자: ${codeMatches.length}명`);
      }
      
      // 교육 이수 현황 계산
      const basicCompleted = institutionParticipants.filter(p => 
        p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료'
      );
      
      const advancedCompleted = institutionParticipants.filter(p => 
        p.advancedEducation === '완료' || p.advancedEducation === '수료'
      );
      
      // 직무별 교육 이수자 분류
      const socialEducationCompleted = institutionParticipants.filter(p => 
        (p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료') &&
        (p.jobType?.includes('전담') || p.jobType === '전담사회복지사')
      );
      
      const lifeEducationCompleted = institutionParticipants.filter(p => 
        (p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료') &&
        (p.jobType?.includes('생활지원') || p.jobType === '생활지원사')
      );
      
      // 근속기간 계산 함수 (일 단위로 반환)
      const calculateAverageTenure = (employees: EmployeeData[], jobTypeName: string): number => {
        console.log(`[${institution.name}] ${jobTypeName} 근속기간 계산:`, employees.length, '명');
        
        if (employees.length === 0) return 0;
        
        const validEmployees = employees.filter(emp => emp.hireDate);
        console.log(`- 입사일 있는 ${jobTypeName}:`, validEmployees.length, '명');
        
        if (validEmployees.length === 0) return 0;
        
        const totalTenureDays = validEmployees.reduce((sum, emp) => {
          try {
            const hireDate = new Date(emp.hireDate!);
            const today = new Date();
            
            // 유효한 날짜인지 확인
            if (isNaN(hireDate.getTime())) {
              console.warn(`[${jobTypeName}] 유효하지 않은 입사일:`, emp.hireDate);
              return sum;
            }
            
            const days = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
            const validDays = Math.max(0, days);
            console.log(`- ${emp.name} (${emp.hireDate}): ${validDays}일`);
            return sum + validDays;
          } catch (error) {
            console.warn(`[${jobTypeName}] 근속기간 계산 오류:`, emp.hireDate, error);
            return sum;
          }
        }, 0);
        
        // 평균 일수 계산 (헤더가 '일' 단위를 요구함)
        const avgDays = totalTenureDays / validEmployees.length;
        const result = Math.round(avgDays);
        console.log(`- ${jobTypeName} 평균 근속기간: ${result}일`);
        return result; // 일 단위, 정수로 반환
      };
      
      // 기본 값들 계산
      const totalActive = activeEmployees.length;
      const socialCount = socialWorkers.length;
      const lifeCount = lifeSupport.length;
      
      // 배정인원 (기관 데이터에서)
      // 수기관리 등록기준 (기관 자체 배정)
      const allocatedSocial = institution.allocatedSocialWorkers || 0;
      const allocatedLife = institution.allocatedLifeSupport || 0;
      const allocatedTotal = allocatedSocial + allocatedLife;
      
      // 예산내시 등록기준 (정부 배정)
      const govAllocatedSocial = institution.allocatedSocialWorkersGov || 0;
      const govAllocatedLife = institution.allocatedLifeSupportGov || 0;
      const govAllocatedTotal = govAllocatedSocial + govAllocatedLife;
      
      // 채용률 계산 (수기관리 등록기준) - NaN 방지
      const employmentRate = (allocatedTotal > 0 && !isNaN(totalActive)) ? 
        Math.round((totalActive / allocatedTotal) * 100 * 10) / 10 : 0;
      const socialEmploymentRate = (allocatedSocial > 0 && !isNaN(socialCount)) ? 
        Math.round((socialCount / allocatedSocial) * 100 * 10) / 10 : 0;
      const lifeEmploymentRate = (allocatedLife > 0 && !isNaN(lifeCount)) ? 
        Math.round((lifeCount / allocatedLife) * 100 * 10) / 10 : 0;
      
      // 채용률 계산 (예산내시 등록기준) - NaN 방지
      const govEmploymentRate = (govAllocatedTotal > 0 && !isNaN(totalActive)) ? 
        Math.round((totalActive / govAllocatedTotal) * 100 * 10) / 10 : 0;
      const govSocialEmploymentRate = (govAllocatedSocial > 0 && !isNaN(socialCount)) ? 
        Math.round((socialCount / govAllocatedSocial) * 100 * 10) / 10 : 0;
      const govLifeEmploymentRate = (govAllocatedLife > 0 && !isNaN(lifeCount)) ? 
        Math.round((lifeCount / govAllocatedLife) * 100 * 10) / 10 : 0;
      
      // 교육 이수율 계산 - NaN 방지
      const totalEducationRate = (totalActive > 0 && !isNaN(basicCompleted.length)) ? 
        Math.round((basicCompleted.length / totalActive) * 100 * 10) / 10 : 0;
      const socialEducationRate = (socialCount > 0 && !isNaN(socialEducationCompleted.length)) ? 
        Math.round((socialEducationCompleted.length / socialCount) * 100 * 10) / 10 : 0;
      const lifeEducationRate = (lifeCount > 0 && !isNaN(lifeEducationCompleted.length)) ? 
        Math.round((lifeEducationCompleted.length / lifeCount) * 100 * 10) / 10 : 0;
      
      // 근속기간 계산
      const socialTenure = calculateAverageTenure(socialWorkers, '전담사회복지사');
      const lifeTenure = calculateAverageTenure(lifeSupport, '생활지원사');
      
      // 분석 행 생성
      const row: AnalysisRow = {
        id: `analysis_${institution.code || Date.now()}`,
        management: institution.areaName || '경남광역',
        region: institution.region || '경상남도',
        district: institution.district || '',
        institutionCode: institution.code || '',
        institutionName: institution.name || '',
        
        // 배정인원(수기관리 등록기준)
        backup1_total: allocatedTotal,
        backup1_social: allocatedSocial,
        backup1_life: allocatedLife,
        
        // 배정인원(예산내시 등록기준) - 정부 배정 데이터 사용
        backup2_a: govAllocatedTotal,
        backup2_b: govAllocatedSocial,
        backup2_c: govAllocatedLife,
        
        // D 채용인원(수기관리 등록기준) - 기관에서 수기로 관리하는 채용 데이터
        dLevel_all: (institution.hiredSocialWorkers || 0) + (institution.hiredLifeSupport || 0),
        dLevel_social: institution.hiredSocialWorkers || 0,
        dLevel_life: institution.hiredLifeSupport || 0,
        
        // 종사자 채용현황 (E, F, G는 D 채용인원 기준) - NaN 방지
        employment_total: (institution.hiredSocialWorkers || 0) + (institution.hiredLifeSupport || 0), // E = D 채용인원과 동일
        employment_rate: govAllocatedTotal > 0 ? 
          Math.round((((institution.hiredSocialWorkers || 0) + (institution.hiredLifeSupport || 0)) / govAllocatedTotal) * 100 * 10) / 10 : 0, // (E/A) 채용률
        employment_social: institution.hiredSocialWorkers || 0, // F = 채용된 전담사회복지사
        employment_social_rate: govAllocatedSocial > 0 ? 
          Math.round(((institution.hiredSocialWorkers || 0) / govAllocatedSocial) * 100 * 10) / 10 : 0, // (F/B) 채용률
        employment_reference: new Date().toISOString().split('T')[0],
        employment_life: institution.hiredLifeSupport || 0, // G = 채용된 생활지원사
        employment_life_rate: govAllocatedLife > 0 ? 
          Math.round(((institution.hiredLifeSupport || 0) / govAllocatedLife) * 100 * 10) / 10 : 0, // (G/C) 채용률
        employment_life_reference: new Date().toISOString().split('T')[0],
        
        // 종사자 근속현황 - NaN 방지
        tenure_social: isNaN(socialTenure) ? 0 : socialTenure,
        tenure_life: isNaN(lifeTenure) ? 0 : lifeTenure,
        
        // 종사자 직무교육 이수율 - H: 실제 채용기준 (현재 재직자)
        education_target_total: totalActive || 0, // H: 현재 재직 중인 전체 인원
        education_target_social: socialCount || 0, // H: 현재 재직 중인 전담사회복지사
        education_target_life: lifeCount || 0, // H: 현재 재직 중인 생활지원사
        education_completed_total: basicCompleted.length || 0, // I: 이수인원
        education_completed_social: socialEducationCompleted.length || 0,
        education_completed_life: lifeEducationCompleted.length || 0,
        education_rate_total: isNaN(totalEducationRate) ? 0 : totalEducationRate, // (I/H) 이수율
        education_rate_social: isNaN(socialEducationRate) ? 0 : socialEducationRate,
        education_rate_life: isNaN(lifeEducationRate) ? 0 : lifeEducationRate,
        education_d_rate_total: (totalActive > 0 && !isNaN(basicCompleted.length)) ? 
          Math.round((basicCompleted.length / totalActive) * 100 * 10) / 10 : 0, // (I/D) 이수율
        education_d_rate_social: (socialCount > 0 && !isNaN(socialEducationCompleted.length)) ? 
          Math.round((socialEducationCompleted.length / socialCount) * 100 * 10) / 10 : 0,
        education_d_rate_life: (lifeCount > 0 && !isNaN(lifeEducationCompleted.length)) ? 
          Math.round((lifeEducationCompleted.length / lifeCount) * 100 * 10) / 10 : 0,
      };
      
      analysisRows.push(row);
    }
    
    return analysisRows;
  }
  
  static calculateSummaryStats(rows: AnalysisRow[]) {
    if (rows.length === 0) return null;
    
    return {
      totalInstitutions: rows.length,
      totalWorkers: rows.reduce((sum, r) => sum + r.dLevel_all, 0),
      totalSocialWorkers: rows.reduce((sum, r) => sum + r.dLevel_social, 0),
      totalLifeSupport: rows.reduce((sum, r) => sum + r.dLevel_life, 0),
      avgEmploymentRate: rows.reduce((sum, r) => sum + r.employment_rate, 0) / rows.length,
      avgEducationRate: rows.reduce((sum, r) => sum + r.education_rate_total, 0) / rows.length,
      totalAllocated: rows.reduce((sum, r) => sum + r.backup1_total, 0),
      totalEmployed: rows.reduce((sum, r) => sum + r.dLevel_all, 0)
    };
  }
}