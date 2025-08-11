import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisConfig, AnalysisResult } from '@shared/schema';
import { useEducationStore } from './education-store';
import { useEmployeeStore } from './employee-store';

interface AnalysisStore {
  analysisConfig: AnalysisConfig | null;
  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  setAnalysisConfig: (config: AnalysisConfig) => void;
  setAnalysisResults: (results: AnalysisResult[]) => void;
  runAnalysis: () => Promise<void>;
  getAnalysisStats: () => {
    totalAnalyzed: number;
    matchingSuccessRate: number;
    completionRate: number;
    incompleteCount: number;
  };
}

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      analysisConfig: null,
      analysisResults: [],
      isAnalyzing: false,
      
      setAnalysisConfig: (config) => set({ analysisConfig: config }),
      setAnalysisResults: (results) => set({ analysisResults: results }),
      
      runAnalysis: async () => {
        const { analysisConfig } = get();
        if (!analysisConfig) return;
        
        set({ isAnalyzing: true });
        
        try {
          // Get data from other stores
          const educationStore = useEducationStore.getState();
          const employeeStore = useEmployeeStore.getState();
          
          const { basicEducationData, advancedEducationData } = educationStore;
          const { employeeData } = employeeStore;
          
          // Simulate analysis processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Perform data matching and analysis
          const results = performDataMatching(
            employeeData,
            basicEducationData,
            advancedEducationData,
            analysisConfig
          );
          
          set({ analysisResults: results });
        } catch (error) {
          console.error('Analysis error:', error);
          throw error;
        } finally {
          set({ isAnalyzing: false });
        }
      },
      
      getAnalysisStats: () => {
        const { analysisResults } = get();
        
        const totalAnalyzed = analysisResults.length;
        const matchingSuccess = analysisResults.filter(r => r.matchStatus === '매칭성공').length;
        const completed = analysisResults.filter(r => r.status === '우수').length;
        const incomplete = analysisResults.filter(r => r.status === '미완료').length;
        
        const matchingSuccessRate = totalAnalyzed > 0 ? 
          Math.round((matchingSuccess / totalAnalyzed) * 100) : 0;
        const completionRate = totalAnalyzed > 0 ? 
          Math.round((completed / totalAnalyzed) * 100) : 0;
        
        return {
          totalAnalyzed,
          matchingSuccessRate,
          completionRate,
          incompleteCount: incomplete,
        };
      },
    }),
    {
      name: 'analysis-store',
    }
  )
);

function performDataMatching(
  employeeData: any[], 
  basicEducationData: any[], 
  advancedEducationData: any[],
  config: AnalysisConfig
): AnalysisResult[] {
  
  return employeeData.map(employee => {
    // Find matching education records
    const basicMatch = findEducationMatch(employee, basicEducationData, config.matchingCriteria);
    const advancedMatch = findEducationMatch(employee, advancedEducationData, config.matchingCriteria);
    
    // Determine education status
    const basicEducation = basicMatch ? 
      (basicMatch.status === '수료' ? '완료' : '미완료') : '해당없음';
    const advancedEducation = advancedMatch ? 
      (advancedMatch.status === '수료' ? '완료' : '미완료') : '해당없음';
    
    // Calculate completion rate
    let completionCount = 0;
    let totalRequired = 0;
    
    if (basicEducation !== '해당없음') {
      totalRequired++;
      if (basicEducation === '완료') completionCount++;
    }
    
    if (advancedEducation !== '해당없음') {
      totalRequired++;
      if (advancedEducation === '완료') completionCount++;
    }
    
    const overallCompletionRate = totalRequired > 0 ? 
      Math.round((completionCount / totalRequired) * 100) : 0;
    
    // Determine overall status
    let status: '우수' | '미완료' | '진행중' = '미완료';
    if (overallCompletionRate === 100) status = '우수';
    else if (overallCompletionRate > 0) status = '진행중';
    
    // Determine match status
    const matchStatus = (basicMatch || advancedMatch) ? '매칭성공' : '매칭실패';
    
    return {
      employeeId: employee.id,
      name: employee.name,
      institution: employee.institution,
      jobType: employee.jobType,
      basicEducation: basicEducation as any,
      advancedEducation: advancedEducation as any,
      overallCompletionRate,
      status,
      matchStatus: matchStatus as any,
    };
  });
}

function findEducationMatch(employee: any, educationData: any[], criteria: string) {
  switch (criteria) {
    case 'ID 기반':
      return educationData.find(edu => edu.id === employee.id);
    case '이름 기반':
      return educationData.find(edu => edu.name === employee.name);
    case '기관+이름':
      return educationData.find(edu => 
        edu.name === employee.name && edu.institution === employee.institution
      );
    default:
      return null;
  }
}
