import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EducationData, EducationStats } from '@shared/schema';

interface EducationStore {
  basicEducationData: EducationData[];
  advancedEducationData: EducationData[];
  setBasicEducationData: (data: EducationData[]) => void;
  setAdvancedEducationData: (data: EducationData[]) => void;
  getEducationStats: () => {
    basicStats: EducationStats;
    advancedStats: EducationStats;
    overallCompletionRate: number;
  };
}

export const useEducationStore = create<EducationStore>()(
  persist(
    (set, get) => ({
      basicEducationData: [],
      advancedEducationData: [],
      
      setBasicEducationData: (data) => set({ basicEducationData: data }),
      setAdvancedEducationData: (data) => set({ advancedEducationData: data }),
      
      getEducationStats: () => {
        const { basicEducationData, advancedEducationData } = get();
        
        const calculateStats = (data: EducationData[]): EducationStats => {
          const totalParticipants = data.length;
          const completedCount = data.filter(item => item.status === '수료').length;
          const completionRate = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;
          
          const courseStats = data.reduce((acc, item) => {
            const course = item.course;
            if (!acc[course]) {
              acc[course] = { count: 0, completionRate: 0 };
            }
            acc[course].count++;
            return acc;
          }, {} as Record<string, { count: number; completionRate: number }>);
          
          // Calculate completion rate for each course
          Object.keys(courseStats).forEach(course => {
            const courseData = data.filter(item => item.course === course);
            const courseCompleted = courseData.filter(item => item.status === '수료').length;
            courseStats[course].completionRate = courseData.length > 0 ? 
              Math.round((courseCompleted / courseData.length) * 100) : 0;
          });
          
          return {
            totalParticipants,
            completedCount,
            completionRate,
            courseStats,
          };
        };
        
        const basicStats = calculateStats(basicEducationData);
        const advancedStats = calculateStats(advancedEducationData);
        
        const totalCompleted = basicStats.completedCount + advancedStats.completedCount;
        const totalParticipants = basicStats.totalParticipants + advancedStats.totalParticipants;
        const overallCompletionRate = totalParticipants > 0 ? 
          Math.round((totalCompleted / totalParticipants) * 100) : 0;
        
        return {
          basicStats,
          advancedStats,
          overallCompletionRate,
        };
      },
    }),
    {
      name: 'education-store',
    }
  )
);
