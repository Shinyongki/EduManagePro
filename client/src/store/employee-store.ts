import { create } from 'zustand';
import type { EmployeeData, InstitutionData } from '@shared/schema';

interface EmployeeStore {
  employeeData: EmployeeData[];
  institutionData: InstitutionData[];
  setEmployeeData: (data: EmployeeData[]) => void;
  setInstitutionData: (data: InstitutionData[]) => void;
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
    
    setEmployeeData: (data) => set({ employeeData: data }),
    setInstitutionData: (data) => set({ institutionData: data }),
    
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
