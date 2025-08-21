import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEmployeeStore } from "@/store/employee-store";
import { useMemo } from "react";
import { 
  UserCheck, Users, Percent, Clock, TrendingUp, MapPin,
  Calendar, Award, BarChart3, PieChart, Building2, Activity
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function EmployeeStatistics() {
  const { employeeData, getEmployeeStats, institutionData } = useEmployeeStore();
  
  const stats = useMemo(() => getEmployeeStats(), [employeeData]);
  
  // 재직자 데이터 필터링 (전체에서 사용)
  const activeEmployees = useMemo(() => {
    return employeeData.filter(emp => {
      if (!emp.resignDate) return true; // 퇴사일이 없으면 재직자
      try {
        const resignDate = new Date(emp.resignDate);
        const today = new Date();
        return resignDate > today; // 퇴사일이 미래이면 재직자
      } catch {
        return true; // 날짜 파싱 실패시 재직자로 간주
      }
    });
  }, [employeeData]);

  // 상세 통계 계산
  const detailedStats = useMemo(() => {
    
    // 연령별 분포 (YYYY-MM-DD 형식의 birthDate 처리)
    const getAge = (birthDate: string) => {
      if (!birthDate) return null;
      try {
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return null;
        return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      } catch {
        return null;
      }
    };
    
    const ageGroups = activeEmployees.reduce((acc, emp) => {
      const age = getAge(emp.birthDate);
      if (age === null) {
        acc['연령 미상'] = (acc['연령 미상'] || 0) + 1;
        return acc;
      }
      const group = age < 30 ? '20대' : age < 40 ? '30대' : age < 50 ? '40대' : age < 60 ? '50대' : '60대+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 기관별 종사자 수 (지역 + 지구 정보 사용)
    const institutionStats = activeEmployees.reduce((acc, emp) => {
      const institutionName = emp.district && emp.region 
        ? `${emp.region} ${emp.district}`.replace('*', '')
        : emp.region || emp.district || '미분류';
      acc[institutionName] = (acc[institutionName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 근속기간 분포 (hireDate와 resignDate로 계산)
    const tenureGroups = activeEmployees.reduce((acc, emp) => {
      let years = 0;
      if (emp.hireDate) {
        try {
          const hireDate = new Date(emp.hireDate);
          const endDate = emp.resignDate ? new Date(emp.resignDate) : new Date();
          if (!isNaN(hireDate.getTime()) && !isNaN(endDate.getTime())) {
            years = Math.floor((endDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          }
        } catch {
          years = 0;
        }
      } else if (emp.careerType) {
        // careerType 정보가 있으면 활용
        if (emp.careerType.includes('1년이상')) {
          years = 1; // 최소값으로 설정
        }
      }
      
      const group = years < 1 ? '1년 미만' : years < 3 ? '1-3년' : years < 5 ? '3-5년' : years < 10 ? '5-10년' : '10년 이상';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 직무별 상세 분포
    const jobTypeStats = activeEmployees.reduce((acc, emp) => {
      const key = emp.jobType || '미분류';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 지역별 분포 (region 사용)
    const regionStats = activeEmployees.reduce((acc, emp) => {
      const region = emp.region || '미분류';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 년도별 입사 추이 (더 의미있는 데이터)
    const yearlyHiring = activeEmployees
      .filter(emp => emp.hireDate)
      .reduce((acc, emp) => {
        try {
          const hireDate = new Date(emp.hireDate!);
          const year = hireDate.getFullYear().toString();
          acc[year] = (acc[year] || 0) + 1;
        } catch {
          acc['연도 미상'] = (acc['연도 미상'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
    
    // 직무별 경력 현황 분석 (전담사회복지사 vs 생활지원사)
    const certificationStats = activeEmployees.reduce((acc, emp) => {
      const jobType = emp.jobType;
      
      if (jobType === '전담사회복지사' || jobType === '선임전담사회복지사') {
        // 전담사회복지사: careerType 필드 사용
        const careerType = emp.careerType;
        
        if (careerType && typeof careerType === 'string') {
          // 의미있는 경력 유형만 처리
          const isValidCareerType = 
            careerType.includes('년') ||           // '년'이 포함된 경력 정보
            careerType.includes('이상') ||         // '이상'이 포함된 경력 정보
            careerType.includes('미만') ||         // '미만'이 포함된 경력 정보
            careerType.includes('경력') ||         // '경력'이 포함된 정보
            careerType.includes('신입');           // '신입' 정보
          
          // ID나 코드 형태가 아닌지 확인
          const isNotIdCode = 
            !careerType.match(/^\d+$/) &&         // 순수 숫자 아님
            !careerType.match(/^[a-z]+\d+$/) &&   // 소문자+숫자 조합 아님
            !careerType.match(/^\d{6}-?\d?$/) &&  // 주민번호 형태 아님
            !careerType.match(/^[a-z]\d+$/);      // 한글자+숫자 아님
          
          if (isValidCareerType && isNotIdCode) {
            const key = `[전담] ${careerType}`;
            acc[key] = (acc[key] || 0) + 1;
          }
        }
        
      } else if (jobType === '생활지원사') {
        // 생활지원사: 입사일 기준으로 경력 계산 (스냅샷 날짜: 2025-08-04)
        if (emp.hireDate) {
          try {
            const hireDate = new Date(emp.hireDate);
            const snapshotDate = new Date('2025-08-04'); // 데이터 입력 기준일
            const yearsWorked = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            
            let careerCategory = '';
            if (yearsWorked < 1) {
              careerCategory = '[생활지원사] 1년 미만';
            } else if (yearsWorked < 2) {
              careerCategory = '[생활지원사] 1년 이상';
            } else if (yearsWorked < 3) {
              careerCategory = '[생활지원사] 2년 이상';
            } else if (yearsWorked < 5) {
              careerCategory = '[생활지원사] 3년 이상';
            } else {
              careerCategory = '[생활지원사] 5년 이상';
            }
            
            acc[careerCategory] = (acc[careerCategory] || 0) + 1;
          } catch {
            acc['[생활지원사] 경력 미상'] = (acc['[생활지원사] 경력 미상'] || 0) + 1;
          }
        } else {
          acc['[생활지원사] 경력 미상'] = (acc['[생활지원사] 경력 미상'] || 0) + 1;
        }
      }
      
      return acc;
    }, {} as Record<string, number>);
    
    // 데이터가 없는 경우 기본 메시지 추가
    if (Object.keys(certificationStats).length === 0) {
      certificationStats['경력 정보 없음'] = activeEmployees.length;
    }
    
    // 책임별 분석 추가
    const responsibilityStats = activeEmployees.reduce((acc, emp) => {
      const responsibility = emp.responsibility || '책임 미상';
      acc[responsibility] = (acc[responsibility] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      ageGroups,
      institutionStats,
      tenureGroups,
      jobTypeStats,
      regionStats,
      yearlyHiring,
      certificationStats,
      responsibilityStats
    };
  }, [activeEmployees]);
  
  // 차트 데이터 준비
  const chartData = useMemo(() => {
    const ageChartData = Object.entries(detailedStats.ageGroups).map(([age, count]) => ({
      name: age,
      value: count,
      fill: age === '20대' ? '#ef4444' : age === '30대' ? '#f97316' : 
            age === '40대' ? '#eab308' : age === '50대' ? '#22c55e' : '#3b82f6'
    }));
    
    const tenureChartData = Object.entries(detailedStats.tenureGroups)
      .sort(([a], [b]) => {
        const order = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tenure, count]) => ({ name: tenure, count }));
    
    const institutionChartData = Object.entries(detailedStats.institutionStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
      
    return { ageChartData, tenureChartData, institutionChartData };
  }, [detailedStats]);
  

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6" data-testid="employee-statistics">
      {/* 기본 통계 카드 */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">종사자 기본 통계</h3>
          <p className="text-sm text-slate-500 mt-1">종사자 현황에 대한 핵심 지표입니다</p>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <UserCheck className="text-blue-600 h-6 w-6 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-600">전담사회복지사</p>
                  <p className="text-2xl font-bold text-blue-900" data-testid="social-worker-count">
                    {stats.socialWorkerCount}명
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <Users className="text-green-600 h-6 w-6 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-600">생활지원사</p>
                  <p className="text-2xl font-bold text-green-900" data-testid="life-support-count">
                    {stats.lifeSupportCount}명
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center">
                <Percent className="text-amber-600 h-6 w-6 mr-3" />
                <div>
                  <p className="text-sm font-medium text-amber-600">충원률</p>
                  <p className="text-2xl font-bold text-amber-900" data-testid="fill-rate">
                    {stats.fillRate}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <Clock className="text-purple-600 h-6 w-6 mr-3" />
                <div>
                  <p className="text-sm font-medium text-purple-600">평균 근속기간</p>
                  <p className="text-2xl font-bold text-purple-900" data-testid="avg-tenure">
                    {stats.averageTenure}년
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 추가 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center">
            <Building2 className="text-indigo-600 h-6 w-6 mr-3" />
            <div>
              <p className="text-sm font-medium text-indigo-600">총 기관 수</p>
              <p className="text-2xl font-bold text-indigo-900">
                {Object.keys(detailedStats.institutionStats).length}개
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
          <div className="flex items-center">
            <TrendingUp className="text-rose-600 h-6 w-6 mr-3" />
            <div>
              <p className="text-sm font-medium text-rose-600">총 종사자 수</p>
              <p className="text-2xl font-bold text-rose-900">
                {stats.totalEmployees}명
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
          <div className="flex items-center">
            <MapPin className="text-cyan-600 h-6 w-6 mr-3" />
            <div>
              <p className="text-sm font-medium text-cyan-600">활동 지역 수</p>
              <p className="text-2xl font-bold text-cyan-900">
                {Object.keys(detailedStats.regionStats).length}개
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center">
            <Award className="text-emerald-600 h-6 w-6 mr-3" />
            <div>
              <p className="text-sm font-medium text-emerald-600">경력 유형</p>
              <p className="text-2xl font-bold text-emerald-900">
                {Object.keys(detailedStats.certificationStats).length}개
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 연령별 분포 파이 차트 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <PieChart className="text-blue-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">연령별 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData.ageChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, value}) => `${name}: ${value}명`}
                  >
                    {chartData.ageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 근속기간 분포 바 차트 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <BarChart3 className="text-green-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">근속기간 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.tenureChartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 기관별 종사자 수 */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Building2 className="text-purple-600 h-5 w-5 mr-2" />
            <h4 className="text-md font-semibold">기관별 종사자 현황 (상위 10개)</h4>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.institutionChartData} layout="horizontal">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 상세 분석 테이블 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 지역별 현황 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <MapPin className="text-cyan-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">지역별 현황</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(detailedStats.regionStats)
                .sort(([,a], [,b]) => b - a)
                .map(([region, count]) => (
                  <div key={region} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{region}</span>
                    <span className="text-sm font-semibold text-cyan-600">{count}명</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* 직무별 현황 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Activity className="text-orange-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">직무별 현황</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(detailedStats.jobTypeStats)
                .sort(([,a], [,b]) => b - a)
                .map(([jobType, count]) => (
                  <div key={jobType} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{jobType}</span>
                    <span className="text-sm font-semibold text-orange-600">{count}명</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* 책임별 현황 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Users className="text-purple-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">책임별 현황</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(detailedStats.responsibilityStats)
                .sort(([,a], [,b]) => b - a)
                .map(([responsibility, count]) => (
                  <div key={responsibility} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{responsibility}</span>
                    <span className="text-sm font-semibold text-purple-600">{count}명</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 경력 유형별 현황 - 레이아웃으로 구분 */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Award className="text-gray-600 h-5 w-5 mr-2" />
            <div>
              <h4 className="text-md font-semibold">직무별 경력 현황</h4>
              <p className="text-xs text-gray-500 mt-1">전담사회복지사: 경력유형 필드 | 생활지원사: 입사일 기준 계산 (2025.08.04)</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(detailedStats.certificationStats).length > 0 ? (
            <div className="space-y-6">
              {/* 전담사회복지사 섹션 */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                  전담사회복지사 (경력유형 필드)
                  <span className="ml-auto text-xs text-gray-500">
                    총 {Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[전담]'))
                      .reduce((sum, [, count]) => sum + count, 0)}명
                  </span>
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(() => {
                    const socialWorkerEntries = Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[전담]'));
                    const totalSocialWorkers = socialWorkerEntries.reduce((sum, [, count]) => sum + count, 0);
                    
                    return socialWorkerEntries
                      .sort(([,a], [,b]) => b - a)
                      .map(([careerType, count]) => {
                        const percentage = totalSocialWorkers > 0 ? ((count / totalSocialWorkers) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={careerType} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors">
                            <div className="text-lg font-bold text-gray-800">{count}명</div>
                            <div className="text-xs font-medium text-blue-600 mb-1">{percentage}%</div>
                            <div className="text-sm text-gray-600 leading-tight">
                              {careerType.replace('[전담] ', '')}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
                {Object.entries(detailedStats.certificationStats).filter(([careerType]) => careerType.startsWith('[전담]')).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">전담사회복지사 경력 데이터 없음</p>
                  </div>
                )}
              </div>

              {/* 생활지원사 섹션 */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-green-600" />
                  생활지원사 (입사일 기준 자동 계산)
                  <span className="ml-auto text-xs text-gray-500">
                    총 {Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[생활지원사]'))
                      .reduce((sum, [, count]) => sum + count, 0)}명
                  </span>
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(() => {
                    const lifeSupportEntries = Object.entries(detailedStats.certificationStats)
                      .filter(([careerType]) => careerType.startsWith('[생활지원사]'));
                    const totalLifeSupport = lifeSupportEntries.reduce((sum, [, count]) => sum + count, 0);
                    
                    return lifeSupportEntries
                      .sort(([a], [b]) => {
                        // 경력 순서대로 정렬 (1년 미만 -> 1년 이상 -> 2년 이상 ...)
                        const getOrder = (str: string) => {
                          if (str.includes('1년 미만')) return 1;
                          if (str.includes('1년 이상')) return 2;
                          if (str.includes('2년 이상')) return 3;
                          if (str.includes('3년 이상')) return 4;
                          if (str.includes('5년 이상')) return 5;
                          return 99;
                        };
                        return getOrder(a) - getOrder(b);
                      })
                      .map(([careerType, count]) => {
                        const percentage = totalLifeSupport > 0 ? ((count / totalLifeSupport) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={careerType} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors">
                            <div className="text-lg font-bold text-gray-800">{count}명</div>
                            <div className="text-xs font-medium text-green-600 mb-1">{percentage}%</div>
                            <div className="text-sm text-gray-600 leading-tight">
                              {careerType.replace('[생활지원사] ', '')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">자동계산</div>
                          </div>
                        );
                      });
                  })()}
                </div>
                {Object.entries(detailedStats.certificationStats).filter(([careerType]) => careerType.startsWith('[생활지원사]')).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">생활지원사 입사일 데이터 없음</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>경력 정보가 없습니다</p>
              <p className="text-xs mt-1">전담사회복지사 경력유형 또는 생활지원사 입사일 데이터가 필요합니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통계 분석 섹션들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 기관별 인력 배치 현황 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Building2 className="text-purple-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">기관별 인력 배치 현황</h4>
              <p className="text-xs text-gray-500 ml-2">(개별 기관별 현황, 광역지원기관 제외)</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // 기관별 종사자 상세 정보 수집 (광역지원기관 제외)
                const institutionDetails = activeEmployees
                  .filter(emp => {
                    // 광역지원기관 제외 필터링
                    const institution = emp.institution || '';
                    const institutionCode = emp.institutionCode || '';
                    
                    return !(
                      institution.includes('광역') ||
                      institution.includes('경상남도사회서비스원') ||
                      institutionCode === 'A48000002' || // 광역지원기관 코드
                      institution.includes('사회서비스원')
                    );
                  })
                  .reduce((acc, emp) => {
                    const institutionName = emp.institution || '미분류';
                    if (!acc[institutionName]) {
                      acc[institutionName] = {
                        total: 0,
                        social: 0,
                        life: 0,
                        district: emp.district || emp.regionName || '미분류',
                        institutionCode: emp.institutionCode || '-'
                      };
                    }
                    acc[institutionName].total++;
                    if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
                      acc[institutionName].social++;
                    } else if (emp.jobType === '생활지원사') {
                      acc[institutionName].life++;
                    }
                    return acc;
                  }, {} as Record<string, { 
                    total: number; 
                    social: number; 
                    life: number; 
                    district: string;
                    institutionCode: string;
                  }>);

                const sortedInstitutions = Object.entries(institutionDetails)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .slice(0, 15); // 상위 15개 기관 표시

                // 배치 유형별 분류
                const balanced = sortedInstitutions.filter(([,data]) => data.social > 0 && data.life > 0).length;
                const socialOnly = sortedInstitutions.filter(([,data]) => data.social > 0 && data.life === 0).length;
                const lifeOnly = sortedInstitutions.filter(([,data]) => data.social === 0 && data.life > 0).length;
                const totalInstitutions = Object.keys(institutionDetails).length;

                return (
                  <div>
                    {/* 배치 유형 요약 */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-lg font-bold text-green-700">{balanced}개</div>
                        <div className="text-xs text-green-600">혼합배치</div>
                        <div className="text-xs text-gray-500">(전담+생활)</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">{socialOnly}개</div>
                        <div className="text-xs text-blue-600">전담 전용</div>
                        <div className="text-xs text-gray-500">(전담만)</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-lg font-bold text-purple-700">{lifeOnly}개</div>
                        <div className="text-xs text-purple-600">생활 전용</div>
                        <div className="text-xs text-gray-500">(생활만)</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-lg font-bold text-gray-700">{totalInstitutions}개</div>
                        <div className="text-xs text-gray-600">총 기관 수</div>
                        <div className="text-xs text-gray-500">전체</div>
                      </div>
                    </div>
                    
                    {/* 기관별 상세 배치 현황 */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {sortedInstitutions.map(([institution, data]) => {
                        // 배치 비율 계산
                        const socialRatio = data.total > 0 ? ((data.social / data.total) * 100).toFixed(0) : '0';
                        const lifeRatio = data.total > 0 ? ((data.life / data.total) * 100).toFixed(0) : '0';
                        
                        // 배치 유형 결정
                        let deploymentType = '';
                        let typeColor = '';
                        if (data.social > 0 && data.life > 0) {
                          deploymentType = '혼합배치';
                          typeColor = 'bg-green-100 text-green-700';
                        } else if (data.social > 0) {
                          deploymentType = '전담전용';
                          typeColor = 'bg-blue-100 text-blue-700';
                        } else if (data.life > 0) {
                          deploymentType = '생활전용';
                          typeColor = 'bg-purple-100 text-purple-700';
                        } else {
                          deploymentType = '미배치';
                          typeColor = 'bg-red-100 text-red-700';
                        }
                        
                        return (
                          <div key={institution} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-800 truncate">{institution}</div>
                                <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                  <span>📍 {data.district}</span>
                                  <span>🏢 {data.institutionCode}</span>
                                </div>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ${typeColor} font-medium`}>
                                {deploymentType}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 text-xs">
                              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-semibold">
                                총 {data.total}명
                              </span>
                              {data.social > 0 && (
                                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                  전담 {data.social}명 ({socialRatio}%)
                                </span>
                              )}
                              {data.life > 0 && (
                                <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                  생활 {data.life}명 ({lifeRatio}%)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 배치 현황 인사이트 */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="text-sm font-medium text-blue-800 mb-1">배치 현황 분석</h6>
                      <p className="text-sm text-blue-600">
                        전체 {totalInstitutions}개 기관 중 {balanced}개 기관이 전담+생활지원사 혼합배치 운영 중 
                        ({((balanced/totalInstitutions)*100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* 3. 근속 및 안정성 지표 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Clock className="text-orange-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">근속 및 안정성 지표</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // 근속기간별 분류 (2025-08-04 기준)
                const tenureGroups = activeEmployees.reduce((acc, emp) => {
                  if (emp.hireDate) {
                    try {
                      const hireDate = new Date(emp.hireDate);
                      const snapshotDate = new Date('2025-08-04');
                      const years = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                      
                      if (years < 1) acc['1년 미만 (신규)']++;
                      else if (years < 2) acc['1-2년 (적응기)']++;
                      else if (years < 5) acc['2-5년 (안정기)']++;
                      else acc['5년 이상 (장기근속)']++;
                    } catch {
                      acc['기간 미상']++;
                    }
                  } else {
                    acc['기간 미상']++;
                  }
                  return acc;
                }, {
                  '1년 미만 (신규)': 0,
                  '1-2년 (적응기)': 0,
                  '2-5년 (안정기)': 0,
                  '5년 이상 (장기근속)': 0,
                  '기간 미상': 0
                } as Record<string, number>);

                const total = Object.values(tenureGroups).reduce((sum, count) => sum + count, 0);
                const newbieRate = ((tenureGroups['1년 미만 (신규)'] / total) * 100).toFixed(1);
                const stableRate = ((tenureGroups['5년 이상 (장기근속)'] / total) * 100).toFixed(1);

                return (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-lg font-bold text-amber-700">{newbieRate}%</div>
                        <div className="text-xs text-amber-600">신규 채용률</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">{stableRate}%</div>
                        <div className="text-xs text-blue-600">장기 근속률</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(tenureGroups).map(([group, count]) => {
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={group} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{group}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{count}명</span>
                              <span className="text-xs text-gray-500">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. 채용 트렌드 분석 & 6. 지역별 격차 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. 채용 트렌드 분석 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <TrendingUp className="text-green-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">채용 트렌드 분석</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // 년도별 채용 추이
                const yearlyHiring = activeEmployees
                  .filter(emp => emp.hireDate)
                  .reduce((acc, emp) => {
                    try {
                      const year = new Date(emp.hireDate!).getFullYear();
                      if (year >= 2020) { // 2020년 이후만
                        acc[year] = (acc[year] || 0) + 1;
                      }
                    } catch {
                      // ignore invalid dates
                    }
                    return acc;
                  }, {} as Record<number, number>);

                const sortedYears = Object.entries(yearlyHiring)
                  .sort(([a], [b]) => Number(b) - Number(a));

                // 월별 채용 패턴 (최근 입사자들의 입사월)
                const monthlyPattern = activeEmployees
                  .filter(emp => emp.hireDate)
                  .reduce((acc, emp) => {
                    try {
                      const month = new Date(emp.hireDate!).getMonth() + 1;
                      acc[month] = (acc[month] || 0) + 1;
                    } catch {
                      // ignore invalid dates
                    }
                    return acc;
                  }, {} as Record<number, number>);

                const peakMonth = Object.entries(monthlyPattern)
                  .sort(([,a], [,b]) => b - a)[0];

                return (
                  <div>
                    <div className="mb-4">
                      <h6 className="text-sm font-medium mb-2 text-gray-700">최근 5년 채용 현황</h6>
                      <div className="space-y-2">
                        {sortedYears.slice(0, 5).map(([year, count]) => (
                          <div key={year} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{year}년</span>
                            <span className="text-sm font-bold text-green-600">{count}명</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="text-sm font-medium text-blue-800 mb-1">채용 집중 시기</h6>
                      <p className="text-sm text-blue-600">
                        {peakMonth ? `${peakMonth[0]}월에 가장 많은 채용 (${peakMonth[1]}명)` : '데이터 부족'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* 6. 시군별 격차 분석 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <MapPin className="text-purple-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">시군별 격차 분석</h4>
              <p className="text-xs text-gray-500 ml-2">(경상남도 18개 시군 기준)</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // 시군별 종사자 분포 (district 필드 우선 사용)
                const districtCounts = activeEmployees.reduce((acc, emp) => {
                  // district > regionName > city > region 순서로 시군 정보 추출
                  let district = emp.district || emp.regionName || emp.city || emp.region || '미분류';
                  
                  // 시군명 정리 (괄호나 특수문자 제거)
                  district = district.replace(/[()]/g, '').replace(/\*/g, '').trim();
                  
                  // 경상남도 주요 시군으로 매핑
                  const districtMapping: Record<string, string> = {
                    '창원': '창원시', '창원시': '창원시',
                    '김해': '김해시', '김해시': '김해시', 
                    '양산': '양산시', '양산시': '양산시',
                    '진주': '진주시', '진주시': '진주시',
                    '통영': '통영시', '통영시': '통영시',
                    '사천': '사천시', '사천시': '사천시',
                    '밀양': '밀양시', '밀양시': '밀양시',
                    '거제': '거제시', '거제시': '거제시',
                    '함안': '함안군', '함안군': '함안군',
                    '창녕': '창녕군', '창녕군': '창녕군',
                    '고성': '고성군', '고성군': '고성군',
                    '하동': '하동군', '하동군': '하동군',
                    '합천': '합천군', '합천군': '합천군',
                    '남해': '남해군', '남해군': '남해군',
                    '거창': '거창군', '거창군': '거창군',
                    '산청': '산청군', '산청군': '산청군',
                    '함양': '함양군', '함양군': '함양군',
                    '의령': '의령군', '의령군': '의령군'
                  };
                  
                  const mappedDistrict = districtMapping[district] || district;
                  
                  if (!acc[mappedDistrict]) {
                    acc[mappedDistrict] = { total: 0, social: 0, life: 0 };
                  }
                  acc[mappedDistrict].total++;
                  if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
                    acc[mappedDistrict].social++;
                  } else if (emp.jobType === '생활지원사') {
                    acc[mappedDistrict].life++;
                  }
                  return acc;
                }, {} as Record<string, { total: number; social: number; life: number }>);

                const sortedDistricts = Object.entries(districtCounts)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .slice(0, 12); // 상위 12개 시군 표시

                // 격차 분석
                const maxDistrict = sortedDistricts[0];
                const minDistrict = sortedDistricts[sortedDistricts.length - 1];
                const avgPerDistrict = Object.values(districtCounts).reduce((sum, data) => sum + data.total, 0) / Object.keys(districtCounts).length;
                
                // 격차 비율 계산
                const gapRatio = maxDistrict && minDistrict ? (maxDistrict[1].total / minDistrict[1].total).toFixed(1) : '0';

                return (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm font-bold text-red-700">{maxDistrict?.[1].total || 0}명</div>
                        <div className="text-xs text-red-600 truncate">최다: {maxDistrict?.[0] || '-'}</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-bold text-blue-700">{avgPerDistrict.toFixed(1)}명</div>
                        <div className="text-xs text-blue-600">시군 평균</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-sm font-bold text-amber-700">{gapRatio}:1</div>
                        <div className="text-xs text-amber-600">격차 비율</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {sortedDistricts.map(([district, data]) => {
                        const socialRatio = data.total > 0 ? ((data.social / data.total) * 100).toFixed(0) : '0';
                        const lifeRatio = data.total > 0 ? ((data.life / data.total) * 100).toFixed(0) : '0';
                        
                        return (
                          <div key={district} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                            <span className="truncate flex-1 mr-2 font-medium">{district}</span>
                            <div className="flex gap-1 text-xs">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold">{data.total}명</span>
                              <span className="bg-green-100 text-green-700 px-1 py-1 rounded">전담{data.social}({socialRatio}%)</span>
                              <span className="bg-purple-100 text-purple-700 px-1 py-1 rounded">생활{data.life}({lifeRatio}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 격차 분석 인사이트 */}
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h6 className="text-sm font-medium text-purple-800 mb-1">격차 분석</h6>
                      <p className="text-sm text-purple-600">
                        {maxDistrict && minDistrict ? 
                          `${maxDistrict[0]}(${maxDistrict[1].total}명)과 ${minDistrict[0]}(${minDistrict[1].total}명) 간 ${gapRatio}배 격차` :
                          '데이터 부족으로 격차 분석 불가'
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
