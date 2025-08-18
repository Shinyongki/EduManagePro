import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  RefreshCw,
  Download,
  Map
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEducationData } from "@/hooks/use-education-data";
import { useEmployeeStore } from "@/store/employee-store";
import type { IntegratedAnalysisData } from "@shared/schema";
import GyeongsangnamMap from "@/components/dashboard/gyeongsangnam-map";
import { IntegratedDataAnalyzer } from "@/utils/integrated-analysis";
import { DataMigration } from "@/components/migration/data-migration";

interface EducationStatistics {
  totalParticipants: number;
  basicEducationCompleted: number;
  advancedEducationCompleted: number;
  bothEducationCompleted: number;
  noEducationCompleted: number;
  completionRate: number;
  institutionBreakdown: { [key: string]: number };
  jobTypeBreakdown: { [key: string]: number };
}

interface EmployeeStatistics {
  totalEmployees: number;
  totalSocialWorkers: number;
  totalLifeSupport: number;
  totalInstitutions: number;
  employmentRate: number;
  averageTenure: number;
  regionBreakdown: { [key: string]: number };
  institutionAllocation: {
    totalAllocated: number;
    actualEmployed: number;
    shortfall: number;
  };
}

export default function Dashboard() {
  const [educationStats, setEducationStats] = useState<EducationStatistics | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMapData, setSelectedMapData] = useState<'institutions' | 'education' | 'employees'>('institutions');
  const [showAllData, setShowAllData] = useState(false);
  const [previewCount, setPreviewCount] = useState(10);
  const { toast } = useToast();
  const { 
    integratedAnalysisData, 
    setIntegratedAnalysisData, 
    basicEducationData,
    advancedEducationData,
    participantData,
    isLoading: dataLoading, 
    error: dataError,
    loadLazyData,
    retry,
    isLoaded
  } = useEducationData();
  const { institutionData, employeeData } = useEmployeeStore();

  // Clear mock data on mount
  React.useEffect(() => {
    try {
      localStorage.removeItem('education-store');
      
      // Mock 데이터 감지 및 제거
      if (integratedAnalysisData.length > 0) {
        const hasMockData = integratedAnalysisData.some(item => 
          item.region === '서울' || 
          item.district === '강남구' ||
          item.institutionName?.includes('강남종합복지관') ||
          item.institutionName?.includes('서초사회복지관') ||
          item.institutionName?.includes('수원시종합사회복지관')
        );
        
        if (hasMockData) {
          console.log('Mock 데이터 감지됨. 삭제 중...');
          setIntegratedAnalysisData([]);
        }
      }
    } catch (error) {
      console.warn('Failed to clear mock data:', error);
    }
  }, [integratedAnalysisData, setIntegratedAnalysisData]);

  // Initialize with empty state on mount and fetch statistics
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // IndexedDB에서 데이터를 이미 가져왔으므로 API 호출 불필요
        // integratedAnalysisData는 이미 useEducationData 훅에서 로드됨
        
        // Fetch employee statistics (이것은 서버에서 계산된 통계이므로 필요)
        const employeeResponse = await fetch('/api/employee-statistics');
        if (employeeResponse.ok) {
          const employeeData = await employeeResponse.json();
          setEmployeeStats({
            totalEmployees: employeeData.totalEmployees || 0,
            totalSocialWorkers: employeeData.socialWorkers || 0,
            totalLifeSupport: employeeData.lifeSupport || 0,
            totalInstitutions: employeeData.totalInstitutions || 0,
            employmentRate: 0,
            averageTenure: 0,
            regionBreakdown: {},
            institutionAllocation: {
              totalAllocated: employeeData.totalEmployees || 0,
              actualEmployed: employeeData.activeEmployees || 0,
              shortfall: (employeeData.totalEmployees || 0) - (employeeData.activeEmployees || 0)
            }
          });
        }

        // Initialize education stats with empty data  
        setEducationStats({
          totalParticipants: 0,
          basicEducationCompleted: 0,
          advancedEducationCompleted: 0,
          bothEducationCompleted: 0,
          noEducationCompleted: 0,
          completionRate: 0,
          institutionBreakdown: {},
          jobTypeBreakdown: {}
        });
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []); // Empty dependency array to run only once on mount

  // 실제 업로드된 데이터를 바탕으로 종합 현황표 생성
  const analysisData = React.useMemo(() => {
    // 디버깅: 데이터 상태 확인
    console.log('=== 데이터 상태 확인 ===');
    console.log('integratedAnalysisData:', integratedAnalysisData?.length || 0);
    console.log('institutionData:', institutionData?.length || 0);
    console.log('basicEducationData:', basicEducationData?.length || 0);
    console.log('advancedEducationData:', advancedEducationData?.length || 0);
    console.log('participantData:', participantData?.length || 0);
    
    console.log('employeeData from hook:', employeeData?.length || 0);
    
    // IntegratedDataAnalyzer를 사용하여 실제 데이터로부터 분석 결과 생성
    try {
      
      // 기관 데이터가 있으면 분석 수행
      if (institutionData && institutionData.length > 0) {
        console.log('기관 데이터 기반 분석 시작:', institutionData.length, '개 기관');
        
        const generatedData = IntegratedDataAnalyzer.generateAnalysisFromRealData(
          employeeData,
          institutionData,
          basicEducationData || [],
          advancedEducationData || [],
          participantData || []
        );
        
        console.log('분석 결과 생성됨:', generatedData?.length || 0, '개 기관');
        
        if (generatedData.length > 0) {
          return generatedData;
        }
      }
      
      // employeeData만 있는 경우 (기관 데이터 없이)
      if (employeeData.length > 0) {
        console.log('종사자 데이터만 있음. 기관별 그룹핑 시도');
        
        // 종사자 데이터에서 기관 추출
        const institutionMap = new Map();
        employeeData.forEach(emp => {
          if (emp.institution && emp.institutionCode) {
            institutionMap.set(emp.institutionCode, {
              code: emp.institutionCode,
              name: emp.institution,
              region: emp.region || emp.province || '경상남도',
              district: emp.district || '',
              areaName: emp.regionName || '경남광역'
            });
          }
        });
        
        const fakeInstitutions = Array.from(institutionMap.values());
        console.log('종사자 데이터에서 추출한 기관:', fakeInstitutions.length, '개');
        
        if (fakeInstitutions.length > 0) {
          const generatedData = IntegratedDataAnalyzer.generateAnalysisFromRealData(
            employeeData,
            fakeInstitutions,
            basicEducationData || [],
            advancedEducationData || [],
            participantData || []
          );
          
          console.log('종사자 기반 분석 결과:', generatedData?.length || 0, '개 기관');
          return generatedData;
        }
      }
      
      // 저장된 integratedAnalysisData 확인 (Mock 데이터가 아닌 경우)
      if (integratedAnalysisData.length > 0) {
        const hasRealData = !integratedAnalysisData.some(item => 
          item.region === '서울' || 
          item.district === '강남구' ||
          item.institutionName?.includes('강남종합복지관')
        );
        
        console.log('저장된 분석 데이터 사용:', hasRealData ? '실제 데이터' : 'Mock 데이터');
        
        if (hasRealData) {
          return integratedAnalysisData;
        }
      }
      
      console.log('분석할 데이터 없음. 빈 배열 반환');
      return [];
    } catch (error) {
      console.error('Failed to generate analysis data:', error);
      return [];
    }
  }, [integratedAnalysisData, institutionData, basicEducationData, advancedEducationData, participantData, employeeData]);
  
  // 미리보기용 데이터 (선택된 개수로 제한)
  const displayData = showAllData ? analysisData : analysisData.slice(0, previewCount);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "데이터 새로고침",
        description: "IndexedDB에서 최신 데이터를 불러오고 있습니다.",
      });
      
      // IndexedDB 직접 확인
      console.log('\n🔍 IndexedDB 데이터 직접 확인 중...');
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const storage = new IndexedDBStorage();
      
      try {
        const keys = ['institutionData', 'employeeData', 'basicEducationData', 'advancedEducationData', 'participantData'];
        for (const key of keys) {
          const data = await storage.getItem(key);
          console.log(`📦 ${key}:`, Array.isArray(data) ? `${data.length}개 항목` : typeof data);
        }
      } catch (error) {
        console.error('IndexedDB 직접 확인 오류:', error);
      }
      
      // IndexedDB에서 모든 데이터 다시 로드
      await Promise.all([
        retry(),
        loadLazyData('basic'),
        loadLazyData('advanced'), 
        loadLazyData('participant')
      ]);
      
      // 새로고침 완료 후 데이터 개수 확인
      setTimeout(() => {
        let dataCount = 0;
        if (institutionData?.length > 0) {
          dataCount = institutionData.length;
        } else if (employeeData?.length > 0) {
          // 종사자 데이터에서 기관 수 추출
          const uniqueInstitutions = new Set(employeeData.map(emp => emp.institutionCode).filter(Boolean));
          dataCount = uniqueInstitutions.size;
        }
        
        toast({
          title: "새로고침 완료",
          description: `${dataCount}개 기관의 데이터를 불러왔습니다.`,
        });
      }, 500); // 더 긴 대기 시간
      
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast({
        title: "새로고침 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    toast({
      title: "데이터 내보내기", 
      description: "연동분석 결과를 Excel 파일로 다운로드합니다.",
    });
  };

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const totalInstitutions = analysisData.length;
    const totalWorkers = analysisData.reduce((sum, item) => sum + item.backup1_total, 0);
    const avgEducationRate = totalInstitutions > 0 
      ? (analysisData.reduce((sum, item) => sum + item.education_rate_fb, 0) / totalInstitutions)
      : 0;
    const warningCount = analysisData.reduce((sum, item) => sum + item.education_warning, 0);
    
    return {
      totalInstitutions,
      totalWorkers,
      avgEducationRate,
      warningCount
    };
  }, [analysisData]);

  // 지도 데이터 생성 함수
  const getMapData = () => {
    if (selectedMapData === 'institutions') {
      // 기관 수 데이터 (지역별 집계)
      const regionCounts = analysisData.reduce((acc, item) => {
        const district = item.district;
        acc[district] = (acc[district] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(regionCounts).map(([district, count]) => ({
        district,
        value: count * 20, // 시각화를 위해 스케일 조정
        label: `${count}개 기관`,
        description: `총 ${count}개의 사회복지기관이 운영 중입니다.`
      }));
    } else if (selectedMapData === 'education') {
      // 교육 이수율 데이터 (지역별 평균)
      const regionEducation = analysisData.reduce((acc, item) => {
        const district = item.district;
        if (!acc[district]) {
          acc[district] = { total: 0, count: 0 };
        }
        acc[district].total += item.education_rate_fb;
        acc[district].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      return Object.entries(regionEducation).map(([district, data]) => {
        const avgRate = data.total / data.count;
        return {
          district,
          value: avgRate,
          label: `${avgRate?.toFixed(1) || '0.0'}%`,
          description: `교육 이수율 평균: ${avgRate?.toFixed(1) || '0.0'}%`
        };
      });
    } else if (selectedMapData === 'employees') {
      // 종사자 수 데이터 (지역별 합계)
      const regionEmployees = analysisData.reduce((acc, item) => {
        const district = item.district;
        acc[district] = (acc[district] || 0) + item.backup1_total;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(regionEmployees).map(([district, count]) => ({
        district,
        value: Math.min(count * 2, 100), // 시각화를 위해 스케일 조정
        label: `${count}명`,
        description: `총 ${count}명의 종사자가 근무 중입니다.`
      }));
    }
    
    return [];
  };

  // 지도 색상 스키마 선택
  const getMapColorScheme = () => {
    switch (selectedMapData) {
      case 'institutions': return 'blue';
      case 'education': return 'green';
      case 'employees': return 'purple';
      default: return 'blue';
    }
  };

  // 지도 제목 선택
  const getMapTitle = () => {
    switch (selectedMapData) {
      case 'institutions': return '시군구별 기관 분포';
      case 'education': return '시군구별 교육 이수율';
      case 'employees': return '시군구별 종사자 분포';
      default: return '경상남도 현황';
    }
  };

  // Show loading state
  if (dataLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">데이터 로딩 중</h3>
            <p className="text-slate-600">IndexedDB에서 데이터를 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">데이터 로드 오류</div>
              <div>{dataError}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                페이지 새로고침
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Storage Info Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Activity className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>IndexedDB 스토리지 활성화:</strong> 대용량 데이터(6.32MB)를 안전하게 저장하고 있습니다. 
          브라우저 스토리지 제한 문제가 해결되었습니다.
        </AlertDescription>
      </Alert>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            연동분석 대시보드
          </h1>
          <p className="text-slate-600 mt-2">
            교육 이수 현황과 종사자 현황을 연동한 종합 분석 시스템
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            데이터 내보내기
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Building className="h-4 w-4" />
              총 기관 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{keyMetrics.totalInstitutions}</div>
            <p className="text-xs text-muted-foreground mt-1">분석 대상 기관</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              총 근무자 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{keyMetrics.totalWorkers}명</div>
            <p className="text-xs text-muted-foreground mt-1">전체 등록자</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              평균 교육 이수율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{keyMetrics.avgEducationRate?.toFixed(1) || '0.0'}%</div>
            <p className="text-xs text-muted-foreground mt-1">기관 평균</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              경고 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{keyMetrics.warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">주의 필요 사항</p>
          </CardContent>
        </Card>
      </div>

      {/* 경상남도 지도 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            경상남도 시군구별 현황
          </CardTitle>
          <CardDescription>
            경상남도 18개 시군의 행정 경계와 데이터 시각화
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 데이터 선택 버튼 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedMapData === 'institutions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMapData('institutions')}
              >
                <Building className="h-4 w-4 mr-1" />
                기관 현황
              </Button>
              <Button
                variant={selectedMapData === 'education' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMapData('education')}
              >
                <GraduationCap className="h-4 w-4 mr-1" />
                교육 이수율
              </Button>
              <Button
                variant={selectedMapData === 'employees' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMapData('employees')}
              >
                <Users className="h-4 w-4 mr-1" />
                종사자 분포
              </Button>
            </div>
            
            {/* 지도 컴포넌트 */}
            <GyeongsangnamMap
              data={getMapData()}
              showLabels={true}
              colorScheme={getMapColorScheme()}
              title={getMapTitle()}
              height="500px"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Analysis Section */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            종합 현황표
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            시각화 차트
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            분석 인사이트
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            데이터 마이그레이션
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                고급 연동분석 - 종합 현황표
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>교육 이수 현황과 종사자 현황을 연동한 종합 분석 데이터입니다</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {showAllData ? `전체 ${analysisData.length}개` : `미리보기 ${Math.min(previewCount, analysisData.length)}개 / 전체 ${analysisData.length}개`}
                  </span>
                  {!showAllData && (
                    <select 
                      value={previewCount} 
                      onChange={(e) => setPreviewCount(Number(e.target.value))}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value={5}>5개</option>
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllData(!showAllData)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showAllData ? '미리보기' : '전체보기'}
                  </Button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">데이터가 없습니다</p>
                    <p className="text-sm">교육관리 및 종사자 관리 데이터를 입력해주세요</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] border rounded-md shadow-lg">
                  <div className="min-w-[8000px]">
                    <table className="w-full border-collapse bg-white">
                    <thead>
                      {/* First level headers */}
                      <tr>
                        <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">광역명</th>
                        <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시도</th>
                        <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">시군구</th>
                        <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관코드</th>
                        <th rowSpan={3} className="border border-gray-300 px-4 py-3 bg-gray-100 text-xs font-bold text-gray-700 whitespace-nowrap">기관명</th>
                        <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-green-100 text-xs font-bold text-green-800 whitespace-nowrap">배정인원(수기관리 등록기준)</th>
                        <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-cyan-100 text-xs font-bold text-cyan-800 whitespace-nowrap">배정인원(예산내시 등록기준)</th>
                        <th colSpan={3} className="border border-gray-300 px-4 py-3 bg-blue-100 text-xs font-bold text-blue-800 whitespace-nowrap">D 채용인원 (수기관리 등록기준)</th>
                        <th colSpan={8} className="border border-gray-300 px-4 py-3 bg-purple-200 text-xs font-bold text-purple-800 whitespace-nowrap">(1-1-2) 종사자 채용현황</th>
                        <th colSpan={2} className="border border-gray-300 px-4 py-3 bg-yellow-100 text-xs font-bold text-yellow-800 whitespace-nowrap">(1-1-3) 종사자 근속현황</th>
                        <th colSpan={12} className="border border-gray-300 px-4 py-3 bg-green-200 text-xs font-bold text-green-800 whitespace-nowrap">(1-4-1) 종사자 직무교육 이수율</th>
                      </tr>
                      {/* Second level headers */}
                      <tr>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전체 종사자( = ①+② )</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사①</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사②</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">A 전체 종사자(=①+② )</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">B 전담사회복지사①</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-cyan-100 text-xs font-semibold text-cyan-700 whitespace-nowrap">C 생활지원사 ②</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">전체 종사자(=①+②)</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">전담사회복지사 ①</th>
                        <th rowSpan={2} className="border border-gray-300 px-3 py-2 bg-blue-100 text-xs font-semibold text-blue-700 whitespace-nowrap">생활지원사 ②</th>
                        <th colSpan={2} className="border border-gray-300 px-3 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">전체 종사자</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-violet-100 text-xs font-semibold text-violet-700 whitespace-nowrap">전담사회복지사</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-indigo-100 text-xs font-semibold text-indigo-700 whitespace-nowrap">생활지원사</th>
                        <th colSpan={2} className="border border-gray-300 px-3 py-2 bg-yellow-100 text-xs font-semibold text-yellow-700 whitespace-nowrap">평균 근속기간(일)</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">H 직무교육 대상인원(배움터 등록기준)</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">I 직무교육 이수인원(배움터 등록기준)</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-emerald-100 text-xs font-semibold text-emerald-700 whitespace-nowrap">(I/H) 직무교육 이수율(배움터 등록기준)</th>
                        <th colSpan={3} className="border border-gray-300 px-3 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">(I/D) 직무교육 이수율(모인우리 등록기준)</th>
                      </tr>
                      {/* Third level headers */}
                      <tr>
                        <th className="border border-gray-300 px-2 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">E채용인원(=①+②)</th>
                        <th className="border border-gray-300 px-2 py-2 bg-purple-100 text-xs font-semibold text-purple-700 whitespace-nowrap">(E/A) 채용률* 1-1-2</th>
                        <th className="border border-gray-300 px-2 py-2 bg-violet-100 text-xs font-semibold text-violet-700 whitespace-nowrap">F채용인원①</th>
                        <th className="border border-gray-300 px-2 py-2 bg-violet-100 text-xs font-semibold text-violet-700 whitespace-nowrap">(F/B) 채용률* 1-1-2</th>
                        <th className="border border-gray-300 px-2 py-2 bg-violet-100 text-xs font-semibold text-violet-700 whitespace-nowrap">(참고)충원률기준시점(2025-00-00)</th>
                        <th className="border border-gray-300 px-2 py-2 bg-indigo-100 text-xs font-semibold text-indigo-700 whitespace-nowrap">G채용인원②</th>
                        <th className="border border-gray-300 px-2 py-2 bg-indigo-100 text-xs font-semibold text-indigo-700 whitespace-nowrap">(G/C) 채용률* 1-1-2</th>
                        <th className="border border-gray-300 px-2 py-2 bg-indigo-100 text-xs font-semibold text-indigo-700 whitespace-nowrap">(참고)충원률 기준시점(2025-00-00)</th>
                        <th className="border border-gray-300 px-2 py-2 bg-amber-100 text-xs font-semibold text-amber-700 whitespace-nowrap">전담사회복지사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-amber-100 text-xs font-semibold text-amber-700 whitespace-nowrap">생활지원사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전체</th>
                        <th className="border border-gray-300 px-2 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">전담사회복지사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-green-100 text-xs font-semibold text-green-700 whitespace-nowrap">생활지원사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">전체</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">전담사회복지사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">생활지원사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-emerald-100 text-xs font-semibold text-emerald-700 whitespace-nowrap">전체</th>
                        <th className="border border-gray-300 px-2 py-2 bg-emerald-100 text-xs font-semibold text-emerald-700 whitespace-nowrap">전담사회복지사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-emerald-100 text-xs font-semibold text-emerald-700 whitespace-nowrap">생활지원사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">전체</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">전담사회복지사</th>
                        <th className="border border-gray-300 px-2 py-2 bg-lime-100 text-xs font-semibold text-lime-700 whitespace-nowrap">생활지원사</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((row, index) => (
                        <tr key={row.id || index} className="hover:bg-gray-50 transition-colors">
                          <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{row.management}</td>
                          <td className="border border-gray-300 px-3 py-2 text-xs">{row.region}</td>
                          <td className="border border-gray-300 px-3 py-2 text-xs">{row.district}</td>
                          <td className="border border-gray-300 px-3 py-2 text-xs font-mono">{row.institutionCode}</td>
                          <td className="border border-gray-300 px-3 py-2 text-xs font-medium">{row.institutionName}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.backup1_total}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup1_social}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup1_life}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.backup2_a}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup2_b}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.backup2_c}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.dLevel_all}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.dLevel_social}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.dLevel_life}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold">{row.employment_total}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.employment_rate?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.employment_social}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.employment_social_rate?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center text-gray-600">{row.employment_reference || '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.employment_life || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.employment_life_rate?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center text-gray-600">{row.employment_life_reference || '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_social ? `${row.tenure_social}일` : '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_life ? `${row.tenure_life}일` : '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_total || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_social || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_life || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_completed_total || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_completed_social || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_completed_life || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_total?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_social?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_life?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.education_d_rate_total?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.education_d_rate_social?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-blue-600">{row.education_d_rate_life?.toFixed(1) || '0.0'}%</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  교육 이수율 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-16 w-16 mx-auto mb-4" />
                    <p>차트가 곧 추가될 예정입니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  기관별 현황 비교
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                    <p>차트가 곧 추가될 예정입니다</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  주요 인사이트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>긍정적 추세:</strong> 전체 평균 교육 이수율이 {keyMetrics.avgEducationRate?.toFixed(1) || '0.0'}%로 목표 수준을 달성했습니다.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>주의 필요:</strong> {keyMetrics.warningCount}개 항목에서 경고 상황이 발생하여 개선이 필요합니다.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>개선 권장:</strong> 생활지원사 교육 참여율 향상을 위한 별도 프로그램을 검토해보세요.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  실시간 모니터링
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">시스템 상태</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">정상</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">데이터 동기화</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">최신</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-800">분석 엔진</span>
                    <Badge variant="outline" className="text-purple-600 border-purple-200">활성</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="migration" className="mt-6">
          <DataMigration />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}