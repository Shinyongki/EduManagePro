import React, { useState, useEffect } from 'react';
import { useEmployeeStore } from '../store/employee-store';
import { Card } from '../components/ui/card';
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

    fetchEmployeeData();
  }, []);

  // 통계 계산
  useEffect(() => {
    if (!employeeData || employeeData.length === 0) return;

    const activeEmployees = employeeData.filter(e => e.isActive);
    
    const total = activeEmployees.length;
    const active = activeEmployees.length;
    const inactive = employeeData.filter(e => !e.isActive).length;

    const jobTypeMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const careerTypeMap = new Map<string, number>();
    const hiringByMonth = new Map<string, number>();

    let totalTenureDays = 0;
    let tenuredEmployees = 0;

    activeEmployees.forEach(employee => {
      const jobType = employee.jobType || '미분류';
      jobTypeMap.set(jobType, (jobTypeMap.get(jobType) || 0) + 1);

      const region = employee.region || employee.province || '미분류';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);

      if (employee.jobType === '전담사회복지사' && employee.careerType) {
        careerTypeMap.set(employee.careerType, (careerTypeMap.get(employee.careerType) || 0) + 1);
      }

      if (employee.hireDate) {
        const hireDate = new Date(employee.hireDate);
        const monthKey = `${hireDate.getFullYear()}-${String(hireDate.getMonth() + 1).padStart(2, '0')}`;
        hiringByMonth.set(monthKey, (hiringByMonth.get(monthKey) || 0) + 1);
        
        const today = new Date();
        const tenureDays = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
        totalTenureDays += tenureDays;
        tenuredEmployees++;
      }
    });

    const averageTenure = tenuredEmployees > 0 
      ? Number((totalTenureDays / tenuredEmployees / 365).toFixed(1))
      : 0;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentResignations = employeeData.filter(e => 
      e.resignDate && new Date(e.resignDate) >= oneYearAgo
    ).length;
    const turnoverRate = total > 0 
      ? Number(((recentResignations / total) * 100).toFixed(1))
      : 0;

    const tenureRanges = [
      { range: '1년 미만', count: 0 },
      { range: '1-3년', count: 0 },
      { range: '3-5년', count: 0 },
      { range: '5-10년', count: 0 },
      { range: '10년 이상', count: 0 }
    ];

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

    const byJobType = Array.from(jobTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const byRegion = Array.from(regionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const byCareerType = Array.from(careerTypeMap.entries())
      .map(([name, value]) => ({ name, value }));

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

  // 데이터가 없는 경우
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

      {/* 직무별 분포 테이블 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Briefcase className="mr-2 h-5 w-5" />
          직무별 분포
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.byJobType.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">{item.name}</p>
              <p className="text-xl font-bold">{item.value}명</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 근속기간 분포 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          근속기간 분포
        </h3>
        <div className="space-y-3">
          {stats.tenureDistribution.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{item.range}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{item.count}명</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 지역별 분포 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          지역별 분포 (상위 10개)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">지역</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">인원</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.byRegion.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm">{item.name}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.value}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 경력구분별 통계 */}
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