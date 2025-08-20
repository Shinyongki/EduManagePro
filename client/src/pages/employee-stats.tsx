import React, { useState, useEffect } from 'react';
import { useEmployeeStore } from '../store/employee-store';
import { Card } from '../components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Users, TrendingUp, Calendar, Award, Briefcase, MapPin, Clock, UserCheck } from 'lucide-react';

function EmployeeStatsPage() {
  const { employeeData = [], setEmployeeData } = useEmployeeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byJobType: [] as any[],
    byRegion: [] as any[],
    byCareerType: [] as any[],
    tenureDistribution: [] as any[],
    hiringTrend: [] as any[],
    averageTenure: 0,
    turnoverRate: 0,
  });

  // 데이터 로드
  useEffect(() => {
    const fetchEmployeeData = async () => {
      setIsLoading(true);
      try {
        // 전체 데이터를 가져오기 위해 limit을 크게 설정
        const response = await fetch('/api/employees?page=1&limit=10000');
        if (response.ok) {
          const result = await response.json();
          setEmployeeData(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 항상 최신 데이터를 가져오기
    fetchEmployeeData();
  }, []);

  // 통계 계산
  useEffect(() => {
    if (!employeeData || employeeData.length === 0) return;

    // 재직자만 필터링
    const activeEmployees = employeeData.filter(e => e.isActive);
    
    // 기본 통계 (재직자 기준)
    const total = activeEmployees.length;  // 전체는 재직자만
    const active = activeEmployees.length;
    const inactive = employeeData.filter(e => !e.isActive).length;  // 퇴직자 수

    // 직무별 통계
    const jobTypeMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const careerTypeMap = new Map<string, number>();
    const hiringByMonth = new Map<string, number>();

    let totalTenureDays = 0;
    let tenuredEmployees = 0;

    // 재직자만 대상으로 통계 계산
    activeEmployees.forEach(employee => {
      // 직무별
      const jobType = employee.jobType || '미분류';
      jobTypeMap.set(jobType, (jobTypeMap.get(jobType) || 0) + 1);

      // 지역별
      const region = employee.region || employee.province || '미분류';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);

      // 경력구분별 (전담사회복지사만)
      if (employee.jobType === '전담사회복지사' && employee.careerType) {
        careerTypeMap.set(employee.careerType, (careerTypeMap.get(employee.careerType) || 0) + 1);
      }

      // 입사 트렌드 (최근 12개월)
      if (employee.hireDate) {
        const hireDate = new Date(employee.hireDate);
        const monthKey = `${hireDate.getFullYear()}-${String(hireDate.getMonth() + 1).padStart(2, '0')}`;
        hiringByMonth.set(monthKey, (hiringByMonth.get(monthKey) || 0) + 1);
      }

      // 근속기간 계산 (재직자이므로 isActive 체크 불필요)
      if (employee.hireDate) {
        const hireDate = new Date(employee.hireDate);
        const today = new Date();
        const tenureDays = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
        totalTenureDays += tenureDays;
        tenuredEmployees++;
      }
    });

    // 평균 근속기간 (년 단위)
    const averageTenure = tenuredEmployees > 0 
      ? Number((totalTenureDays / tenuredEmployees / 365).toFixed(1))
      : 0;

    // 이직률 계산 (최근 12개월 기준, 재직자 대비)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentResignations = employeeData.filter(e => 
      e.resignDate && new Date(e.resignDate) >= oneYearAgo
    ).length;
    // 이직률 = (최근 퇴직자 / 재직자) * 100
    const turnoverRate = total > 0 
      ? Number(((recentResignations / total) * 100).toFixed(1))
      : 0;

    // 근속기간 분포
    const tenureRanges = [
      { range: '1년 미만', count: 0 },
      { range: '1-3년', count: 0 },
      { range: '3-5년', count: 0 },
      { range: '5-10년', count: 0 },
      { range: '10년 이상', count: 0 }
    ];

    // 재직자만 대상으로 근속기간 분포 계산
    activeEmployees.forEach(employee => {
      if (employee.hireDate) {
        const hireDate = new Date(employee.hireDate);
        const today = new Date();
        const years = (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (years < 1) tenureRanges[0].count++;
        else if (years < 3) tenureRanges[1].count++;
        else if (years < 5) tenureRanges[2].count++;
        else if (years < 10) tenureRanges[3].count++;
        else tenureRanges[4].count++;
      }
    });

    // 차트 데이터 변환
    const byJobType = Array.from(jobTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const byRegion = Array.from(regionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // 상위 10개 지역만

    const byCareerType = Array.from(careerTypeMap.entries())
      .map(([name, value]) => ({ name, value }));

    // 최근 12개월 입사 트렌드
    const sortedMonths = Array.from(hiringByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    setStats({
      total,
      active,
      inactive,
      byJobType,
      byRegion,
      byCareerType,
      tenureDistribution: tenureRanges,
      hiringTrend: sortedMonths,
      averageTenure,
      turnoverRate,
    });
  }, [employeeData]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // 로딩 중
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">종사자 통계</h1>
        <Card className="p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </Card>
      </div>
    );
  }

  // 데이터가 없는 경우 안내 메시지
  if (!employeeData || employeeData.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">종사자 통계</h1>
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">종사자 데이터가 없습니다</h3>
            <p className="text-gray-500">종사자 관리 &gt; 종사자 데이터 메뉴에서 데이터를 업로드해주세요.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">종사자 통계</h1>
        <div className="text-sm text-gray-500">
          재직자 {stats.total}명 | 퇴직자 {stats.inactive}명
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">재직 종사자</p>
              <p className="text-2xl font-bold">{stats.total}명</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">퇴직자</p>
              <p className="text-2xl font-bold">{stats.inactive}명</p>
            </div>
            <UserCheck className="h-8 w-8 text-gray-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">평균 근속기간</p>
              <p className="text-2xl font-bold">{stats.averageTenure}년</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">연간 이직률</p>
              <p className="text-2xl font-bold">{stats.turnoverRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 직무별 분포 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Briefcase className="mr-2 h-5 w-5" />
            직무별 분포
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.byJobType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}명`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.byJobType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 근속기간 분포 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            근속기간 분포
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.tenureDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 지역별 분포 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            지역별 분포 (상위 10개)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byRegion} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 월별 입사 트렌드 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            월별 입사 트렌드 (최근 12개월)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.hiringTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 경력구분별 통계 (전담사회복지사) */}
      {stats.byCareerType.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="mr-2 h-5 w-5" />
            전담사회복지사 경력구분
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.byCareerType.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">{item.name}</p>
                <p className="text-xl font-bold">{item.value}명</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 상세 통계 테이블 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">상세 통계</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">전체</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">재직</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">퇴직</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">재직률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.byJobType.map((job, index) => {
                // byJobType은 이미 재직자만 카운트한 데이터
                const jobCount = job.value;
                
                return (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{job.name}</td>
                    <td className="px-4 py-2 text-sm text-center">{jobCount}</td>
                    <td className="px-4 py-2 text-sm text-center text-green-600">{jobCount}</td>
                    <td className="px-4 py-2 text-sm text-center text-red-600">-</td>
                    <td className="px-4 py-2 text-sm text-center font-semibold">100%</td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-sm">합계</td>
                <td className="px-4 py-2 text-sm text-center">{stats.total}</td>
                <td className="px-4 py-2 text-sm text-center text-green-600">{stats.total}</td>
                <td className="px-4 py-2 text-sm text-center text-red-600">-</td>
                <td className="px-4 py-2 text-sm text-center">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default EmployeeStatsPage;