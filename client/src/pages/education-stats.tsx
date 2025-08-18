import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEducationStore } from "@/store/education-store";
import { useEmployeeStore } from "@/store/employee-store";
import { BookOpen, GraduationCap, TrendingUp, Users, Award, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

export default function EducationStatsPage() {
  const { 
    basicEducationData, 
    advancedEducationData, 
    participantData,
    getEducationStats,
    getEducationSummaryStats,
    getParticipantEducationStatus
  } = useEducationStore();

  const { employeeData } = useEmployeeStore();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // 페이지가 로드될 때마다 새로고침
    setRefreshKey(prev => prev + 1);
  }, [basicEducationData, advancedEducationData, participantData]);

  const educationStats = getEducationStats();
  const summaryStats = getEducationSummaryStats();
  const participantStatuses = getParticipantEducationStatus();

  // 직군별 통계 계산 (중복 제거)
  const getJobTypeStats = (educationType: 'basic' | 'advanced') => {
    const rawData = educationType === 'basic' ? basicEducationData : advancedEducationData;
    const data = filterByRetirement(rawData);
    
    // 직군별로 그룹화
    const jobTypeGroups = data.reduce((acc, item) => {
      const jobType = item.jobType || '기타';
      if (!acc[jobType]) {
        acc[jobType] = [];
      }
      acc[jobType].push(item);
      return acc;
    }, {} as Record<string, typeof data>);

    // 각 직군별로 고유한 사람 기준으로 통계 계산
    return Object.entries(jobTypeGroups).map(([jobType, items]) => {
      // 동일한 사람(이름+ID)으로 그룹화
      const personGroups = items.reduce((acc, item) => {
        const personKey = `${item.name}_${item.id}`;
        if (!acc[personKey]) {
          acc[personKey] = {
            person: { name: item.name, id: item.id, jobType: item.jobType },
            courses: []
          };
        }
        acc[personKey].courses.push(item);
        return acc;
      }, {} as Record<string, { person: any; courses: typeof items }>);

      const uniquePersons = Object.values(personGroups);
      const total = uniquePersons.length;

      // 각 사람별로 수료 상태 판단
      const personStats = uniquePersons.map(({ courses }) => {
        const hasCompleted = courses.some(course => course.status === '수료');
        const hasCancelled = courses.some(course => course.rawStatus === '수강취소');
        const hasInProgress = courses.some(course => course.rawStatus === '정상' && course.status !== '수료');
        
        return {
          isCompleted: hasCompleted,
          isCancelled: hasCancelled && !hasCompleted,
          isInProgress: hasInProgress && !hasCompleted
        };
      });

      const completed = personStats.filter(p => p.isCompleted).length;
      const cancelled = personStats.filter(p => p.isCancelled).length;
      const inProgress = personStats.filter(p => p.isInProgress).length;

      return {
        jobType,
        total,
        completed,
        inProgress,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
  };

  // 기관별 성과 분석 (중복 제거)
  const getInstitutionPerformance = (criteriaRate: number = 80) => {
    const rawAllData = [...basicEducationData, ...advancedEducationData];
    const allData = filterByRetirement(rawAllData);
    
    // 기관별로 그룹화
    const institutionGroups = allData.reduce((acc, item) => {
      const institution = item.institution;
      if (!acc[institution]) {
        acc[institution] = {
          name: institution,
          district: item.district,
          items: []
        };
      }
      acc[institution].items.push(item);
      return acc;
    }, {} as Record<string, { name: string; district: string; items: typeof allData }>);

    return Object.values(institutionGroups).map(({ name, district, items }) => {
      // 동일한 사람(이름+ID)으로 그룹화
      const personGroups = items.reduce((acc, item) => {
        const personKey = `${item.name}_${item.id}`;
        if (!acc[personKey]) {
          acc[personKey] = {
            person: { name: item.name, id: item.id, jobType: item.jobType },
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
      }, {} as Record<string, { person: any; basicCourses: typeof items; advancedCourses: typeof items }>);

      const uniquePersons = Object.values(personGroups);
      const total = uniquePersons.length;

      // 사람별 수료 상태 계산
      let completed = 0;
      let basicCompleted = 0;
      let advancedCompleted = 0;
      let basicTotal = 0;
      let advancedTotal = 0;

      const jobTypeStats = {} as Record<string, { total: number; completed: number }>;

      uniquePersons.forEach(({ person, basicCourses, advancedCourses }) => {
        const jobType = person.jobType || '기타';
        if (!jobTypeStats[jobType]) {
          jobTypeStats[jobType] = { total: 0, completed: 0 };
        }
        jobTypeStats[jobType].total++;

        const hasBasicCompleted = basicCourses.some(course => course.status === '수료');
        const hasAdvancedCompleted = advancedCourses.some(course => course.status === '수료');
        
        if (basicCourses.length > 0) {
          basicTotal++;
          if (hasBasicCompleted) {
            basicCompleted++;
          }
        }
        
        if (advancedCourses.length > 0) {
          advancedTotal++;
          if (hasAdvancedCompleted) {
            advancedCompleted++;
          }
        }

        // 전체 수료 여부 (기본 또는 심화 중 하나라도 수료)
        if (hasBasicCompleted || hasAdvancedCompleted) {
          completed++;
          jobTypeStats[jobType].completed++;
        }
      });

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const basicCompletionRate = basicTotal > 0 ? Math.round((basicCompleted / basicTotal) * 100) : 0;
      const advancedCompletionRate = advancedTotal > 0 ? Math.round((advancedCompleted / advancedTotal) * 100) : 0;

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
  };

  const [performanceCriteria, setPerformanceCriteria] = useState(80);
  const [includeRetired, setIncludeRetired] = useState(false);
  
  // 퇴직자 필터링 함수
  const filterByRetirement = (data: any[]) => {
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
  };

  // 디버깅 정보
  const debugInfo = {
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
  };

  const basicJobStats = getJobTypeStats('basic');
  const advancedJobStats = getJobTypeStats('advanced');
  const institutionPerformance = getInstitutionPerformance(performanceCriteria);
  
  const excellentInstitutions = institutionPerformance.filter(inst => inst.isExcellent);
  const improvementNeeded = institutionPerformance.filter(inst => !inst.isExcellent && inst.total > 0);

  // 배움터 등록기준 분석 함수 (재직자만)
  const getLearningPlatformStats = () => {
    const { institutionData } = useEmployeeStore.getState();
    
    // 재직자만 필터링
    const activeParticipants = participantData.filter(participant => {
      // isActive가 true이거나
      if (participant.isActive) return true;
      
      // 퇴사일이 없거나 미래 날짜인 경우
      if (!participant.resignDate) return true;
      
      try {
        const resignDate = new Date(participant.resignDate);
        const today = new Date();
        return resignDate > today;
      } catch {
        // 날짜 파싱 실패시 재직자로 간주
        return true;
      }
    });
    
    // 기관별 분석 데이터 생성
    const institutionStats = (institutionData || []).map(institution => {
      // 해당 기관의 재직 참가자 데이터 필터링
      const institutionParticipants = activeParticipants.filter(p => 
        p.institution?.includes(institution.name) ||
        p.institutionCode === institution.code ||
        p.institution === institution.name
      );
      
      // 직무별 대상인원 (배움터 등록기준)
      const targetTotal = institutionParticipants.length;
      const targetSocial = institutionParticipants.filter(p => 
        p.jobType?.includes('전담') || p.jobType === '전담사회복지사'
      ).length;
      const targetLife = institutionParticipants.filter(p => 
        p.jobType?.includes('생활지원') || p.jobType === '생활지원사'
      ).length;
      
      // 교육 이수인원 (배움터 등록기준)
      const completedTotal = institutionParticipants.filter(p => 
        p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료'
      ).length;
      const completedSocial = institutionParticipants.filter(p => 
        (p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료') &&
        (p.jobType?.includes('전담') || p.jobType === '전담사회복지사')
      ).length;
      const completedLife = institutionParticipants.filter(p => 
        (p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료') &&
        (p.jobType?.includes('생활지원') || p.jobType === '생활지원사')
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
  };

  const learningPlatformStats = getLearningPlatformStats();

  // 파이 차트 색상 정의
  const COLORS = {
    complete: '#22c55e',    // 초록색 - 완전수료
    partial: '#f59e0b',     // 주황색 - 부분수료  
    inProgress: '#3b82f6',  // 파란색 - 진행중
    none: '#ef4444'         // 빨간색 - 미수료
  };

  // 전체 수료 현황 데이터
  const completionData = [
    { name: '완전수료', value: summaryStats.complete, color: COLORS.complete },
    { name: '부분수료', value: summaryStats.partial, color: COLORS.partial },
    { name: '진행중', value: summaryStats.inProgress, color: COLORS.inProgress },
    { name: '미수료', value: summaryStats.none, color: COLORS.none },
  ];

  // 과정별 통계 데이터 (기본교육)
  const basicCourseData = Object.entries(educationStats.basicStats.courseStats || {}).map(([course, stats]) => ({
    course,
    participants: stats.count,
    completionRate: stats.completionRate
  }));

  // 과정별 통계 데이터 (심화교육)
  const advancedCourseData = Object.entries(educationStats.advancedStats.courseStats || {}).map(([course, stats]) => ({
    course,
    participants: stats.count,
    completionRate: stats.completionRate
  }));

  // 교육 유형별 비교 데이터
  const comparisonData = [
    {
      type: '기본교육',
      total: educationStats.basicStats.totalParticipants,
      completed: educationStats.basicStats.completedCount,
      rate: educationStats.basicStats.completionRate
    },
    {
      type: '심화교육',
      total: educationStats.advancedStats.totalParticipants,
      completed: educationStats.advancedStats.completedCount,
      rate: educationStats.advancedStats.completionRate
    }
  ];

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
                {filterByRetirement([...basicEducationData, ...advancedEducationData])
                  .reduce((acc, item) => {
                    const personKey = `${item.name}_${item.id}`;
                    acc.add(personKey);
                    return acc;
                  }, new Set()).size}명
              </div>
              <p className="text-xs text-blue-100">
                {includeRetired ? '퇴직자 포함' : '현직자만'} 고유 인원
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
                  const filteredData = filterByRetirement(basicEducationData);
                  const personGroups = filteredData.reduce((acc, item) => {
                    const personKey = `${item.name}_${item.id}`;
                    if (!acc[personKey]) acc[personKey] = [];
                    acc[personKey].push(item);
                    return acc;
                  }, {});
                  return Object.values(personGroups).filter((courses: any) => 
                    courses.some((course: any) => course.status === '수료')
                  ).length;
                })()}명
              </div>
              <p className="text-xs text-green-100">
                수료율: {basicJobStats.find(s => s.jobType === '전담사회복지사')?.completionRate || 0}%
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
                  const filteredData = filterByRetirement(advancedEducationData);
                  const personGroups = filteredData.reduce((acc, item) => {
                    const personKey = `${item.name}_${item.id}`;
                    if (!acc[personKey]) acc[personKey] = [];
                    acc[personKey].push(item);
                    return acc;
                  }, {});
                  return Object.values(personGroups).filter((courses: any) => 
                    courses.some((course: any) => course.status === '수료')
                  ).length;
                })()}명
              </div>
              <p className="text-xs text-purple-100">
                수료율: {advancedJobStats.find(s => s.jobType === '전담사회복지사')?.completionRate || 0}%
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
                  const allFilteredData = filterByRetirement([...basicEducationData, ...advancedEducationData]);
                  const personGroups = allFilteredData.reduce((acc, item) => {
                    const personKey = `${item.name}_${item.id}`;
                    if (!acc[personKey]) acc[personKey] = [];
                    acc[personKey].push(item);
                    return acc;
                  }, {});
                  
                  const uniquePersons = Object.values(personGroups);
                  const totalCompleted = uniquePersons.filter((courses: any) => 
                    courses.some((course: any) => course.status === '수료')
                  ).length;
                  
                  return uniquePersons.length > 0 ? Math.round((totalCompleted / uniquePersons.length) * 100) : 0;
                })()}%
              </div>
              <p className="text-xs text-indigo-100">
                {includeRetired ? '퇴직자 포함' : '현직자만'} 통합 수료율
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 교육별 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                기본교육 현황
              </CardTitle>
              <CardDescription>기본교육 참여 및 수료 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 참여자</span>
                  <Badge variant="outline">{educationStats.basicStats.totalParticipants}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료자</span>
                  <Badge className="bg-green-100 text-green-800">{educationStats.basicStats.completedCount}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료율</span>
                  <Badge className="bg-blue-100 text-blue-800">{educationStats.basicStats.completionRate}%</Badge>
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
              <CardDescription>심화교육 참여 및 수료 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">전체 참여자</span>
                  <Badge variant="outline">{educationStats.advancedStats.totalParticipants}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료자</span>
                  <Badge className="bg-green-100 text-green-800">{educationStats.advancedStats.completedCount}명</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">수료율</span>
                  <Badge className="bg-purple-100 text-purple-800">{educationStats.advancedStats.completionRate}%</Badge>
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
                <CardDescription>우수 기관과 개선 필요 기관을 구분할 수료율 기준을 설정하세요</CardDescription>
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
                      <div key={index} className="border border-green-200 rounded-lg p-3 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{inst.name}</h4>
                          <Badge className="bg-green-100 text-green-800">
                            {inst.completionRate}%
                          </Badge>
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
                      <div key={index} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{inst.name}</h4>
                          <Badge className="bg-orange-100 text-orange-800">
                            {inst.completionRate}%
                          </Badge>
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