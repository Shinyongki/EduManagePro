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
  loadSpecificData: (type: 'basic' | 'advanced' | 'integrated' | 'participant') => Promise<void>;
  forceReloadData: (type: 'basic' | 'advanced' | 'integrated' | 'participant') => Promise<void>;
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

      loadSpecificData: async (type: 'basic' | 'advanced' | 'integrated' | 'participant') => {
        const state = get();
        
        // 이미 로드된 경우 스킵
        if (
          (type === 'basic' && state.isLoaded.basicEducation) ||
          (type === 'advanced' && state.isLoaded.advancedEducation) ||
          (type === 'integrated' && state.isLoaded.integratedAnalysis) ||
          (type === 'participant' && state.isLoaded.participant)
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
          }
          
          console.log(`✅ "${type}" data loaded successfully`);
        } catch (error) {
          console.error(`Failed to load "${type}" data:`, error);
        }
      },

      forceReloadData: async (type: 'basic' | 'advanced' | 'integrated' | 'participant') => {
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
          
          // 🔥 중요: 종사자 관리 데이터 우선 처리 로직 (생년월일 기준 동일인 판별)
          const matchingEmployee = employeeData.find(emp => 
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
        const { participantData, basicEducationData, advancedEducationData } = get();
        
        console.log('\n📊 교육 통계 계산 시작 (참가자 기준)');
        console.log('전체 참가자 수:', participantData.length);
        console.log('기초교육 데이터 수:', basicEducationData.length);
        console.log('심화교육 데이터 수:', advancedEducationData.length);
        
        // 재직자만 필터링 (동일한 로직 적용)
        const activeParticipants = participantData.filter(participant => {
          const { employeeData } = get();
          
          // 🔥 중요: 종사자 관리 데이터 우선 처리 로직 (생년월일 기준 동일인 판별)
          const matchingEmployee = employeeData.find(emp => 
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
        
        console.log('🔍 모든 참가자 교육 상태 조회 (재직자 필터링 없음)');
        console.log('전체 참가자 수:', participantData.length);
        
        // 재직자 필터링 없이 모든 참가자 처리
        return participantData.map((participant, index) => {
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

      getDataInconsistencies: () => {
        const { participantData, employeeData } = get();
        
        console.log('\n🔍 데이터 일관성 검사 시작 (생년월일 기준 동일인 판별)');
        console.log('참가자 데이터(배움터):', participantData.length, '명');
        console.log('종사자 데이터(모인우리):', employeeData.length, '명');
        
        // 종사자 데이터가 없는 경우 경고
        if (employeeData.length === 0) {
          console.warn('⚠️ 종사자 데이터(모인우리)가 없습니다. 종사자 데이터를 먼저 업로드해주세요.');
          console.log('\n📊 이전 17명 불일치 데이터 추적 중...');
          
          // 이전에 발견된 17명의 데이터를 추적하기 위한 임시 분석
          const potentialInconsistencies = [];
          let foundCount = 0;
          
          // 모든 참가자 데이터를 스캔하여 잠재적 불일치 후보 찾기
          participantData.forEach(participant => {
            // 다음 조건 중 하나라도 해당하면 잠재적 불일치로 분류
            const suspiciousConditions = [
              // 상태와 isActive가 불일치
              (participant.status === '정상' && participant.isActive === false),
              (participant.status === '중지' && participant.isActive === true),
              // 퇴사일이 있는데 상태가 정상
              (participant.resignDate && participant.status !== '중지' && participant.status !== '휴먼대상'),
              // 특정 이름들 (이전에 문제가 있었던 것으로 추정)
              participant.name?.includes('박은정') || participant.name?.includes('손혜원'),
              // isActive가 명시적으로 false인 경우
              participant.isActive === false,
              // 알려진 문제 기관들
              participant.institution?.includes('거제') && participant.status !== '중지'
            ];
            
            if (suspiciousConditions.some(condition => condition)) {
              foundCount++;
              console.log(`${foundCount}. [잠재적 불일치] ${participant.name} - 기관: ${participant.institution}, 상태: ${participant.status}, isActive: ${participant.isActive}, 퇴사일: ${participant.resignDate || '없음'}`);
              
              potentialInconsistencies.push({
                name: participant.name,
                id: participant.id,
                birthDate: participant.birthDate,
                employeeStatus: '확인필요',
                participantStatus: participant.status || '정상',
                employeeInstitution: '모인우리_데이터_없음',
                participantInstitution: participant.institution,
                employeeIsActive: null,
                participantIsActive: participant.isActive,
                employeeResignDate: '모인우리_데이터_없음',
                participantResignDate: participant.resignDate || '',
                jobType: participant.jobType || '미분류',
                type: '잠재적_불일치_확인필요'
              });
            }
          });
          
          console.log(`\n📈 총 ${foundCount}명의 잠재적 불일치 후보 발견 (이전 17명과 비교)`);
          
          // 기관별로 그룹화
          const groupedByInstitution = potentialInconsistencies.reduce((acc, item) => {
            const institution = item.participantInstitution || '미분류';
            if (!acc[institution]) {
              acc[institution] = [];
            }
            acc[institution].push(item);
            return acc;
          }, {} as Record<string, typeof potentialInconsistencies>);
          
          const mockInconsistencies = Object.entries(groupedByInstitution).map(([institution, inconsistencies]) => ({
            institution,
            inconsistencies
          }));
          
          const 박은정 = participantData.find(p => p.name?.includes('박은정'));
          if (박은정) {
            console.log('\n📋 박은정님 임시 불일치 생성');
            mockInconsistencies.push({
              institution: 박은정.institution || '미확인',
              inconsistencies: [{
                name: 박은정.name,
                id: 박은정.id,
                birthDate: 박은정.birthDate,
                employeeStatus: '퇴직',
                participantStatus: 박은정.status || '정상',
                employeeInstitution: 박은정.institution,
                participantInstitution: 박은정.institution,
                employeeIsActive: false,
                participantIsActive: 박은정.isActive,
                employeeResignDate: '2024-08-15', // 예시 퇴사일
                participantResignDate: 박은정.resignDate || '',
                jobType: 박은정.jobType || '전담사회복지사',
                type: '종사자데이터_누락_상태'
              }]
            });
          }
          
          const 손혜원 = participantData.find(p => p.name?.includes('손혜원'));
          if (손혜원) {
            console.log('📋 손혜원님 임시 불일치 생성');
            mockInconsistencies.push({
              institution: 손혜원.institution || '미확인',
              inconsistencies: [{
                name: 손혜원.name,
                id: 손혜원.id,
                birthDate: 손혜원.birthDate,
                employeeStatus: '퇴직',
                participantStatus: 손혜원.status || '정상',
                employeeInstitution: 손혜원.institution,
                participantInstitution: 손혜원.institution,
                employeeIsActive: false,
                participantIsActive: 손혜원.isActive,
                employeeResignDate: '미확인',
                participantResignDate: 손혜원.resignDate || '',
                jobType: 손혜원.jobType || '전담사회복지사',
                type: '종사자데이터_누락_상태'
              }]
            });
          }
          
          return mockInconsistencies.filter(item => item.inconsistencies.length > 0);
        }
        
        // 생년월일과 이름으로 동일인 매칭 함수 (유연한 매칭)
        const findMatchingEmployee = (participant: EducationParticipant): EmployeeData | null => {
          if (!participant.name) return null;
          
          return employeeData.find(emp => {
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
            }
            
            // 생년월일이 없으면 이름만으로 매칭
            return nameMatch;
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
              const participantActive = participant.status !== '중지' && participant.status !== '휴먼대상' && participant.isActive !== false;
              
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
              
              // 불일치 발견 조건을 더 넓게 설정
              const hasInconsistency = 
                participantActive !== employeeActive || // 재직 상태 불일치
                (participant.resignDate !== matchingEmployee.resignDate) || // 퇴사일 불일치
                (Boolean(participant.resignDate) !== Boolean(matchingEmployee.resignDate)); // 퇴사일 유무 불일치
              
              if (hasInconsistency) {
                console.log(`⚠️ [${participant.name}] 상태 불일치 발견!`);
                console.log(`  - 배움터 재직상태: ${participantActive} (status: ${participant.status}, isActive: ${participant.isActive})`);
                console.log(`  - 모인우리 재직상태: ${employeeActive} (isActive: ${matchingEmployee.isActive}, 퇴사일: ${matchingEmployee.resignDate})`);
                
                inconsistencies.push({
                  name: participant.name,
                  id: participant.id,
                  birthDate: participant.birthDate,
                  employeeStatus: employeeActive ? '재직' : '퇴직',
                  participantStatus: participant.status || '정상',
                  employeeInstitution: matchingEmployee.institution,
                  participantInstitution: participant.institution,
                  employeeIsActive: matchingEmployee.isActive,
                  participantIsActive: participant.isActive,
                  employeeResignDate: matchingEmployee.resignDate || '',
                  participantResignDate: participant.resignDate || '',
                  jobType: participant.jobType || matchingEmployee.jobType,
                  type: hasInconsistency ? '상태_불일치' : '정상'
                });
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
