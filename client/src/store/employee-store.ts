import { create } from 'zustand';
import type { EmployeeData, InstitutionData } from '@shared/schema';

interface EmployeeStore {
  employeeData: EmployeeData[];
  institutionData: InstitutionData[];
  isLoaded: boolean;
  isLoading: boolean;
  institutionDataLoaded: boolean;
  setEmployeeData: (data: EmployeeData[]) => void;
  setInstitutionData: (data: InstitutionData[]) => void;
  loadEmployeeData: () => Promise<void>;
  loadInstitutionData: () => Promise<void>;
  getEmployeeStats: () => {
    totalEmployees: number;
    socialWorkerCount: number;
    lifeSupportCount: number;
    fillRate: number;
    averageTenure: number;
    institutionCount: number;
  };
}

export const useEmployeeStore = create<EmployeeStore>()(
  (set, get) => ({
    employeeData: [],
    institutionData: [],
    isLoaded: false,
    isLoading: false,
    institutionDataLoaded: false,
    
    setEmployeeData: (data) => {
      // 안전한 중복 제거
      try {
        console.log('🚀 === Store: 데이터 설정 시작 ===');
        console.log(`📊 Store: 원본 데이터 개수: ${data?.length || 0}개`);
        
        if (!Array.isArray(data) || data.length === 0) {
          console.log('❌ Store: 빈 데이터 또는 배열이 아님');
          set({ employeeData: [], isLoaded: true });
          return;
        }
        
        // 이정민님 원본 개수 확인
        const originalJungMinCount = data.filter(emp => emp.name === '이정민').length;
        console.log(`📊 Store: 원본 이정민님 개수: ${originalJungMinCount}개`);
        
        // 🔧 1단계: ID 기준 중복 제거
        const uniqueById = data.filter((emp, index, array) => {
          if (!emp?.id) return false;
          const isFirst = array.findIndex(e => e?.id === emp.id) === index;
          if (emp.name === '이정민' && !isFirst) {
            console.log(`🗑️ Store: 이정민님 ID 중복 제거: ${emp.id}`);
          }
          return isFirst;
        });
        
        // 🔧 2단계: 이정민님 추가 중복 제거 (이름+생년월일+입사일 기준)
        const uniqueEmployees = uniqueById.filter((emp, index, array) => {
          if (emp.name === '이정민') {
            const key = `${emp.name}-${emp.birthDate}-${emp.hireDate}`;
            const isFirst = array.findIndex(e => 
              e.name === '이정민' && 
              `${e.name}-${e.birthDate}-${e.hireDate}` === key
            ) === index;
            
            if (!isFirst) {
              console.log(`🗑️ Store: 이정민님 추가 중복 제거 (${key}): ${emp.id}`);
            }
            return isFirst;
          }
          return true; // 다른 직원들은 그대로 유지
        });
        
        console.log(`🔧 Store: ID 중복 제거: 원본 ${data.length}개 → 정리 후 ${uniqueEmployees.length}개`);
        
        // 이정민님 중복 확인
        const jungMinCount = uniqueEmployees.filter(emp => emp.name === '이정민').length;
        console.log(`🔧 Store: 이정민님 중복 제거 후: ${jungMinCount}개`);
        console.log('🚀 === Store: 중복 제거 완료 ===');
        
        set({ employeeData: uniqueEmployees, isLoaded: true });
      } catch (error) {
        console.error('❌ Store: 데이터 설정 중 오류:', error);
        set({ employeeData: data || [], isLoaded: true });
      }
    },
    setInstitutionData: (data) => set({ institutionData: data }),
    
    loadEmployeeData: async () => {
      const { isLoading, isLoaded } = get();
      
      // 이미 로딩 중이거나 로드 완료된 경우 스킵
      if (isLoading || isLoaded) {
        return;
      }
      
      set({ isLoading: true });
      
      try {
        console.log('🔄 종사자 데이터 자동 로딩 시작...');
        
        // IndexedDB에서 먼저 시도
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        let rawData = await educationDB.getItem<any>('employeeData');
        
        // API 응답 구조 또는 직접 배열 모두 처리
        let employeeData: EmployeeData[] = [];
        if (rawData) {
          if (Array.isArray(rawData)) {
            employeeData = rawData;
          } else if (rawData.data && Array.isArray(rawData.data)) {
            console.log('📦 IndexedDB에서 API 응답 구조 감지, data 배열 추출');
            employeeData = rawData.data;
          } else {
            console.warn('⚠️ IndexedDB 데이터가 예상과 다른 구조:', typeof rawData);
          }
        }
        
        if (!employeeData || employeeData.length === 0) {
          console.log('📡 IndexedDB에 종사자 데이터 없음, 서버에서 가져오기...');
          
          try {
            const response = await fetch('/api/employees?limit=100000');
            if (response.ok) {
              const result = await response.json();
              employeeData = result.data || [];
              
              if (employeeData.length > 0) {
                // IndexedDB에 저장
                await educationDB.setItem('employeeData', employeeData);
                console.log(`💾 IndexedDB에 ${employeeData.length}명 종사자 데이터 저장 완료`);
              }
            } else {
              console.warn('서버 API 응답 실패:', response.status);
              employeeData = [];
            }
          } catch (error) {
            console.warn('서버 API 호출 실패:', error);
            employeeData = [];
          }
        }
        
        console.log(`✅ 종사자 데이터 자동 로딩 완료: ${employeeData?.length || 0}명`);
        
        if (employeeData && employeeData.length > 0) {
          console.log('🔧 자동 데이터 보정 시작...');
          // 데이터 보정 적용 (백현태님 등)
          const correctedData = employeeData.map(emp => {
            if (emp.name === '백현태' && emp.modifiedDate === 'qorgusxo11') {
              return {
                ...emp,
                notes: emp.remarks || '개인사유로 인한 퇴사',
                note: emp.remarks || '개인사유로 인한 퇴사',
                modifiedDate: emp.mainDuty || '2024-04-01',
                mainDuty: '-',
                primaryWork: '-',
                learningId: emp.learningId || 'qorgusxo11',
                updateDate: emp.updateDate || '2024-04-01',
                mainTasks: emp.mainTasks || '-',
                corrected: true,
                correctionType: 'field_mapping_fix'
              };
            }
            
            // 컬럼 밀림 현상 보정 (careerType에 이름이 들어간 경우들) - 스토어용
            if (emp.careerType && 
                typeof emp.careerType === 'string' && 
                emp.careerType.length >= 2 && 
                emp.careerType.length <= 4 && 
                /^[가-힣]+$/.test(emp.careerType) &&
                emp.careerType !== '기타' &&
                emp.birthDate && 
                (emp.birthDate.includes('년이상') || emp.birthDate === '기타')) {
              
              console.log(`🔧 [스토어] 컬럼밀림보정 "${emp.careerType}" - 생년월일: ${emp.gender}, 경력: ${emp.birthDate}`);
              
              return {
                ...emp,
                name: emp.careerType,           // 실제 이름
                // responsibility는 원본 유지 (특화는 특화로 유지)
                careerType: emp.birthDate,      // 경력 정보
                birthDate: emp.gender,          // 생년월일
                gender: emp.hireDate,           // 성별
                hireDate: emp.resignDate || emp.learningId,  // 입사일
                resignDate: null,               // 퇴사일 초기화 (재직자로 보정)
                isActive: true,                 // 재직자로 설정
                corrected: true,
                correctionType: 'name_in_careerType_fix'
              };
            }
            
            return emp;
          });
          
          set({ employeeData: correctedData, isLoaded: true });
          
          // 보정된 데이터를 다시 저장
          try {
            await educationDB.setItem('employeeData', correctedData);
          } catch (error) {
            console.warn('보정된 데이터 저장 실패:', error);
          }
        } else {
          set({ employeeData: [], isLoaded: true });
        }
        
      } catch (error) {
        console.error('종사자 데이터 로딩 실패:', error);
        set({ employeeData: [], isLoaded: true });
      } finally {
        set({ isLoading: false });
      }
    },
    
    loadInstitutionData: async () => {
      const { institutionDataLoaded } = get();
      
      // 이미 로드 완료된 경우 스킵 (강제로 다시 로드하려면 institutionDataLoaded를 false로 설정)
      if (institutionDataLoaded) {
        console.log('🔄 기관 데이터 이미 로드됨, 스킵...');
        return;
      }
      
      try {
        console.log('🔄 기관 데이터 자동 로딩 시작...');
        
        // IndexedDB에서 먼저 시도
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        let institutionData = await educationDB.getItem<InstitutionData[]>('institutionData');
        
        if (!institutionData || institutionData.length === 0) {
          console.log('📡 IndexedDB에 기관 데이터 없음, 서버에서 가져오기...');
          
          try {
            const response = await fetch('/api/institutions');
            if (response.ok) {
              const serverData = await response.json();
              
              if (serverData && serverData.length > 0) {
                // 서버에서 데이터가 있을 때만 업데이트
                institutionData = serverData;
                await educationDB.setItem('institutionData', institutionData);
                console.log(`💾 IndexedDB에 ${institutionData.length}개 기관 데이터 저장 완료`);
              } else {
                // 서버에 데이터가 없어도 기존 IndexedDB 데이터는 유지
                console.log('⚠️ 서버에 데이터 없음, 기존 데이터 유지');
                institutionData = institutionData || [];
              }
            } else {
              console.warn('서버 API 응답 실패:', response.status, '기존 데이터 유지');
              institutionData = institutionData || [];
            }
          } catch (error) {
            console.warn('서버 API 호출 실패:', error, '기존 데이터 유지');
            institutionData = institutionData || [];
          }
        }
        
        console.log(`✅ 기관 데이터 자동 로딩 완료: ${institutionData?.length || 0}개`);
        
        // 로드된 데이터가 있든 없든 상태 업데이트
        set({ 
          institutionData: institutionData || [], 
          institutionDataLoaded: true 
        });
        
      } catch (error) {
        console.error('기관 데이터 로딩 심각한 오류:', error);
        // 🚨 절대로 기존 데이터를 지우지 않음!
        // 현재 스토어 상태 유지 또는 빈 배열만 설정 (기존 데이터 보존)
        const currentState = get();
        set({ 
          institutionData: currentState.institutionData || [], 
          institutionDataLoaded: false  // 다음에 다시 시도할 수 있도록
        });
      }
    },
    
    getEmployeeStats: () => {
      const { employeeData, institutionData } = get();
      
      // employeeData가 배열인지 확인
      if (!Array.isArray(employeeData)) {
        return {
          totalEmployees: 0,
          socialWorkerCount: 0,
          lifeSupportCount: 0,
          fillRate: 0,
          averageTenure: 0,
          institutionCount: 0,
        };
      }
      
      // 재직자 계산: 퇴사일이 없거나 미래인 경우 (여러 퇴사일 필드 통합)
      const activeEmployees = employeeData.filter(emp => {
        // 퇴사일 필드 통합 (employee-data.tsx와 동일한 로직)
        const resignDate = emp.resignDate || emp.퇴사일 || emp.exitDate || emp.leaveDate;
        
        if (!resignDate || resignDate === '' || resignDate === '-') return true; // 퇴사일이 없으면 재직자
        try {
          const resignDateObj = new Date(resignDate);
          const today = new Date();
          return resignDateObj > today; // 퇴사일이 미래이면 재직자
        } catch {
          return true; // 날짜 파싱 실패시 재직자로 간주
        }
      });
      
      const totalEmployees = activeEmployees.length;
      
      // 실제 데이터 기준으로 직무별 카운트 (담당업무 기준 포함)
      const socialWorkerList = activeEmployees.filter(emp => {
        // 직무 유형으로 판단
        if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
          return true;
        }
        
        // 담당업무로 판단 (일반및중점, 특화를 담당하는 사람들은 전담사회복지사로 분류)
        const duty = emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
        if (duty === '일반및중점' || duty === '일반및 중점' || duty === '특화') {
          return true;
        }
        
        return false;
      });
      
      const socialWorkerCount = socialWorkerList.length;
      
      // 전담사회복지사 카운팅 디버깅
      console.log(`📊 전담사회복지사 카운팅 분석:`);
      console.log(`  - 전체 재직자: ${activeEmployees.length}명`);
      console.log(`  - 전담사회복지사(선임 포함): ${socialWorkerCount}명`);
      
      const jobTypeStats = {
        전담사회복지사: activeEmployees.filter(emp => emp.jobType === '전담사회복지사').length,
        선임전담사회복지사: activeEmployees.filter(emp => emp.jobType === '선임전담사회복지사').length,
        dutyBased: activeEmployees.filter(emp => {
          const duty = emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
          return (duty === '일반및중점' || duty === '일반및 중점' || duty === '특화') && 
                 emp.jobType !== '전담사회복지사' && emp.jobType !== '선임전담사회복지사';
        }).length
      };
      console.log(`  - 직무별 분류:`, jobTypeStats);
      console.log(`  - 총합: ${jobTypeStats.전담사회복지사 + jobTypeStats.선임전담사회복지사 + jobTypeStats.dutyBased}명`);
      const lifeSupportCount = activeEmployees.filter(emp => emp.jobType === '생활지원사').length;
      
      // 충원율 계산
      // 기관 데이터가 있고 정원(quota) 정보가 있으면 사용
      // 데이터가 없으면 0% 표시
      let fillRate = 0;
      
      if (institutionData && institutionData.length > 0) {
        // 기관별 정원 합계 계산 (전담사회복지사 + 생활지원사)
        const totalQuota = institutionData.reduce((sum, inst: any) => {
          const socialWorkerQuota = inst.allocatedSocialWorkers || 0;
          const lifeSupportQuota = inst.allocatedLifeSupport || 0;
          return sum + socialWorkerQuota + lifeSupportQuota;
        }, 0);
        console.log(`📊 정원 계산: 총 기관 수 ${institutionData.length}개, 총 정원 ${totalQuota}명`);
        
        if (totalQuota > 0) {
          // 정원 대비 현원 비율 계산
          fillRate = Math.round((totalEmployees / totalQuota) * 100);
          console.log(`📊 정원대비 현원: ${totalEmployees}명 / ${totalQuota}명 = ${fillRate}%`);
        } else {
          // 정원 정보가 없으면 0%로 표시
          fillRate = 0;
          console.log(`⚠️ 정원 정보 없음: totalQuota = ${totalQuota}`);
        }
      }
      
      // 평균 근속기간 계산 (hireDate 기준)
      const validTenures = activeEmployees
        .filter(emp => emp.hireDate)
        .map(emp => {
          try {
            const hireDate = new Date(emp.hireDate!);
            const endDate = emp.resignDate ? new Date(emp.resignDate) : new Date();
            return (endDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          } catch {
            return 0;
          }
        })
        .filter(tenure => tenure >= 0);
      
      const averageTenure = validTenures.length > 0 ? 
        Math.round((validTenures.reduce((sum, tenure) => sum + tenure, 0) / validTenures.length) * 10) / 10 : 0;
      
      // 기관 수 계산
      // 1. 기관 데이터가 있으면 그것을 우선 사용
      // 2. 없으면 종사자 데이터에서 unique institution 계산
      let institutionCount = 0;
      
      if (institutionData && institutionData.length > 0) {
        // 기관 데이터에서 광역지원기관 제외하고 카운트
        // 가능한 모든 기관명 필드 체크 (수행기관명, institutionName, name, 광역명 등)
        institutionCount = institutionData.filter((inst: any) => {
          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
          const code = inst['수행기관코드'] || inst['광역코드'] || inst.institutionCode || inst.code || '';
          const isMetro = inst['광역시'] || '';
          
          // 광역지원기관 제외 조건
          const isExcluded = (
            name.includes('광역지원') ||
            name.includes('경상남도사회서비스원') ||
            code === 'A48000002' ||
            name.includes('사회서비스원') ||
            isMetro.includes('광역')
          );
          
          // 유효한 기관명이 있고 제외 대상이 아닌 경우만 카운트
          return name && name.trim() !== '' && !isExcluded;
        }).length;
        
        console.log(`기관 데이터 기준 총 기관수: ${institutionCount}개 (전체: ${institutionData.length}개)`);
      } else {
        // 종사자 데이터에서 unique institution 계산
        const uniqueInstitutions = new Set(
          activeEmployees
            .filter(emp => {
              const institution = emp.institution || '';
              const institutionCode = emp.institutionCode || '';
              // 광역지원기관 제외
              return !(
                institution.includes('광역') ||
                institution.includes('경상남도사회서비스원') ||
                institutionCode === 'A48000002' ||
                institution.includes('사회서비스원')
              );
            })
            .map(emp => emp.institution)
            .filter(Boolean)
        );
        institutionCount = uniqueInstitutions.size;
        console.log(`종사자 데이터 기준 총 기관수: ${institutionCount}개`);
      }
      
      return {
        totalEmployees,
        socialWorkerCount,
        lifeSupportCount,
        fillRate,
        averageTenure,
        institutionCount,
      };
    },
  })
);
