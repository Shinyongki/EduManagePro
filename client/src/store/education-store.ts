import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EducationData, EducationStats, IntegratedAnalysisData, EducationParticipant, EmployeeData } from '@shared/schema';
import { educationDB } from '@/lib/indexeddb';
// import { categorizeInstitution } from '@/utils/institution-matcher'; // TODO: async 처리 필요

// 교육 이수 상태 타입 정의
export type EducationCompletionStatus = 
  | 'complete'     // 🟢 완전수료: 기초 + 심화 모두 수료
  | 'partial'      // 🟡 부분수료: 기초 또는 심화 중 하나만 수료  
  | 'none'         // 🔴 미수료: 둘 다 미수료
  | 'in_progress'; // ⚪ 진행중: 수강 중인 과정 있음

export interface ParticipantEducationStatus {
  participant: EducationParticipant;
  basicEducation: {
    status: 'completed' | 'incomplete' | 'in_progress' | 'not_found';
    completionDate?: string;
    course?: string;
  };
  advancedEducation: {
    status: 'completed' | 'incomplete' | 'in_progress' | 'not_found';
    completionDate?: string;
    course?: string;
  };
  overallStatus: EducationCompletionStatus;
  lastUpdated?: string;
}

interface EducationStore {
  basicEducationData: EducationData[];
  advancedEducationData: EducationData[];
  integratedAnalysisData: IntegratedAnalysisData[];
  participantData: EducationParticipant[];
  employeeData: EmployeeData[];
  isLoaded: {
    basicEducation: boolean;
    advancedEducation: boolean;
    integratedAnalysis: boolean;
    participant: boolean;
    employee: boolean;
  };
  isInitializing: boolean;
  setBasicEducationData: (data: EducationData[]) => void;
  setAdvancedEducationData: (data: EducationData[]) => void;
  setIntegratedAnalysisData: (data: IntegratedAnalysisData[]) => void;
  setParticipantData: (data: EducationParticipant[]) => void;
  setEmployeeData: (data: EmployeeData[]) => void;
  loadFromIndexedDB: () => Promise<void>;
  loadSpecificData: (type: 'basic' | 'advanced' | 'integrated' | 'participant' | 'employee') => Promise<void>;
  forceReloadData: (type: 'basic' | 'advanced' | 'integrated' | 'participant' | 'employee') => Promise<void>;
  saveToIndexedDB: () => Promise<void>;
  clearAllData: () => Promise<void>;
  getEducationStats: () => {
    basicStats: EducationStats;
    advancedStats: EducationStats;
    overallCompletionRate: number;
  };
  getIntegratedAnalysisStats: () => {
    totalInstitutions: number;
    totalBackupRegistrations: number;
    averageQualificationRate: number;
    averageEducationRate: number;
    totalWarnings: number;
  };
  getParticipantEducationStatus: () => ParticipantEducationStatus[];
  getAllParticipantEducationStatus: () => ParticipantEducationStatus[];
  getEducationSummaryStats: () => {
    total: number;
    complete: number;
    partial: number;
    none: number;
    inProgress: number;
  };
  getDataInconsistencies: () => {
    institution: string;
    inconsistencies: Array<{
      name: string;
      id: string;
      employeeStatus: string;
      participantStatus: string;
      employeeInstitution: string;
      participantInstitution: string;
      employeeIsActive: boolean;
      participantIsActive: boolean;
      employeeResignDate: string;
      participantResignDate: string;
    }>;
  }[];
}

