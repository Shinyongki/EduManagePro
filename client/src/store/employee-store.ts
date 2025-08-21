import { create } from 'zustand';
import type { EmployeeData, InstitutionData } from '@shared/schema';

interface EmployeeStore {
  employeeData: EmployeeData[];
  institutionData: InstitutionData[];
  isLoaded: boolean;
  isLoading: boolean;
  setEmployeeData: (data: EmployeeData[]) => void;
  setInstitutionData: (data: InstitutionData[]) => void;
  loadEmployeeData: () => Promise<void>;
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
    
    setEmployeeData: (data) => set({ employeeData: data, isLoaded: true }),
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
        let employeeData = await educationDB.getItem<EmployeeData[]>('employeeData');
        
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
    
    getEmployeeStats: () => {
      const { employeeData, institutionData } = get();
      
      // 재직자 계산: resignDate가 없거나 미래인 경우
      const activeEmployees = employeeData.filter(emp => {
        if (!emp.resignDate) return true; // 퇴사일이 없으면 재직자
        try {
          const resignDate = new Date(emp.resignDate);
          const today = new Date();
          return resignDate > today; // 퇴사일이 미래이면 재직자
        } catch {
          return true; // 날짜 파싱 실패시 재직자로 간주
        }
      });
      
      const totalEmployees = activeEmployees.length;
      
      // 실제 데이터 기준으로 직무별 카운트
      const socialWorkerCount = activeEmployees.filter(emp => 
        emp.jobType === '전담사회복지사' || 
        emp.jobType === '선임전담사회복지사'
      ).length;
      const lifeSupportCount = activeEmployees.filter(emp => emp.jobType === '생활지원사').length;
      
      // 충원율 계산 (실제 데이터가 없으므로 임시 계산)
      const expectedTotal = Math.max(socialWorkerCount + lifeSupportCount, totalEmployees);
      const fillRate = expectedTotal > 0 ? Math.round((totalEmployees / expectedTotal) * 100) : 100;
      
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
      
      // 기관 수 계산 (regionCode 기준)
      const uniqueInstitutions = new Set(employeeData.map(emp => emp.regionCode).filter(Boolean));
      const institutionCount = uniqueInstitutions.size || institutionData.length;
      
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
