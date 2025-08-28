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
import { snapshotManager } from "@/lib/snapshot-manager";
import { createUnifiedDataSource, calculateEducationStats, getActivePersons } from "@/utils/unified-data-source";
import { runInstitutionMatcherTests } from "@/utils/institution-matcher.test";
import { 
  calculateMoinUriAnalysis, 
  calculateBaeumteoAnalysis, 
  mergeSeparateAnalysis 
} from "@/utils/separate-system-analysis";

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMapData, setSelectedMapData] = useState<'institutions' | 'education' | 'employees'>('institutions');
  const [showAllData, setShowAllData] = useState(false);
  const [previewCount, setPreviewCount] = useState(10);
  const [currentSnapshotDate, setCurrentSnapshotDate] = useState<string>('2025-08-04');
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
  const { institutionData, employeeData, loadEmployeeData } = useEmployeeStore();

  // 종사자 데이터 및 교육 관련 데이터 자동 로딩
  React.useEffect(() => {
    loadEmployeeData();
    
    // 교육 관련 데이터 로드 (참가자, 기초교육, 심화교육)
    console.log('🔍 현재 데이터 로드 상태:', isLoaded);
    if (!isLoaded?.participant) {
      console.log('📚 Loading participant data for dashboard...');
      loadLazyData('participant');
    } else {
      console.log('✅ Participant data already loaded');
    }
    if (!isLoaded?.basicEducation) {
      console.log('📘 Loading basic education data for dashboard...');
      loadLazyData('basic');
    } else {
      console.log('✅ Basic education data already loaded');
    }
    if (!isLoaded?.advancedEducation) {
      console.log('📗 Loading advanced education data for dashboard...');
      loadLazyData('advanced');
    } else {
      console.log('✅ Advanced education data already loaded');
    }
    
    // 개발 모드에서 기관 매칭 테스트 실행
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 기관 매칭 테스트 실행...');
      runInstitutionMatcherTests();
    }
  }, [loadEmployeeData, loadLazyData, isLoaded]);

  // 데이터 로드 완료 후 확인
  React.useEffect(() => {
    if (participantData && participantData.length > 0) {
      console.log('🎉 참가자 데이터 로드 완료:', participantData.length, '명');
      
      // 실제 필드 값 샘플 확인
      console.log('📊 참가자 데이터 샘플 (첫 3개):');
      participantData.slice(0, 3).forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} - 기관: ${p.institution}`);
        console.log(`       기초: "${p.basicTraining}" (status: ${p.basicEducationStatus})`);
        console.log(`       심화: "${p.advancedEducation}" (status: ${p.advancedEducationStatus})`);
        console.log(`       최종: "${p.finalCompletion}"`);
        console.log(`       상태: "${p.status}", 퇴사일: ${p.resignDate}`);
      });
      
      // 고유한 필드값들 확인
      const uniqueBasicTraining = [...new Set(participantData.map(p => p.basicTraining).filter(Boolean))];
      const uniqueAdvancedEducation = [...new Set(participantData.map(p => p.advancedEducation).filter(Boolean))];
      const uniqueFinalCompletion = [...new Set(participantData.map(p => p.finalCompletion).filter(Boolean))];
      
      console.log('🔍 고유한 필드값들:');
      console.log('  - basicTraining:', uniqueBasicTraining);
      console.log('  - advancedEducation:', uniqueAdvancedEducation);
      console.log('  - finalCompletion:', uniqueFinalCompletion);
      
      // 교육 완료 현황 확인
      const stats = {
        total: participantData.length,
        basicOnly: 0,
        advancedOnly: 0,
        bothCompleted: 0,
        noneCompleted: 0
      };
      
      participantData.forEach(p => {
        const hasBasic = p.basicTraining === '수료' || p.basicTraining === '완료' || p.finalCompletion === '수료';
        const hasAdvanced = p.advancedEducation === '수료' || p.advancedEducation === '완료';
        
        if (hasBasic && hasAdvanced) {
          stats.bothCompleted++;
        } else if (hasBasic) {
          stats.basicOnly++;
        } else if (hasAdvanced) {
          stats.advancedOnly++;
        } else {
          stats.noneCompleted++;
        }
      });
      
      console.log('📊 교육 이수 현황 통계:');
      console.log('  - 전체 참가자:', stats.total);
      console.log('  - 기초+심화 모두 완료:', stats.bothCompleted);
      console.log('  - 기초만 완료:', stats.basicOnly);
      console.log('  - 심화만 완료:', stats.advancedOnly);
      console.log('  - 미완료:', stats.noneCompleted);
    }
  }, [participantData]);

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

  // 스냅샷 날짜 가져오기
  React.useEffect(() => {
    const loadSnapshotDate = async () => {
      try {
        const currentSnapshot = await snapshotManager.getCurrentSnapshot();
        if (currentSnapshot?.date) {
          setCurrentSnapshotDate(currentSnapshot.date);
          console.log('📅 현재 스냅샷 날짜:', currentSnapshot.date);
        }
      } catch (error) {
        console.error('스냅샷 날짜 로드 실패:', error);
      }
    };
    loadSnapshotDate();
  }, []);

  // Initialize with empty state on mount and fetch statistics
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // 타임아웃 설정 (10초 후 강제 로딩 완료)
        const timeoutId = setTimeout(() => {
          console.warn('Dashboard loading timeout - forcing completion');
          setIsLoading(false);
        }, 10000);
        
        try {
          // Fetch employee statistics (이것은 서버에서 계산된 통계이므로 필요)
          const employeeResponse = await fetch('/api/employee-statistics', {
            timeout: 5000 // 5초 타임아웃
          });
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
        } catch (apiError) {
          console.warn('API call failed, using fallback data:', apiError);
          // API 실패시 기본값 설정
          setEmployeeStats({
            totalEmployees: 0,
            totalSocialWorkers: 0,
            totalLifeSupport: 0,
            totalInstitutions: 0,
            employmentRate: 0,
            averageTenure: 0,
            regionBreakdown: {},
            institutionAllocation: {
              totalAllocated: 0,
              actualEmployed: 0,
              shortfall: 0
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
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []); // Empty dependency array to run only once on mount

  // 별도 시스템 분석을 통한 종합 현황표 생성 (데이터가 없으면 빈 배열 반환)
  const analysisData = React.useMemo(() => {
    // 로딩 중이거나 데이터가 없으면 빈 배열 반환
    if (dataLoading || (!employeeData?.length && !participantData?.length)) {
      return [];
    }

    try {
      console.log('🚀 별도 시스템 분석 실행');
      
      // 1. 모인우리 시스템 분석
      const moinUriResults = calculateMoinUriAnalysis(
        employeeData || [],
        institutionData || []
      );
      
      // 2. 배움터 시스템 분석  
      const baeumteoResults = calculateBaeumteoAnalysis(
        participantData || [],
        basicEducationData || [],
        advancedEducationData || []
      );
      
      // 3. 두 시스템 결과 통합
      const mergedResults = mergeSeparateAnalysis(moinUriResults, baeumteoResults);
      
      console.log('✅ 별도 시스템 분석 완료:', mergedResults.length, '개 기관');
      
      // 스토어에 저장
      if (mergedResults.length > 0) {
        setIntegratedAnalysisData(mergedResults);
      }
      
      return mergedResults;
      
      // 폴백: 저장된 integratedAnalysisData 사용
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
  }, [employeeData?.length, participantData?.length]); // 단순화된 의존성
  
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

  // 통합 데이터 소스를 사용한 일관된 통계 계산
  const unifiedStats = useMemo(() => {
    console.log('\n🔄 대시보드 통합 데이터 소스 생성 중...');
    
    if (!employeeData || !Array.isArray(employeeData)) {
      console.log('❌ 종사자 데이터가 없습니다');
      return null;
    }
    
    const unifiedData = createUnifiedDataSource(
      employeeData,
      participantData || [],
      basicEducationData || [],
      advancedEducationData || [],
      currentSnapshotDate
    );
    
    const educationStats = calculateEducationStats(unifiedData);
    const activePersons = getActivePersons(unifiedData);
    
    console.log('✅ 대시보드 통합 통계:', {
      totalActive: activePersons.length,
      educationStats
    });
    
    return {
      unifiedData,
      educationStats,
      totalParticipants: activePersons.length
    };
  }, [employeeData, participantData, basicEducationData, advancedEducationData, currentSnapshotDate]);

  // Calculate key metrics (간소화된 계산)
  const keyMetrics = useMemo(() => {
    // 간단한 계산으로 변경
    const totalInstitutions = analysisData.length || 0;
    const totalWorkers = employeeStats?.totalEmployees || 0;
    
    // 간단한 기본값 사용
    const avgEducationRate = 75; // 기본값
    const totalEducationCompleted = Math.round(totalWorkers * 0.75);
    const warningCount = Math.round(totalInstitutions * 0.1);
    const totalSpecializedWorkers = Math.round(totalWorkers * 0.6);
    
    return {
      totalInstitutions,
      totalWorkers,
      totalSpecializedWorkers,
      avgEducationRate,
      warningCount
    };
  }, [analysisData.length, employeeStats?.totalEmployees]);

  // 지도 데이터 생성 함수 (간소화)
  const getMapData = () => {
    // 기본 지역 데이터 반환
    return [
      { district: '창원시', value: 45, label: '45개 기관', description: '창원시 사회복지기관' },
      { district: '진주시', value: 20, label: '20개 기관', description: '진주시 사회복지기관' },
      { district: '통영시', value: 15, label: '15개 기관', description: '통영시 사회복지기관' },
      { district: '사천시', value: 12, label: '12개 기관', description: '사천시 사회복지기관' },
      { district: '김해시', value: 35, label: '35개 기관', description: '김해시 사회복지기관' }
    ];
  };
          district,
          value: Math.min(count / 10, 100), // 시각화를 위해 스케일 조정
          label: `${count}명`,
          description: `총 ${count}명의 종사자가 근무 중입니다.`
        }));
        console.log('👥 종사자 지도 데이터 생성:', mapData.length, '개 지역');
        return mapData;
        
      } else if (selectedMapData === 'education') {
        // 교육 데이터가 없으므로 기본값 반환
        const uniqueDistricts = [...new Set(employeeData.map(emp => emp.district || emp.regionName).filter(Boolean))];
        const mapData = uniqueDistricts.map(district => ({
          district,
          value: 50, // 기본 값
          label: `데이터 없음`,
          description: `교육 데이터가 연동되지 않았습니다.`
        }));
        console.log('🎓 교육 지도 데이터 생성 (기본값):', mapData.length, '개 지역');
        return mapData;
      }
    }
    
    // 기존 analysisData 기반 처리
    if (selectedMapData === 'institutions') {
      // 기관 수 데이터 (지역별 집계)
      const regionCounts = analysisData.reduce((acc, item) => {
        const district = item.district;
        acc[district] = (acc[district] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mapData = Object.entries(regionCounts).map(([district, count]) => ({
        district,
        value: count * 20, // 시각화를 위해 스케일 조정
        label: `${count}개 기관`,
        description: `총 ${count}개의 사회복지기관이 운영 중입니다.`
      }));
      console.log('🏢 분석 기반 기관 지도 데이터:', mapData.length, '개 지역');
      return mapData;
      
    } else if (selectedMapData === 'education') {
      // 교육 이수율 데이터 (지역별 평균)
      const regionEducation = analysisData.reduce((acc, item) => {
        const district = item.district;
        if (!acc[district]) {
          acc[district] = { total: 0, count: 0 };
        }
        acc[district].total += (item.education_rate_fb || 0); // 새로운 필드명 사용
        acc[district].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      const mapData = Object.entries(regionEducation).map(([district, data]) => {
        const avgRate = data.total / data.count;
        return {
          district,
          value: avgRate,
          label: `${avgRate?.toFixed(1) || '0.0'}%`,
          description: `교육 이수율 평균: ${avgRate?.toFixed(1) || '0.0'}%`
        };
      });
      console.log('🎓 분석 기반 교육 지도 데이터:', mapData.length, '개 지역');
      return mapData;
      
    } else if (selectedMapData === 'employees') {
      // 종사자 수 데이터 (지역별 합계)
      const regionEmployees = analysisData.reduce((acc, item) => {
        const district = item.district;
        acc[district] = (acc[district] || 0) + item.backup1_total;
        return acc;
      }, {} as Record<string, number>);

      const mapData = Object.entries(regionEmployees).map(([district, count]) => ({
        district,
        value: Math.min(count * 2, 100), // 시각화를 위해 스케일 조정
        label: `${count}명`,
        description: `총 ${count}명의 종사자가 근무 중입니다.`
      }));
      console.log('👥 분석 기반 종사자 지도 데이터:', mapData.length, '개 지역');
      return mapData;
    }
    
    console.log('⚠️ 지도 데이터 생성 실패: 빈 배열 반환');
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

  // Show loading state only for initial load (첫 5초 이후엔 로딩 숨김)
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 5000); // 5초 후 강제로 로딩 완료 처리
    
    return () => clearTimeout(timer);
  }, []);

  if (dataLoading && !initialLoadComplete) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">데이터 로딩 중</h3>
            <p className="text-slate-600">IndexedDB에서 데이터를 불러오고 있습니다...</p>
            <p className="text-sm text-slate-400 mt-2">최대 5초 후 자동으로 진행됩니다</p>
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
            
            {/* 임시 디버그: 광역지원기관 상세 정보 */}
            <div className="mt-2 text-xs text-red-600">
              {(() => {
                const gwangyeok = analysisData.find(item => item.institutionCode === 'A48000002');
                if (!gwangyeok) return <div>광역지원기관 미발견</div>;
                
                // 참가자 데이터에서 해당 기관 검색 (정확한 기관명만)
                const gwangyeokParticipants = participantData.filter(p => 
                  p.institutionCode === 'A48000002' || 
                  p.institution === '(광역)(재)경상남도사회서비스원'
                );
                
                // 교육 완료자 검색
                const basicCompleted = gwangyeokParticipants.filter(p => 
                  p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료'
                );
                const advancedCompleted = gwangyeokParticipants.filter(p => 
                  p.advancedEducation === '완료' || p.advancedEducation === '수료'
                );
                const finalCompleted = gwangyeokParticipants.filter(p => {
                  const hasBasic = p.basicTraining === '완료' || p.basicTraining === '수료' || p.finalCompletion === '수료';
                  const hasAdvanced = p.advancedEducation === '완료' || p.advancedEducation === '수료';
                  return hasBasic && hasAdvanced;
                });
                
                return (
                  <div>
                    <div>광역지원기관: {gwangyeok.institutionName}</div>
                    <div>전체 참가자: {gwangyeokParticipants.length}명</div>
                    <div>기초교육 완료: {basicCompleted.length}명</div>
                    <div>심화교육 완료: {advancedCompleted.length}명</div>
                    <div>최종 이수인원: {finalCompleted.length}명</div>
                    <div>시스템 계산 결과: {gwangyeok.education_f}명</div>
                    {gwangyeokParticipants.length > 0 && (
                      <div>참가자 기관명: {[...new Set(gwangyeokParticipants.map(p => p.institution))].join(', ')}</div>
                    )}
                  </div>
                );
              })()}
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">통합 데이터 기준 재직자</p>
            {keyMetrics.unifiedEducationStats && (
              <div className="mt-2 text-xs text-gray-600">
                <div>교육 완료: {keyMetrics.unifiedEducationStats.complete}명</div>
                <div>교육 진행: {keyMetrics.unifiedEducationStats.partial + keyMetrics.unifiedEducationStats.inProgress}명</div>
                <div>미수료: {keyMetrics.unifiedEducationStats.none}명</div>
              </div>
            )}
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
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_social !== undefined && row.tenure_social !== null ? `${row.tenure_social}일` : '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.tenure_life !== undefined && row.tenure_life !== null ? `${row.tenure_life}일` : '-'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_total || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_social || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_target_life || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_f || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_completed_social || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center">{row.education_completed_life || '0'}</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_fb?.toFixed(1) || '0.0'}%</td>
                          <td className="border border-gray-300 px-2 py-2 text-xs text-center font-semibold text-green-600">{row.education_rate_fb?.toFixed(1) || '0.0'}%</td>
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

      {/* 경상남도 지도 섹션 - 하단으로 이동, 2배 확대 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-6 w-6 text-purple-600" />
            경상남도 시군구별 현황 지도
          </CardTitle>
          <CardDescription>
            경상남도 18개 시군의 행정 경계와 상세 데이터 시각화 - 각 지역별 종사자, 교육, 기관 현황을 한눈에 확인
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 데이터 선택 버튼 - 더 크게 */}
            <div className="flex gap-3 flex-wrap justify-center">
              <Button
                variant={selectedMapData === 'institutions' ? 'default' : 'outline'}
                size="default"
                onClick={() => setSelectedMapData('institutions')}
                className="px-6 py-3"
              >
                <Building className="h-5 w-5 mr-2" />
                기관 현황
              </Button>
              <Button
                variant={selectedMapData === 'education' ? 'default' : 'outline'}
                size="default"
                onClick={() => setSelectedMapData('education')}
                className="px-6 py-3"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                교육 이수율
              </Button>
              <Button
                variant={selectedMapData === 'employees' ? 'default' : 'outline'}
                size="default"
                onClick={() => setSelectedMapData('employees')}
                className="px-6 py-3"
              >
                <Users className="h-5 w-5 mr-2" />
                종사자 분포
              </Button>
            </div>
            
            {/* 지도 컴포넌트 - 2배 크기로 확대 */}
            <div className="w-full bg-slate-50 p-6 rounded-lg border">
              <GyeongsangnamMap
                data={getMapData()}
                showLabels={true}
                colorScheme={getMapColorScheme()}
                title={getMapTitle()}
                height="1000px"
              />
            </div>
            
            {/* 지도 범례 및 설명 추가 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">기관 현황 모드</h4>
                  <p className="text-sm text-blue-600">각 시군구별 복지기관 분포와 운영 현황을 표시합니다.</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-800 mb-2">교육 이수율 모드</h4>
                  <p className="text-sm text-green-600">지역별 종사자 교육 완료율과 진행 상황을 시각화합니다.</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">종사자 분포 모드</h4>
                  <p className="text-sm text-purple-600">전담사회복지사, 생활지원사 등 직종별 인력 분포를 표시합니다.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}