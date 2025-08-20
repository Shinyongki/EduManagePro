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
      
      const activeEmployees = employeeData.filter(emp => emp.isActive);
      const totalEmployees = activeEmployees.length;
      
      const socialWorkerCount = activeEmployees.filter(emp => 
        emp.jobType === '전담사회복지사' || 
        emp.jobType === '선임전담사회복지사'
      ).length;
      const lifeSupportCount = activeEmployees.filter(emp => emp.jobType === '생활지원사').length;
      
      // Calculate fill rate from institution data
      const totalAllocated = institutionData.reduce((sum, inst) => 
        sum + inst.allocatedSocialWorkers + inst.allocatedLifeSupport, 0);
      const totalActual = institutionData.reduce((sum, inst) => 
        sum + inst.actualSocialWorkers + inst.actualLifeSupport, 0);
      const fillRate = totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0;
      
      // Calculate average tenure
      const totalWorkDays = activeEmployees.reduce((sum, emp) => sum + (emp.workDays || 0), 0);
      const averageTenure = activeEmployees.length > 0 ? 
        Math.round((totalWorkDays / activeEmployees.length) / 365 * 10) / 10 : 0;
      
      const institutionCount = institutionData.length;
      
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
