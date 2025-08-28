import type { EmployeeData, InstitutionData, EducationData, EducationParticipant, IntegratedAnalysisData } from '@shared/schema';
import { matchInstitution, normalizeInstitutionName, isInstitutionMatch, debugInstitutionMatch, filterActiveEmployees } from './institution-matcher';

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
    participantData: EducationParticipant[],
    snapshotDate?: string // 스냅샷 날짜 추가 (YYYY-MM-DD 형식)
  ): AnalysisRow[] {
    
    // 입력 데이터 검증
    if (!Array.isArray(employeeData)) {
      console.warn('⚠️ employeeData가 배열이 아닙니다:', typeof employeeData);
      employeeData = [];
    }
    if (!Array.isArray(institutionData)) {
      console.warn('⚠️ institutionData가 배열이 아닙니다:', typeof institutionData);
      institutionData = [];
    }
    if (!Array.isArray(basicEducationData)) {
      console.warn('⚠️ basicEducationData가 배열이 아닙니다:', typeof basicEducationData);
      basicEducationData = [];
    }
    if (!Array.isArray(advancedEducationData)) {
      console.warn('⚠️ advancedEducationData가 배열이 아닙니다:', typeof advancedEducationData);
      advancedEducationData = [];
    }
    if (!Array.isArray(participantData)) {
      console.warn('⚠️ participantData가 배열이 아닙니다:', typeof participantData);
      participantData = [];
    }
    
    const analysisRows: AnalysisRow[] = [];
    
    // 기관별로 데이터 집계
    console.log(`\n🚀 === INTEGRATED ANALYSIS 시작 === 🚀`);
    console.log(`\n🏢 기관 데이터 분석 시작: ${institutionData.length}개 기관`);
    console.log(`👥 종사자 데이터: ${employeeData.length}명`);
    console.log(`📚 기초교육 데이터: ${basicEducationData.length}명`);
    console.log(`🎓 심화교육 데이터: ${advancedEducationData.length}명`);
    console.log(`👨‍🎓 참가자 데이터: ${participantData.length}명`);
    
    // 참가자 데이터 샘플 확인
    if (participantData.length > 0) {
      console.log('\n📋 참가자 데이터 샘플:');
      participantData.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name}`);
        console.log(`     기관: "${p.institution}" (코드: ${p.institutionCode || '코드없음'})`);
        console.log(`     기초: ${p.basicTraining || '미수료'}`);
        console.log(`     심화: ${p.advancedEducation || '미수료'}`);
      });
      
      // 기관코드가 있는 참가자 수 확인
      const withCode = participantData.filter(p => p.institutionCode).length;
      const withoutCode = participantData.length - withCode;
      console.log(`\n📊 기관코드 보유 현황:`);
      console.log(`  - 기관코드 있음: ${withCode}명 (${((withCode/participantData.length)*100).toFixed(1)}%)`);
      console.log(`  - 기관코드 없음: ${withoutCode}명 (${((withoutCode/participantData.length)*100).toFixed(1)}%)`);
      
      // 경남광역 참가자 확인
      const gwangyeokParticipants = participantData.filter(p => 
        p.institution?.includes('경남광역') || p.institutionCode === 'A48000002'
      );
      if (gwangyeokParticipants.length > 0) {
        console.log(`\n🔍 경남광역 관련 참가자: ${gwangyeokParticipants.length}명`);
        gwangyeokParticipants.slice(0, 3).forEach(p => {
          console.log(`  - ${p.name}: "${p.institution}" (코드: ${p.institutionCode || '없음'})`);
        });
      }
    }
    
    // 기관 데이터 샘플 확인
    if (institutionData.length > 0) {
      console.log('\n🏛️ 기관 데이터 샘플:');
      institutionData.slice(0, 3).forEach((inst, idx) => {
        console.log(`  ${idx + 1}. "${inst.name}" (코드: ${inst.code})`);
      });
    }
    
    // 광역지원기관 확인
    const gwangyeokInstitution = institutionData.find(inst => inst.code === 'A48000002');
    if (gwangyeokInstitution) {
      console.log('\\n🎯 광역지원기관 발견:', gwangyeokInstitution.name, '(코드:', gwangyeokInstitution.code, ')');
    } else {
      console.log('\\n❌ 광역지원기관(A48000002) 기관 데이터에서 미발견');
      
      // 참가자 데이터에서 광역지원기관 확인
      const gwangyeokParticipants = participantData.filter(p => p.institutionCode === 'A48000002');
      console.log(`참가자 데이터에서 A48000002 기관코드: ${gwangyeokParticipants.length}명`);
      
      if (gwangyeokParticipants.length > 0) {
        console.log('광역지원기관 참가자 기관명들:', [...new Set(gwangyeokParticipants.map(p => p.institution))]);
      }
    }
    
    for (const institution of institutionData) {
      // 해당 기관의 종사자 데이터 필터링 (정규화된 매칭 사용)
      const institutionEmployees = employeeData.filter(emp => {
        // 통합 매칭 함수 사용
        const isMatch = matchInstitution(
          { code: emp.institutionCode, name: emp.institution },
          { code: institution.code, name: institution.name }
        );
        
        // 디버깅: 매칭 실패 케이스 로깅
        if (!isMatch && institution.code === 'A48000002') {
          const debug = debugInstitutionMatch(emp.institution || '', institution.name || '');
          console.log(`광역지원기관 매칭 실패: ${emp.institution} vs ${institution.name}`);
          console.log(`  정규화: "${debug.normalized1}" vs "${debug.normalized2}"`);
        }
        
        return isMatch;
      });
      
      // 기관별 매칭 결과 로깅
      if (institutionEmployees.length > 0 || institution.name?.includes('센터') || institution.name?.includes('복지')) {
        console.log(`\n🏢 [${institution.name}] (코드: ${institution.code})`);
        console.log(`   정규화된 이름: ${normalizeInstitutionName(institution.name)}`);
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
      
      // 재직자만 필터링 (개선된 필터링 로직 사용)
      const activeEmployees = filterActiveEmployees(institutionEmployees);
      
      // 직무별 분류 (디버깅 추가)
      const socialWorkers = activeEmployees.filter(emp => 
        emp.jobType === '전담사회복지사' || 
        emp.jobType === '선임전담사회복지사' ||
        emp.jobType === '광역전담사회복지사' ||
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
      
      // 디버깅: 직무별 분류 결과 확인 (특정 기관만)
      if (institution.code === 'A48000002' && activeEmployees.length > 0) {
        console.log(`\n=== [${institution.name}] A48000002 직무 분류 분석 ===`);
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
        
        // isActive 상태 확인
        console.log(`\n재직 상태 분석:`);
        console.log(`- 전체 직원: ${institutionEmployees.length}명`);
        console.log(`- 재직 중인 직원: ${activeEmployees.length}명`);
        console.log(`- 퇴사한 직원: ${institutionEmployees.filter(emp => !emp.isActive).length}명`);
        
        // 각 직원별 상세 정보
        console.log(`\n직원별 상세 정보:`);
        institutionEmployees.forEach((emp, idx) => {
          console.log(`  ${idx + 1}. ${emp.name} - 직무: ${emp.jobType} - 재직: ${emp.isActive ? '재직' : '퇴사'}`);
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
      
      // 교육 참가자 데이터 필터링 (정규화된 매칭 사용)
      const institutionParticipants = participantData.filter(p => {
        // 통합 매칭 함수 사용
        const isMatch = matchInstitution(
          { code: p.institutionCode, name: p.institution },
          { code: institution.code, name: institution.name }
        );
        
        // 디버깅: 매칭 결과 확인 (처음 기관 또는 중요 기관만)
        if (analysisRows.length === 0 && participantData.indexOf(p) < 5) {
          if (!isMatch) {
            console.log(`❌ 매칭 실패: 참가자 "${p.institution}" (${p.institutionCode}) ≠ 기관 "${institution.name}" (${institution.code})`);
          } else {
            console.log(`✅ 매칭 성공: 참가자 "${p.institution}" (${p.institutionCode}) = 기관 "${institution.name}" (${institution.code})`);
          }
        }
        
        return isMatch;
      });
      
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
      
      // 🔥 참가자 페이지와 동일한 교육 이수 현황 계산 로직 적용
      // 재직자만 필터링 (퇴사자 제외)
      const activeParticipants = institutionParticipants.filter(p => {
        // 상태가 '중지', '퇴사' 등이 아닌 경우만 포함
        const isActive = p.status !== '중지' && 
                        p.status !== '퇴사' && 
                        !p.resignDate && 
                        p.isActive !== false;
        return isActive;
      });
      
      console.log(`   재직자 필터링: ${institutionParticipants.length}명 → ${activeParticipants.length}명`);
      
      let basicCompleted = activeParticipants.filter(p => 
        p.basicTraining === '수료' ||
        p.basicTraining === '완료' ||
        p.finalCompletion === '수료'
      );
      
      let advancedCompleted = activeParticipants.filter(p => 
        p.advancedEducation === '수료' ||
        p.advancedEducation === '완료'
      );
      
      // 🔥 소속회원 목록 페이지와 동일한 로직 적용: 기초와 심화 모두 수료한 사람들만 카운트
      let finalCompleted = activeParticipants.filter(p => {
        // 참가자 페이지와 완전히 동일한 조건 적용
        const basicCompleted = p.basicTraining === '수료' ||
                              p.basicTraining === '완료' ||
                              p.finalCompletion === '수료';
        const advancedCompleted = p.advancedEducation === '수료' ||
                                 p.advancedEducation === '완료';
        
        // 🎯 기초와 심화 모두 수료한 경우만 이수자로 인정
        const isBothCompleted = basicCompleted && advancedCompleted;
        
        // 디버깅: 광역지원기관 개별 상태 확인
        if (institution.code === 'A48000002') {
          console.log(`     - ${p.name}: 기초(${p.basicTraining || '없음'}), 심화(${p.advancedEducation || '없음'}), 상태(${p.status || '정상'}), 최종수료: ${isBothCompleted ? 'O' : 'X'}`);
        }
        
        return isBothCompleted;
      });
      
      // 🔥 중복 제거: 같은 사람의 여러 교육 기록을 하나로 통합
      const uniqueFinalCompleted = [];
      const seenNames = new Set();
      finalCompleted.forEach(p => {
        if (!seenNames.has(p.name)) {
          seenNames.add(p.name);
          uniqueFinalCompleted.push(p);
        }
      });
      finalCompleted = uniqueFinalCompleted;
      
      // 🔍 디버깅: 교육 이수 상태 자세히 로깅
      if (institution.code === 'A48000002' || institutionParticipants.length > 0) {
        console.log(`\n📊 [${institution.name}] 교육 이수 상세 분석:`);
        console.log(`전체 참가자: ${institutionParticipants.length}명`);
        console.log(`기초교육 완료자: ${basicCompleted.length}명`);
        console.log(`심화교육 완료자: ${advancedCompleted.length}명`);
        console.log(`최종 이수인원 (중복제거 전): ${uniqueFinalCompleted.length + (finalCompleted.length - uniqueFinalCompleted.length)}건`);
        console.log(`최종 이수인원 (중복제거 후): ${finalCompleted.length}명`);
        
        // 각 참가자별 교육 상태 확인
        institutionParticipants.slice(0, 5).forEach((p, idx) => {
          const hasBasic = p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료';
          const hasAdvanced = p.advancedEducation === '완료' || p.advancedEducation === '수료';
          console.log(`  ${idx + 1}. ${p.name}: 기초=${p.basicTraining || 'N/A'}, 심화=${p.advancedEducation || 'N/A'}, 최종=${p.finalCompletion || 'N/A'} → ${hasBasic && hasAdvanced ? '✅이수' : '❌미이수'}`);
        });
      }
      
      // participantData가 없거나 매칭이 안 된 경우, basicEducationData와 advancedEducationData에서 직접 찾기
      if (institutionParticipants.length === 0 && (basicEducationData.length > 0 || advancedEducationData.length > 0)) {
        console.log(`📚 [${institution.name}] participantData 매칭 실패, educationData에서 직접 검색`);
        
        // basicEducationData에서 해당 기관 찾기 (정규화된 매칭 사용)
        const institutionBasicEdu = basicEducationData.filter(edu => {
          // 통합 매칭 함수 사용
          if (matchInstitution(
            { code: edu.institutionCode, name: edu.institution },
            { code: institution.code, name: institution.name }
          )) return true;
          
          // 종사자 이름으로 매칭 (보조 방법)
          const employeeMatch = institutionEmployees.some(emp => 
            emp.name === edu.name || 
            (emp.residentId && edu.residentId && emp.residentId === edu.residentId)
          );
          if (employeeMatch) return true;
          
          return false;
        });
        
        // advancedEducationData에서 해당 기관 찾기 (정규화된 매칭 사용)
        const institutionAdvancedEdu = advancedEducationData.filter(edu => {
          // 통합 매칭 함수 사용
          if (matchInstitution(
            { code: edu.institutionCode, name: edu.institution },
            { code: institution.code, name: institution.name }
          )) return true;
          
          // 종사자 이름으로 매칭 (보조 방법)
          const employeeMatch = institutionEmployees.some(emp => 
            emp.name === edu.name || 
            (emp.residentId && edu.residentId && emp.residentId === edu.residentId)
          );
          if (employeeMatch) return true;
          
          return false;
        });
        
        console.log(`   기초교육 매칭: ${institutionBasicEdu.length}명`);
        console.log(`   심화교육 매칭: ${institutionAdvancedEdu.length}명`);
        
        // 교육 이수자로 변환
        basicCompleted = institutionBasicEdu.filter(edu => 
          edu.status === '수료' || edu.status === '완료' || edu.finalCompletion === '수료'
        );
        
        advancedCompleted = institutionAdvancedEdu.filter(edu => 
          edu.status === '수료' || edu.status === '완료'
        );
        
        // 🔥 개선된 교차 매칭: 기초와 심화 모두 수료한 사람들 (더 정확한 매칭)
        finalCompleted = institutionBasicEdu.filter(basicEdu => {
          const hasBasic = basicEdu.status === '수료' || basicEdu.status === '완료' || basicEdu.finalCompletion === '수료';
          
          if (!hasBasic) return false;
          
          // 심화교육에서 동일인 찾기 (다양한 매칭 방법 시도)
          const hasAdvanced = institutionAdvancedEdu.some(advEdu => {
            if (advEdu.status !== '수료' && advEdu.status !== '완료') return false;
            
            // 1차: 이름 + 주민등록번호 매칭
            if (basicEdu.name === advEdu.name && 
                basicEdu.residentId && advEdu.residentId && 
                basicEdu.residentId === advEdu.residentId) {
              return true;
            }
            
            // 2차: 이름만 정확 매칭 (주민등록번호가 없는 경우)
            if (basicEdu.name === advEdu.name && 
                (!basicEdu.residentId || !advEdu.residentId)) {
              return true;
            }
            
            // 3차: 이름 유사 매칭 (공백, 특수문자 무시)
            const normalizeName = (name: string) => name?.replace(/\s+/g, '').toLowerCase() || '';
            if (normalizeName(basicEdu.name) === normalizeName(advEdu.name)) {
              return true;
            }
            
            return false;
          });
          
          return hasBasic && hasAdvanced;
        });
        
        console.log(`   기초교육 수료자: ${basicCompleted.length}명`);
        console.log(`   심화교육 수료자: ${advancedCompleted.length}명`);
        console.log(`   최종 이수인원 (기초+심화 모두): ${finalCompleted.length}명`);
        
        // 🔍 세부 디버깅: 매칭 실패 케이스 분석
        if (basicCompleted.length > 0 && advancedCompleted.length > 0 && finalCompleted.length === 0) {
          console.log(`   ⚠️ 교차 매칭 실패 - 세부 분석:`);
          console.log(`   기초교육 수료자 이름들:`, basicCompleted.slice(0, 3).map(edu => edu.name));
          console.log(`   심화교육 수료자 이름들:`, advancedCompleted.slice(0, 3).map(edu => edu.name));
        }
      }
      
      // 광역지원기관 디버깅을 위한 특별 로깅
      if (institution.code === 'A48000002' || 
          institution.district?.includes('*광역지원기관') ||
          institution.district?.includes('광역지원기관')) {
        console.log(`\\n🔍 [광역지원기관 디버깅] ${institution.name}`);
        console.log(`기관코드: ${institution.code}`);
        console.log(`전체 재직자: ${activeEmployees.length}명`);
        console.log(`참가자 데이터 매칭: ${institutionParticipants.length}명`);
        console.log(`기초교육 완료자: ${basicCompleted.length}명`);
        console.log(`심화교육 완료자: ${advancedCompleted.length}명`);
        console.log(`최종 이수인원 (기초+심화): ${finalCompleted.length}명`);
        
        // 참가자별 상세 분석
        if (institutionParticipants.length > 0) {
          console.log(`\\n참가자별 교육 현황:`);
          institutionParticipants.forEach((p, idx) => {
            const hasBasic = p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료';
            const hasAdvanced = p.advancedEducation === '완료' || p.advancedEducation === '수료';
            console.log(`  ${idx + 1}. ${p.name} - 기초: ${p.basicTraining || 'N/A'}, 심화: ${p.advancedEducation || 'N/A'} (최종: ${hasBasic && hasAdvanced ? 'O' : 'X'})`);
          });
        } else {
          console.log(`참가자 데이터 매칭 실패 - 기관명으로 재검색 필요`);
          // 기관명으로 참가자 데이터 재검색
          const manualParticipants = participantData.filter(p => 
            p.institution?.includes('광역') || 
            p.institution?.includes(institution.name?.replace(/\\s+/g, '')) ||
            institution.name?.includes(p.institution?.replace(/\\s+/g, ''))
          );
          console.log(`수동 검색 결과: ${manualParticipants.length}명`);
          if (manualParticipants.length > 0) {
            console.log(`수동 검색된 기관명들:`, [...new Set(manualParticipants.map(p => p.institution))]);
          }
        }
        console.log(`===============================\\n`);
      }
      
      // 🔥 직무별 교육 이수자 분류 - 최종수료자들을 직무별로 분류 (중복 제거)
      let socialEducationCompleted = finalCompleted.filter(p => {
        const jobType = p.jobType || '';
        return jobType.includes('전담') || 
               jobType === '전담사회복지사' ||
               jobType === '선임전담사회복지사';
      });
      
      // 🔥 중복 제거: 같은 사람의 여러 교육 기록을 하나로 통합
      const uniqueSocialEducationCompleted = [];
      const seenSocialNames = new Set();
      socialEducationCompleted.forEach(p => {
        if (!seenSocialNames.has(p.name)) {
          seenSocialNames.add(p.name);
          uniqueSocialEducationCompleted.push(p);
        }
      });
      socialEducationCompleted = uniqueSocialEducationCompleted;
      
      let lifeEducationCompleted = finalCompleted.filter(p => {
        const jobType = p.jobType || '';
        return jobType.includes('생활지원') || 
               jobType === '생활지원사' ||
               jobType.includes('특화') ||
               jobType.includes('요양') ||
               jobType.includes('돌봄') ||
               jobType.includes('케어');
      });
      
      // 🔥 중복 제거: 같은 사람의 여러 교육 기록을 하나로 통합
      const uniqueLifeEducationCompleted = [];
      const seenLifeNames = new Set();
      lifeEducationCompleted.forEach(p => {
        if (!seenLifeNames.has(p.name)) {
          seenLifeNames.add(p.name);
          uniqueLifeEducationCompleted.push(p);
        }
      });
      lifeEducationCompleted = uniqueLifeEducationCompleted;
      
      // educationData에서 직무별 분류도 추가 (participantData가 없는 경우)
      if (institutionParticipants.length === 0 && finalCompleted.length > 0) {
        // 🔥 개선된 종사자 데이터와의 매칭
        socialEducationCompleted = finalCompleted.filter(edu => {
          const employee = institutionEmployees.find(emp => {
            // 다양한 매칭 방법 시도
            if (emp.name === edu.name) return true;
            if (emp.residentId && edu.residentId && emp.residentId === edu.residentId) return true;
            
            // 이름 정규화 매칭
            const normalizeName = (name: string) => name?.replace(/\s+/g, '').toLowerCase() || '';
            if (normalizeName(emp.name) === normalizeName(edu.name)) return true;
            
            return false;
          });
          
          return employee && (
            employee.jobType?.includes('전담') || 
            employee.jobType === '전담사회복지사' ||
            employee.jobType === '선임전담사회복지사'
          );
        });
        
        lifeEducationCompleted = finalCompleted.filter(edu => {
          const employee = institutionEmployees.find(emp => {
            // 다양한 매칭 방법 시도
            if (emp.name === edu.name) return true;
            if (emp.residentId && edu.residentId && emp.residentId === edu.residentId) return true;
            
            // 이름 정규화 매칭
            const normalizeName = (name: string) => name?.replace(/\s+/g, '').toLowerCase() || '';
            if (normalizeName(emp.name) === normalizeName(edu.name)) return true;
            
            return false;
          });
          
          return employee && (
            employee.jobType?.includes('생활지원') || 
            employee.jobType === '생활지원사' ||
            employee.jobType?.includes('특화') ||
            employee.jobType?.includes('요양') ||
            employee.jobType?.includes('돌봄') ||
            employee.jobType?.includes('케어')
          );
        });
        
        // 🔥 educationData에서도 중복 제거 적용
        const uniqueSocialEducationCompleted = [];
        const seenSocialEduNames = new Set();
        socialEducationCompleted.forEach(p => {
          if (!seenSocialEduNames.has(p.name)) {
            seenSocialEduNames.add(p.name);
            uniqueSocialEducationCompleted.push(p);
          }
        });
        socialEducationCompleted = uniqueSocialEducationCompleted;

        const uniqueLifeEducationCompleted = [];
        const seenLifeEduNames = new Set();
        lifeEducationCompleted.forEach(p => {
          if (!seenLifeEduNames.has(p.name)) {
            seenLifeEduNames.add(p.name);
            uniqueLifeEducationCompleted.push(p);
          }
        });
        lifeEducationCompleted = uniqueLifeEducationCompleted;

        // 🔍 직무별 분류 디버깅 (중복제거 후)
        console.log(`   직무별 이수자 분류 (중복제거 후):`);
        console.log(`   - 전담사회복지사: ${socialEducationCompleted.length}명`);
        console.log(`   - 생활지원사: ${lifeEducationCompleted.length}명`);
        console.log(`   - 분류되지 않음: ${finalCompleted.length - socialEducationCompleted.length - lifeEducationCompleted.length}명`);
      }
      
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
            // 스냅샷 날짜가 있으면 해당 날짜 기준, 없으면 현재 날짜 기준
            const referenceDate = snapshotDate ? new Date(snapshotDate) : new Date();
            
            // 유효한 날짜인지 확인
            if (isNaN(hireDate.getTime())) {
              console.warn(`[${jobTypeName}] 유효하지 않은 입사일:`, emp.hireDate);
              return sum;
            }
            
            const days = Math.floor((referenceDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
            const validDays = Math.max(0, days);
            console.log(`- ${emp.name} (${emp.hireDate}): ${validDays}일 (기준일: ${referenceDate.toISOString().split('T')[0]})`);
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
      
      // 교육 이수율 계산 - NaN 방지 (기초와 심화 모두 수료한 최종수료자 기준)
      const totalEducationRate = (totalActive > 0 && !isNaN(finalCompleted.length)) ? 
        Math.round((finalCompleted.length / totalActive) * 100 * 10) / 10 : 0;
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
        
        // 종사자 직무교육 이수율 - H: 배움터 등록기준 (교육 대상자 중복 제거)
        education_target_total: [...new Set(institutionParticipants.map(p => p.name))].length || 0, // H: 배움터에 등록된 전체 인원 (중복제거)
        education_target_social: [...new Set(institutionParticipants.filter(p => {
          const jobType = p.jobType || '';
          return jobType.includes('전담') || jobType === '전담사회복지사' || jobType === '선임전담사회복지사';
        }).map(p => p.name))].length || 0, // H: 배움터에 등록된 전담사회복지사 (중복제거)
        education_target_life: [...new Set(institutionParticipants.filter(p => {
          const jobType = p.jobType || '';
          return jobType.includes('생활지원') || jobType === '생활지원사' || jobType.includes('특화') || jobType.includes('요양') || jobType.includes('돌봄') || jobType.includes('케어');
        }).map(p => p.name))].length || 0, // H: 배움터에 등록된 생활지원사 (중복제거)
        education_completed_total: finalCompleted.length || 0, // I: 이수인원 (기초+심화 모두 수료)
        education_completed_social: socialEducationCompleted.length || 0,
        education_completed_life: lifeEducationCompleted.length || 0,
        education_rate_total: isNaN(totalEducationRate) ? 0 : totalEducationRate, // (I/H) 이수율
        education_rate_social: isNaN(socialEducationRate) ? 0 : socialEducationRate,
        education_rate_life: isNaN(lifeEducationRate) ? 0 : lifeEducationRate,
        education_d_rate_total: (totalActive > 0 && !isNaN(finalCompleted.length)) ? 
          Math.round((finalCompleted.length / totalActive) * 100 * 10) / 10 : 0, // (I/D) 모인우리 등록기준 이수율
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