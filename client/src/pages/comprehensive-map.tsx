import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin,
  Building,
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  ArrowLeft,
  Star,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GyeongsangnamMap from "@/components/dashboard/gyeongsangnam-map";
import { Link } from "wouter";

interface StatusReportData {
  id: string;
  management: string;
  region: string;
  district: string;
  institutionCode: string;
  institutionName: string;
  
  // 배정인원 (수기관리 등록기준)
  backup1_total: number;
  backup1_social: number;
  backup1_life: number;
  
  // 배정인원 (예산내시 등록기준) 
  backup2_a: number;
  backup2_b: number;
  backup2_c: number;
  
  // D 채용인원
  dLevel_all: number;
  dLevel_social: number;
  dLevel_life: number;
  
  // 종사자 채용현황
  employment_total: number;
  employment_rate: number;
  employment_social: number;
  employment_social_rate: number;
  employment_reference?: string;
  employment_life: number;
  employment_life_rate: number;
  employment_life_reference?: string;
  
  // 종사자 근속현황
  tenure_social: number;
  tenure_life: number;
  
  // 종사자 직무교육 이수율
  education_f: number;
  education_rate_fb: number;
  education_social_rate: number;
  education_life_rate: number;
  education_warning?: number;
  education_g?: number;
  
  // I/H 교육 이수율 (대시보드와 동일)
  educationRateIH_Total?: number;
  educationRateIH_SocialWorkers?: number;
  educationRateIH_LifeSupport?: number;
  
  // 계산된 필드들
  hasAllocationDifference: boolean;
}

interface MapData {
  district: string;
  value?: number;
  label?: string;
  color?: string;
  description?: string;
}