export const useEducationStore = create<EducationStore>()(
  persist(
    (set, get) => ({
      basicEducationData: [],
      advancedEducationData: [],
      integratedAnalysisData: [],
      participantData: [],
      employeeData: [],
      isLoaded: {
        basicEducation: false,
        advancedEducation: false,
        integratedAnalysis: false,
        participant: false,
        employee: false,
      },
      isInitializing: false,
      
      setBasicEducationData: (data) => {
        console.log(`📝 Saving ${data.length} basic education records to store and IndexedDB`);
        set((state) => ({ 
          basicEducationData: data,
          isLoaded: { ...state.isLoaded, basicEducation: true }
        }));
        // IndexedDB에 자동 저장
        educationDB.setItem('basicEducationData', data).then(() => {
          console.log(`✅ Basic education data saved to IndexedDB: ${data.length} records`);
        }).catch(error => {
          console.warn('Failed to save basic education data to IndexedDB:', error);
        });
      },
      setAdvancedEducationData: (data) => {
        console.log(`📝 Saving ${data.length} advanced education records to store and IndexedDB`);
        set((state) => ({ 
          advancedEducationData: data,
          isLoaded: { ...state.isLoaded, advancedEducation: true }
        }));
        // IndexedDB에 자동 저장
        educationDB.setItem('advancedEducationData', data).then(() => {
          console.log(`✅ Advanced education data saved to IndexedDB: ${data.length} records`);
        }).catch(error => {
          console.warn('Failed to save advanced education data to IndexedDB:', error);
        });
      },
      setIntegratedAnalysisData: (data) => {
        set((state) => ({ 
          integratedAnalysisData: data,
          isLoaded: { ...state.isLoaded, integratedAnalysis: true }
        }));
        // IndexedDB에 자동 저장
        educationDB.setItem('integratedAnalysisData', data).catch(error => {
          console.warn('Failed to save integrated analysis data to IndexedDB:', error);
        });
      },
      setParticipantData: (data) => {
        console.log(`📝 Saving ${data.length} participant records to store and IndexedDB`);
        set((state) => ({ 
          participantData: data,
          isLoaded: { ...state.isLoaded, participant: true }
        }));
        // IndexedDB에 자동 저장
        educationDB.setItem('participantData', data).catch(error => {
          console.warn('Failed to save participant data to IndexedDB:', error);
        });
        
        // 참가자 데이터 업데이트 시 UI 새로고침
        console.log('🔄 참가자 데이터 업데이트 완료');
      },
      setEmployeeData: (data) => {
        console.log(`📝 Saving ${data.length} employee records to store and IndexedDB`);
        set((state) => ({ 
          employeeData: data,
          isLoaded: { ...state.isLoaded, employee: true }
        }));
        // IndexedDB에 자동 저장
        educationDB.setItem('employeeData', data).catch(error => {
          console.warn('Failed to save employee data to IndexedDB:', error);
        });
        
        // 🔥 중요: 종사자 데이터 업데이트 후 모든 관련 분석 데이터를 강제 새로고침
        console.log('🔄 종사자 데이터 업데이트로 인한 관련 데이터 새로고침...');
        setTimeout(() => {
          // 다른 데이터들도 다시 로드하여 최신 상태로 동기화
          const { forceReloadData } = get();
          Promise.all([
            forceReloadData('participant'),
            forceReloadData('basic'),
            forceReloadData('advanced')
          ]).then(() => {
            console.log('✅ 모든 관련 데이터 새로고침 완료');
          }).catch(error => {
            console.error('❌ 데이터 새로고침 중 오류:', error);
          });
        }, 100); // 짧은 지연 후 실행
      },

      loadFromIndexedDB: async () => {
        const state = get();
        
        // 이미 초기화 중이거나 이미 로드된 경우 중복 실행 방지
        if (state.isInitializing || state.isLoaded.integratedAnalysis) {
          console.log('📦 Critical data already loading or loaded, skipping...');
          return;
        }

        console.log('⚡ Loading critical data only (integrated analysis)...');
        set((state) => ({ ...state, isInitializing: true }));
        
        try {
          // 대시보드에 필요한 필수 데이터만 먼저 로드
          const integratedData = await educationDB.getItem<IntegratedAnalysisData[]>('integratedAnalysisData');
          
          set((state) => ({
            integratedAnalysisData: integratedData || [],
            isLoaded: { ...state.isLoaded, integratedAnalysis: true },
            isInitializing: false
          }));

          console.log('✅ Critical data loaded from IndexedDB');
        } catch (error) {
          console.error('Failed to load critical data from IndexedDB:', error);
          set((state) => ({ ...state, isInitializing: false }));
        }
      },

      loadSpecificData: async (type: 'basic' | 'advanced' | 'integrated' | 'participant' | 'employee') => {
        const state = get();
        
        // 이미 로드된 경우 스킵
        if (
          (type === 'basic' && state.isLoaded.basicEducation) ||
          (type === 'advanced' && state.isLoaded.advancedEducation) ||
          (type === 'integrated' && state.isLoaded.integratedAnalysis) ||
          (type === 'participant' && state.isLoaded.participant) ||
          (type === 'employee' && state.isLoaded.employee)
        ) {
          console.log(`📦 Data "${type}" already loaded, skipping...`);
          return;
        }

        try {
          console.log(`🔄 Loading "${type}" data from IndexedDB...`);
          
          switch (type) {
            case 'basic':
              const basicData = await educationDB.getItem<EducationData[]>('basicEducationData');
              set((state) => ({
                basicEducationData: basicData || [],
                isLoaded: { ...state.isLoaded, basicEducation: true }
              }));
              break;
              
            case 'advanced':
              const advancedData = await educationDB.getItem<EducationData[]>('advancedEducationData');
              set((state) => ({
                advancedEducationData: advancedData || [],
                isLoaded: { ...state.isLoaded, advancedEducation: true }
              }));
              break;
              
            case 'integrated':
              const integratedData = await educationDB.getItem<IntegratedAnalysisData[]>('integratedAnalysisData');
              set((state) => ({
                integratedAnalysisData: integratedData || [],
                isLoaded: { ...state.isLoaded, integratedAnalysis: true }
              }));
              break;
              
            case 'participant':
              const participantData = await educationDB.getItem<EducationParticipant[]>('participantData');
              set((state) => ({
                participantData: participantData || [],
                isLoaded: { ...state.isLoaded, participant: true }
              }));
              break;
              
            case 'employee':
              const rawEmployeeData = await educationDB.getItem('employeeData');
              console.log('🔍 IndexedDB에서 가져온 원본 종사자 데이터:', rawEmployeeData);
              
              let processedEmployeeData: EmployeeData[] = [];
              
              if (rawEmployeeData) {
                // API 응답 객체 구조 확인 (data 배열 포함)
                if (!Array.isArray(rawEmployeeData) && rawEmployeeData && typeof rawEmployeeData === 'object') {
                  if (Array.isArray(rawEmployeeData.data)) {
                    console.log('✅ API 응답 객체에서 종사자 데이터 배열 추출:', rawEmployeeData.data.length, '개');
                    processedEmployeeData = rawEmployeeData.data;
                  } else {
                    console.warn('⚠️ employeeData 객체에 data 배열이 없습니다:', rawEmployeeData);
                  }
                } else if (Array.isArray(rawEmployeeData)) {
                  console.log('✅ 직접 종사자 데이터 배열:', rawEmployeeData.length, '개');
                  processedEmployeeData = rawEmployeeData;
                } else {
                  console.warn('⚠️ 종사자 데이터 구조를 인식할 수 없습니다:', typeof rawEmployeeData, rawEmployeeData);
                }
              } else {
                console.log('⚠️ IndexedDB에 종사자 데이터가 없습니다');
              }
              
              console.log(`🎯 최종 처리된 종사자 데이터: ${processedEmployeeData.length}명`);
              
              set((state) => ({
                employeeData: processedEmployeeData,
                isLoaded: { ...state.isLoaded, employee: true }
              }));
              break;
          }
          
          console.log(`✅ "${type}" data loaded successfully`);
        } catch (error) {
          console.error(`Failed to load "${type}" data:`, error);
        }
      },

      forceReloadData: async (type: 'basic' | 'advanced' | 'integrated' | 'participant' | 'employee') => {
        try {
          console.log(`🔄 Force reloading "${type}" data from IndexedDB...`);
          
          switch (type) {
            case 'basic':
              const basicData = await educationDB.getItem<EducationData[]>('basicEducationData');
              set((state) => ({
                basicEducationData: basicData || [],
                isLoaded: { ...state.isLoaded, basicEducation: true }
              }));
              console.log(`✅ Force reloaded basic education data: ${(basicData || []).length} records`);
              break;
              
            case 'advanced':
              const advancedData = await educationDB.getItem<EducationData[]>('advancedEducationData');
              set((state) => ({
                advancedEducationData: advancedData || [],
                isLoaded: { ...state.isLoaded, advancedEducation: true }
              }));
              console.log(`✅ Force reloaded advanced education data: ${(advancedData || []).length} records`);
              break;
              
            case 'integrated':
              const integratedData = await educationDB.getItem<IntegratedAnalysisData[]>('integratedAnalysisData');
              set((state) => ({
                integratedAnalysisData: integratedData || [],
                isLoaded: { ...state.isLoaded, integratedAnalysis: true }
              }));
              console.log(`✅ Force reloaded integrated analysis data: ${(integratedData || []).length} records`);
              break;
              
            case 'participant':
              const participantData = await educationDB.getItem<EducationParticipant[]>('participantData');
              set((state) => ({
                participantData: participantData || [],
                isLoaded: { ...state.isLoaded, participant: true }
              }));
              console.log(`✅ Force reloaded participant data: ${(participantData || []).length} records`);
              break;
              
            case 'employee':
              const rawEmployeeDataForce = await educationDB.getItem('employeeData');
              console.log('🔄 Force reload - IndexedDB에서 가져온 원본 종사자 데이터:', rawEmployeeDataForce);
              
              let processedEmployeeDataForce: EmployeeData[] = [];
              
              if (rawEmployeeDataForce) {
                if (!Array.isArray(rawEmployeeDataForce) && rawEmployeeDataForce && typeof rawEmployeeDataForce === 'object') {
                  if (Array.isArray(rawEmployeeDataForce.data)) {
                    console.log('✅ Force reload - API 응답 객체에서 종사자 데이터 배열 추출:', rawEmployeeDataForce.data.length, '개');
                    processedEmployeeDataForce = rawEmployeeDataForce.data;
                  } else {
                    console.warn('⚠️ Force reload - employeeData 객체에 data 배열이 없습니다:', rawEmployeeDataForce);
                  }
                } else if (Array.isArray(rawEmployeeDataForce)) {
                  console.log('✅ Force reload - 직접 종사자 데이터 배열:', rawEmployeeDataForce.length, '개');
                  processedEmployeeDataForce = rawEmployeeDataForce;
                } else {
                  console.warn('⚠️ Force reload - 종사자 데이터 구조를 인식할 수 없습니다:', typeof rawEmployeeDataForce);
                }
              } else {
                console.log('⚠️ Force reload - IndexedDB에 종사자 데이터가 없습니다');
              }
              
              set((state) => ({
                employeeData: processedEmployeeDataForce,
                isLoaded: { ...state.isLoaded, employee: true }
              }));
              console.log(`✅ Force reloaded employee data: ${processedEmployeeDataForce.length} records`);
              break;
          }
        } catch (error) {
          console.error(`Failed to force reload "${type}" data:`, error);
        }
      },

      saveToIndexedDB: async () => {
        try {
          const state = get();
          await Promise.all([
            educationDB.setItem('basicEducationData', state.basicEducationData),
            educationDB.setItem('advancedEducationData', state.advancedEducationData),
            educationDB.setItem('integratedAnalysisData', state.integratedAnalysisData),
            educationDB.setItem('participantData', state.participantData)
          ]);
          console.log('Data saved to IndexedDB successfully');
        } catch (error) {
          console.error('Failed to save data to IndexedDB:', error);
        }
      },

      clearAllData: async () => {
        try {
          await educationDB.clear();
          set({
            basicEducationData: [],
            advancedEducationData: [],
            integratedAnalysisData: [],
            participantData: [],
            isLoaded: {
              basicEducation: false,
              advancedEducation: false,
              integratedAnalysis: false,
              participant: false,
            },
            isInitializing: false
          });
          console.log('All data cleared from IndexedDB and memory');
        } catch (error) {
          console.error('Failed to clear data:', error);
        }
      },
      
      getEducationStats: () => {
        const { basicEducationData, advancedEducationData } = get();
        
        const calculateStats = (data: EducationData[]): EducationStats => {
          // 동일한 사람(이름+ID)으로 그룹화하여 중복 제거
          const personGroups = data.reduce((acc, item) => {
            const personKey = `${item.name}_${item.id}`;
            if (!acc[personKey]) {
              acc[personKey] = {
                person: { name: item.name, id: item.id },
                courses: []
              };
            }
            acc[personKey].courses.push(item);
            return acc;
          }, {} as Record<string, { person: any; courses: EducationData[] }>);

          const uniquePersons = Object.values(personGroups);
          const totalParticipants = uniquePersons.length;
          
          // 각 사람별로 하나라도 수료했으면 수료자로 카운팅
          const completedCount = uniquePersons.filter(({ courses }) => 
            courses.some(course => course.status === '수료')
          ).length;
          
          const completionRate = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;
          
          // 과정별 통계는 실제 수강 건수로 계산 (중복 포함)
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
        
        // 전체 통계는 기본+심화 교육 통합 데이터로 중복 제거하여 계산
        const allData = [...basicEducationData, ...advancedEducationData];
        const allPersonGroups = allData.reduce((acc, item) => {
          const personKey = `${item.name}_${item.id}`;
          if (!acc[personKey]) {
            acc[personKey] = {
              person: { name: item.name, id: item.id },
              basicCourses: [],
              advancedCourses: []
            };
          }
          
          if (item.courseType === '기본' || item.course.includes('기본교육')) {
            acc[personKey].basicCourses.push(item);
          } else {
            acc[personKey].advancedCourses.push(item);
          }
          return acc;
        }, {} as Record<string, { person: any; basicCourses: any[]; advancedCourses: any[] }>);

        const allUniquePersons = Object.values(allPersonGroups);
        const totalParticipants = allUniquePersons.length;
        
        // 기본 또는 심화 중 하나라도 수료한 사람 수
        const totalCompleted = allUniquePersons.filter(({ basicCourses, advancedCourses }) => {
          const hasBasicCompleted = basicCourses.some(course => course.status === '수료');
          const hasAdvancedCompleted = advancedCourses.some(course => course.status === '수료');
          return hasBasicCompleted || hasAdvancedCompleted;
        }).length;
        
        const overallCompletionRate = totalParticipants > 0 ? 
          Math.round((totalCompleted / totalParticipants) * 100) : 0;
        
        return {
          basicStats,
          advancedStats,
          overallCompletionRate,
        };
      },

      getIntegratedAnalysisStats: () => {
        const { integratedAnalysisData } = get();
        
        if (integratedAnalysisData.length === 0) {
          return {
            totalInstitutions: 0,
            totalBackupRegistrations: 0,
            averageQualificationRate: 0,
            averageEducationRate: 0,
            totalWarnings: 0,
          };
        }

        const totalInstitutions = integratedAnalysisData.length;
        const totalBackupRegistrations = integratedAnalysisData.reduce((sum, item) => sum + item.backup1_total, 0);
        const totalQualifications = integratedAnalysisData.reduce((sum, item) => sum + item.qualification_total, 0);
        const averageQualificationRate = totalInstitutions > 0 ? (totalQualifications / totalInstitutions) : 0;
        const totalEducationRates = integratedAnalysisData.reduce((sum, item) => sum + item.education_rate_fb, 0);
        const averageEducationRate = totalInstitutions > 0 ? (totalEducationRates / totalInstitutions) : 0;
        const totalWarnings = integratedAnalysisData.reduce((sum, item) => sum + item.education_warning, 0);

        return {
          totalInstitutions,
          totalBackupRegistrations,
          averageQualificationRate,
          averageEducationRate,
          totalWarnings,
        };
      },

      getParticipantEducationStatus: (): ParticipantEducationStatus[] => {
        const { participantData, basicEducationData, advancedEducationData } = get();
        
        // 재직자만 필터링 (디버깅 추가)
        console.log('🔍 참가자 재직자 필터링 시작');
        console.log('전체 참가자 수:', participantData.length);
        
        // 처음 10명의 샘플 데이터 확인
        if (participantData.length > 0) {
          console.log('\n=== 처음 10명 샘플 데이터 분석 ===');
          participantData.slice(0, 10).forEach((sample, idx) => {
            console.log(`샘플 ${idx + 1}:`, {
              name: sample.name,
              isActive: sample.isActive,
              isActiveType: typeof sample.isActive,
              resignDate: sample.resignDate,
              resignDateType: typeof sample.resignDate,
              status: sample.status,
              jobType: sample.jobType
            });
          });
          
          console.log('\n전체 키들:', Object.keys(participantData[0]));
        }
        
        // 퇴사일이 있는 사람들만 따로 분석
        const withResignDate = participantData.filter(p => p.resignDate);
        console.log('\n퇴사일이 있는 참가자:', withResignDate.length, '명');
        
        if (withResignDate.length > 0) {
          console.log('퇴사일 샘플 (처음 5명):');
          withResignDate.slice(0, 5).forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.name}: 퇴사일=${p.resignDate}, isActive=${p.isActive}, status=${p.status}`);
          });
        }
        
        const activeParticipants = participantData.filter(participant => {
          const { employeeData } = get();
          
          // 배열 안전성 검증
          const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
          
          // 🔥 개선된 매칭 로직: 4단계 관대한 매칭으로 매칭률 극대화
          const findMatchingEmployee = (participant: any) => {
            if (!participant.name) return null;
            
            // 이름과 생년월일 정규화 함수들
            const normalizeName = (name: string) => {
              if (!name) return '';
              return name.trim().replace(/\s+/g, '').replace(/[()（）]/g, '').toLowerCase();
            };
            
            const normalizeDate = (dateStr: string) => {
              if (!dateStr) return '';
              const numbers = dateStr.replace(/[^0-9]/g, '');
              if (numbers.length === 6) {
                const yy = parseInt(numbers.substring(0, 2));
                const fullYear = yy >= 30 ? `19${yy}` : `20${yy}`;
                return fullYear + numbers.substring(2);
              }
              return numbers.length === 8 ? numbers : numbers;
            };
            
            let match = null;
            
            // 1단계: 완전 매칭 (이름 + 생년월일)
            match = safeEmployeeData.find(emp => {
              if (!emp.name) return false;
              const participantNormalizedName = normalizeName(participant.name);
              const empNormalizedName = normalizeName(emp.name);
              if (empNormalizedName !== participantNormalizedName) return false;
              
              if (participant.birthDate && emp.birthDate) {
                if (emp.birthDate === participant.birthDate) return true;
                try {
                  const empNormalizedDate = normalizeDate(emp.birthDate);
                  const participantNormalizedDate = normalizeDate(participant.birthDate);
                  return empNormalizedDate && participantNormalizedDate && empNormalizedDate === participantNormalizedDate;
                } catch {
                  return false;
                }
              }
              
              return !participant.birthDate || !emp.birthDate; // 생년월일 없으면 이름만으로 성공
            });
            
            if (match) return match;
            
            // 2단계: 관대한 이름 매칭 (생년월일 불일치 허용)
            match = safeEmployeeData.find(emp => {
              if (!emp.name) return false;
              return normalizeName(participant.name) === normalizeName(emp.name);
            });
            
            if (match) return match;
            
            // 3단계: 유사 이름 매칭
            match = safeEmployeeData.find(emp => {
              if (!emp.name || emp.name.length < 2) return false;
              const participantName = participant.name.trim();
              const empName = emp.name.trim();
              if (participantName.length < 2 || empName.length < 2) return false;
              
              const firstCharMatch = participantName[0] === empName[0];
              const secondCharMatch = participantName.length > 1 && empName.length > 1 && participantName[1] === empName[1];
              const similarityScore = participantName.split('').filter((char, idx) => empName[idx] === char).length;
              
              return (firstCharMatch && secondCharMatch) || similarityScore >= 2;
            });
            
            if (match) return match;
            
            // 4단계: 초관대 매칭 (성씨 + 50% 일치율)
            if (participant.name.length >= 2) {
              match = safeEmployeeData.find(emp => {
                if (!emp.name || emp.name.length < 2) return false;
                const participantName = participant.name.trim();
                const empName = emp.name.trim();
                const firstCharMatch = participantName[0] === empName[0];
                const lengthDiff = Math.abs(participantName.length - empName.length);
                
                if (firstCharMatch && lengthDiff <= 1) {
                  const matchingChars = participantName.split('').filter((char, idx) => empName[idx] === char).length;
                  const matchRatio = matchingChars / Math.max(participantName.length, empName.length);
                  return matchRatio >= 0.5;
                }
                return false;
              });
            }
            
            return match;
          };
          
          const matchingEmployee = findMatchingEmployee(participant);
          
          if (matchingEmployee) {
            // 종사자 데이터가 있는 경우, 종사자 데이터를 우선으로 처리
            const employeeActive = matchingEmployee.isActive && !matchingEmployee.resignDate;
            
            console.log(`🔥 [우선처리] ${participant.name}: 종사자관리(모인우리) 데이터 기준 - ${employeeActive ? '재직' : '퇴직'}`);
            
            // 종사자 데이터에 퇴사일이 있거나 isActive가 false면 제외
            if (matchingEmployee.resignDate) {
              try {
                const resignDate = new Date(matchingEmployee.resignDate);
                const today = new Date();
                if (resignDate <= today) {
                  console.log(`  └ 퇴사일 확인: ${matchingEmployee.resignDate} (퇴직 처리)`);
                  return false;
                }
              } catch {
                console.log(`  └ 퇴사일 파싱 오류: ${matchingEmployee.resignDate} (퇴직 처리)`);
                return false;
              }
            }
            
            if (!matchingEmployee.isActive) {
              console.log(`  └ isActive: false (퇴직 처리)`);
              return false;
            }
            
            // 종사자 데이터에서 재직 중으로 확인됨
            return true;
          }
          
          // 매칭되는 종사자 데이터가 없는 경우, 기존 로직 사용
          console.log(`ℹ️ [기본처리] ${participant.name}: 종사자 데이터 없음, 배움터 데이터 기준 처리`);
          
          // 상태가 '중지' 또는 '휴먼대상'인 경우 제외
          if (participant.status === '중지' || participant.status === '휴먼대상') return false;
          
          // isActive가 false인 경우 제외
          if (participant.isActive === false) return false;
          
          // isActive가 true이거나
          if (participant.isActive === true) return true;
          
          // 퇴사일이 없거나 미래 날짜인 경우
          if (!participant.resignDate) return true;
          
          try {
            const resignDate = new Date(participant.resignDate);
            const today = new Date();
            const isActiveByDate = resignDate > today;
            
            // 날짜 검증 결과 로깅 (처음 5명만)
            if (withResignDate.indexOf(participant) < 5) {
              console.log(`날짜 검증: ${participant.name} - 퇴사일: ${participant.resignDate}, 오늘: ${today.toISOString().split('T')[0]}, 재직여부: ${isActiveByDate}`);
            }
            
            return isActiveByDate;
          } catch (error) {
            // 날짜 파싱 실패시 재직자로 간주
            console.log(`날짜 파싱 실패: ${participant.name} - ${participant.resignDate}:`, error);
            return true;
          }
        });
        
        console.log('재직자 필터링 후:', activeParticipants.length);
        
        // isActive 상태별 통계
        const activeStats = {
          isActiveTrue: participantData.filter(p => p.isActive === true).length,
          isActiveFalse: participantData.filter(p => p.isActive === false).length,
          isActiveUndefined: participantData.filter(p => p.isActive === undefined).length,
          hasResignDate: participantData.filter(p => p.resignDate).length,
          hasEmptyResignDate: participantData.filter(p => p.resignDate === '' || p.resignDate === null).length,
          statusStopped: participantData.filter(p => p.status === '중지').length,
          statusHumanTarget: participantData.filter(p => p.status === '휴먼대상').length,
          statusValues: [...new Set(participantData.map(p => p.status).filter(Boolean))].slice(0, 10)
        };
        console.log('isActive 상태별 통계:', activeStats);
        
        return activeParticipants.map((participant, index) => {
          // ID 또는 이름으로 교육 데이터 매칭
          const basicEducation = basicEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );
          
          const advancedEducation = advancedEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );

          // 기초교육 상태 결정
          const basicStatus = !basicEducation 
            ? 'not_found'
            : basicEducation.status === '수료' 
              ? 'completed'
              : basicEducation.status === '진행중'
                ? 'in_progress'
                : 'incomplete';

          // 심화교육 상태 결정  
          const advancedStatus = !advancedEducation
            ? 'not_found'
            : advancedEducation.status === '수료'
              ? 'completed'
              : advancedEducation.status === '진행중'
                ? 'in_progress'
                : 'incomplete';

          // 전체 상태 결정
          let overallStatus: EducationCompletionStatus;
          if (basicStatus === 'completed' && advancedStatus === 'completed') {
            overallStatus = 'complete'; // 🟢 완전수료
          } else if (basicStatus === 'completed' || advancedStatus === 'completed') {
            overallStatus = 'partial'; // 🟡 부분수료
          } else if (basicStatus === 'in_progress' || advancedStatus === 'in_progress') {
            overallStatus = 'in_progress'; // ⚪ 진행중
          } else {
            overallStatus = 'none'; // 🔴 미수료
          }
          
          // 처음 10명만 상세 로깅
          if (index < 10) {
            console.log(`참가자 ${index + 1} 상태 분석:`, {
              name: participant.name,
              id: participant.id,
              hasBasicEducation: !!basicEducation,
              basicEducationStatus: basicEducation?.status,
              basicStatus: basicStatus,
              hasAdvancedEducation: !!advancedEducation,
              advancedEducationStatus: advancedEducation?.status,
              advancedStatus: advancedStatus,
              overallStatus: overallStatus
            });
          }

          // 마지막 업데이트 날짜 계산
          const basicDate = basicEducation?.completionDate;
          const advancedDate = advancedEducation?.completionDate;
          let lastUpdated = undefined;
          
          if (basicDate && advancedDate) {
            lastUpdated = new Date(basicDate) > new Date(advancedDate) ? basicDate.toString() : advancedDate.toString();
          } else if (basicDate) {
            lastUpdated = basicDate.toString();
          } else if (advancedDate) {
            lastUpdated = advancedDate.toString();
          }

          return {
            participant,
            basicEducation: {
              status: basicStatus,
              completionDate: basicEducation?.completionDate?.toString(),
              course: basicEducation?.course,
            },
            advancedEducation: {
              status: advancedStatus,
              completionDate: advancedEducation?.completionDate?.toString(),
              course: advancedEducation?.course,
            },
            overallStatus,
            lastUpdated,
          };
        });
      },

      getEducationSummaryStats: () => {
        const { participantData: rawParticipantData, basicEducationData: rawBasicEducationData, advancedEducationData: rawAdvancedEducationData } = get();
        
        // 배열 안전성 검증
        const participantData = Array.isArray(rawParticipantData) ? rawParticipantData : [];
        const basicEducationData = Array.isArray(rawBasicEducationData) ? rawBasicEducationData : [];
        const advancedEducationData = Array.isArray(rawAdvancedEducationData) ? rawAdvancedEducationData : [];
        
        console.log('\n📊 교육 통계 계산 시작 (참가자 기준)');
        console.log('전체 참가자 수:', participantData.length);
        console.log('기초교육 데이터 수:', basicEducationData.length);
        console.log('심화교육 데이터 수:', advancedEducationData.length);
        
        // 재직자만 필터링 (동일한 로직 적용)
        const activeParticipants = participantData.filter(participant => {
          const { employeeData } = get();
          
          // 배열 안전성 검증
          const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
          
          // 🔥 개선된 매칭 로직: 4단계 관대한 매칭으로 매칭률 극대화
          const findMatchingEmployee = (participant: any) => {
            if (!participant.name) return null;
            
            // 이름과 생년월일 정규화 함수들
            const normalizeName = (name: string) => {
              if (!name) return '';
              return name.trim().replace(/\s+/g, '').replace(/[()（）]/g, '').toLowerCase();
            };
            
            const normalizeDate = (dateStr: string) => {
              if (!dateStr) return '';
              const numbers = dateStr.replace(/[^0-9]/g, '');
              if (numbers.length === 6) {
                const yy = parseInt(numbers.substring(0, 2));
                const fullYear = yy >= 30 ? `19${yy}` : `20${yy}`;
                return fullYear + numbers.substring(2);
              }
              return numbers.length === 8 ? numbers : numbers;
            };
            
            let match = null;
            
            // 1단계: 완전 매칭 (이름 + 생년월일)
            match = safeEmployeeData.find(emp => {
              if (!emp.name) return false;
              const participantNormalizedName = normalizeName(participant.name);
              const empNormalizedName = normalizeName(emp.name);
              if (empNormalizedName !== participantNormalizedName) return false;
              
              if (participant.birthDate && emp.birthDate) {
                if (emp.birthDate === participant.birthDate) return true;
                try {
                  const empNormalizedDate = normalizeDate(emp.birthDate);
                  const participantNormalizedDate = normalizeDate(participant.birthDate);
                  return empNormalizedDate && participantNormalizedDate && empNormalizedDate === participantNormalizedDate;
                } catch {
                  return false;
                }
              }
              
              return !participant.birthDate || !emp.birthDate; // 생년월일 없으면 이름만으로 성공
            });
            
            if (match) return match;
            
            // 2단계: 관대한 이름 매칭 (생년월일 불일치 허용)
            match = safeEmployeeData.find(emp => {
              if (!emp.name) return false;
              return normalizeName(participant.name) === normalizeName(emp.name);
            });
            
            if (match) return match;
            
            // 3단계: 유사 이름 매칭
            match = safeEmployeeData.find(emp => {
              if (!emp.name || emp.name.length < 2) return false;
              const participantName = participant.name.trim();
              const empName = emp.name.trim();
              if (participantName.length < 2 || empName.length < 2) return false;
              
              const firstCharMatch = participantName[0] === empName[0];
              const secondCharMatch = participantName.length > 1 && empName.length > 1 && participantName[1] === empName[1];
              const similarityScore = participantName.split('').filter((char, idx) => empName[idx] === char).length;
              
              return (firstCharMatch && secondCharMatch) || similarityScore >= 2;
            });
            
            if (match) return match;
            
            // 4단계: 초관대 매칭 (성씨 + 50% 일치율)
            if (participant.name.length >= 2) {
              match = safeEmployeeData.find(emp => {
                if (!emp.name || emp.name.length < 2) return false;
                const participantName = participant.name.trim();
                const empName = emp.name.trim();
                const firstCharMatch = participantName[0] === empName[0];
                const lengthDiff = Math.abs(participantName.length - empName.length);
                
                if (firstCharMatch && lengthDiff <= 1) {
                  const matchingChars = participantName.split('').filter((char, idx) => empName[idx] === char).length;
                  const matchRatio = matchingChars / Math.max(participantName.length, empName.length);
                  return matchRatio >= 0.5;
                }
                return false;
              });
            }
            
            return match;
          };
          
          const matchingEmployee = findMatchingEmployee(participant);
          
          if (matchingEmployee) {
            // 종사자 데이터가 있는 경우, 종사자 데이터를 우선으로 처리
            console.log(`🔥 [통계계산-우선처리] ${participant.name}: 종사자관리(모인우리) 데이터 기준`);
            
            // 종사자 데이터에 퇴사일이 있으면 제외
            if (matchingEmployee.resignDate) {
              try {
                const resignDate = new Date(matchingEmployee.resignDate);
                const today = new Date();
                if (resignDate <= today) {
                  return false;
                }
              } catch {
                return false;
              }
            }
            
            return matchingEmployee.isActive;
          }
          
          // 매칭되는 종사자 데이터가 없는 경우, 기존 로직 사용
          // 상태가 '중지' 또는 '휴먼대상'인 경우 제외
          if (participant.status === '중지' || participant.status === '휴먼대상') return false;
          
          // isActive가 false인 경우 제외
          if (participant.isActive === false) return false;
          
          // isActive가 true이거나
          if (participant.isActive === true) return true;
          
          // 퇴사일이 없거나 미래 날짜인 경우
          if (!participant.resignDate) return true;
          
          try {
            const resignDate = new Date(participant.resignDate);
            const today = new Date();
            return resignDate > today;
          } catch {
            return true;
          }
        });
        
        console.log('재직자 필터링 후:', activeParticipants.length, '명');
        
        // 각 참가자별로 교육 상태 확인
        let complete = 0, partial = 0, inProgress = 0, none = 0;
        
        activeParticipants.forEach((participant, index) => {
          // 기초교육 상태 확인
          const basicEducation = basicEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );
          
          // 심화교육 상태 확인
          const advancedEducation = advancedEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );

          const basicCompleted = basicEducation?.status === '수료';
          const basicInProgress = basicEducation?.status === '진행중';
          const advancedCompleted = advancedEducation?.status === '수료';
          const advancedInProgress = advancedEducation?.status === '진행중';

          // 전체 상태 결정 (동일한 로직)
          if (basicCompleted && advancedCompleted) {
            complete++;
          } else if (basicCompleted || advancedCompleted) {
            partial++;
          } else if (basicInProgress || advancedInProgress) {
            inProgress++;
          } else {
            none++;
          }
          
          // 처음 5명 로깅
          if (index < 5) {
            console.log(`참가자 ${index + 1}: ${participant.name}`, {
              기초교육: basicEducation?.status || '없음',
              심화교육: advancedEducation?.status || '없음',
              최종상태: basicCompleted && advancedCompleted ? '완전수료' :
                       basicCompleted || advancedCompleted ? '부분수료' :
                       basicInProgress || advancedInProgress ? '진행중' : '미수료'
            });
          }
        });

        const stats = {
          total: activeParticipants.length,
          complete,
          partial,
          inProgress,
          none
        };
        
        console.log('최종 통계:', stats);
        console.log('합계 검증:', complete + partial + inProgress + none, '=', stats.total);
        
        return stats;
      },

      getAllParticipantEducationStatus: (): ParticipantEducationStatus[] => {
        const { participantData, basicEducationData, advancedEducationData } = get();
        
        // 배열 안전성 검증
        const safeParticipantData = Array.isArray(participantData) ? participantData : [];
        const safeBasicEducationData = Array.isArray(basicEducationData) ? basicEducationData : [];
        const safeAdvancedEducationData = Array.isArray(advancedEducationData) ? advancedEducationData : [];
        
        console.log('🔍 모든 참가자 교육 상태 조회 (재직자 필터링 없음)');
        console.log('전체 참가자 수:', safeParticipantData.length);
        
        // 재직자 필터링 없이 모든 참가자 처리
        return safeParticipantData.map((participant, index) => {
          // ID 또는 이름으로 교육 데이터 매칭
          const basicEducation = safeBasicEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );
          
          const advancedEducation = safeAdvancedEducationData.find(
            edu => edu.id === participant.id || edu.name === participant.name
          );

          // 기초교육 상태 결정
          const basicStatus = !basicEducation 
            ? 'not_found'
            : basicEducation.status === '수료' 
              ? 'completed'
              : basicEducation.status === '진행중'
                ? 'in_progress'
                : 'incomplete';

          // 심화교육 상태 결정  
          const advancedStatus = !advancedEducation
            ? 'not_found'
            : advancedEducation.status === '수료'
              ? 'completed'
              : advancedEducation.status === '진행중'
                ? 'in_progress'
                : 'incomplete';

          // 전체 상태 결정
          let overallStatus: EducationCompletionStatus;
          if (basicStatus === 'completed' && advancedStatus === 'completed') {
            overallStatus = 'complete'; // 🟢 완전수료
          } else if (basicStatus === 'completed' || advancedStatus === 'completed') {
            overallStatus = 'partial'; // 🟡 부분수료
          } else if (basicStatus === 'in_progress' || advancedStatus === 'in_progress') {
            overallStatus = 'in_progress'; // ⚪ 진행중
          } else {
            overallStatus = 'none'; // 🔴 미수료
          }

          // 마지막 업데이트 날짜 계산
          const basicDate = basicEducation?.completionDate;
          const advancedDate = advancedEducation?.completionDate;
          let lastUpdated = undefined;
          
          if (basicDate && advancedDate) {
            lastUpdated = new Date(basicDate) > new Date(advancedDate) ? basicDate.toString() : advancedDate.toString();
          } else if (basicDate) {
            lastUpdated = basicDate.toString();
          } else if (advancedDate) {
            lastUpdated = advancedDate.toString();
          }

          return {
            participant,
            basicEducation: {
              status: basicStatus,
              completionDate: basicEducation?.completionDate?.toString(),
              course: basicEducation?.course,
            },
            advancedEducation: {
              status: advancedStatus,
              completionDate: advancedEducation?.completionDate?.toString(),
              course: advancedEducation?.course,
            },
            overallStatus,
            lastUpdated,
          };
        });
      },

      getDataInconsistencies: (externalEmployeeData?: any[]) => {
        const { participantData } = get();
        
        // 외부에서 전달받은 종사자 데이터 사용 (participants 페이지에서 전달)
        const rawEmployeeData = externalEmployeeData || [];
        console.log('✅ 데이터 불일치 분석 시작:', rawEmployeeData.length, '명 종사자,', participantData.length, '명 참가자');
        
        // 🔍 안소영 존재 확인 - 강화된 디버깅
        console.log('🔍🔍🔍 =================================');
        console.log('🔍🔍🔍 안소영 디버깅 시작');
        console.log('🔍🔍🔍 전체 참가자 데이터 수:', participantData.length);
        
        const ansoYeongParticipants = participantData.filter(p => p.name === '안소영');
        console.log('🔍🔍🔍 안소영 참가자 수:', ansoYeongParticipants.length, '명');
        
        if (ansoYeongParticipants.length === 0) {
          console.log('🔍🔍🔍 안소영 참가자를 찾을 수 없음');
          // 유사한 이름 찾기
          const similarNames = participantData.filter(p => p.name && p.name.includes('소영')).slice(0, 5);
          console.log('🔍🔍🔍 "소영" 포함 참가자:', similarNames.map(p => `${p.name} (${p.institution})`));
        } else {
          ansoYeongParticipants.forEach((p, idx) => {
            console.log(`🔍🔍🔍 안소영 ${idx + 1}:`, {
              name: p.name,
              institution: p.institution,
              status: p.status,
              birthDate: p.birthDate,
              id: p.id,
              learningId: p.learningId
            });
          });
        }
        console.log('🔍🔍🔍 =================================');
        
        // 성능 모니터링
        const startTime = performance.now();
        
        // 배열 안전성 검증 및 정렬로 일관성 확보
        const safeRawEmployeeData = Array.isArray(rawEmployeeData) ? 
          [...rawEmployeeData].sort((a, b) => {
            // 이름 + ID로 정렬하여 항상 동일한 순서 보장
            const nameA = a.name || '';
            const nameB = b.name || '';
            const idA = a.id || '';
            const idB = b.id || '';
            return nameA.localeCompare(nameB) || idA.localeCompare(idB);
          }) : [];
        
        // 참가자 데이터도 정렬로 일관성 확보
        const sortedParticipantData = [...participantData].sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          const instA = a.institution || '';
          const instB = b.institution || '';
          return nameA.localeCompare(nameB) || instA.localeCompare(instB);
        });
        
        // 🔍 특별 디버깅 대상 이름들 (전역 스코프로 이동)
        const debugNames = ['김다미', '다미', '백현태', '박은정', '손혜원', '안소영'];
        
        // 종사자 데이터 보정 (컬럼 밀림 수정) - 강화된 로직 적용
        const employeeData = safeRawEmployeeData.map(emp => {
          // 데이터 검증 및 디버깅 (교육 스토어)
          if (emp.name === '백현태') {
            console.log(`🔍 [교육스토어] 백현태님 원본 데이터:`, emp);
          }
          
          // 기존 보정 로직도 유지 (일반적인 1칸 밀림)
          if (emp.name === '특화' && emp.careerType && 
              typeof emp.careerType === 'string' && 
              emp.careerType.length >= 2 && 
              emp.careerType.length <= 4 && 
              /^[가-힣]+$/.test(emp.careerType)) {
            
            console.log(`🔧 [일관성 검사] 일반 컬럼 밀림 보정: "${emp.name}" → "${emp.careerType}" (기관: ${emp.institution})`);
            
            return {
              ...emp,
              name: emp.careerType,              // 실제 이름
              careerType: emp.birthDate,         // 경력 (4년이상)
              birthDate: emp.gender,             // 생년월일 (1990-04-10)
              gender: emp.hireDate,              // 성별 (남)
              hireDate: emp.learningId,          // 입사일을 찾아야 함
              corrected: true,
              correctionType: 'column_shift_analysis'
            };
          }
          return emp;
        });
        
        console.log('종사자 데이터 보정 후:', employeeData.length, '명');
        console.log('종사자 데이터 샘플 (첫 3명):', employeeData.slice(0, 3).map(emp => ({
          name: emp.name,
          birthDate: emp.birthDate,
          isActive: emp.isActive,
          institution: emp.institution
        })));
        
        // 🔍 데이터 형식 분석을 위한 추가 샘플
        console.log('🔍 종사자 생년월일 형식 샘플:', employeeData.slice(0, 10).map(emp => emp.birthDate).filter(Boolean));
        console.log('🔍 참가자 생년월일 형식 샘플:', sortedParticipantData.slice(0, 10).map(p => p.birthDate).filter(Boolean));
        
        // 원본 종사자 데이터가 없는 경우 빈 배열 반환
        if (safeRawEmployeeData.length === 0) {
          console.warn('⚠️ 종사자 데이터(모인우리)가 없습니다. 종사자 데이터를 먼저 업로드해주세요.');
          console.log('📌 정확한 불일치 분석을 위해서는 종사자 데이터 업로드가 필요합니다.');
          return []; // 임시 데이터를 생성하지 않고 빈 배열 반환
        }
        
        // 대용량 데이터 처리 최적화
        if (safeRawEmployeeData.length > 3000 || sortedParticipantData.length > 3000) {
          console.log('🚀 대용량 데이터 감지 - 최적화된 처리 모드로 전환');
        }
        
        // 생년월일 정규화 함수 (findMatchingEmployee보다 먼저 선언)
        const normalizeBirthDate = (dateStr: string) => {
          if (!dateStr) return '';
          
          // 숫자만 추출 (점, 하이픈, 슬래시 등 모든 구분자 제거)
          const numbers = dateStr.replace(/[^0-9]/g, '');
          
          // 6자리인 경우 (YYMMDD) -> 19YY 또는 20YY로 변환
          if (numbers.length === 6) {
            const yy = parseInt(numbers.substring(0, 2));
            const fullYear = yy >= 30 ? `19${yy}` : `20${yy}`;
            const result = fullYear + numbers.substring(2);
            return result;
          }
          
          // 8자리인 경우 그대로 반환 (YYYYMMDD)
          if (numbers.length === 8) {
            return numbers;
          }
          
          // 예외 처리: 다른 길이는 그대로 반환
          return numbers;
        };
        
        // 🔍 날짜 정규화 테스트 (일회성 디버깅)
        console.log('🔍 날짜 정규화 테스트:');
        console.log('- "1995-12-14" -> "' + normalizeBirthDate("1995-12-14") + '"');
        console.log('- "1966.03.04" -> "' + normalizeBirthDate("1966.03.04") + '"');
        console.log('- "66.03.04" -> "' + normalizeBirthDate("66.03.04") + '"');

        // 생년월일과 이름으로 동일인 매칭 함수 (매우 유연한 매칭)
        const findMatchingEmployee = (participant: EducationParticipant): EmployeeData | null => {
          if (!participant.name) return null;
          
          // 배열 안전성 검증
          const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
          
          // 🔍 안소영 케이스 매칭 디버깅
          if (participant.name === '안소영') {
            console.log(`🔍 [안소영] 매칭 시도:`);
            console.log(`- 참가자 생년월일: ${participant.birthDate}`);
            console.log(`- 참가자 정규화 생년월일: ${normalizeBirthDate(participant.birthDate || '')}`);
            console.log(`- 참가자 기관: ${participant.institution}`);
            console.log(`- 참가자 상태: ${participant.status}`);
          }
          
          // 디버깅: 종사자 데이터 상태 확인
          if (safeEmployeeData.length === 0) {
            console.warn(`⚠️ [${participant.name}] 종사자 데이터가 비어있음 - 매칭 불가능`);
            return null;
          }
          
          // 이름 정규화 함수
          const normalizeName = (name: string) => {
            if (!name) return '';
            return name
              .trim()
              .replace(/\s+/g, '') // 모든 공백 제거
              .replace(/[()（）]/g, '') // 괄호 제거
              .toLowerCase();
          };
          
          
          // 특별 디버깅 케이스들 (필요시에만 활성화)
          const isSpecialDebugCase = debugNames.some(name => participant.name?.includes(name));
          
          if (isSpecialDebugCase) {
            console.log(`\n🔍 [특별디버깅] ${participant.name}:`,);
            console.log(`- 생년월일: ${participant.birthDate || 'N/A'}`);
            console.log(`- 정규화된 이름: "${normalizeName(participant.name)}"`);
            console.log(`- 정규화된 생년월일: "${normalizeBirthDate(participant.birthDate || '')}"`);
            
            // 이름의 첫 2글자로 유사한 종사자 찾기
            const searchTerm = participant.name.length >= 2 ? participant.name.substring(0, 2) : participant.name;
            const nameMatches = safeEmployeeData.filter(emp => 
              emp.name && emp.name.includes(searchTerm)
            );
            
            if (nameMatches.length > 0) {
              console.log(`- "${searchTerm}" 포함 종사자: ${nameMatches.length}명`);
              nameMatches.slice(0, 3).forEach((emp, idx) => {
                console.log(`  ${idx + 1}. "${emp.name}" (생년월일: ${emp.birthDate || 'N/A'}, 상태: ${emp.isActive ? '재직' : '퇴직'}, 보정됨: ${emp.corrected || false})`);
              });
            } else {
              console.log(`- "${searchTerm}" 포함 종사자를 찾지 못했습니다.`);
            }
          }
          
          // 🔧 결정적(Deterministic) 매칭 로직: 항상 동일한 결과 보장
          let matchedEmployee = null;
          
          // 매칭 후보들을 정렬된 순서로 처리하여 일관성 확보
          const sortedCandidates = [...safeEmployeeData].sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
          });
          
          // 1단계: 완전 매칭 (이름 + 생년월일) - 첫 번째 매칭만 선택
          for (const emp of sortedCandidates) {
            if (!emp.name) continue;
            
            const participantNormalizedName = normalizeName(participant.name);
            const empNormalizedName = normalizeName(emp.name);
            
            // 이름이 다르면 패스
            if (empNormalizedName !== participantNormalizedName) continue;
            
            // 둘 다 생년월일이 있는 경우만 엄격 매칭
            if (participant.birthDate && emp.birthDate) {
              // 정확 일치
              if (emp.birthDate === participant.birthDate) {
                matchedEmployee = emp;
                break;
              }
              
              // 정규화된 생년월일 비교
              try {
                const empNormalizedDate = normalizeBirthDate(emp.birthDate);
                const participantNormalizedDate = normalizeBirthDate(participant.birthDate);
                
                if (empNormalizedDate && participantNormalizedDate && 
                    empNormalizedDate === participantNormalizedDate) {
                  matchedEmployee = emp;
                  break;
                }
              } catch (error) {
                // 날짜 파싱 실패는 무시하고 다음 단계로
              }
              
              continue; // 생년월일이 다르면 완전매칭 실패
            }
            
            // 🔍 안소영 디버깅: 생년월일 없는 경우도 로깅
            if (participant.name === '안소영') {
              console.log(`🔍 [안소영] 매칭 검토: 참가자 생년월일(${participant.birthDate || '없음'}), 종사자 생년월일(${emp.birthDate || '없음'})`);
              if (!participant.birthDate || !emp.birthDate) {
                console.log(`🔍 [안소영] 생년월일 없음으로 매칭 건너뛰기`);
              }
            }
            
            // 둘 중 하나라도 생년월일이 없는 경우 매칭 건너뛰기 (동명이인 혼동 방지)
            if (!participant.birthDate || !emp.birthDate) {
              if (participant.name !== '안소영') { // 안소영은 디버깅을 위해 스킵하지 않음
                console.log(`⚠️ [${participant.name}] 생년월일 없음으로 매칭 건너뛰기 (참가자: ${participant.birthDate || '없음'}, 종사자: ${emp.birthDate || '없음'})`);
                continue; // 생년월일이 없으면 매칭하지 않음
              }
            }
          }
          
          // 2단계: 관대한 이름 매칭 (첫 번째 일치만 선택)
          if (!matchedEmployee) {
            for (const emp of sortedCandidates) {
              if (!emp.name) continue;
              
              const participantNormalizedName = normalizeName(participant.name);
              const empNormalizedName = normalizeName(emp.name);
              
              if (empNormalizedName === participantNormalizedName) {
                matchedEmployee = emp;
                break; // 첫 번째 매칭만 선택
              }
            }
          }
          
          // 3단계: 유사 이름 매칭 (첫 번째 매칭만 선택)
          if (!matchedEmployee) {
            for (const emp of sortedCandidates) {
              if (!emp.name || emp.name.length < 2) continue;
              
              const participantName = participant.name?.trim() || '';
              const empName = emp.name.trim();
              
              if (participantName.length < 2 || empName.length < 2) continue;
              
              const firstCharMatch = participantName[0] === empName[0];
              const secondCharMatch = participantName.length > 1 && empName.length > 1 && 
                                    participantName[1] === empName[1];
              
              const similarityScore = participantName.split('').filter((char, idx) => 
                empName[idx] === char
              ).length;
              
              if ((firstCharMatch && secondCharMatch) || similarityScore >= 2) {
                matchedEmployee = emp;
                break; // 첫 번째 매칭만 선택
              }
            }
          }
          
          // 4단계: 초관대 매칭 (첫 번째 매칭만 선택)
          if (!matchedEmployee && participant.name && participant.name.length >= 2) {
            for (const emp of sortedCandidates) {
              if (!emp.name || emp.name.length < 2) continue;
              
              const participantName = participant.name.trim();
              const empName = emp.name.trim();
              
              const firstCharMatch = participantName[0] === empName[0];
              const lengthDiff = Math.abs(participantName.length - empName.length);
              
              if (firstCharMatch && lengthDiff <= 1) {
                const matchingChars = participantName.split('').filter((char, idx) => 
                  empName[idx] === char
                ).length;
                const matchRatio = matchingChars / Math.max(participantName.length, empName.length);
                
                if (matchRatio >= 0.5) {
                  matchedEmployee = emp;
                  break; // 첫 번째 매칭만 선택
                }
              }
            }
          }
          
          // 🔍 안소영 매칭 결과 디버깅
          if (participant.name === '안소영') {
            if (matchedEmployee) {
              console.log(`🔍 [안소영] 매칭 성공:`);
              console.log(`- 매칭된 종사자 이름: ${matchedEmployee.name}`);
              console.log(`- 매칭된 종사자 생년월일: ${matchedEmployee.birthDate}`);
              console.log(`- 매칭된 종사자 기관: ${matchedEmployee.institution}`);
              console.log(`- 매칭된 종사자 isActive: ${matchedEmployee.isActive}`);
              console.log(`- 매칭된 종사자 퇴사일: ${matchedEmployee.resignDate}`);
            } else {
              console.log(`🔍 [안소영] 매칭 실패 - 모인우리 데이터에서 찾을 수 없음`);
            }
          }
          
          // 매칭 결과 최소 로깅 (성능 향상)
          if (matchedEmployee) {
            // 디버깅 케이스에만 상세 로그 출력
            if (isSpecialDebugCase) {
              console.log(`✅ [특별케이스] ${participant.name} ↔ ${matchedEmployee.name}`);
            }
            return matchedEmployee;
          } else {
            // 디버깅 케이스에만 상세 로그 출력  
            if (isSpecialDebugCase) {
              console.log(`❌ [특별케이스] ${participant.name} 매칭실패`);
            }
          }
          
          // 유사 데이터 검색 (매칭 실패시)
          const similarEmployees = safeEmployeeData.filter(emp => {
            if (!emp.name) return false;
            
            const participantNormalizedName = normalizeName(participant.name);
            const empNormalizedName = normalizeName(emp.name);
            
            // 이름이 정확히 일치하는 경우
            if (empNormalizedName === participantNormalizedName) {
              // 생년월일이 있는 경우 날짜 차이 계산
              if (participant.birthDate && emp.birthDate) {
                try {
                  const participantDate = new Date(participant.birthDate);
                  const empDate = new Date(emp.birthDate);
                  const diffTime = Math.abs(participantDate.getTime() - empDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  // 30일 이내 차이면 유사 데이터로 간주
                  if (diffDays <= 30) {
                    emp._similarityInfo = {
                      type: '이름일치_생년월일차이',
                      nameSimilarity: 100,
                      birthDateDiff: diffDays,
                      reason: `생년월일 ${diffDays}일 차이`
                    };
                    return true;
                  }
                } catch (error) {
                  // 날짜 파싱 실패시 생년월일 문자열 비교
                  if (participant.birthDate !== emp.birthDate) {
                    emp._similarityInfo = {
                      type: '이름일치_생년월일형식차이',
                      nameSimilarity: 100,
                      birthDateDiff: null,
                      reason: `생년월일 형식 차이 (${participant.birthDate} vs ${emp.birthDate})`
                    };
                    return true;
                  }
                }
              }
            }
            
            // 생년월일이 정확히 일치하는 경우
            if (participant.birthDate && emp.birthDate) {
              const participantNormalizedDate = normalizeBirthDate(participant.birthDate);
              const empNormalizedDate = normalizeBirthDate(emp.birthDate);
              
              if (participantNormalizedDate === empNormalizedDate) {
                // 이름 유사도 계산 (간단한 포함관계 체크)
                const participant_name = participantNormalizedName;
                const emp_name = empNormalizedName;
                
                if (participant_name.includes(emp_name) || emp_name.includes(participant_name)) {
                  emp._similarityInfo = {
                    type: '생년월일일치_이름유사',
                    nameSimilarity: Math.min(participant_name.length, emp_name.length) / Math.max(participant_name.length, emp_name.length) * 100,
                    birthDateDiff: 0,
                    reason: `생년월일 일치, 이름 유사 (${participant.name} vs ${emp.name})`
                  };
                  return true;
                }
              }
            }
            
            return false;
          });
          
          // 유사 데이터가 있다면 가장 유사한 것을 추가 정보로 첨부
          if (similarEmployees.length > 0) {
            // 유사도가 높은 순으로 정렬
            similarEmployees.sort((a, b) => {
              const aScore = (a._similarityInfo?.nameSimilarity || 0) - (a._similarityInfo?.birthDateDiff || 0);
              const bScore = (b._similarityInfo?.nameSimilarity || 0) - (b._similarityInfo?.birthDateDiff || 0);
              return bScore - aScore;
            });
            
            const mostSimilar = similarEmployees[0];
            console.log(`🔍 [${participant.name}] 유사 데이터 발견: ${mostSimilar.name} (${mostSimilar._similarityInfo?.reason})`);
            
            // 유사 데이터 정보를 participant에 첨부
            participant._similarEmployees = similarEmployees;
          }
          
          return null;
        };
        
        const institutionGroups = participantData.reduce((acc, participant) => {
          const institution = participant.institution || '미분류';
          if (!acc[institution]) {
            acc[institution] = [];
          }
          acc[institution].push(participant);
          return acc;
        }, {} as Record<string, typeof participantData>);
        
        // 🔄 참가자 데이터가 없는 경우 모든 종사자를 "종사자만 존재"로 처리
        let institutionGroupsToProcess = institutionGroups;
        
        if (participantData.length === 0 && employeeData.length > 0) {
          console.log('⚠️ 참가자 데이터가 없음: 모든 종사자를 "종사자만 존재"로 분류');
          
          // 종사자 데이터를 기관별로 그룹화
          const employeeInstitutionGroups = employeeData.reduce((acc, employee) => {
            const institution = employee.institution || employee.regionName || employee.district || '미분류';
            if (!acc[institution]) {
              acc[institution] = [];
            }
            return acc;
          }, {} as Record<string, any[]>);
          
          institutionGroupsToProcess = employeeInstitutionGroups;
          console.log('🏢 종사자 기관 그룹:', Object.keys(institutionGroupsToProcess));
        }

        const results = Object.entries(institutionGroupsToProcess).map(([institution, participants]) => {
          const inconsistencies: any[] = [];
          
          // 🔄 참가자 데이터가 있는 경우에만 참가자-종사자 매칭 수행
          if (participantData.length > 0) {
            // 생년월일 기준 종사자 데이터와 참가자 데이터 교차 검증
            participants.forEach(participant => {
              // 🔍 안소영 매칭 전 디버깅
              if (participant.name === '안소영') {
                console.log(`🔍 [안소영] 매칭 시작 - 기관: ${institution}, 참가자 기관: ${participant.institution}`);
              }
              
              const matchingEmployee = findMatchingEmployee(participant);
            
            if (matchingEmployee) {
              console.log(`\n🔍 [${participant.name}] 동일인 발견 (생년월일: ${participant.birthDate})`);
              console.log('- 배움터 상태:', participant.status, '/ isActive:', participant.isActive);
              console.log('- 모인우리 상태:', matchingEmployee.isActive ? '재직' : '퇴직', '/ 퇴사일:', matchingEmployee.resignDate);
              
              // 상태 불일치 검사 (더 세밀한 분석)
              const participantActive = participant.status !== '중지' && participant.status !== '휴면대상' && participant.status !== '탈퇴' && participant.isActive !== false;
              
              // 종사자 데이터에서 퇴직 여부 판별
              let employeeActive = matchingEmployee.isActive;
              if (matchingEmployee.resignDate) {
                try {
                  const resignDate = new Date(matchingEmployee.resignDate);
                  const today = new Date();
                  employeeActive = resignDate > today; // 퇴사일이 미래이면 재직
                } catch {
                  employeeActive = false; // 퇴사일 파싱 실패시 퇴직으로 간주
                }
              }
              
              // 휴면대상, 중지, 탈퇴와 퇴직을 동등하게 처리 (상태 일치로 간주)
              const isBothInactive = 
                (participant.status === '휴면대상' && !employeeActive) ||
                (participant.status === '중지' && !employeeActive) ||
                (participant.status === '탈퇴' && !employeeActive);
              
              // 퇴사일 비교 함수 (10일 이상 차이나면 불일치)
              const isResignDateMismatch = () => {
                const participantDate = participant.resignDate?.trim();
                const employeeDate = matchingEmployee.resignDate?.trim();
                
                // 한쪽이 공란이면 불일치
                if ((participantDate && !employeeDate) || (!participantDate && employeeDate)) {
                  return true;
                }
                
                // 둘 다 공란이면 일치
                if (!participantDate && !employeeDate) {
                  return false;
                }
                
                // 둘 다 있으면 날짜 차이 계산
                if (participantDate && employeeDate) {
                  try {
                    const date1 = new Date(participantDate);
                    const date2 = new Date(employeeDate);
                    const diffTime = Math.abs(date1.getTime() - date2.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 10; // 10일 이상 차이나면 불일치
                  } catch {
                    return participantDate !== employeeDate; // 날짜 파싱 실패시 문자열 비교
                  }
                }
                
                return false;
              };
              
              // 추가 불일치 검사 함수들
              const checkInstitutionMismatch = () => {
                // 경남광역은 광역 관리기관이므로 개별 기관과의 차이를 불일치로 보지 않음
                const participantInst = participant.institution?.trim();
                const employeeInst = matchingEmployee.institution?.trim();
                
                if (!participantInst || !employeeInst) return false;
                
                // 경남광역과 개별 기관 간의 차이는 정상으로 처리
                if (participantInst === '경남광역' || employeeInst === '경남광역') {
                  return false; // 일치로 처리
                }
                
                return participantInst !== employeeInst;
              };
              
              const checkHireDateMismatch = () => {
                const participantHireDate = participant.hireDate?.trim();
                const employeeHireDate = matchingEmployee.hireDate?.trim();
                
                if (!participantHireDate || !employeeHireDate) return false;
                
                try {
                  const date1 = new Date(participantHireDate);
                  const date2 = new Date(employeeHireDate);
                  const diffTime = Math.abs(date1.getTime() - date2.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays > 90; // 90일 이상 차이나면 불일치
                } catch {
                  return participantHireDate !== employeeHireDate;
                }
              };
              
              const checkJobTypeMismatch = () => {
                if (!participant.jobType || !matchingEmployee.jobType) return false;
                
                // 기관 유형별 직군 제약 검증
                const checkInstitutionJobConstraints = () => {
                  const participantInstitution = participant.institution || '';
                  const employeeInstitution = matchingEmployee.institution || '';
                  
                  // 광역지원기관에는 생활지원사가 있을 수 없음
                  const isGwangyeokInstitution = (instName: string) => 
                    instName.includes('광역지원기관') || instName.includes('*광역지원기관');
                  
                  if (isGwangyeokInstitution(participantInstitution) || 
                      isGwangyeokInstitution(employeeInstitution)) {
                    const hasLifeSupport = participant.jobType?.includes('생활지원사') || 
                                         matchingEmployee.jobType?.includes('생활지원사');
                    if (hasLifeSupport) {
                      console.log(`⚠️ 광역지원기관에 생활지원사 존재: ${participant.name} (${participant.institution})`);
                      return true; // 제약 위반으로 불일치 처리
                    }
                  }
                  
                  return false;
                };
                
                // 기관별 직군 제약 검증
                if (checkInstitutionJobConstraints()) {
                  return true;
                }
                
                // 직군 정규화 함수
                const normalizeJobType = (jobType: string) => {
                  const normalized = jobType.trim().toLowerCase();
                  
                  // 전담사회복지사 계열 통합
                  if (normalized.includes('전담사회복지사') || 
                      normalized.includes('광역전담사회복지사') ||
                      normalized.includes('선임전담사회복지사')) {
                    return '전담사회복지사';
                  }
                  
                  // 생활지원사 계열 통합
                  if (normalized.includes('생활지원사') || 
                      normalized.includes('선임생활지원사')) {
                    return '생활지원사';
                  }
                  
                  return normalized;
                };
                
                const normalizedParticipantJob = normalizeJobType(participant.jobType);
                const normalizedEmployeeJob = normalizeJobType(matchingEmployee.jobType);
                
                return normalizedParticipantJob !== normalizedEmployeeJob;
              };
              
              const checkStatusContradiction = () => {
                // 퇴사일은 있는데 상태가 정상인 경우
                const hasResignDateButActive = participant.resignDate && participant.status === '정상';
                // 퇴사일이 미래인 경우
                const futurResignDate = participant.resignDate && new Date(participant.resignDate) > new Date();
                
                return hasResignDateButActive || futurResignDate;
              };
              
              // 불일치 유형 분류
              const inconsistencyTypes = [];
              
              // 🔍 안소영 디버깅: 불일치 유형 분석
              if (participant.name === '안소영') {
                console.log(`🔍 [안소영] 불일치 유형 분석:`);
                console.log(`- 참가자 기관: ${participant.institution}`);
                console.log(`- 참가자 생년월일: ${participant.birthDate}`);
                console.log(`- 매칭된 종사자: ${matchingEmployee.name} (${matchingEmployee.birthDate})`);
                console.log(`- 매칭된 종사자 기관: ${matchingEmployee.institution}`);
                console.log(`- isBothInactive: ${isBothInactive}`);
                console.log(`- participantActive: ${participantActive}`);
                console.log(`- employeeActive: ${employeeActive}`);
                console.log(`- participant.status: ${participant.status}`);
              }
              
              // 🛡️ 중지/탈퇴/휴면 상태 참가자는 불일치 분석에서 제외
              if (participant.status === '중지' || participant.status === '탈퇴' || participant.status === '휴면대상') {
                if (participant.name === '안소영') {
                  console.log(`🛡️ [안소영] 중지 상태로 불일치 분석 제외됨 (상태: ${participant.status})`);
                }
                return; // 불일치 분석 건너뛰기
              }
              
              if (!isBothInactive && (participantActive !== employeeActive)) {
                inconsistencyTypes.push('재직상태_불일치');
                if (participant.name === '안소영') {
                  console.log(`⚠️ [안소영] 재직상태 불일치 추가됨`);
                }
              }
              
              if (isResignDateMismatch()) {
                inconsistencyTypes.push('퇴사일_불일치');
              }
              
              if (checkInstitutionMismatch()) {
                inconsistencyTypes.push('소속기관_불일치');
              }
              
              if (checkHireDateMismatch()) {
                inconsistencyTypes.push('입사일_불일치');
              }
              
              if (checkJobTypeMismatch()) {
                inconsistencyTypes.push('직군_불일치');
              }
              
              if (checkStatusContradiction()) {
                inconsistencyTypes.push('상태모순_불일치');
              }
              
              // 불일치 발견 조건을 더 넓게 설정
              const hasInconsistency = 
                !isBothInactive && (
                  inconsistencyTypes.length > 0
                );
              
              if (isBothInactive) {
                console.log(`✅ [${participant.name}] 상태 일치 (배움터: '${participant.status}' ↔ 모인우리: '퇴직')`);
              } else if (hasInconsistency) {
                console.log(`⚠️ [${participant.name}] 상태 불일치 발견!`);
                console.log(`  - 배움터 재직상태: ${participantActive} (status: ${participant.status}, isActive: ${participant.isActive})`);
                console.log(`  - 모인우리 재직상태: ${employeeActive} (isActive: ${matchingEmployee.isActive}, 퇴사일: ${matchingEmployee.resignDate})`);
                console.log(`  - 배움터 퇴사일: ${participant.resignDate || '(없음)'}`);
                console.log(`  - 모인우리 퇴사일: ${matchingEmployee.resignDate || '(없음)'}`);
                
                // 퇴사일 차이 계산해서 로그 출력
                if (participant.resignDate && matchingEmployee.resignDate) {
                  try {
                    const date1 = new Date(participant.resignDate);
                    const date2 = new Date(matchingEmployee.resignDate);
                    const diffTime = Math.abs(date1.getTime() - date2.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    console.log(`  - 퇴사일 차이: ${diffDays}일 (기준: 10일 이상시 불일치)`);
                  } catch {
                    console.log(`  - 퇴사일 형식 오류로 문자열 비교`);
                  }
                }
                
                // 상세 불일치 정보 수집
                const detailedInfo = {
                  // 기본 정보
                  name: participant.name,
                  id: participant.id,
                  birthDate: participant.birthDate,
                  
                  // 불일치 유형
                  inconsistencyTypes: inconsistencyTypes,
                  inconsistencyCount: inconsistencyTypes.length,
                  
                  // 상태 정보 (기존)
                  employeeStatus: employeeActive ? '재직' : '퇴직',
                  participantStatus: participant.status || '정상',
                  employeeIsActive: matchingEmployee.isActive,
                  participantIsActive: participant.isActive,
                  
                  // 퇴사일 정보 (기존)
                  employeeResignDate: matchingEmployee.resignDate || '',
                  participantResignDate: participant.resignDate || '',
                  
                  // 추가 상세 정보
                  employeeInstitution: matchingEmployee.institution || '',
                  participantInstitution: participant.institution || '',
                  employeeHireDate: matchingEmployee.hireDate || '',
                  participantHireDate: participant.hireDate || '',
                  employeeJobType: matchingEmployee.jobType || '',
                  participantJobType: participant.jobType || '',
                  employeePhone: matchingEmployee.phone || '',
                  participantPhone: participant.phone || '',
                  
                  // 계산된 차이값들
                  hireDateDiff: (() => {
                    if (!participant.hireDate || !matchingEmployee.hireDate) return null;
                    try {
                      const date1 = new Date(participant.hireDate);
                      const date2 = new Date(matchingEmployee.hireDate);
                      const diffTime = Math.abs(date1.getTime() - date2.getTime());
                      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    } catch {
                      return null;
                    }
                  })(),
                  
                  resignDateDiff: (() => {
                    if (!participant.resignDate || !matchingEmployee.resignDate) return null;
                    try {
                      const date1 = new Date(participant.resignDate);
                      const date2 = new Date(matchingEmployee.resignDate);
                      const diffTime = Math.abs(date1.getTime() - date2.getTime());
                      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    } catch {
                      return null;
                    }
                  })(),
                  
                  // 호환성을 위한 기존 필드
                  jobType: participant.jobType || matchingEmployee.jobType,
                  type: inconsistencyTypes.join(', ') || '상태_불일치'
                };
                
                inconsistencies.push(detailedInfo);
              }
              
              // 특별 디버깅 케이스 체크
              if (debugNames.some(name => participant.name?.includes(name))) {
                console.log(`\n🔍 [${participant.name}] 매칭 성공 상세 분석:`);
                console.log('- 생년월일:', participant.birthDate);
                console.log('- 배움터 퇴사일:', participant.resignDate);
                console.log('- 모인우리 퇴사일:', matchingEmployee.resignDate);
                console.log('- 모인우리 isActive:', matchingEmployee.isActive);
              }
            } else {
              // 매칭되는 종사자 데이터가 없는 경우
              if (debugNames.some(name => participant.name?.includes(name))) {
                console.log(`\n⚠️ [${participant.name}] 매칭되는 종사자 데이터 없음`);
                console.log('- 생년월일:', participant.birthDate);
                console.log('- 배움터 상태:', participant.status);
              }
              }
            });
          }
          
          // 🔄 양방향 불일치 체크: 종사자 데이터에만 있고 참가자 데이터에 없는 경우
          // 🎯 향상된 기관 매칭 로직
          const normalizeInstitutionName = (name: string) => {
            if (!name) return '';
            return name
              .replace(/\s+/g, '') // 공백 제거
              .replace(/시|군|구/g, '') // 행정구역 제거
              .toLowerCase();
          };
          
          const normalizedTarget = normalizeInstitutionName(institution);
          
          const institutionEmployees = employeeData.filter(emp => {
            const empInstitution = emp.institution || emp.regionName || emp.district || '';
            const normalizedEmp = normalizeInstitutionName(empInstitution);
            
            // 1차: 정확 매치
            if (empInstitution === institution) return true;
            
            // 2차: 정규화된 이름 매치
            if (normalizedEmp === normalizedTarget) return true;
            
            // 3차: 부분 매치 (핵심 키워드 포함)
            if (normalizedTarget && normalizedEmp && 
                (normalizedTarget.includes(normalizedEmp) || normalizedEmp.includes(normalizedTarget))) {
              return true;
            }
            
            return false;
          });
          
          // 디버깅: 기관 매칭 결과 로그
          if (institutionEmployees.length > 0) {
            console.log(`🏢 [${institution}] 기관 매칭 결과: ${institutionEmployees.length}명`);
            console.log('  - 매칭된 종사자들:', institutionEmployees.map(emp => `${emp.name}(${emp.institution || emp.regionName || emp.district})`).join(', '));
          }
          
          institutionEmployees.forEach(employee => {
            // 참가자 데이터에서 매칭 찾기 (참가자 데이터가 있는 경우만)
            let matchingParticipant = null;
            
            if (participantData.length > 0) {
              matchingParticipant = participants.find(p => 
                p.name === employee.name && 
                (p.birthDate === employee.birthDate || 
                 (!p.birthDate && !employee.birthDate) ||
                 (p.birthDate && employee.birthDate && 
                  p.birthDate.replace(/[-\/\.]/g, '') === employee.birthDate.replace(/[-\/\.]/g, '')))
              );
            }
            
            // 참가자 데이터가 없거나 매칭되는 참가자가 없으면 "종사자만 존재"
            if (!matchingParticipant) {
              // 모인우리에만 존재하는 경우
              console.log(`⚠️ [${employee.name}] 모인우리에만 존재 (배움터 데이터 없음)`);
              console.log(`  - 모인우리 소속: ${employee.institution || employee.regionName || employee.district}`);
              console.log(`  - 현재 처리 기관: ${institution}`);
              
              inconsistencies.push({
                name: employee.name,
                id: employee.id || '',
                birthDate: employee.birthDate || '',
                
                // 불일치 유형
                inconsistencyTypes: ['모인우리에만_존재'],
                inconsistencyCount: 1,
                
                // 상태 정보
                employeeStatus: employee.isActive ? '재직' : '퇴직',
                participantStatus: '데이터없음',
                employeeIsActive: employee.isActive,
                participantIsActive: false,
                
                // 퇴사일 정보
                employeeResignDate: employee.resignDate || '',
                participantResignDate: '',
                
                // 추가 상세 정보
                employeeInstitution: employee.institution || '',
                participantInstitution: '',
                employeeHireDate: employee.hireDate || '',
                participantHireDate: '',
                employeeJobType: employee.jobType || '',
                participantJobType: '',
                employeePhone: employee.phone || '',
                participantPhone: '',
                
                // 계산된 차이값들
                hireDateDiff: null,
                resignDateDiff: null,
                
                // 호환성을 위한 기존 필드
                jobType: employee.jobType || '',
                type: '모인우리에만_존재'
              });
            }
          });
          
          // 참가자 데이터에만 있고 종사자 데이터에 없는 경우 (이미 위에서 처리됨)
          participants.forEach(participant => {
            const matchingEmployee = findMatchingEmployee(participant);
            if (!matchingEmployee && !inconsistencies.find(i => i.name === participant.name)) {
              
              // 배움터만 가입 후 중지한 케이스 처리 (중간관리자, 임시담당자, 컨설턴트 등)
              const isLearningOnlyThenSuspended = participant.status === '중지';
              
              if (isLearningOnlyThenSuspended) {
                // 중지 상태인 경우 배움터만 가입했다가 업무 종료한 케이스로 간주
                console.log(`✅ [${participant.name}] 배움터만 가입 후 중지 - 임시담당/관리자 케이스로 정상 처리`);
                console.log(`   - 기관: ${participant.institution}`);
                console.log(`   - 상태: ${participant.status}`);
                console.log(`   - 생년월일: ${participant.birthDate}`);
                return; // 불일치로 분류하지 않음
              }
              
              // 배움터 상태가 비활성(중지, 탈퇴, 휴면대상)인 경우는 정상으로 간주
              const inactiveStatuses = ['중지', '탈퇴', '휴면대상'];
              if (inactiveStatuses.includes(participant.status)) {
                console.log(`✅ [${participant.name}] 배움터 상태가 '${participant.status}'이므로 모인우리에 없어도 정상`);
                console.log(`   - 기관: ${participant.institution}`);
                console.log(`   - 생년월일: ${participant.birthDate}`);
                console.log(`   - 직군: ${participant.jobType}`);
                console.log(`   - 퇴사일: ${participant.resignDate || '없음'}`);
                return; // 불일치로 분류하지 않음
              }
              
              // 기관별 직군 제약 검증 (배움터에만 존재하는 경우)
              const participantInstitution = participant.institution || '';
              const isGwangyeokInstitution = participantInstitution.includes('광역지원기관') || 
                                           participantInstitution.includes('*광역지원기관');
              
              if (isGwangyeokInstitution && participant.jobType?.includes('생활지원사')) {
                console.log(`⚠️ [${participant.name}] 광역지원기관에 생활지원사가 등록됨 - 데이터 오류 가능성 (기관: ${participantInstitution})`);
                // 이 경우도 불일치로 분류 (데이터 정정 필요)
              }
              
              console.log(`⚠️ [${participant.name}] 배움터에만 존재 (모인우리 데이터 없음)`);
              
              // 유사 데이터 정보 추출
              const similarEmployees = participant._similarEmployees || [];
              let similarDataInfo = null;
              
              if (similarEmployees.length > 0) {
                const mostSimilar = similarEmployees[0];
                similarDataInfo = {
                  hasSimilarData: true,
                  similarCount: similarEmployees.length,
                  mostSimilarEmployee: {
                    name: mostSimilar.name,
                    birthDate: mostSimilar.birthDate,
                    institution: mostSimilar.institution || mostSimilar.regionName || mostSimilar.district,
                    jobType: mostSimilar.jobType,
                    phone: mostSimilar.phone,
                    similarity: mostSimilar._similarityInfo
                  },
                  allSimilarEmployees: similarEmployees.map(emp => ({
                    name: emp.name,
                    birthDate: emp.birthDate,
                    institution: emp.institution || emp.regionName || emp.district,
                    similarity: emp._similarityInfo
                  }))
                };
                
                console.log(`  📝 유사 데이터 ${similarEmployees.length}건 발견: ${mostSimilar.name} (${mostSimilar._similarityInfo?.reason})`);
              }
              
              inconsistencies.push({
                name: participant.name,
                id: participant.id || '',
                birthDate: participant.birthDate || '',
                
                // 불일치 유형
                inconsistencyTypes: ['배움터에만_존재'],
                inconsistencyCount: 1,
                
                // 상태 정보
                employeeStatus: '데이터없음',
                participantStatus: participant.status || '정상',
                employeeIsActive: false,
                participantIsActive: participant.isActive !== false,
                
                // 퇴사일 정보
                employeeResignDate: '',
                participantResignDate: participant.resignDate || '',
                
                // 추가 상세 정보
                employeeInstitution: '',
                participantInstitution: participant.institution || '',
                employeeHireDate: '',
                participantHireDate: participant.hireDate || '',
                employeeJobType: '',
                participantJobType: participant.jobType || '',
                employeePhone: '',
                participantPhone: participant.phone || '',
                
                // 계산된 차이값들
                hireDateDiff: null,
                resignDateDiff: null,
                
                // 🔍 유사 데이터 정보 (신규 추가)
                similarData: similarDataInfo,
                
                // 호환성을 위한 기존 필드
                jobType: participant.jobType || '',
                type: '배움터에만_존재'
              });
            }
          });
          
          return {
            institution,
            inconsistencies
          };
        }).filter(result => result.inconsistencies.length > 0);
        
        console.log('\n📊 불일치 발견 요약:');
        results.forEach(result => {
          console.log(`${result.institution}: ${result.inconsistencies.length}건`);
        });
        
        // 전체 매칭 통계 요약
        const totalParticipants = participantData.length;
        const totalInconsistencies = results.reduce((sum, result) => sum + result.inconsistencies.length, 0);
        const learningOnlyCount = results.reduce((sum, result) => 
          sum + result.inconsistencies.filter(inc => inc.inconsistencyTypes?.includes('배움터에만_존재')).length, 0);
        const employeeOnlyCount = results.reduce((sum, result) => 
          sum + result.inconsistencies.filter(inc => inc.inconsistencyTypes?.includes('모인우리에만_존재')).length, 0);
        const statusMismatchCount = results.reduce((sum, result) => 
          sum + result.inconsistencies.filter(inc => 
            inc.inconsistencyTypes?.some(type => type.includes('불일치') && !type.includes('존재'))
          ).length, 0);
          
        console.log('\n🚨 분석 결과 검증:');
        console.log(`참가자 데이터: ${participantData.length}명`);
        console.log(`종사자 데이터: ${employeeData.length}명`);
        console.log(`배움터에만 존재: ${learningOnlyCount}명`);
        console.log(`모인우리에만 존재: ${employeeOnlyCount}명`);
        console.log(`상태 불일치: ${statusMismatchCount}명`);
        
        if (learningOnlyCount > totalParticipants * 0.8) {
          console.warn('🚨 경고: 80% 이상이 배움터에만 존재로 분류됨 - 매칭 로직 문제 의심');
        }
        
        console.log('\n🎯 매칭 분석 최종 요약:');
        console.log(`전체 참가자(배움터): ${totalParticipants}명`);
        console.log(`전체 종사자(모인우리): ${employeeData.length}명`);
        console.log(`전체 불일치 건수: ${totalInconsistencies}건`);
        console.log(`  - 배움터에만 존재: ${learningOnlyCount}건 (${totalParticipants > 0 ? ((learningOnlyCount/totalParticipants)*100).toFixed(1) : 0}%)`);
        console.log(`  - 모인우리에만 존재: ${employeeOnlyCount}건`);
        console.log(`  - 상태 불일치: ${statusMismatchCount}건`);
        console.log(`매칭 성공률: ${totalParticipants > 0 ? (((totalParticipants - learningOnlyCount) / totalParticipants) * 100).toFixed(1) : 0}%`);
        
        // 결과를 정렬하여 일관성 확보
        const sortedResults = results
          .filter(result => result.inconsistencies.length > 0)
          .sort((a, b) => a.institution.localeCompare(b.institution))
          .map(result => ({
            ...result,
            inconsistencies: result.inconsistencies.sort((a, b) => {
              // 이름으로 정렬하여 항상 동일한 순서 보장
              return a.name.localeCompare(b.name);
            })
          }));
        
        console.log('\n🎯 매칭 분석 최종 요약 (일관성 확보됨):');
        console.log(`전체 참가자(배움터): ${sortedParticipantData.length}명`);
        console.log(`전체 종사자(모인우리): ${safeRawEmployeeData.length}명`);
        const finalInconsistencyCount = sortedResults.reduce((sum, result) => sum + result.inconsistencies.length, 0);
        console.log(`전체 불일치 건수: ${finalInconsistencyCount}건`);
        console.log(`영향받는 기관수: ${sortedResults.length}개`);
        
        // 종료/폐지 기관 필터링 (임시로 비활성화)
        const filteredResults = sortedResults.filter(result => {
          // TODO: async 처리를 위해 별도 함수로 분리 필요
          // const classification = await categorizeInstitution(result.institution);
          // const isExcluded = classification === 'closed';
          
          // 임시로 모든 기관을 포함
          return true;
        });
        
        console.log(`\n✅ 필터링 후 영향받는 기관수: ${filteredResults.length}개`);
        const filteredInconsistencyCount = filteredResults.reduce((sum, result) => sum + result.inconsistencies.length, 0);
        console.log(`✅ 필터링 후 불일치 건수: ${filteredInconsistencyCount}건`);
        
        // 🔍 카테고리별 분석 결과 (상세 디버깅)
        const categoryBreakdown = filteredResults.reduce((acc, result) => {
          result.inconsistencies.forEach(item => {
            if (item.inconsistencyTypes && Array.isArray(item.inconsistencyTypes)) {
              item.inconsistencyTypes.forEach(type => {
                acc[type] = (acc[type] || 0) + 1;
              });
            }
          });
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`📈 [카테고리별 상세 분석]:`);
        Object.entries(categoryBreakdown).forEach(([category, count]) => {
          console.log(`- ${category}: ${count}건`);
        });
        
        // 🔍 첫 5개 결과 샘플
        console.log(`📋 [결과 샘플 (첫 5개)]:`);
        if (filteredResults.length > 0 && filteredResults[0].inconsistencies.length > 0) {
          filteredResults[0].inconsistencies.slice(0, 5).forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.name} (${filteredResults[0].institution}) - 타입: [${(item.inconsistencyTypes || []).join(', ')}]`);
          });
        }
        
        // 성능 로그
        const endTime = performance.now();
        console.log(`⏱️ 불일치 분석 완료 시간: ${(endTime - startTime).toFixed(2)}ms`);
        
        return filteredResults;
      },
    }),
    {
      name: 'education-store',
      // localStorage 용량 문제 해결을 위한 설정 - 대용량 데이터는 저장하지 않음
      partialize: (state) => {
        // 대용량 데이터는 localStorage에 저장하지 않고 IndexedDB 사용
        const { basicEducationData, advancedEducationData, integratedAnalysisData, participantData, ...rest } = state;
        
        console.log('Using IndexedDB for large data storage');
        return {}; // localStorage에는 아무것도 저장하지 않음
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('localStorage rehydration error:', error);
        }
        return (state) => {
          // localStorage 복원 후 IndexedDB에서 대용량 데이터 로드
          if (state && state.loadFromIndexedDB) {
            state.loadFromIndexedDB().catch(error => {
              console.error('Failed to load from IndexedDB during rehydration:', error);
            });
          }
        };
      },
    }
  )
);
