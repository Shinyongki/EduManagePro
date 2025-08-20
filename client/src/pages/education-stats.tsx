import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEducationStore } from "@/store/education-store";
import { useEmployeeStore } from "@/store/employee-store";
import { BookOpen, GraduationCap, TrendingUp, Users, Award, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { 
  createUnifiedDataSource, 
  createParticipantBasedStats,
  calculateEducationStats, 
  calculateEducationParticipants,
  getActivePersons 
} from "@/utils/unified-data-source";

export default function EducationStatsPage() {
  const { 
    basicEducationData, 
    advancedEducationData, 
    participantData,
    getEducationStats,
    getEducationSummaryStats,
    getParticipantEducationStatus
  } = useEducationStore();

  const { employeeData, loadEmployeeData } = useEmployeeStore();

  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);

  // 종사자 데이터 자동 로딩
  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  // 🎯 소속회원 기준 교육 통계 계산 (소속회원 목록과 통일)
  const participantBasedStats = useMemo(() => {
    if (!participantData || participantData.length === 0) {
      return { 
        allParticipants: [], 
        activeParticipants: [], 
        totalCount: 0, 
        activeCount: 0,
        stats: { total: 0, complete: 0, partial: 0, inProgress: 0, none: 0 }
      };
    }
    
    console.log('\n📊 교육통계: 소속회원 기준 통계 계산');
    console.log('- 참조 데이터: 소속회원', participantData.length, '명');
    
    const result = createParticipantBasedStats(
      participantData,
      basicEducationData || [],
      advancedEducationData || [],
      '2025-08-04' // 스냅샷 날짜 기준
    );
    
    // 교육 통계 계산
    const stats = {
      total: result.activeCount,
      complete: 0,
      partial: 0,
      inProgress: 0,
      none: 0
    };
    
    result.activeParticipants.forEach(participant => {
      const basicCompleted = participant.basicEducationStatus === '수료' || 
                            participant.basicEducationStatus === '완료' ||
                            participant.basicTraining === '수료' ||
                            participant.basicTraining === '완료';
      const advancedCompleted = participant.advancedEducationStatus === '수료' || 
                               participant.advancedEducationStatus === '완료' ||
                               participant.advancedEducation === '수료' ||
                               participant.advancedEducation === '완료';
      
      if (basicCompleted && advancedCompleted) {
        stats.complete++;
      } else if (basicCompleted || advancedCompleted) {
        stats.partial++;
      } else if (participant.basicEducationStatus || participant.advancedEducationStatus ||
                 participant.basicTraining || participant.advancedEducation) {
        stats.inProgress++;
      } else {
        stats.none++;
      }
    });
    
    console.log('📈 교육통계 결과:', stats);
    console.log('✅ 소속회원 목록과 동일한 기준 적용');
    
    return { ...result, stats };
  }, [participantData, basicEducationData, advancedEducationData]);

  // 기존 통계 (비교용)
  const educationStats = getEducationStats();
  const summaryStats = getEducationSummaryStats();
  const participantStatuses = getParticipantEducationStatus();
  
  // 소속회원 기준 기관별 상세 정보 가져오기 (useCallback으로 최적화)
  const getInstitutionEmployeeDetails = useCallback((institutionName: string) => {
    if (!participantBasedStats.activeParticipants || participantBasedStats.activeParticipants.length === 0) {
      return [];
    }

    // 해당 기관의 소속회원 데이터 필터링
    const institutionParticipants = participantBasedStats.activeParticipants.filter(p => 
      p.institution === institutionName ||
      p.institution?.includes(institutionName) ||
      institutionName?.includes(p.institution)
    );
    
    console.log(`🔍 [${institutionName}] 상세보기 - 소속회원 ${institutionParticipants.length}명 발견`);
    
    // 광역지원기관 특별 디버깅
    if (institutionName?.includes('광역') || institutionName?.includes('경상남도사회서비스원')) {
      console.log(`\n🏛️ [광역지원기관 상세보기] ${institutionName}`);
      console.log('- 매칭된 소속회원 수:', institutionParticipants.length);
      console.log('- 매칭 조건들:');
      console.log(`  * 정확일치: ${participantBasedStats.activeParticipants.filter(p => p.institution === institutionName).length}명`);
      console.log(`  * 기관명이 소속회원institution포함: ${participantBasedStats.activeParticipants.filter(p => p.institution?.includes(institutionName)).length}명`);
      console.log(`  * 소속회원institution이 기관명포함: ${participantBasedStats.activeParticipants.filter(p => institutionName?.includes(p.institution)).length}명`);
      
      if (institutionParticipants.length > 0) {
        console.log('- 첫 3명 샘플:');
        institutionParticipants.slice(0, 3).forEach(p => {
          console.log(`  * ${p.name} (기관: "${p.institution}", 기본교육: "${p.basicEducationStatus || p.basicTraining || 'null'}", 심화교육: "${p.advancedEducationStatus || p.advancedEducation || 'null'}")`);
        });
      }
    }
    
    // 소속회원 데이터를 직접 사용하여 교육 상태 표시
    return institutionParticipants.map(participant => {
      // 기초교육 상태 확인
      const basicEducationStatus = 
        (participant.basicEducationStatus === '수료' || participant.basicEducationStatus === '완료' ||
         participant.basicTraining === '수료' || participant.basicTraining === '완료') 
          ? '수료' 
          : participant.basicEducationStatus || participant.basicTraining || '미이수';
      
      // 심화교육 상태 확인
      const advancedEducationStatus = 
        (participant.advancedEducationStatus === '수료' || participant.advancedEducationStatus === '완료' ||
         participant.advancedEducation === '수료' || participant.advancedEducation === '완료') 
          ? '수료' 
          : participant.advancedEducationStatus || participant.advancedEducation || '미이수';
      
      return {
        name: participant.name,
        jobType: participant.jobType || '미분류',
        hireDate: participant.hireDate || '미등록',
        resignDate: participant.resignDate,
        institution: participant.institution,
        isActive: participant.status === '정상' && !participant.resignDate,
        basicEducationStatus,
        advancedEducationStatus,
        isFullyCompleted: basicEducationStatus === '수료' && advancedEducationStatus === '수료'
      };
    });
  }, [participantBasedStats]);

  // 소속회원 기준 직군별 통계 계산 - useCallback으로 최적화
  const getJobTypeStats = useCallback((educationType: 'basic' | 'advanced') => {
    if (!participantBasedStats.activeParticipants || participantBasedStats.activeParticipants.length === 0) {
      return [];
    }

    // 소속회원들을 직군별로 그룹화
    const jobTypeGroups = participantBasedStats.activeParticipants.reduce((acc, participant) => {
      const jobType = participant.jobType || '기타';
      if (!acc[jobType]) {
        acc[jobType] = [];
      }
      acc[jobType].push(participant);
      return acc;
    }, {} as Record<string, typeof participantBasedStats.activeParticipants>);

    // 각 직군별로 통계 계산
    return Object.entries(jobTypeGroups).map(([jobType, participants]) => {
      const total = participants.length;
      
      let completed = 0;
      let inProgress = 0;
      let cancelled = 0;


      participants.forEach(participant => {
        if (educationType === 'basic') {
          // 기본교육 상태 확인
          const isCompleted = participant.basicEducationStatus === '수료' || 
                            participant.basicEducationStatus === '완료' ||
                            participant.basicTraining === '수료' ||
                            participant.basicTraining === '완료';
          
          const isCancelled = 
            (participant.basicEducationStatus && 
             (participant.basicEducationStatus.includes('취소') || 
              participant.basicEducationStatus.includes('중단') ||
              participant.basicEducationStatus === '수강취소')) ||
            (participant.basicTraining && 
             (participant.basicTraining.includes('취소') || 
              participant.basicTraining.includes('중단') ||
              participant.basicTraining === '수강취소')) ||
            (participant.status && 
             (participant.status.includes('취소') || 
              participant.status.includes('중단')));
          
          const isInProgress = !isCompleted && !isCancelled && 
                             (participant.basicEducationStatus || participant.basicTraining);

          if (isCompleted) completed++;
          else if (isCancelled) cancelled++;
          else if (isInProgress) inProgress++;
        } else {
          // 심화교육 상태 확인
          const isCompleted = participant.advancedEducationStatus === '수료' || 
                            participant.advancedEducationStatus === '완료' ||
                            participant.advancedEducation === '수료' ||
                            participant.advancedEducation === '완료';
          
          const isCancelled = 
            (participant.advancedEducationStatus && 
             (participant.advancedEducationStatus.includes('취소') || 
              participant.advancedEducationStatus.includes('중단') ||
              participant.advancedEducationStatus === '수강취소')) ||
            (participant.advancedEducation && 
             (participant.advancedEducation.includes('취소') || 
              participant.advancedEducation.includes('중단') ||
              participant.advancedEducation === '수강취소')) ||
            (participant.status && 
             (participant.status.includes('취소') || 
              participant.status.includes('중단')));
          
          const isInProgress = !isCompleted && !isCancelled && 
                             (participant.advancedEducationStatus || participant.advancedEducation);

          if (isCompleted) completed++;
          else if (isCancelled) cancelled++;
          else if (isInProgress) inProgress++;
        }
      });


      return {
        jobType,
        total,
        completed,
        inProgress,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }).filter(stat => stat.total > 0); // 참여자가 있는 직군만 반환
  }, [participantBasedStats]);

  // 소속회원 기준 기관별 성과 분석 (폐지/종료 기관 제외) - useCallback으로 최적화
  const getInstitutionPerformance = useCallback((criteriaRate: number = 80) => {
    if (!participantBasedStats.activeParticipants || participantBasedStats.activeParticipants.length === 0) {
      return [];
    }
    
    // 폐지/종료 기관 식별 키워드
    const closedInstitutionKeywords = [
      '폐지', '종료', '폐쇄', '해산', '해체', '중단', '운영중단', '운영종료',
      '폐원', '휴원', '휴업', '운영휴지', '사업중단', '사업종료', 
      'closed', 'terminated', 'discontinued', 'shutdown'
    ];
    
    // 폐지/종료된 기관인지 확인하는 함수
    const isClosedInstitution = (institutionName: string, participants: any[]) => {
      // 기관명에 폐지/종료 키워드가 포함된 경우
      const nameCheck = closedInstitutionKeywords.some(keyword => 
        institutionName?.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // 해당 기관의 모든 소속회원이 비활성 상태인 경우 (폐지 추정)
      const allInactive = participants.length > 0 && 
        participants.every(p => 
          p.status !== '정상' || 
          p.isActive === false ||
          (p.resignDate && new Date(p.resignDate) < new Date())
        );
      
      return nameCheck || allInactive;
    };
    
    // 소속회원을 기관별로 그룹화
    const institutionGroups = participantBasedStats.activeParticipants.reduce((acc, participant) => {
      const institution = participant.institution;
      if (!acc[institution]) {
        acc[institution] = {
          name: institution,
          district: participant.district,
          participants: []
        };
      }
      acc[institution].participants.push(participant);
      return acc;
    }, {} as Record<string, { name: string; district: string; participants: typeof participantBasedStats.activeParticipants }>);

    return Object.values(institutionGroups)
      .filter(({ name, participants }) => {
        // 폐지/종료된 기관 제외
        return !isClosedInstitution(name, participants);
      })
      .map(({ name, district, participants }) => {
        const total = participants.length;
        
        // 광역지원기관 및 우리들노인통합지원센터 디버깅
        if (name?.includes('광역') || name?.includes('경상남도사회서비스원') || 
            name?.includes('우리들') || name?.includes('노인통합지원센터')) {
          console.log(`\n🏥 [${name}] 기관성과 분석 디버깅:`);
          console.log('- 총 소속회원:', total, '명');
          console.log('- 기관명 정확한 매칭:', name);
          console.log('- district:', district);
          console.log('- 첫 5명 샘플:', participants.slice(0, 5).map(p => ({
            name: p.name,
            institution: p.institution,
            basicEducationStatus: p.basicEducationStatus,
            basicTraining: p.basicTraining,
            advancedEducationStatus: p.advancedEducationStatus,
            advancedEducation: p.advancedEducation,
            status: p.status
          })));
        }

        // 소속회원별 수료 상태 계산 (통일된 로직 사용)
        let completed = 0;
        let basicCompleted = 0;
        let advancedCompleted = 0;
        let basicTotal = total; // 모든 소속회원이 기본교육 대상
        let advancedTotal = total; // 모든 소속회원이 심화교육 대상

        const jobTypeStats = {} as Record<string, { total: number; completed: number }>;

        participants.forEach(participant => {
          const jobType = participant.jobType || '기타';
          if (!jobTypeStats[jobType]) {
            jobTypeStats[jobType] = { total: 0, completed: 0 };
          }
          jobTypeStats[jobType].total++;

          // 🎯 통일된 수료 판정 로직 - 상세보기와 동일하게
          const hasBasicCompleted = 
            participant.basicEducationStatus === '수료' || 
            participant.basicEducationStatus === '완료' ||
            participant.basicTraining === '수료' ||
            participant.basicTraining === '완료';
          
          const hasAdvancedCompleted = 
            participant.advancedEducationStatus === '수료' || 
            participant.advancedEducationStatus === '완료' ||
            participant.advancedEducation === '수료' ||
            participant.advancedEducation === '완료';
          
          if (hasBasicCompleted) {
            basicCompleted++;
          }
          
          if (hasAdvancedCompleted) {
            advancedCompleted++;
          }

          // 전체 수료 여부 (기본 또는 심화 중 하나라도 수료)
          if (hasBasicCompleted || hasAdvancedCompleted) {
            completed++;
            jobTypeStats[jobType].completed++;
          }
          
          // 광역지원기관 및 우리들노인통합지원센터 개별 회원 디버깅
          if ((name?.includes('광역') || name?.includes('경상남도사회서비스원') || 
               name?.includes('우리들')) && (hasBasicCompleted || hasAdvancedCompleted)) {
            console.log(`  ✅ 수료자: ${participant.name} (기본:${hasBasicCompleted ? 'O' : 'X'}, 심화:${hasAdvancedCompleted ? 'O' : 'X'})`);
          }
          
          // 광역지원기관에서 수료 상태가 없는 회원들도 디버깅
          if ((name?.includes('광역') || name?.includes('경상남도사회서비스원')) && !hasBasicCompleted && !hasAdvancedCompleted) {
            console.log(`  ❌ 미수료자: ${participant.name} - basic: "${participant.basicEducationStatus || participant.basicTraining || 'null'}", advanced: "${participant.advancedEducationStatus || participant.advancedEducation || 'null'}"`);
          }
        });

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const basicCompletionRate = basicTotal > 0 ? Math.round((basicCompleted / basicTotal) * 100) : 0;
        const advancedCompletionRate = advancedTotal > 0 ? Math.round((advancedCompleted / advancedTotal) * 100) : 0;
        
        // 광역지원기관 및 우리들노인통합지원센터 최종 결과 디버깅
        if (name?.includes('광역') || name?.includes('경상남도사회서비스원') || 
            name?.includes('우리들') || name?.includes('노인통합지원센터')) {
          console.log(`📊 [${name}] 최종 통계:`);
          console.log(`- 전체: ${total}명, 수료: ${completed}명, 수료율: ${completionRate}%`);
          console.log(`- 기본교육: ${basicCompleted}/${basicTotal} (${basicCompletionRate}%)`);
          console.log(`- 심화교육: ${advancedCompleted}/${advancedTotal} (${advancedCompletionRate}%)`);
          
          if (completionRate < 20) {
            console.log('⚠️ 수료율이 비정상적으로 낮습니다. 데이터 확인 필요!');
          }
        }

        return {
          name,
          district,
          total,
          completed,
          basic: { total: basicTotal, completed: basicCompleted },
          advanced: { total: advancedTotal, completed: advancedCompleted },
          jobTypes: jobTypeStats,
          completionRate,
          basicCompletionRate,
          advancedCompletionRate,
          size: total < 10 ? 'small' : total < 50 ? 'medium' : 'large',
          isExcellent: total > 0 && completionRate >= criteriaRate
        };
      });
  }, [participantBasedStats]);

  const [performanceCriteria, setPerformanceCriteria] = useState(80);
  const [includeRetired, setIncludeRetired] = useState(false);
  
  // 퇴직자 필터링 함수 - useCallback으로 최적화
  const filterByRetirement = useCallback((data: any[]) => {
    if (includeRetired) {
      return data; // 퇴직자 포함
    }
    
    // 퇴직자 제외 시에만 종사자 데이터와 매칭하여 필터링
    const filtered = data.filter(item => {
      // 종사자 데이터가 없으면 모든 데이터 포함 (교육 데이터만 있는 경우)
      if (!employeeData || employeeData.length === 0) {
        return true;
      }
      
      const employee = employeeData.find(e => e.id === item.id);
      
      // ID로 매칭되지 않으면 이름으로 매칭 시도
      if (!employee) {
        const employeeByName = employeeData.find(e => e.name === item.name);
        if (!employeeByName) {
          // 매칭되지 않으면 포함 (종사자 목록에 없어도 교육은 받을 수 있음)
          return true;
        }
        
        // 이름으로 매칭된 경우 퇴직 여부 확인
        return employeeByName.isActive;
      }
      
      // ID로 매칭된 경우 퇴직 여부 확인 (isActive가 false이면 퇴직자)
      return employee.isActive;
    });
    
    return filtered;
  }, [includeRetired, employeeData]);

  // 디버깅 정보 - useMemo로 최적화
  const debugInfo = useMemo(() => ({
    totalBasicEducation: basicEducationData.length,
    totalAdvancedEducation: advancedEducationData.length,
    totalParticipants: participantData.length,
    totalEmployees: employeeData.length,
    filteredBasic: filterByRetirement(basicEducationData).length,
    filteredAdvanced: filterByRetirement(advancedEducationData).length,
    matchedBasic: basicEducationData.filter(item => 
      employeeData.find(e => e.id === item.id || e.name === item.name)
    ).length,
    retiredEmployees: employeeData.filter(e => !e.isActive).length,
    activeEmployees: employeeData.filter(e => e.isActive).length
  }), [basicEducationData, advancedEducationData, participantData, employeeData, filterByRetirement]);

  // 계산 결과들을 useMemo로 최적화
  const basicJobStats = useMemo(() => getJobTypeStats('basic'), [getJobTypeStats]);
  const advancedJobStats = useMemo(() => getJobTypeStats('advanced'), [getJobTypeStats]);
  const institutionPerformance = useMemo(() => getInstitutionPerformance(performanceCriteria), [getInstitutionPerformance, performanceCriteria]);
  
  const excellentInstitutions = useMemo(() => institutionPerformance.filter(inst => inst.isExcellent), [institutionPerformance]);
  const improvementNeeded = useMemo(() => institutionPerformance.filter(inst => !inst.isExcellent && inst.total > 0), [institutionPerformance]);

  // 배움터 등록기준 분석 함수 (재직자만) - useMemo로 최적화
  const getLearningPlatformStats = useMemo(() => {
    const { institutionData } = useEmployeeStore.getState();
    
    // 🎯 통일된 활성 참가자 데이터 사용 (다른 분석과 동일)
    const activeParticipants = participantBasedStats.activeParticipants || [];
    
    // 기관별 분석 데이터 생성
    const institutionStats = (institutionData || []).map(institution => {
      // 해당 기관의 재직 참가자 데이터 필터링
      const institutionParticipants = activeParticipants.filter(p => 
        p.institution?.includes(institution.name) ||
        p.institutionCode === institution.code ||
        p.institution === institution.name
      );
      
      // 광역지원기관 특별 처리 (중복 제거)
      const uniqueParticipants = institutionParticipants.filter((participant, index, self) => {
        // 이름과 주민번호로 중복 체크
        return index === self.findIndex(p => 
          p.name === participant.name && 
          (p.residentId === participant.residentId || (!p.residentId && !participant.residentId))
        );
      });
      
      // 직무별 대상인원 (배움터 등록기준) - 중복 제거된 데이터 사용
      const targetSocial = uniqueParticipants.filter(p => 
        p.jobType?.includes('전담') || p.jobType === '전담사회복지사'
      ).length;
      const targetLife = uniqueParticipants.filter(p => 
        p.jobType?.includes('생활지원') || p.jobType === '생활지원사'
      ).length;
      
      // 전체 대상인원은 전담사회복지사 + 생활지원사의 합
      const targetTotal = targetSocial + targetLife;
      
      // 교육 이수인원 (배움터 등록기준) - 중복 제거된 데이터 사용
      // 광역지원기관 디버깅
      if (institution.name?.includes('광역') || institution.code === 'A48000002') {
        console.log(`🔍 [${institution.name}] 이수인원 계산 디버깅:`);
        console.log('- 참가자 데이터:', uniqueParticipants);
        uniqueParticipants.forEach(p => {
          console.log(`  - ${p.name}: basicTraining=${p.basicTraining}, finalCompletion=${p.finalCompletion}, status=${p.status}`);
        });
      }
      
      // 🎯 통일된 수료 판정 함수 - 기관성과 분석과 동일하게
      const isCompleted = (participant: any) => {
        // 기본교육 수료 확인
        const hasBasicCompleted = 
          participant.basicEducationStatus === '수료' || 
          participant.basicEducationStatus === '완료' ||
          participant.basicTraining === '수료' ||
          participant.basicTraining === '완료';
        
        // 심화교육 수료 확인  
        const hasAdvancedCompleted = 
          participant.advancedEducationStatus === '수료' || 
          participant.advancedEducationStatus === '완료' ||
          participant.advancedEducation === '수료' ||
          participant.advancedEducation === '완료';
        
        // 기본교육 또는 심화교육 중 하나라도 수료하면 완료로 간주
        return hasBasicCompleted || hasAdvancedCompleted;
      };
      
      const completedTotal = uniqueParticipants.filter(isCompleted).length;
      const completedSocial = uniqueParticipants.filter(p => 
        isCompleted(p) && (p.jobType?.includes('전담') || p.jobType === '전담사회복지사')
      ).length;
      const completedLife = uniqueParticipants.filter(p => 
        isCompleted(p) && (p.jobType?.includes('생활지원') || p.jobType === '생활지원사')
      ).length;
      
      // 이수율 계산
      const rateTotal = targetTotal > 0 ? Math.round((completedTotal / targetTotal) * 100 * 10) / 10 : 0;
      const rateSocial = targetSocial > 0 ? Math.round((completedSocial / targetSocial) * 100 * 10) / 10 : 0;
      const rateLife = targetLife > 0 ? Math.round((completedLife / targetLife) * 100 * 10) / 10 : 0;
      
      return {
        institutionCode: institution.code,
        institutionName: institution.name,
        district: institution.district || institution.region,
        // 대상인원
        targetTotal,
        targetSocial,
        targetLife,
        // 이수인원
        completedTotal,
        completedSocial,
        completedLife,
        // 이수율
        rateTotal,
        rateSocial,
        rateLife
      };
    }).filter(inst => inst.targetTotal > 0); // 대상인원이 있는 기관만
    
    return institutionStats;
  }, [participantBasedStats]);

  const learningPlatformStats = getLearningPlatformStats;

  // 파이 차트 색상 정의
  const COLORS = {
    complete: '#22c55e',    // 초록색 - 완전수료
    partial: '#f59e0b',     // 주황색 - 부분수료  
    inProgress: '#3b82f6',  // 파란색 - 진행중
    none: '#ef4444'         // 빨간색 - 미수료
  };

  // 소속회원 기준 수료 현황 데이터
  const completionData = [
    { name: '완전수료', value: participantBasedStats.stats.complete, color: COLORS.complete },
    { name: '부분수료', value: participantBasedStats.stats.partial, color: COLORS.partial },
    { name: '진행중', value: participantBasedStats.stats.inProgress, color: COLORS.inProgress },
    { name: '미수료', value: participantBasedStats.stats.none, color: COLORS.none },
  ];

  // 소속회원 기준 과정별 통계 데이터 (기본교육)
  const basicCourseData = useMemo(() => {
    if (!participantBasedStats.activeParticipants || participantBasedStats.activeParticipants.length === 0) {
      return [];
    }
    
    // 소속회원들의 기본교육 과정별 통계 생성
    const courseStats = participantBasedStats.activeParticipants.reduce((acc, participant) => {
      const course = participant.basicCourse || '기본교육 과정';
      if (!acc[course]) {
        acc[course] = { total: 0, completed: 0 };
      }
      acc[course].total++;
      if (participant.basicEducationStatus === '수료' || participant.basicEducationStatus === '완료' ||
          participant.basicTraining === '수료' || participant.basicTraining === '완료') {
        acc[course].completed++;
      }
      return acc;
    }, {} as Record<string, {total: number, completed: number}>);
    
    return Object.entries(courseStats).map(([course, stats]) => ({
      course,
      participants: stats.total,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));
  }, [participantBasedStats]);

  // 소속회원 기준 과정별 통계 데이터 (심화교육)
  const advancedCourseData = useMemo(() => {
    if (!participantBasedStats.activeParticipants || participantBasedStats.activeParticipants.length === 0) {
      return [];
    }
    
    // 소속회원들의 심화교육 과정별 통계 생성
    const courseStats = participantBasedStats.activeParticipants.reduce((acc, participant) => {
      const course = participant.advancedCourse || '심화교육 과정';
      if (!acc[course]) {
        acc[course] = { total: 0, completed: 0 };
      }
      acc[course].total++;
      if (participant.advancedEducationStatus === '수료' || participant.advancedEducationStatus === '완료' ||
          participant.advancedEducation === '수료' || participant.advancedEducation === '완료') {
        acc[course].completed++;
      }
      return acc;
    }, {} as Record<string, {total: number, completed: number}>);
    
    return Object.entries(courseStats).map(([course, stats]) => ({
      course,
      participants: stats.total,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));
  }, [participantBasedStats]);

  // 소속회원 기준 교육 유형별 비교 데이터
  const comparisonData = useMemo(() => {
    const basicCompleted = participantBasedStats.activeParticipants.filter(p =>
      p.basicEducationStatus === '수료' || p.basicEducationStatus === '완료' ||
      p.basicTraining === '수료' || p.basicTraining === '완료'
    ).length;
    
    const advancedCompleted = participantBasedStats.activeParticipants.filter(p =>
      p.advancedEducationStatus === '수료' || p.advancedEducationStatus === '완료' ||
      p.advancedEducation === '수료' || p.advancedEducation === '완료'
    ).length;
    
    const basicRate = participantBasedStats.stats.total > 0 ? Math.round((basicCompleted / participantBasedStats.stats.total) * 100) : 0;
    const advancedRate = participantBasedStats.stats.total > 0 ? Math.round((advancedCompleted / participantBasedStats.stats.total) * 100) : 0;
    
    return [
      {
        type: '기본교육',
        total: participantBasedStats.stats.total,
        completed: basicCompleted,
        rate: basicRate
      },
      {
        type: '심화교육', 
        total: participantBasedStats.stats.total,
        completed: advancedCompleted,
        rate: advancedRate
      }
    ];
  }, [participantBasedStats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">교육 통계 현황</h1>
          <p className="text-gray-600">교육 데이터 분석 및 수료 현황 통계</p>
        </div>

        {/* 필터 옵션 */}
        <Card>
          <CardHeader>
            <CardTitle>통계 필터 설정</CardTitle>
            <CardDescription>통계 계산에 적용할 필터 옵션을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label htmlFor="includeRetired" className="text-sm font-medium">퇴직자 포함:</label>
                <input
                  id="includeRetired"
                  type="checkbox"
                  checked={includeRetired}
                  onChange={(e) => setIncludeRetired(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  {includeRetired ? '퇴직자도 통계에 포함' : '현직자만 통계에 포함'}
                </span>
              </div>
              <div className="text-sm text-gray-400 border-l pl-4">
                퇴직자: 퇴사일이 있거나 상태가 "중지"인 회원
              </div>
              <div className="text-xs text-gray-500 border-l pl-4 ml-4">
                <div>기본교육: {debugInfo.totalBasicEducation}건 → {debugInfo.filteredBasic}건</div>
                <div>심화교육: {debugInfo.totalAdvancedEducation}건 → {debugInfo.filteredAdvanced}건</div>
                <div>소속회원: {debugInfo.totalParticipants}명</div>
                <div>종사자: {debugInfo.totalEmployees}명 (퇴직자 {debugInfo.retiredEmployees}명, 재직자 {debugInfo.activeEmployees}명)</div>
                <div>매칭률: {debugInfo.totalBasicEducation > 0 ? Math.round((debugInfo.matchedBasic / debugInfo.totalBasicEducation) * 100) : 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 전체 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 참여자</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participantBasedStats.stats.total}명
              </div>
              <p className="text-xs text-blue-100">
                소속회원 기준 재직자 ('정상' 상태만)
              </p>
              <p className="text-xs text-blue-200 mt-1">
                전체: {participantBasedStats.totalCount}명 → 재직자: {participantBasedStats.stats.total}명
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">기본교육 수료자</CardTitle>
              <CheckCircle2 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const basicCompleted = participantBasedStats.activeParticipants.filter(p =>
                    p.basicEducationStatus === '수료' || 
                    p.basicEducationStatus === '완료' ||
                    p.basicTraining === '수료' ||
                    p.basicTraining === '완료'
                  ).length;
                  return basicCompleted;
                })()}명
              </div>
              <p className="text-xs text-green-100">
                기본교육 수료율: {participantBasedStats.stats.total > 0 ? 
                  Math.round((participantBasedStats.activeParticipants.filter(p =>
                    p.basicEducationStatus === '수료' || 
                    p.basicEducationStatus === '완료' ||
                    p.basicTraining === '수료' ||
                    p.basicTraining === '완료'
                  ).length / participantBasedStats.stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">심화교육 수료자</CardTitle>
              <Award className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const advancedCompleted = participantBasedStats.activeParticipants.filter(p =>
                    p.advancedEducationStatus === '수료' || 
                    p.advancedEducationStatus === '완료' ||
                    p.advancedEducation === '수료' ||
                    p.advancedEducation === '완료'
                  ).length;
                  return advancedCompleted;
                })()}명
              </div>
              <p className="text-xs text-purple-100">
                심화교육 수료율: {participantBasedStats.stats.total > 0 ? 
                  Math.round((participantBasedStats.activeParticipants.filter(p =>
                    p.advancedEducationStatus === '수료' || 
                    p.advancedEducationStatus === '완료' ||
                    p.advancedEducation === '수료' ||
                    p.advancedEducation === '완료'
                  ).length / participantBasedStats.stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 수료율</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  // 소속회원 기준 전체 수료율 계산 (기본교육 또는 심화교육 중 하나라도 수료한 경우)
                  if (participantBasedStats.stats.total === 0) return 0;
                  
                  const anyEducationCompleted = participantBasedStats.activeParticipants.filter(p => {
                    const basicCompleted = p.basicEducationStatus === '수료' || 
                                          p.basicEducationStatus === '완료' ||
                                          p.basicTraining === '수료' ||
                                          p.basicTraining === '완료';
                    const advancedCompleted = p.advancedEducationStatus === '수료' || 
                                             p.advancedEducationStatus === '완료' ||
                                             p.advancedEducation === '수료' ||
                                             p.advancedEducation === '완료';
                    return basicCompleted || advancedCompleted;
                  }).length;
                  
                  return Math.round((anyEducationCompleted / participantBasedStats.stats.total) * 100);
                })()}%
              </div>
              <p className="text-xs text-indigo-100">
                소속회원 기준 전체 수료율 (기본 또는 심화 중 1개 이상)
              </p>
              <p className="text-xs text-indigo-200 mt-1">
                대상: {participantBasedStats.stats.total}명 ('정상' 상태 재직자만)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 교육별 상세 통계 (소속회원 기준) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                기본교육 현황
              </CardTitle>
              <CardDescription>소속회원 기준 기본교육 참여 및 수료 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 대상자</span>
                  <Badge variant="outline">{participantBasedStats.stats.total}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료자</span>
                  <Badge className="bg-green-100 text-green-800">
                    {(() => {
                      const basicCompleted = participantBasedStats.activeParticipants.filter(p =>
                        p.basicEducationStatus === '수료' || 
                        p.basicEducationStatus === '완료' ||
                        p.basicTraining === '수료' ||
                        p.basicTraining === '완료'
                      ).length;
                      return basicCompleted;
                    })()}명
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료율</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {participantBasedStats.stats.total > 0 ? 
                      Math.round((participantBasedStats.activeParticipants.filter(p =>
                        p.basicEducationStatus === '수료' || 
                        p.basicEducationStatus === '완료' ||
                        p.basicTraining === '수료' ||
                        p.basicTraining === '완료'
                      ).length / participantBasedStats.stats.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                심화교육 현황
              </CardTitle>
              <CardDescription>소속회원 기준 심화교육 참여 및 수료 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 대상자</span>
                  <Badge variant="outline">{participantBasedStats.stats.total}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료자</span>
                  <Badge className="bg-green-100 text-green-800">
                    {(() => {
                      const advancedCompleted = participantBasedStats.activeParticipants.filter(p =>
                        p.advancedEducationStatus === '수료' || 
                        p.advancedEducationStatus === '완료' ||
                        p.advancedEducation === '수료' ||
                        p.advancedEducation === '완료'
                      ).length;
                      return advancedCompleted;
                    })()}명
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료율</span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {participantBasedStats.stats.total > 0 ? 
                      Math.round((participantBasedStats.activeParticipants.filter(p =>
                        p.advancedEducationStatus === '수료' || 
                        p.advancedEducationStatus === '완료' ||
                        p.advancedEducation === '수료' ||
                        p.advancedEducation === '완료'
                      ).length / participantBasedStats.stats.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 섹션 */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">전체 현황</TabsTrigger>
            <TabsTrigger value="jobtype">직군별</TabsTrigger>
            <TabsTrigger value="institutions">기관 성과</TabsTrigger>
            <TabsTrigger value="basic">기본교육</TabsTrigger>
            <TabsTrigger value="advanced">심화교육</TabsTrigger>
            <TabsTrigger value="comparison">비교분석</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>전체 수료 현황</CardTitle>
                <CardDescription>소속 회원들의 교육 수료 현황 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {completionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobtype" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>기본교육 직군별 현황</CardTitle>
                  <CardDescription>전담사회복지사 vs 생활지원사 기본교육 통계</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {basicJobStats.map((stat, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-lg">{stat.jobType}</h4>
                          <Badge className={stat.completionRate >= 80 ? "bg-green-100 text-green-800" : 
                                         stat.completionRate >= 60 ? "bg-yellow-100 text-yellow-800" : 
                                         "bg-red-100 text-red-800"}>
                            {stat.completionRate}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">총 참여자:</span>
                            <span className="font-medium ml-2">{stat.total}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">수료자:</span>
                            <span className="font-medium ml-2 text-green-600">{stat.completed}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">진행중:</span>
                            <span className="font-medium ml-2 text-blue-600">{stat.inProgress}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">수강취소:</span>
                            <span className="font-medium ml-2 text-red-600">{stat.cancelled}명</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>심화교육 직군별 현황</CardTitle>
                  <CardDescription>전담사회복지사 vs 생활지원사 심화교육 통계</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {advancedJobStats.map((stat, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-lg">{stat.jobType}</h4>
                          <Badge className={stat.completionRate >= 80 ? "bg-green-100 text-green-800" : 
                                         stat.completionRate >= 60 ? "bg-yellow-100 text-yellow-800" : 
                                         "bg-red-100 text-red-800"}>
                            {stat.completionRate}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">총 참여자:</span>
                            <span className="font-medium ml-2">{stat.total}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">수료자:</span>
                            <span className="font-medium ml-2 text-green-600">{stat.completed}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">진행중:</span>
                            <span className="font-medium ml-2 text-blue-600">{stat.inProgress}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">수강취소:</span>
                            <span className="font-medium ml-2 text-red-600">{stat.cancelled}명</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 직군별 비교 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>직군별 교육 참여 비교</CardTitle>
                <CardDescription>전담사회복지사와 생활지원사의 기본/심화 교육 참여 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...basicJobStats.map(s => ({...s, type: '기본교육'})), ...advancedJobStats.map(s => ({...s, type: '심화교육'}))]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jobType" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#64748b" name="총 참여자" />
                      <Bar dataKey="completed" fill="#22c55e" name="수료자" />
                      <Bar dataKey="completionRate" fill="#f59e0b" name="수료율 (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="institutions" className="space-y-6">
            {/* 성과 기준 설정 */}
            <Card>
              <CardHeader>
                <CardTitle>기관 성과 분석 기준 설정</CardTitle>
                <CardDescription>
                  우수 기관과 개선 필요 기관을 구분할 수료율 기준을 설정하세요
                  <br />
                  <span className="text-amber-600 text-sm">
                    ⚠️ 폐지/종료된 기관은 자동으로 제외됩니다
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <label htmlFor="criteria" className="text-sm font-medium">수료율 기준:</label>
                  <input
                    id="criteria"
                    type="number"
                    min="0"
                    max="100"
                    value={performanceCriteria}
                    onChange={(e) => setPerformanceCriteria(Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-center"
                  />
                  <span className="text-sm text-gray-500">% 이상</span>
                  <div className="ml-4 text-sm">
                    <span className="text-green-600 font-medium">우수: {excellentInstitutions.length}개 기관</span>
                    <span className="mx-2">|</span>
                    <span className="text-orange-600 font-medium">개선필요: {improvementNeeded.length}개 기관</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 우수 기관 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">🏆 우수 기관 ({excellentInstitutions.length}개)</CardTitle>
                  <CardDescription>수료율 {performanceCriteria}% 이상 달성 기관</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {excellentInstitutions.map((inst, index) => (
                      <div 
                        key={index} 
                        className="border border-green-200 rounded-lg p-3 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => setSelectedInstitution(inst.name)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{inst.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              {inst.completionRate}%
                            </Badge>
                            <span className="text-xs text-blue-600 font-medium">상세보기 ›</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>📍 {inst.district} | 규모: {inst.size === 'small' ? '소규모' : inst.size === 'medium' ? '중규모' : '대규모'}</div>
                          <div>총 {inst.total}명 참여 | 수료 {inst.completed}명</div>
                          <div>기본교육: {inst.basicCompletionRate}% | 심화교육: {inst.advancedCompletionRate}%</div>
                        </div>
                      </div>
                    ))}
                    {excellentInstitutions.length === 0 && (
                      <p className="text-center text-gray-500 py-8">기준을 만족하는 기관이 없습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 개선 필요 기관 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">📈 개선 필요 기관 ({improvementNeeded.length}개)</CardTitle>
                  <CardDescription>수료율 {performanceCriteria}% 미만 기관</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {improvementNeeded.map((inst, index) => (
                      <div 
                        key={index} 
                        className="border border-orange-200 rounded-lg p-3 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => setSelectedInstitution(inst.name)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{inst.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-800">
                              {inst.completionRate}%
                            </Badge>
                            <span className="text-xs text-blue-600 font-medium">상세보기 ›</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>📍 {inst.district} | 규모: {inst.size === 'small' ? '소규모' : inst.size === 'medium' ? '중규모' : '대규모'}</div>
                          <div>총 {inst.total}명 참여 | 수료 {inst.completed}명</div>
                          <div>기본교육: {inst.basicCompletionRate}% | 심화교육: {inst.advancedCompletionRate}%</div>
                        </div>
                      </div>
                    ))}
                    {improvementNeeded.length === 0 && (
                      <p className="text-center text-gray-500 py-8">개선이 필요한 기관이 없습니다.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 선택된 기관 상세 정보 */}
            {selectedInstitution && (() => {
              const employeeDetails = getInstitutionEmployeeDetails(selectedInstitution);
              const completedEmployees = employeeDetails.filter(emp => emp.isFullyCompleted);
              const basicOnlyEmployees = employeeDetails.filter(emp => emp.basicEducationStatus === '수료' && emp.advancedEducationStatus !== '수료');
              const advancedOnlyEmployees = employeeDetails.filter(emp => emp.advancedEducationStatus === '수료' && emp.basicEducationStatus !== '수료');
              const noEducationEmployees = employeeDetails.filter(emp => emp.basicEducationStatus === '미이수' && emp.advancedEducationStatus === '미이수');
              
              return (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-blue-800">🔍 {selectedInstitution} - 상세 현황</CardTitle>
                        <CardDescription>소속 회원 {employeeDetails.length}명의 교육 이수 현황</CardDescription>
                      </div>
                      <button
                        onClick={() => setSelectedInstitution(null)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        ✕ 닫기
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 요약 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-green-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-800">{completedEmployees.length}</div>
                        <div className="text-sm text-green-600">완전이수</div>
                        <div className="text-xs text-gray-500">(기초+심화)</div>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-800">{basicOnlyEmployees.length}</div>
                        <div className="text-sm text-blue-600">기초만</div>
                        <div className="text-xs text-gray-500">(심화 미이수)</div>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-800">{advancedOnlyEmployees.length}</div>
                        <div className="text-sm text-purple-600">심화만</div>
                        <div className="text-xs text-gray-500">(기초 미이수)</div>
                      </div>
                      <div className="bg-red-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-800">{noEducationEmployees.length}</div>
                        <div className="text-sm text-red-600">미이수</div>
                        <div className="text-xs text-gray-500">(교육 없음)</div>
                      </div>
                    </div>
                    
                    {/* 직원 목록 */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800">소속 회원 목록</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="grid gap-2">
                          {employeeDetails.map((employee, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-lg border ${
                                employee.isFullyCompleted 
                                  ? 'bg-green-50 border-green-200' 
                                  : employee.basicEducationStatus === '수료' || employee.advancedEducationStatus === '수료'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {employee.jobType} | 입사: {employee.hireDate || '미등록'}
                                    {employee.resignDate && ` | 퇴사: ${employee.resignDate}`}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Badge 
                                    className={`text-xs ${
                                      employee.basicEducationStatus === '수료' 
                                        ? 'bg-green-100 text-green-800' 
                                        : employee.basicEducationStatus === '미이수'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    기초: {employee.basicEducationStatus}
                                  </Badge>
                                  <Badge 
                                    className={`text-xs ${
                                      employee.advancedEducationStatus === '수료' 
                                        ? 'bg-green-100 text-green-800' 
                                        : employee.advancedEducationStatus === '미이수'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    심화: {employee.advancedEducationStatus}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* 기관 규모별 효율성 */}
            <Card>
              <CardHeader>
                <CardTitle>기관 규모별 교육 효율성</CardTitle>
                <CardDescription>소규모(10명 미만) vs 중규모(10-50명) vs 대규모(50명 이상)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      ['small', 'medium', 'large'].map(size => {
                        const institutions = institutionPerformance.filter(inst => inst.size === size);
                        const avgRate = institutions.length > 0 
                          ? Math.round(institutions.reduce((sum, inst) => sum + inst.completionRate, 0) / institutions.length)
                          : 0;
                        return {
                          size: size === 'small' ? '소규모' : size === 'medium' ? '중규모' : '대규모',
                          count: institutions.length,
                          avgCompletionRate: avgRate,
                          totalParticipants: institutions.reduce((sum, inst) => sum + inst.total, 0)
                        };
                      })
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="size" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#64748b" name="기관 수" />
                      <Bar dataKey="avgCompletionRate" fill="#22c55e" name="평균 수료율 (%)" />
                      <Bar dataKey="totalParticipants" fill="#3b82f6" name="총 참여자" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 배움터 등록기준 분석 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  배움터 등록기준 직무교육 분석
                </CardTitle>
                <CardDescription>각 기관별 배움터 등록자 기준 직무교육 대상인원, 이수인원, 이수율 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 요약 통계 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">총 기관 수</div>
                      <div className="text-2xl font-bold text-blue-700">{learningPlatformStats.length}</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">총 대상인원</div>
                      <div className="text-2xl font-bold text-green-700">
                        {learningPlatformStats.reduce((sum, inst) => sum + inst.targetTotal, 0)}명
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">총 이수인원</div>
                      <div className="text-2xl font-bold text-purple-700">
                        {learningPlatformStats.reduce((sum, inst) => sum + inst.completedTotal, 0)}명
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="text-sm text-orange-600 font-medium">전체 이수율</div>
                      <div className="text-2xl font-bold text-orange-700">
                        {learningPlatformStats.length > 0 ? 
                          Math.round(learningPlatformStats.reduce((sum, inst) => sum + inst.rateTotal, 0) / learningPlatformStats.length * 10) / 10 
                          : 0}%
                      </div>
                    </div>
                  </div>

                  {/* 기관별 상세 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">기관명</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">지역</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전체<br/>대상인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전담사회복지사<br/>대상인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">생활지원사<br/>대상인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전체<br/>이수인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전담사회복지사<br/>이수인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">생활지원사<br/>이수인원</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전체<br/>이수율</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">전담사회복지사<br/>이수율</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-b">생활지원사<br/>이수율</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {learningPlatformStats
                          .sort((a, b) => b.rateTotal - a.rateTotal)
                          .map((inst, index) => (
                          <tr key={inst.institutionCode} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{inst.institutionName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{inst.district}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium">{inst.targetTotal}</td>
                            <td className="px-4 py-3 text-sm text-center">{inst.targetSocial}</td>
                            <td className="px-4 py-3 text-sm text-center">{inst.targetLife}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-green-600">{inst.completedTotal}</td>
                            <td className="px-4 py-3 text-sm text-center text-green-600">{inst.completedSocial}</td>
                            <td className="px-4 py-3 text-sm text-center text-green-600">{inst.completedLife}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <Badge variant={inst.rateTotal >= 80 ? "default" : inst.rateTotal >= 60 ? "secondary" : "destructive"}>
                                {inst.rateTotal}%
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <Badge variant={inst.rateSocial >= 80 ? "default" : inst.rateSocial >= 60 ? "secondary" : "destructive"}>
                                {inst.rateSocial}%
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <Badge variant={inst.rateLife >= 80 ? "default" : inst.rateLife >= 60 ? "secondary" : "destructive"}>
                                {inst.rateLife}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 차트 */}
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={learningPlatformStats.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="institutionName" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={10}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="targetTotal" fill="#3b82f6" name="대상인원" />
                        <Bar dataKey="completedTotal" fill="#22c55e" name="이수인원" />
                        <Bar dataKey="rateTotal" fill="#f59e0b" name="이수율(%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="basic" className="space-y-6">
            {basicCourseData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>기본교육 과정별 현황</CardTitle>
                  <CardDescription>과정별 참여자 수 및 수료율</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={basicCourseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="participants" fill="#3b82f6" name="참여자 수" />
                        <Bar dataKey="completionRate" fill="#22c55e" name="수료율 (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">기본교육 데이터가 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {advancedCourseData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>심화교육 과정별 현황</CardTitle>
                  <CardDescription>과정별 참여자 수 및 수료율</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={advancedCourseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="participants" fill="#8b5cf6" name="참여자 수" />
                        <Bar dataKey="completionRate" fill="#22c55e" name="수료율 (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">심화교육 데이터가 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>기본교육 vs 심화교육 비교</CardTitle>
                <CardDescription>교육 유형별 참여자 및 수료율 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#64748b" name="전체 참여자" />
                      <Bar dataKey="completed" fill="#22c55e" name="수료자" />
                      <Bar dataKey="rate" fill="#f59e0b" name="수료율 (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 최근 수료 현황 */}
        {participantStatuses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>최근 수료 현황</CardTitle>
              <CardDescription>최근 교육을 완료한 참여자들</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {participantStatuses
                  .filter(p => p.overallStatus === 'complete' || p.overallStatus === 'partial')
                  .slice(0, 10)
                  .map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.overallStatus === 'complete' ? 'bg-green-500' : 'bg-orange-500'
                        }`} />
                        <div>
                          <p className="font-medium">{participant.participant.name}</p>
                          <p className="text-sm text-gray-500">{participant.participant.institution}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={participant.overallStatus === 'complete' ? 'default' : 'secondary'}>
                          {participant.overallStatus === 'complete' ? '완전수료' : '부분수료'}
                        </Badge>
                        {participant.lastUpdated && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(participant.lastUpdated).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}