export default function ComprehensiveMap() {
  const [statusReportData, setStatusReportData] = useState<StatusReportData[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedMapType, setSelectedMapType] = useState<string>('institutions');
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const { toast } = useToast();

  // 데이터 로드
  useEffect(() => {
    loadStatusReportData();
  }, []);

  // 대시보드와 동일한 데이터 로딩 로직
  const fetchStatusReportData = async () => {
    try {
      // 각 페이지의 API를 활용하여 데이터 수집 (대시보드와 동일)
      const [employeeResponse, educationResponse, institutionResponse, participantResponse] = await Promise.all([
        fetch('/api/employees?limit=10000'),
        fetch('/api/education?limit=10000'),
        fetch('/api/institutions'),
        fetch('/api/participants?limit=10000')
      ]);

      const employeeData = employeeResponse.ok ? await employeeResponse.json() : { data: [] };
      const educationData = educationResponse.ok ? await educationResponse.json() : { data: [] };
      const institutionData = institutionResponse.ok ? await institutionResponse.json() : { data: [] };
      const participantData = participantResponse.ok ? await participantResponse.json() : { data: [] };

      console.log('API 응답 확인:', {
        employeeData: employeeData.data?.length || 0,
        educationData: educationData.data?.length || 0,
        institutionData: institutionData.data?.length || 0,
        participantData: participantData.data?.length || 0
      });

      // 데이터 구조 확인
      const institutions = institutionData.data || institutionData || [];
      
      // 대시보드의 데이터 처리 로직 적용
      const statusReportData = institutions.map((institution: any) => {
        const employees = employeeData.data || employeeData || [];
        const participants = participantData.data || participantData || [];
        const basicEducation = educationData.data || educationData || [];
        
        const institutionEmployees = employees.filter((emp: any) => 
          emp.institution === institution.name || emp.institutionCode === institution.code
        );
        
        const activeEmployees = institutionEmployees.filter((emp: any) => emp.isActive);
        const socialWorkers = activeEmployees.filter((emp: any) => 
          emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
        );
        const lifeSupport = activeEmployees.filter((emp: any) => emp.jobType === '생활지원사');

        // 교육 데이터 (대시보드와 동일한 방식)
        const allInstitutionEducation = basicEducation.filter((edu: any) => 
          edu.institutionName === institution.name || edu.institutionCode === institution.code
        );
        
        // 정상 상태의 교육 데이터만 필터링
        const institutionEducation = allInstitutionEducation.filter((edu: any) => {
          const isNormalStatus = edu.rawStatus === '정상' || edu.rawStatus === 'normal' || edu.rawStatus === 'Normal';
          return isNormalStatus;
        });

        // 대시보드와 동일한 I/H 교육 이수율 계산 방식
        // H: 교육 대상인원 (재직 종사자 기준) - 대시보드와 동일하게 변경
        const educationTargetH_Total = activeEmployees.length;
        const educationTargetH_SocialWorkers = socialWorkers.length;
        const educationTargetH_LifeSupport = lifeSupport.length;

        // 재직자 명단
        const activeEmployeeNames = activeEmployees.map(emp => emp.name);

        // I 교육 완료 인원 (수료한 고유한 회원 수) - 대시보드와 동일한 방식
        const completedEducation = institutionEducation.filter((edu: any) => {
          return edu.status === '수료'; // 수료한 경우만
        });

        // I 교육 완료 인원 (수료한 재직자만 카운트) - 대시보드와 동일
        const completedActiveNames = [...new Set(completedEducation.map((edu: any) => edu.name))]
          .filter(name => activeEmployeeNames.includes(name));
        
        // 전담사회복지사 이수 완료자 (재직자 중에서)
        const completedActiveSocialWorkers = [...new Set(
          completedEducation
            .filter((edu: any) => edu.jobType === '전담사회복지사' || edu.jobType?.includes('사회복지사'))
            .map((edu: any) => edu.name)
        )].filter(name => {
          const emp = activeEmployees.find((e: any) => e.name === name);
          return emp && (emp.jobType === '전담사회복지사' || emp.jobType?.includes('전담'));
        });
        
        // 생활지원사 이수 완료자 (재직자 중에서)
        const completedActiveLifeSupport = [...new Set(
          completedEducation
            .filter((edu: any) => edu.jobType === '생활지원사' || edu.jobType?.includes('생활지원'))
            .map((edu: any) => edu.name)
        )].filter(name => {
          const emp = activeEmployees.find((e: any) => e.name === name);
          return emp && (emp.jobType === '생활지원사' || emp.jobType?.includes('생활지원'));
        });

        const educationCompletedI_Total = [...new Set(completedActiveNames)].length;
        const educationCompletedI_SocialWorkers = [...new Set(completedActiveSocialWorkers)].length;
        const educationCompletedI_LifeSupport = [...new Set(completedActiveLifeSupport)].length;

        // I/H 비율 계산
        const socialEducationRate = educationTargetH_SocialWorkers > 0 ? 
          (educationCompletedI_SocialWorkers / educationTargetH_SocialWorkers) * 100 : 0;
        const lifeEducationRate = educationTargetH_LifeSupport > 0 ?
          (educationCompletedI_LifeSupport / educationTargetH_LifeSupport) * 100 : 0;

        // 디버깅 로그 추가 (양산시 기관들 포함)
        if (institution.name.includes('효능원') || institution.name.includes('김해시') || institution.name.includes('통합지원센터') || 
            institution.name.includes('양산') || institution.district === '양산시') {
          console.log(`=== ${institution.name} 상세 분석 ===`);
          console.log('기관 직원:', {
            socialWorkers: socialWorkers.length,
            lifeSupport: lifeSupport.length,
            activeEmployeeNames: activeEmployeeNames
          });
          console.log('교육 데이터:', {
            allEducation: allInstitutionEducation.length,
            normalEducation: institutionEducation.length,
            completedEducation: completedEducation.length,
            completedActiveNames: completedActiveNames.length,
            completedActiveSocialWorkers: completedActiveSocialWorkers.length,
            completedActiveLifeSupport: completedActiveLifeSupport.length
          });
          console.log('I/H 계산:', {
            educationTargetH_Total,
            educationTargetH_SocialWorkers,
            educationTargetH_LifeSupport,
            educationCompletedI_Total,
            educationCompletedI_SocialWorkers,
            educationCompletedI_LifeSupport,
            completedActiveNames: completedActiveNames
          });
          console.log('계산 결과:', {
            socialEducationRate,
            lifeEducationRate
          });
        }

        return {
          id: `analysis_${institution.code}`,
          management: '경남광역',
          region: '경상남도',
          district: institution.district || '',
          institutionCode: institution.code,
          institutionName: institution.name,
          
          // 수기관리 배정
          backup1_total: (institution.allocatedSocialWorkers || 0) + (institution.allocatedLifeSupport || 0),
          backup1_social: institution.allocatedSocialWorkers || 0,
          backup1_life: institution.allocatedLifeSupport || 0,
          
          // 예산내시 배정 (정부 배정)
          backup2_a: (institution.allocatedSocialWorkersGov || 0) + (institution.allocatedLifeSupportGov || 0),
          backup2_b: institution.allocatedSocialWorkersGov || 0,
          backup2_c: institution.allocatedLifeSupportGov || 0,
          
          // 실제 채용
          dLevel_all: activeEmployees.length,
          dLevel_social: socialWorkers.length,
          dLevel_life: lifeSupport.length,
          
          // 채용률
          employment_social_rate: institution.allocatedSocialWorkersGov > 0 ? 
            (socialWorkers.length / institution.allocatedSocialWorkersGov) * 100 : 0,
          employment_life_rate: institution.allocatedLifeSupportGov > 0 ? 
            (lifeSupport.length / institution.allocatedLifeSupportGov) * 100 : 0,
          
          // 교육 이수율 (I/H 방식)
          educationRateIH_Total: educationTargetH_Total > 0 ? (educationCompletedI_Total / educationTargetH_Total) * 100 : 0,
          educationRateIH_SocialWorkers: socialEducationRate,
          educationRateIH_LifeSupport: lifeEducationRate,
          education_social_rate: socialEducationRate,
          education_life_rate: lifeEducationRate,
          
          // 근속
          tenure_social: 0, // 계산 생략
          tenure_life: 0
        };
      });

      return statusReportData;
    } catch (error) {
      console.error('Failed to fetch status report data:', error);
      return [];
    }
  };

  const loadStatusReportData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchStatusReportData();
      
      // 배정 차이 확인
      const processedData = data.map((item: any) => {
        const manualTotal = (item.backup1_social || 0) + (item.backup1_life || 0);
        const budgetTotal = (item.backup2_b || 0) + (item.backup2_c || 0);
        const hasAllocationDifference = manualTotal !== budgetTotal;
        
        console.log(`${item.institutionName}: 수기=${manualTotal}, 예산=${budgetTotal}, 차이=${hasAllocationDifference}`);
        
        return {
          ...item,
          hasAllocationDifference
        };
      });
      
      setStatusReportData(processedData);
      
      // 데이터 로딩 후 디버깅 정보
      console.log('=== 데이터 로딩 완료 ===');
      console.log('로딩된 데이터 개수:', processedData.length);
      console.log('샘플 데이터:', processedData.slice(0, 5).map(item => ({
        name: item.institutionName,
        district: item.district,
        code: item.institutionCode
      })));
      const districts = [...new Set(processedData.map(item => item.district))];
      console.log('포함된 지역들:', districts);
      console.log('========================');
    } catch (error) {
      console.error('Status report data loading error:', error);
      toast({
        title: "데이터 로드 오류",
        description: "상태 보고서 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 선택된 지역의 기관 데이터
  const selectedDistrictInstitutions = useMemo(() => {
    if (!selectedDistrict) return [];
    const filtered = statusReportData.filter(item => item.district === selectedDistrict);
    console.log('=== selectedDistrictInstitutions 계산 ===');
    console.log('선택된 지역:', selectedDistrict);
    console.log('필터링된 기관 수:', filtered.length);
    console.log('필터링된 기관들:', filtered.map(inst => inst.institutionName));
    console.log('==========================================');
    return filtered;
  }, [statusReportData, selectedDistrict]);

  // 종합 지도 데이터 (기관 수 기준)
  const comprehensiveMapData = useMemo(() => {
    const districtData = statusReportData.reduce((acc, item) => {
      const district = item.district || '기타';
      if (!acc[district]) {
        acc[district] = {
          institutions: 0,
          totalEmployees: 0,
          totalSocialWorkers: 0,
          totalLifeSupport: 0,
          hasAllocationDifference: false
        };
      }
      acc[district].institutions += 1;
      acc[district].totalEmployees += item.dLevel_all;
      acc[district].totalSocialWorkers += item.dLevel_social;
      acc[district].totalLifeSupport += item.dLevel_life;
      if (item.hasAllocationDifference) {
        acc[district].hasAllocationDifference = true;
      }
      return acc;
    }, {} as any);
    
    return Object.entries(districtData).map(([district, data]: [string, any]) => ({
      district,
      value: data.institutions,
      label: `${data.institutions}개${data.hasAllocationDifference ? ' ★' : ''}`,
      description: `기관: ${data.institutions}개, 전체 직원: ${data.totalEmployees}명 (전담사회복지사: ${data.totalSocialWorkers}명, 생활지원사: ${data.totalLifeSupport}명)`,
      hasAllocationDifference: data.hasAllocationDifference
    }));
  }, [statusReportData]);

  const handleDistrictClick = (districtName: string) => {
    console.log('=== 지역 클릭 디버깅 ===');
    console.log('클릭된 지역:', districtName);
    console.log('전체 데이터 개수:', statusReportData.length);
    console.log('전체 데이터 샘플:', statusReportData.slice(0, 3).map(item => ({
      name: item.institutionName,
      district: item.district,
      code: item.institutionCode
    })));
    
    const filteredInstitutions = statusReportData.filter(item => item.district === districtName);
    console.log('해당 지역의 기관 수:', filteredInstitutions.length);
    console.log('해당 지역의 기관들:', filteredInstitutions.map(inst => ({ 
      name: inst.institutionName, 
      code: inst.institutionCode,
      district: inst.district
    })));
    
    // 모든 고유 district 값 출력
    const uniqueDistricts = [...new Set(statusReportData.map(item => item.district))];
    console.log('데이터에 있는 모든 지역명:', uniqueDistricts);
    
    setSelectedDistrict(districtName);
    setShowDetailedView(true); // 바로 상세보기 표시
    console.log('selectedDistrict 설정 완료:', districtName);
    console.log('=======================');
  };

  const handleMapTypeChange = (mapType: string) => {
    setSelectedMapType(mapType);
  };

  // 지역별 상세 정보 렌더링
  const renderDistrictDetails = () => {
    if (!selectedDistrict || selectedDistrictInstitutions.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">지역을 선택해주세요</h3>
          <p className="text-gray-500">지도에서 지역을 클릭하면 해당 지역의 상세 정보를 확인할 수 있습니다.</p>
        </div>
      );
    }

    const districtStats = {
      totalInstitutions: selectedDistrictInstitutions.length,
      totalEmployees: selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.dLevel_all, 0),
      totalSocialWorkers: selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.dLevel_social, 0),
      totalLifeSupport: selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.dLevel_life, 0),
      avgEmploymentRate: selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.employment_social_rate + inst.employment_life_rate, 0) / (selectedDistrictInstitutions.length * 2),
      avgEducationRate: selectedDistrictInstitutions.length > 0 ? 
        selectedDistrictInstitutions.reduce((sum, inst) => {
          const socialRate = isNaN(inst.education_social_rate) ? 0 : (inst.education_social_rate || 0);
          const lifeRate = isNaN(inst.education_life_rate) ? 0 : (inst.education_life_rate || 0);
          return sum + (socialRate + lifeRate) / 2;
        }, 0) / selectedDistrictInstitutions.length : 0
    };

    return (
      <div className="space-y-6">

        {/* 기관별 상세 정보 - 컴팩트 그리드 형태 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  {selectedDistrict} 기관별 상세 정보
                </CardTitle>
                <CardDescription>
                  {selectedDistrictInstitutions.length}개 기관의 종합 현황
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowDetailedView(false)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                지도로 돌아가기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedDistrictInstitutions.map((institution, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  {/* 기관명 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-gray-800 truncate">
                      {institution.institutionName}
                    </h4>
                    <div className="flex items-center gap-1">
                      {institution.hasAllocationDifference && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">{institution.institutionCode}</span>
                    </div>
                  </div>

                  {/* 순서 변경: 배정>인력>채용률>이수율 */}
                  <div className="space-y-2">
                    {/* 배정 현황 */}
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500 mb-1">배정 현황</div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          <span className="text-blue-600">예산내시:</span> 전담 {institution.backup2_b} | 생활 {institution.backup2_c}
                        </div>
                        {institution.hasAllocationDifference && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="text-green-600">수기관리:</span> 전담 {institution.backup1_social} | 생활 {institution.backup1_life}
                      </div>
                    </div>

                    {/* 인력 현황 (배정/채용 순서) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded border">
                        <div className="text-xs text-gray-500 mb-1">전담사회복지사</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-700">
                            {institution.backup1_social}/{institution.dLevel_social}
                          </span>
                          <span className="text-xs text-gray-500">배정/채용</span>
                        </div>
                      </div>
                      
                      <div className="bg-white p-2 rounded border">
                        <div className="text-xs text-gray-500 mb-1">생활지원사</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-700">
                            {institution.backup1_life}/{institution.dLevel_life}
                          </span>
                          <span className="text-xs text-gray-500">배정/채용</span>
                        </div>
                      </div>
                    </div>

                    {/* 채용률 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded border">
                        <div className="text-xs text-gray-500 mb-1">전담사회복지사 채용률</div>
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          institution.employment_social_rate >= 80 ? 'bg-green-100 text-green-700' : 
                          institution.employment_social_rate >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(institution.employment_social_rate)}%
                        </span>
                      </div>
                      
                      <div className="bg-white p-2 rounded border">
                        <div className="text-xs text-gray-500 mb-1">생활지원사 채용률</div>
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          institution.employment_life_rate >= 80 ? 'bg-green-100 text-green-700' : 
                          institution.employment_life_rate >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(institution.employment_life_rate)}%
                        </span>
                      </div>
                    </div>

                    {/* 교육 이수율 */}
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs text-gray-500 mb-1">교육 이수율</div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            (institution.education_social_rate || 0) >= 80 ? 'bg-green-100 text-green-700' : 
                            (institution.education_social_rate || 0) >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            전담: {isNaN(institution.education_social_rate) ? '0' : Math.round(institution.education_social_rate || 0)}%
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            (institution.education_life_rate || 0) >= 80 ? 'bg-green-100 text-green-700' : 
                            (institution.education_life_rate || 0) >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            생활: {isNaN(institution.education_life_rate) ? '0' : Math.round(institution.education_life_rate || 0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden">
      <div className="h-full w-full flex flex-col px-1 py-1">
        {/* 헤더 - 더 컴팩트하게 */}
        <div className="bg-white rounded shadow-sm border px-3 py-2 mb-1 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                경상남도 교육관리 종합지도
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadStatusReportData}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                새로고침
              </Button>
              <Link href="/">
                <Button variant="default" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  대시보드로
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 - 남은 공간 모두 사용 */}
        <div className="flex-1 min-h-0">
          {/* 지도 영역 - 전체 높이 사용 */}
          <Card className="h-full flex flex-col border-0 shadow-none">
            <CardHeader className="py-1 px-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    종합 현황 지도
                    {selectedDistrict && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Building className="h-3 w-3 mr-1" />
                        {selectedDistrict} ({selectedDistrictInstitutions.length}개 기관)
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                {selectedDistrict && (
                  <Button 
                    onClick={() => {
                      setSelectedDistrict(null);
                      setShowDetailedView(false);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    선택 해제
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <div className="absolute inset-0 overflow-hidden">
                <GyeongsangnamMap
                  data={comprehensiveMapData}
                  colorScheme="blue"
                  title="경상남도 교육관리 종합 현황"
                  height="100%"
                  showLabels={true}
                  onDistrictClick={handleDistrictClick}
                />
                
                {/* 지역 선택 시 지도 내부 오버레이 */}
                {selectedDistrict && selectedDistrictInstitutions.length > 0 && (
                  <div 
                    className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
                    style={{ 
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      width: '380px',
                      maxHeight: 'calc(100vh - 140px)',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}
                  >
                    {/* 헤더 */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Building className="h-5 w-5 text-blue-600" />
                          {selectedDistrict} ({selectedDistrictInstitutions.length}개 기관)
                        </h3>
                        <Button 
                          onClick={() => {
                            setSelectedDistrict(null);
                            setShowDetailedView(false);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          닫기
                        </Button>
                      </div>
                      
                      {/* 요약 통계 */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">기관 수</div>
                          <div className="text-sm font-bold text-blue-600">{selectedDistrictInstitutions.length}개</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">전체 직원</div>
                          <div className="text-sm font-bold text-green-600">
                            {selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.dLevel_all, 0)}명
                          </div>
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">평균 채용률</div>
                          <div className="text-sm font-bold text-purple-600">
                            {Math.round(selectedDistrictInstitutions.reduce((sum, inst) => sum + inst.employment_social_rate + inst.employment_life_rate, 0) / (selectedDistrictInstitutions.length * 2))}%
                          </div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded text-center">
                          <div className="text-xs text-gray-600">평균 이수율</div>
                          <div className="text-sm font-bold text-orange-600">
                            {Math.round(selectedDistrictInstitutions.length > 0 ? 
                              selectedDistrictInstitutions.reduce((sum, inst) => {
                                const socialRate = isNaN(inst.education_social_rate) ? 0 : (inst.education_social_rate || 0);
                                const lifeRate = isNaN(inst.education_life_rate) ? 0 : (inst.education_life_rate || 0);
                                return sum + (socialRate + lifeRate) / 2;
                              }, 0) / selectedDistrictInstitutions.length : 0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 기관별 상세 정보 */}
                    <div className="p-3">
                      <div className="grid grid-cols-1 gap-2">
                        {selectedDistrictInstitutions.map((institution, index) => (
                          <div key={index} className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                            {/* 기관명 헤더 - 컴팩트 */}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-xs text-gray-800 truncate">
                                {institution.institutionName.length > 15 ? institution.institutionName.substring(0, 15) + '...' : institution.institutionName}
                              </h4>
                              <div className="flex items-center gap-1">
                                {institution.hasAllocationDifference && (
                                  <Star className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                            </div>

                            {/* 핵심 지표 표시 - 순서 변경: 배정>인력>채용률>이수율 */}
                            <div className="space-y-1">
                              {/* 배정인원 (예산내시/수기관리) */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">배정</span>
                                <span className="font-semibold">
                                  예산 {institution.backup2_b + institution.backup2_c} | 수기 {institution.backup1_social + institution.backup1_life}
                                  {institution.hasAllocationDifference && <Star className="inline h-3 w-3 text-yellow-500 ml-1" />}
                                </span>
                              </div>
                              
                              {/* 인력현황 (배정/채용 순서로 변경) */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">인력</span>
                                <span className="font-semibold text-blue-700">
                                  전담 {institution.backup1_social}/{institution.dLevel_social} | 생활 {institution.backup1_life}/{institution.dLevel_life}
                                </span>
                              </div>
                              
                              {/* 채용률 */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">채용률</span>
                                <div className="flex gap-1">
                                  <span className={`px-1 py-0.5 rounded font-bold ${
                                    institution.employment_social_rate >= 80 ? 'bg-green-100 text-green-700' : 
                                    institution.employment_social_rate >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    전담{Math.round(institution.employment_social_rate)}%
                                  </span>
                                  <span className={`px-1 py-0.5 rounded font-bold ${
                                    institution.employment_life_rate >= 80 ? 'bg-green-100 text-green-700' : 
                                    institution.employment_life_rate >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    생활{Math.round(institution.employment_life_rate)}%
                                  </span>
                                </div>
                              </div>

                              {/* 교육 이수율 */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">이수율</span>
                                <div className="flex gap-1">
                                  <span className={`px-1 py-0.5 rounded font-bold ${
                                    (institution.education_social_rate || 0) >= 80 ? 'bg-green-100 text-green-700' : 
                                    (institution.education_social_rate || 0) >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isNaN(institution.education_social_rate) ? '0' : Math.round(institution.education_social_rate || 0)}%
                                  </span>
                                  <span className={`px-1 py-0.5 rounded font-bold ${
                                    (institution.education_life_rate || 0) >= 80 ? 'bg-green-100 text-green-700' : 
                                    (institution.education_life_rate || 0) >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isNaN(institution.education_life_rate) ? '0' : Math.round(institution.education_life_rate || 0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}