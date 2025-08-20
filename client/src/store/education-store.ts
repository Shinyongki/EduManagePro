import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EducationData, EducationStats, IntegratedAnalysisData, EducationParticipant, EmployeeData } from '@shared/schema';
import { educationDB } from '@/lib/indexeddb';

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
          
          // 🔥 중요: 종사자 관리 데이터 우선 처리 로직 (생년월일 기준 동일인 판별)
          const matchingEmployee = safeEmployeeData.find(emp => 
            emp.name === participant.name && 
            emp.birthDate === participant.birthDate
          );
          
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
          
          // 🔥 중요: 종사자 관리 데이터 우선 처리 로직 (생년월일 기준 동일인 판별)
          const matchingEmployee = safeEmployeeData.find(emp => 
            emp.name === participant.name && 
            emp.birthDate === participant.birthDate
          );
          
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
        console.log('✅ 외부에서 전달받은 종사자 데이터:', rawEmployeeData.length, '명');
        
        console.log('\n🔍 데이터 일관성 검사 시작 (생년월일 기준 동일인 판별)');
        console.log('참가자 데이터(배움터):', participantData.length, '명');
        // 배열 안전성 검증
        const safeRawEmployeeData = Array.isArray(rawEmployeeData) ? rawEmployeeData : [];
        console.log('종사자 데이터(모인우리) 원본:', safeRawEmployeeData.length, '명');
        
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
        
        // 원본 종사자 데이터가 없는 경우 빈 배열 반환
        if (safeRawEmployeeData.length === 0) {
          console.warn('⚠️ 종사자 데이터(모인우리)가 없습니다. 종사자 데이터를 먼저 업로드해주세요.');
          console.log('📌 정확한 불일치 분석을 위해서는 종사자 데이터 업로드가 필요합니다.');
          return []; // 임시 데이터를 생성하지 않고 빈 배열 반환
        }
        
        // 생년월일과 이름으로 동일인 매칭 함수 (유연한 매칭)
        const findMatchingEmployee = (participant: EducationParticipant): EmployeeData | null => {
          if (!participant.name) return null;
          
          // 배열 안전성 검증
          const safeEmployeeData = Array.isArray(employeeData) ? employeeData : [];
          
          // 백현태님 특별 디버깅
          if (participant.name?.includes('백현태')) {
            console.log('\n🔍 [보정된 데이터로] 백현태님 매칭 디버깅:');
            console.log('- 참가자 이름:', participant.name);
            console.log('- 참가자 생년월일:', participant.birthDate);
            console.log('- 보정된 종사자 데이터 중 이름이 일치하는 사람들:');
            
            const nameMatches = safeEmployeeData.filter(emp => emp.name?.includes('백현태'));
            nameMatches.forEach((emp, idx) => {
              console.log(`  ${idx + 1}. 이름: ${emp.name}, 생년월일: ${emp.birthDate}, 상태: ${emp.isActive}, 퇴사일: ${emp.resignDate}, 보정됨: ${emp.corrected}`);
            });
            
            if (nameMatches.length === 0) {
              console.log('  ⚠️ 보정된 종사자 데이터에도 백현태님이 없습니다!');
            } else {
              console.log(`  ✅ 보정된 데이터에서 ${nameMatches.length}명 발견!`);
            }
          }
          
          return safeEmployeeData.find(emp => {
            // 이름 매칭 (정확 일치)
            const nameMatch = emp.name === participant.name;
            
            if (!nameMatch) return false;
            
            // 생년월일 매칭 (다양한 형식 지원)
            if (participant.birthDate && emp.birthDate) {
              // 정확 일치
              if (emp.birthDate === participant.birthDate) return true;
              
              // 날짜 형식을 정규화해서 비교
              try {
                const normalizeDate = (dateStr: string) => {
                  // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD 등을 YYYYMMDD로 변환
                  return dateStr.replace(/[-./]/g, '');
                };
                
                const empNormalizedDate = normalizeDate(emp.birthDate);
                const participantNormalizedDate = normalizeDate(participant.birthDate);
                
                if (empNormalizedDate === participantNormalizedDate) return true;
              } catch (error) {
                console.log(`날짜 정규화 실패: ${emp.birthDate} vs ${participant.birthDate}`);
              }
              
              // 생년월일이 다르면 동명이인으로 판단하여 매칭하지 않음
              return false;
            }
            
            // 둘 다 생년월일이 없는 경우에만 이름만으로 매칭 (경고 메시지 출력)
            if (!participant.birthDate && !emp.birthDate) {
              console.warn(`⚠️ 생년월일 없이 이름만으로 매칭: ${participant.name}`);
              return nameMatch;
            }
            
            // 한쪽만 생년월일이 있는 경우 매칭하지 않음 (데이터 불완전)
            return false;
          }) || null;
        };
        
        const institutionGroups = participantData.reduce((acc, participant) => {
          const institution = participant.institution || '미분류';
          if (!acc[institution]) {
            acc[institution] = [];
          }
          acc[institution].push(participant);
          return acc;
        }, {} as Record<string, typeof participantData>);
        
        const results = Object.entries(institutionGroups).map(([institution, participants]) => {
          const inconsistencies: any[] = [];
          
          // 생년월일 기준 종사자 데이터와 참가자 데이터 교차 검증
          participants.forEach(participant => {
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
                return participant.jobType && matchingEmployee.jobType && 
                       participant.jobType !== matchingEmployee.jobType;
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
              
              if (!isBothInactive && (participantActive !== employeeActive)) {
                inconsistencyTypes.push('재직상태_불일치');
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
              
              // 박은정 특별 체크
              if (participant.name?.includes('박은정')) {
                console.log('\n🔍 박은정님 상세 분석:');
                console.log('- 생년월일:', participant.birthDate);
                console.log('- 배움터 퇴사일:', participant.resignDate);
                console.log('- 모인우리 퇴사일:', matchingEmployee.resignDate);
                console.log('- 모인우리 isActive:', matchingEmployee.isActive);
              }
            } else {
              // 매칭되는 종사자 데이터가 없는 경우
              if (participant.name?.includes('손혜원') || participant.name?.includes('박은정')) {
                console.log(`\n⚠️ [${participant.name}] 매칭되는 종사자 데이터 없음`);
                console.log('- 생년월일:', participant.birthDate);
                console.log('- 배움터 상태:', participant.status);
              }
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
        
        return results;
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
