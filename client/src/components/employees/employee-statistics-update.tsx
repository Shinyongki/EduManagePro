import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEmployeeStore } from "@/store/employee-store";
import { useMemo, useEffect } from "react";
import { 
  UserCheck, Users, Percent, Clock, TrendingUp, MapPin,
  Calendar, Award, BarChart3, PieChart, Building2, Activity,
  AlertTriangle, Target
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function EmployeeStatisticsUpdate() {
  const { employeeData, getEmployeeStats, institutionData, loadInstitutionData } = useEmployeeStore();
  
  // 기관 데이터 자동 로드
  useEffect(() => {
    loadInstitutionData();
  }, []);
  
  const stats = useMemo(() => {
    if (!Array.isArray(employeeData)) {
      return {
        totalEmployees: 0,
        socialWorkerCount: 0,
        lifeSupportCount: 0,
        fillRate: 0,
        averageTenure: 0,
        institutionCount: 0,
      };
    }
    return getEmployeeStats();
  }, [employeeData, institutionData]);
  
  // 재직자 데이터 필터링
  const activeEmployees = useMemo(() => {
    if (!Array.isArray(employeeData)) return [];
    return employeeData.filter(emp => {
      const resignDate = emp.resignDate;
      return !resignDate || resignDate === '' || resignDate === null || resignDate === 'N' || resignDate === '재직';
    });
  }, [employeeData]);

  // 전담사회복지사와 생활지원사 분리
  const socialWorkers = useMemo(() => 
    activeEmployees.filter(emp => emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'),
    [activeEmployees]
  );
  
  const lifeSupportWorkers = useMemo(() => 
    activeEmployees.filter(emp => emp.jobType === '생활지원사'),
    [activeEmployees]
  );

  // 직무별 경력 현황 분석
  const careerStats = useMemo(() => {
    const socialCareerStats: Record<string, number> = {};
    const lifeCareerStats: Record<string, number> = {};

    // 전담사회복지사 경력 분석
    socialWorkers.forEach(emp => {
      const careerType = emp.careerType;
      if (careerType && typeof careerType === 'string') {
        const isValidCareerType = 
          careerType.includes('년') || careerType.includes('이상') || 
          careerType.includes('미만') || careerType.includes('경력') || 
          careerType.includes('신입');
        
        const isNotIdCode = 
          !careerType.match(/^\d+$/) && 
          !careerType.match(/^[a-z]+\d+$/) && 
          !careerType.match(/^\d{6}-?\d?$/) && 
          !careerType.match(/^[a-z]\d+$/);
        
        if (isValidCareerType && isNotIdCode) {
          socialCareerStats[careerType] = (socialCareerStats[careerType] || 0) + 1;
        } else {
          socialCareerStats['1년 미만'] = (socialCareerStats['1년 미만'] || 0) + 1;
        }
      } else {
        socialCareerStats['1년 미만'] = (socialCareerStats['1년 미만'] || 0) + 1;
      }
    });

    // 생활지원사 경력 분석 (입사일 기준)
    let lifeUnknown = 0;
    lifeSupportWorkers.forEach(emp => {
      if (emp.hireDate) {
        try {
          const hireDate = new Date(emp.hireDate);
          const snapshotDate = new Date('2025-08-04');
          const yearsWorked = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          
          if (yearsWorked >= 5) {
            lifeCareerStats['5년 이상'] = (lifeCareerStats['5년 이상'] || 0) + 1;
          } else if (yearsWorked >= 3) {
            lifeCareerStats['3년 이상'] = (lifeCareerStats['3년 이상'] || 0) + 1;
          } else if (yearsWorked >= 2) {
            lifeCareerStats['2년 이상'] = (lifeCareerStats['2년 이상'] || 0) + 1;
          } else if (yearsWorked >= 1) {
            lifeCareerStats['1년 이상'] = (lifeCareerStats['1년 이상'] || 0) + 1;
          } else {
            lifeCareerStats['1년 미만'] = (lifeCareerStats['1년 미만'] || 0) + 1;
          }
        } catch {
          lifeUnknown++;
        }
      } else {
        lifeUnknown++;
      }
    });

    // 전담사회복지사 정렬 (원하는 순서대로)
    const orderedSocialStats: Record<string, number> = {};
    const socialOrder = ['4년이상', '2년이상', '1년 이상', '1년 미만'];
    
    // 먼저 지정된 순서대로 추가
    socialOrder.forEach(key => {
      Object.keys(socialCareerStats).forEach(career => {
        if (career.includes(key.replace('이상', '').replace('미만', '').replace(' ', ''))) {
          orderedSocialStats[career] = socialCareerStats[career];
        }
      });
    });
    
    // 1년 미만 카테고리 추가
    if (socialCareerStats['1년 미만']) {
      orderedSocialStats['1년 미만'] = socialCareerStats['1년 미만'];
    }
    
    // 나머지 추가
    Object.keys(socialCareerStats).forEach(key => {
      if (!orderedSocialStats[key]) {
        orderedSocialStats[key] = socialCareerStats[key];
      }
    });

    // 생활지원사 정렬
    const orderedLifeStats: Record<string, number> = {};
    const lifeOrder = ['5년 이상', '3년 이상', '2년 이상', '1년 이상', '1년 미만'];
    lifeOrder.forEach(key => {
      if (lifeCareerStats[key]) {
        orderedLifeStats[key] = lifeCareerStats[key];
      }
    });

    return { 
      social: orderedSocialStats, 
      life: orderedLifeStats,
      lifeUnknown 
    };
  }, [socialWorkers, lifeSupportWorkers]);

  // 근속 분석 (직무별)
  const tenureAnalysis = useMemo(() => {
    const analyzeTenure = (employees: any[]) => {
      const groups = {
        '1년 미만': 0,
        '1-2년': 0,
        '2-3년': 0,
        '3-5년': 0,
        '5년 이상': 0,
        '미상': 0
      };

      employees.forEach(emp => {
        if (emp.hireDate) {
          try {
            const hireDate = new Date(emp.hireDate);
            const snapshotDate = new Date('2025-08-04');
            const years = (snapshotDate.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            
            if (years < 1) groups['1년 미만']++;
            else if (years < 2) groups['1-2년']++;
            else if (years < 3) groups['2-3년']++;
            else if (years < 5) groups['3-5년']++;
            else groups['5년 이상']++;
          } catch {
            groups['미상']++;
          }
        } else {
          groups['미상']++;
        }
      });

      return groups;
    };

    return {
      social: analyzeTenure(socialWorkers),
      life: analyzeTenure(lifeSupportWorkers)
    };
  }, [socialWorkers, lifeSupportWorkers]);

  // 연령 분석 (직무별)
  const ageAnalysis = useMemo(() => {
    const analyzeAge = (employees: any[]) => {
      const groups = {
        '20대': 0,
        '30대': 0,
        '40대': 0,
        '50대': 0,
        '60대 이상': 0,
        '미상': 0
      };

      employees.forEach(emp => {
        if (emp.birthDate) {
          try {
            const birthYear = parseInt(emp.birthDate.substring(0, 4));
            const age = 2025 - birthYear;
            
            if (age < 30) groups['20대']++;
            else if (age < 40) groups['30대']++;
            else if (age < 50) groups['40대']++;
            else if (age < 60) groups['50대']++;
            else groups['60대 이상']++;
          } catch {
            groups['미상']++;
          }
        } else {
          groups['미상']++;
        }
      });

      return groups;
    };

    return {
      social: analyzeAge(socialWorkers),
      life: analyzeAge(lifeSupportWorkers)
    };
  }, [socialWorkers, lifeSupportWorkers]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6" data-testid="employee-statistics">
      
      {/* 주요 통계 요약 카드 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📋 주요 통계 현황</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
            <div className="text-center">
              <p className="text-sm font-medium text-green-700 mb-1">전담사회복지사</p>
              <p className="text-2xl font-bold text-green-900">{stats.socialWorkerCount}명</p>
              <p className="text-xs text-green-600">(전담+선임전담)</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border-2 border-cyan-200 bg-cyan-50">
            <div className="text-center">
              <p className="text-sm font-medium text-cyan-700 mb-1">정원 대비 현원</p>
              <p className="text-2xl font-bold text-cyan-900">{stats.fillRate}%</p>
              <p className="text-xs text-cyan-600">(충원율)</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700 mb-1">생활지원사</p>
              <p className="text-2xl font-bold text-blue-900">{stats.lifeSupportCount}명</p>
              <p className="text-xs text-blue-600">(생활지원사)</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">총 기관수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.institutionCount}개</p>
              <p className="text-xs text-gray-600">전체</p>
            </div>
          </div>
        </div>
      </div>

      {/* 직무별 경력 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전담사회복지사 경력 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Award className="text-green-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">전담사회복지사 경력 현황</h4>
              <p className="text-xs text-gray-500 ml-2">(경력유형 필드 기준)</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(careerStats.social).map(([career, count]) => (
                <div key={career} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-lg font-bold text-gray-800">{count}명</div>
                  <div className="text-xs text-gray-600">{career}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              총 {socialWorkers.length}명 중 {Object.values(careerStats.social).reduce((a, b) => a + b, 0)}명 분류
            </div>
          </CardContent>
        </Card>

        {/* 생활지원사 경력 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Award className="text-blue-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">생활지원사 경력 현황</h4>
              <p className="text-xs text-gray-500 ml-2">(입사일 기준 자동계산)</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(careerStats.life).map(([career, count]) => (
                <div key={career} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-lg font-bold text-gray-800">{count}명</div>
                  <div className="text-xs text-gray-600">{career}</div>
                </div>
              ))}
            </div>
            {careerStats.lifeUnknown > 0 && (
              <div className="mt-3 text-xs text-gray-500">
                * 경력 미상: {careerStats.lifeUnknown}명
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              총 {lifeSupportWorkers.length}명 중 {Object.values(careerStats.life).reduce((a, b) => a + b, 0)}명 분류
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 근속 현황 (직무별) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전담사회복지사 근속 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Clock className="text-orange-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">전담사회복지사 근속 현황</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(tenureAnalysis.social).map(([period, count]) => {
                const percentage = socialWorkers.length > 0 ? 
                  ((count / socialWorkers.length) * 100).toFixed(1) : '0.0';
                return (
                  <div key={period} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{period}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{count}명</span>
                      <span className="text-xs text-gray-500">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-2 bg-orange-50 rounded">
              <p className="text-xs text-orange-700">
                평균 근속: {stats.averageTenure.toFixed(1)}년
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 생활지원사 근속 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Clock className="text-blue-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">생활지원사 근속 현황</h4>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(tenureAnalysis.life).map(([period, count]) => {
                const percentage = lifeSupportWorkers.length > 0 ? 
                  ((count / lifeSupportWorkers.length) * 100).toFixed(1) : '0.0';
                return (
                  <div key={period} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{period}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{count}명</span>
                      <span className="text-xs text-gray-500">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 연령 분포 (직무별) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전담사회복지사 연령 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Users className="text-purple-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">전담사회복지사 연령 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={Object.entries(ageAnalysis.social)
                    .filter(([_, count]) => count > 0)
                    .map(([age, count]) => ({ name: age, value: count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value, percent}) => `${name}: ${value}명 (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(ageAnalysis.social).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 생활지원사 연령 */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Users className="text-cyan-600 h-5 w-5 mr-2" />
              <h4 className="text-md font-semibold">생활지원사 연령 분포</h4>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={Object.entries(ageAnalysis.life)
                    .filter(([_, count]) => count > 0)
                    .map(([age, count]) => ({ name: age, value: count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value, percent}) => `${name}: ${value}명 (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(ageAnalysis.life).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}