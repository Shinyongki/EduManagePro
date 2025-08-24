import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Upload, List, Eye, Building, Download, RefreshCw, ChevronDown, ChevronUp, Users, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeStore } from '@/store/employee-store';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateUploadForm } from "@/components/snapshot/date-upload-form";
import { snapshotManager } from "@/lib/snapshot-manager";

export default function InstitutionDataPage() {
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { institutionData, setInstitutionData, loadInstitutionData, employeeData, loadEmployeeData } = useEmployeeStore();

  useEffect(() => {
    fetchInstitutionData();
    // 종사자 데이터도 로드
    loadEmployeeData();
  }, []);


  // 데이터 상태 디버깅용 로그
  useEffect(() => {
    console.log('🔍 Current institutionData length:', institutionData?.length || 0);
    console.log('🔍 Current institutionData sample:', institutionData?.slice(0, 2));
    
    // 지역 데이터 구조 확인
    if (institutionData && institutionData.length > 0) {
      const sample = institutionData[0];
      console.log('🔍 지역 필드 확인:', {
        '지자체': sample['지자체'],
        'district': sample.district,
        '시군구': sample['시군구'],
        '광역시': sample['광역시'],
        'region': sample.region
      });
      
      // 모든 지역 목록 확인
      const allDistricts = institutionData.map(inst => inst['지자체'] || inst.district || inst['시군구']).filter(Boolean);
      const uniqueDistricts = [...new Set(allDistricts)];
      console.log('🔍 전체 지역 목록:', uniqueDistricts);
      console.log('🔍 지역 개수:', uniqueDistricts.length);
      
      // 특화서비스 필드 확인
      console.log('🔍 특화서비스 필드 확인:', {
        '특화서비스': sample['특화서비스'],
        'specializedService': sample.specializedService,
        '특화 서비스': sample['특화 서비스'],
        '특화서비스수행여부': sample['특화서비스수행여부']
      });
      
      // 모든 specializedService 값들 확인
      const allSpecializedValues = [...new Set(institutionData.map(inst => inst.specializedService).filter(Boolean))];
      console.log('🔍 전체 specializedService 값들:', allSpecializedValues);
      
      // 특화서비스 관련 모든 필드들의 고유값 확인
      const allFields = institutionData.reduce((acc, inst) => {
        Object.keys(inst).forEach(key => {
          if (key.toLowerCase().includes('특화') || key.toLowerCase().includes('specialized') || key.toLowerCase().includes('special')) {
            if (!acc[key]) acc[key] = new Set();
            acc[key].add(inst[key]);
          }
        });
        return acc;
      }, {});
      
      console.log('🔍 특화서비스 관련 필드들:', Object.keys(allFields).map(key => ({
        field: key,
        values: [...allFields[key]].filter(v => v !== undefined && v !== null && v !== '')
      })));
      
      // 특화서비스 기관 리스트 출력
      const specializedInstitutions = institutionData.filter(inst => inst.specializedService === '해당');
      console.log('🏢 특화서비스 기관 목록 (총 ' + specializedInstitutions.length + '개):');
      specializedInstitutions.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.name || inst['수행기관명'] || '기관명 없음'} (${inst.district || inst['지자체'] || '지역 정보 없음'})`);
      });
      
      // 시설유형 데이터 확인
      const facilityTypes = [...new Set(institutionData.map(inst => inst['시설유형구분'] || inst.facilityType || '일반').filter(Boolean))];
      console.log('🏗️ 시설유형 목록 (총 ' + facilityTypes.length + '개):', facilityTypes);
      
      // 시설유형별 기관 수 확인
      const facilityTypeCount = institutionData.reduce((acc, inst) => {
        const type = inst['시설유형구분'] || inst.facilityType || '일반';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      console.log('🏗️ 시설유형별 기관 수:', facilityTypeCount);
    }
  }, [institutionData]);

  const fetchInstitutionData = async () => {
    setIsLoading(true);
    try {
      // 강제로 다시 로드하기 위해 플래그 리셋
      const { useEmployeeStore } = await import('@/store/employee-store');
      useEmployeeStore.setState({ institutionDataLoaded: false });
      
      // store의 loadInstitutionData를 먼저 호출
      await loadInstitutionData();
      // 약간의 지연 후 store 상태 확인 (React state update는 비동기)
      setTimeout(() => {
        console.log(`🗃️ Store에서 기관 데이터 로드 완료: ${institutionData?.length || 0}개`);
      }, 100);
    } catch (error) {
      console.error('Failed to fetch institution data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/institutions/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 모든 데이터 가져오기
      const [employeeResponse, participantResponse, basicResponse, advancedResponse, institutionResponse] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/participants'),
        fetch('/api/education/basic'),
        fetch('/api/education/advanced'),
        fetch('/api/institutions')
      ]);

      const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
        employeeResponse.ok ? employeeResponse.json() : [],
        participantResponse.ok ? participantResponse.json() : [],
        basicResponse.ok ? basicResponse.json() : [],
        advancedResponse.ok ? advancedResponse.json() : [],
        institutionResponse.ok ? institutionResponse.json() : []
      ]);

      // 날짜별 스냅샷 생성
      await snapshotManager.createSnapshot(
        date,
        {
          employeeData,
          participantData,
          basicEducationData,
          advancedEducationData,
          institutionData
        },
        description
      );

      // IndexedDB 동기화
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      await educationDB.setItem('institutionData', institutionData);
      setInstitutionData(institutionData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 기관 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 기관 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('모든 기관현황 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/institutions/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 기관현황 데이터가 삭제되었습니다.",
      });

      // 스토어 및 IndexedDB 데이터 즉시 초기화
      setInstitutionData([]);
      
      // IndexedDB 클리어
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        await educationDB.setItem('institutionData', []);
        console.log('🗃️ IndexedDB institutionData 클리어 완료');
      } catch (e) {
        console.warn('IndexedDB 클리어 실패:', e);
      }

    } catch (error) {
      toast({
        title: "초기화 실패",
        description: error instanceof Error ? error.message : "데이터 초기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터 필터링
  const filteredData = institutionData.filter(item => {
    // 지역 필터링
    if (regionFilter !== 'all' && !item.region?.includes(regionFilter)) return false;
    
    // 검색어 필터링
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.code?.toLowerCase().includes(searchLower) ||
      item.region?.toLowerCase().includes(searchLower) ||
      item.district?.toLowerCase().includes(searchLower) ||
      item.areaName?.toLowerCase().includes(searchLower) ||
      item.manager?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // 페이지 변경 시 스크롤 상단으로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // 데이터 내보내기 기능
  const handleExportData = async () => {
    if (filteredData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "내보낼 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // 동적 import로 xlsx 라이브러리 로드
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      // 내보낼 데이터 준비
      const exportData = filteredData.map(inst => ({
        // 지역 정보
        '광역시': inst.region || '',
        '지자체': inst.district || '',
        '광역코드': inst.areaCode || '',
        '광역명': inst.areaName || '',
        
        // 수행기관 기본정보
        '수행기관코드': inst.code || '',
        '수행기관위수탁구분': inst.contractType || '',
        '위수탁기간': inst.contractPeriod || '',
        '2020년': inst.year2020 || '',
        '2021년': inst.year2021 || '',
        '2022년': inst.year2022 || '',
        '2023년': inst.year2023 || '',
        '2024년': inst.year2024 || '',
        '2025년': inst.year2025 || '',
        
        // 서비스 유형
        '시설유형구분': inst.facilityType || '',
        '특화서비스': inst.specializedService || '',
        '응급안전안심서비스': inst.emergencyService || '',
        '방문요양서비스': inst.homeVisitService || '',
        '재가노인복지서비스': inst.elderlyWelfareService || '',
        '사회서비스원 소속': inst.socialServiceOrg || '',
        '사회서비스형 노인일자리 파견 이용': inst.elderlyJobDispatch || '',
        
        // 기관 상세정보
        '수탁법인명': inst.operatingOrg || '',
        '수탁법인번호': inst.operationType || '',
        '수탁기관 사업자등록번호': inst.consignmentOrg || '',
        '수행기관 고유번호': inst.institutionId || '',
        '수행기관명': inst.name || '',
        '기관장명': inst.manager || '',
        '우편번호': inst.postalCode || '',
        '주소': inst.baseAddress || '',
        '배송지우편번호': inst.deliveryPostalCode || '',
        '배송지주소': inst.detailAddress || '',
        
        // 연락처 정보
        '기관 대표전화': inst.mainContact || '',
        '메인 연락처': inst.responsibleContact || '',
        '긴급연락처/핸드폰': inst.emergencyContact || '',
        '팩스번호': inst.faxNumber || '',
        '이메일': inst.email || '',
        
        // 인력 배정 현황
        '전담사회복지사(배정)': inst.allocatedSocialWorkers || 0,
        '전담사회복지사(채용)': inst.hiredSocialWorkers || 0,
        '생활지원사(배정)': inst.allocatedLifeSupport || 0,
        '생활지원사(채용)': inst.hiredLifeSupport || 0,
        '대상자 사후관리 제외(배정)': inst.allocatedTargets || 0,
        '대상자 사후관리 제외(제공_일반+중점)': inst.providedGeneralIntensive || 0,
        '대상자 사후관리 제외(제공_일반)': inst.providedGeneral || 0,
        '대상자 사후관리 제외(제공_중점)': inst.providedIntensive || 0,
        '대상자 사후관리 제외(제공_특화)': inst.providedSpecialized || 0,
        
        // 지자체 공무원 정보
        '공무원 성명': inst.officialName || '',
        '공무원 메인 연락처': inst.officialContact || '',
        '공무원 이메일': inst.officialEmail || '',
        
        // 관리 정보
        '수정일': inst.modifiedDate || '',
        '등록자': inst.registrant || '',
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '기관 현황 데이터');

      // 파일명 생성
      const today = new Date().toISOString().split('T')[0];
      const fileName = `기관현황데이터_${today}.xlsx`;

      // 파일 다운로드
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(data, fileName);

      toast({
        title: "내보내기 완료",
        description: `${filteredData.length}건의 데이터가 ${fileName}로 내보내졌습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "내보내기 실패",
        description: "파일 내보내기 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">기관 현황 데이터 관리</h1>
          <p className="text-muted-foreground mt-2">
            기관별 배치 현황과 정원 정보를 업로드하고 관리합니다
          </p>
        </div>
      </div>

      {/* 데이터 업로드 섹션 - 접을 수 있는 카드 */}
      <Collapsible open={showUploadSection} onOpenChange={setShowUploadSection}>
        <Card className="mb-6">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <CardTitle>데이터 업로드</CardTitle>
                </div>
                <Button variant="ghost" size="sm">
                  {showUploadSection ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      펼치기
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>Excel 파일을 통해 기관현황 데이터를 업로드합니다</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <DateUploadForm
                onUpload={handleDateUpload}
                isUploading={isUploading}
                title="기관현황 데이터 업로드"
                description="Excel 파일을 통해 기관현황 데이터를 특정 날짜 기준으로 업로드합니다"
              />
              
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isLoading || !institutionData || institutionData.length === 0}
                >
                  데이터 초기화
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 메인 데이터 목록 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                기관 현황 데이터 목록
              </CardTitle>
              <CardDescription>
                업로드된 기관별 배치 현황을 조회합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground">데이터를 불러오는 중...</div>
                </div>
              ) : institutionData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 기관 데이터가 없습니다.
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowUploadSection(true)}
                  >
                    데이터 업로드하기
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Input
                          placeholder="이름, 기관, 지역으로 검색..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // 검색 시 첫 페이지로
                          }}
                          className="w-full sm:w-64"
                        />
                        <Select value={regionFilter} onValueChange={(value) => {
                          setRegionFilter(value);
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="전체 지역" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 지역</SelectItem>
                            <SelectItem value="서울">서울</SelectItem>
                            <SelectItem value="경기">경기</SelectItem>
                            <SelectItem value="인천">인천</SelectItem>
                            <SelectItem value="부산">부산</SelectItem>
                            <SelectItem value="대구">대구</SelectItem>
                            <SelectItem value="광주">광주</SelectItem>
                            <SelectItem value="대전">대전</SelectItem>
                            <SelectItem value="울산">울산</SelectItem>
                            <SelectItem value="세종">세종</SelectItem>
                            <SelectItem value="강원">강원</SelectItem>
                            <SelectItem value="충북">충북</SelectItem>
                            <SelectItem value="충남">충남</SelectItem>
                            <SelectItem value="전북">전북</SelectItem>
                            <SelectItem value="전남">전남</SelectItem>
                            <SelectItem value="경북">경북</SelectItem>
                            <SelectItem value="경남">경남</SelectItem>
                            <SelectItem value="제주">제주</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10개씩</SelectItem>
                            <SelectItem value="25">25개씩</SelectItem>
                            <SelectItem value="50">50개씩</SelectItem>
                            <SelectItem value="100">100개씩</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportData}
                          disabled={isExporting || filteredData.length === 0}
                        >
                          <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                          {isExporting ? '내보내는 중...' : '내보내기'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchInstitutionData}
                          disabled={isLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                          새로고침
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-lg font-semibold">{filteredData.length}개</div>
                      <div className="text-sm text-muted-foreground">
                        {searchTerm || regionFilter !== 'all' ? '검색 결과' : '총 기관 (테이블 표시)'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto overflow-y-visible">
                      <Table className="min-w-[5500px] w-full">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        {/* 첫 번째 헤더 행 - 그룹 헤더 */}
                        <TableRow className="border-b">
                          {/* 지역 정보 */}
                          <TableHead className="w-[100px] whitespace-nowrap bg-gray-100 border-r" rowSpan={2}>광역시</TableHead>
                          <TableHead className="w-[100px] whitespace-nowrap bg-gray-100 border-r" rowSpan={2}>지자체</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap bg-gray-100 border-r" rowSpan={2}>광역코드</TableHead>
                          <TableHead className="w-[150px] whitespace-nowrap bg-gray-100 border-r" rowSpan={2}>광역명</TableHead>
                          
                          {/* 수행기관 기본정보 */}
                          <TableHead className="w-[140px] whitespace-nowrap bg-blue-100 border-r" rowSpan={2}>수행기관코드</TableHead>
                          <TableHead className="w-[160px] whitespace-nowrap bg-blue-100 border-r" rowSpan={2}>수행기관위수탁구분</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap bg-blue-100 border-r" rowSpan={2}>위수탁기간</TableHead>
                          <TableHead className="text-center whitespace-nowrap bg-blue-200 border-r" colSpan={6}>사업수행연도이력</TableHead>
                          
                          {/* 서비스 유형 */}
                          <TableHead className="w-[120px] whitespace-nowrap bg-green-100 border-r" rowSpan={2}>시설유형구분</TableHead>
                          <TableHead className="text-center whitespace-nowrap bg-green-200 border-r" colSpan={6}>특화 및 유관서비스 수행여부</TableHead>
                          
                          {/* 기관정보 */}
                          <TableHead className="text-center whitespace-nowrap bg-yellow-200 border-r" colSpan={11}>기관정보</TableHead>
                          
                          {/* 기본연락망 */}
                          <TableHead className="text-center whitespace-nowrap bg-purple-200 border-r" colSpan={4}>기본연락망</TableHead>
                          
                          {/* 복지부 배정 인원 */}
                          <TableHead className="text-center whitespace-nowrap bg-cyan-200 border-r" colSpan={3}>복지부 배정 인원(※일반&중점, 특화 포함)</TableHead>
                          
                          {/* 배정 및 채용 인원 */}
                          <TableHead className="text-center whitespace-nowrap bg-teal-200 border-r" colSpan={9}>배정 및 채용 인원(※일반&중점, 특화 포함)</TableHead>
                          
                          {/* 지자체 공무원 정보 */}
                          <TableHead className="text-center whitespace-nowrap bg-orange-200 border-r" colSpan={3}>지자체 공무원 정보</TableHead>
                          
                          {/* 관리 정보 */}
                          <TableHead className="w-[120px] whitespace-nowrap bg-red-100 border-r" rowSpan={2}>수정일</TableHead>
                          <TableHead className="w-[100px] whitespace-nowrap bg-red-100" rowSpan={2}>등록자</TableHead>
                        </TableRow>
                        
                        {/* 두 번째 헤더 행 - 세부 헤더들 */}
                        <TableRow>
                          {/* 사업수행연도이력 세부 헤더 */}
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2020년</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2021년</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2022년</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2023년</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2024년</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap bg-blue-100 border-r">2025년</TableHead>
                          
                          {/* 특화 및 유관서비스 수행여부 세부 헤더 */}
                          <TableHead className="w-[120px] whitespace-nowrap bg-green-100 border-r">특화서비스</TableHead>
                          <TableHead className="w-[160px] whitespace-nowrap bg-green-100 border-r">응급안전안심서비스</TableHead>
                          <TableHead className="w-[140px] whitespace-nowrap bg-green-100 border-r">방문요양서비스</TableHead>
                          <TableHead className="w-[160px] whitespace-nowrap bg-green-100 border-r">재가노인복지서비스</TableHead>
                          <TableHead className="w-[140px] whitespace-nowrap bg-green-100 border-r">사회서비스원 소속</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap bg-green-100 border-r">사회서비스형 노인일자리 파견 이용</TableHead>
                          
                          {/* 기관정보 세부 헤더 */}
                          <TableHead className="w-[140px] whitespace-nowrap bg-yellow-100 border-r">수탁법인명</TableHead>
                          <TableHead className="w-[140px] whitespace-nowrap bg-yellow-100 border-r">수탁법인번호</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap bg-yellow-100 border-r">수탁기관 사업자등록번호</TableHead>
                          <TableHead className="w-[140px] whitespace-nowrap bg-yellow-100 border-r">수행기관 고유번호</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap bg-yellow-100 border-r">수행기관명</TableHead>
                          <TableHead className="w-[100px] whitespace-nowrap bg-yellow-100 border-r">기관장명</TableHead>
                          <TableHead className="w-[100px] whitespace-nowrap bg-yellow-100 border-r">우편번호</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap bg-yellow-100 border-r">주소</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap bg-yellow-100 border-r">배송지우편번호</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap bg-yellow-100 border-r">배송지주소</TableHead>
                          <TableHead className="w-[150px] whitespace-nowrap bg-yellow-100 border-r">기관 대표전화</TableHead>
                          
                          {/* 기본연락망 세부 헤더 */}
                          <TableHead className="w-[140px] whitespace-nowrap bg-purple-100 border-r">메인 연락처</TableHead>
                          <TableHead className="w-[160px] whitespace-nowrap bg-purple-100 border-r">긴급연락처/핸드폰</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap bg-purple-100 border-r">팩스번호</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap bg-purple-100 border-r">이메일</TableHead>
                          
                          {/* 복지부 배정 인원 세부 헤더 */}
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-cyan-100 border-r">전담사회복지사(배정)</TableHead>
                          <TableHead className="w-[160px] text-center whitespace-nowrap bg-cyan-100 border-r">생활지원사(배정)</TableHead>
                          <TableHead className="w-[200px] text-center whitespace-nowrap bg-cyan-100 border-r">대상자 ※사후관리 제외(배정)</TableHead>
                          
                          {/* 배정 및 채용 인원 세부 헤더 */}
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-teal-100 border-r">전담사회복지사(배정)</TableHead>
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-teal-100 border-r">전담사회복지사(채용)</TableHead>
                          <TableHead className="w-[160px] text-center whitespace-nowrap bg-teal-100 border-r">생활지원사(배정)</TableHead>
                          <TableHead className="w-[160px] text-center whitespace-nowrap bg-teal-100 border-r">생활지원사(채용)</TableHead>
                          <TableHead className="w-[200px] text-center whitespace-nowrap bg-teal-100 border-r">대상자 ※사후관리 제외(배정)</TableHead>
                          <TableHead className="w-[200px] text-center whitespace-nowrap bg-teal-100 border-r">대상자 ※사후관리 제외(제공_일반+중점)</TableHead>
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-teal-100 border-r">대상자 ※사후관리 제외(제공_일반)</TableHead>
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-teal-100 border-r">대상자 ※사후관리 제외(제공_중점)</TableHead>
                          <TableHead className="w-[180px] text-center whitespace-nowrap bg-teal-100 border-r">대상자 ※사후관리 제외(제공_특화)</TableHead>
                          
                          {/* 지자체 공무원 정보 세부 헤더 */}
                          <TableHead className="w-[100px] whitespace-nowrap bg-orange-100 border-r">성명</TableHead>
                          <TableHead className="w-[140px] whitespace-nowrap bg-orange-100 border-r">메인 연락처</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap bg-orange-100 border-r">이메일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentData.map((institution, index) => {
                          return (
                            <TableRow key={index} className="hover:bg-muted/50">
                              {/* 지역 정보 */}
                              <TableCell className="whitespace-nowrap">{institution.region || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.district || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.areaCode || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.areaName || '-'}</TableCell>
                              
                              {/* 수행기관 기본정보 */}
                              <TableCell className="font-medium whitespace-nowrap">{institution.code || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.contractType || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.contractPeriod || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2020 || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2021 || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2022 || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2023 || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2024 || '-'}</TableCell>
                              <TableCell className="text-center">{institution.year2025 || '-'}</TableCell>
                              
                              {/* 서비스 유형 */}
                              <TableCell className="whitespace-nowrap">{institution.facilityType || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.specializedService || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.emergencyService || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.homeVisitService || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.elderlyWelfareService || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.socialServiceOrg || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.elderlyJobDispatch || '-'}</TableCell>
                              
                              {/* 기관정보 */}
                              <TableCell className="whitespace-nowrap">{institution.operatingOrg || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.operationType || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.consignmentOrg || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.institutionId || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.name || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.manager || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.postalCode || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.baseAddress || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.deliveryPostalCode || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.detailAddress || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.mainContact || '-'}</TableCell>
                              
                              {/* 기본연락망 */}
                              <TableCell className="whitespace-nowrap">{institution.responsibleContact || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.emergencyContact || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.faxNumber || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.email || '-'}</TableCell>
                              
                              {/* 복지부 배정 인원 */}
                              <TableCell className="text-center">{institution.allocatedSocialWorkersGov || 0}</TableCell>
                              <TableCell className="text-center">{institution.allocatedLifeSupportGov || 0}</TableCell>
                              <TableCell className="text-center">{institution.allocatedTargetsGov || 0}</TableCell>
                              
                              {/* 배정 및 채용 인원 */}
                              <TableCell className="text-center">{institution.allocatedSocialWorkers || 0}</TableCell>
                              <TableCell className="text-center">{institution.hiredSocialWorkers || 0}</TableCell>
                              <TableCell className="text-center">{institution.allocatedLifeSupport || 0}</TableCell>
                              <TableCell className="text-center">{institution.hiredLifeSupport || 0}</TableCell>
                              <TableCell className="text-center">{institution.allocatedTargets || 0}</TableCell>
                              <TableCell className="text-center">{institution.providedGeneralIntensive || 0}</TableCell>
                              <TableCell className="text-center">{institution.providedGeneral || 0}</TableCell>
                              <TableCell className="text-center">{institution.providedIntensive || 0}</TableCell>
                              <TableCell className="text-center">{institution.providedSpecialized || 0}</TableCell>
                              
                              {/* 지자체 공무원 정보 */}
                              <TableCell className="whitespace-nowrap">{institution.officialName || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.officialContact || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.officialEmail || '-'}</TableCell>
                              
                              {/* 관리 정보 */}
                              <TableCell className="whitespace-nowrap">{institution.modifiedDate || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{institution.registrant || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                    {totalPages > 1 && (
                      <div className="p-4 flex items-center justify-center gap-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          이전
                        </Button>
                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          다음
                        </Button>
                        <span className="text-sm text-muted-foreground ml-2">
                          {currentPage} / {totalPages} 페이지
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
      {/* 기관 통계 섹션 추가 */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">기관 운영 통계 분석</CardTitle>
            <CardDescription>기관별 운영 현황에 대한 상세 통계 및 분석 정보</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <div className="text-muted-foreground">통계를 생성하는 중...</div>
              </div>
            ) : institutionData && institutionData.length > 0 ? (
              <div className="space-y-6">
                {/* 기본 통계 - 1행 4개 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* 총 기관 수 - 광역지원기관 제외 */}
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center">
                      <Building className="text-indigo-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-indigo-600">총 기관 수</p>
                        <p className="text-2xl font-bold text-indigo-900">
                          {institutionData.filter((inst: any) => {
                            const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                            const code = inst['수행기관코드'] || inst['광역코드'] || inst.institutionCode || inst.code || '';
                            const isMetro = inst['광역시'] || '';
                            
                            const isExcluded = (
                              name.includes('광역지원') ||
                              name.includes('경상남도사회서비스원') ||
                              code === 'A48000002' ||
                              name.includes('사회서비스원') ||
                              isMetro.includes('광역')
                            );
                            
                            return name && name.trim() !== '' && !isExcluded;
                          }).length}개
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 총 종사자 수 */}
                  <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                    <div className="flex items-center">
                      <Users className="text-rose-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-rose-600">총 종사자 수</p>
                        <p className="text-2xl font-bold text-rose-900">
                          {(() => {
                            // 기관 데이터 기준으로 계산
                            const socialWorkerCount = institutionData.reduce((sum, inst) => {
                              const value = Number(inst.actualSocialWorkers) || 
                                          Number(inst.hiredSocialWorkers) || 
                                          Number(inst['전담사회복지사(채용)']) || 
                                          Number(inst['전담사회복지사']) || 0;
                              return sum + (isNaN(value) ? 0 : value);
                            }, 0);
                            
                            const lifeSupportCount = institutionData.reduce((sum, inst) => {
                              const value = Number(inst.actualLifeSupport) || 
                                          Number(inst.hiredLifeSupport) || 
                                          Number(inst['생활지원사(채용)']) || 
                                          Number(inst['생활지원사']) || 0;
                              return sum + (isNaN(value) ? 0 : value);
                            }, 0);
                            
                            return socialWorkerCount + lifeSupportCount;
                          })()}명
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 활동 시군 수 */}
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="flex items-center">
                      <Users className="text-cyan-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-cyan-600">활동 시군 수</p>
                        <p className="text-2xl font-bold text-cyan-900">
                          {(() => {
                            const uniqueDistricts = new Set(
                              institutionData
                                .map(inst => inst['지자체'] || inst.district || inst['시군구'] || inst['시군'])
                                .filter(district => district && 
                                  district !== '경상남도' && 
                                  district !== '미분류' &&
                                  district !== '*광역지원기관' &&
                                  !district.includes('경상남도') &&
                                  !district.includes('광역지원')
                                )
                            );
                            return uniqueDistricts.size;
                          })()}개
                        </p>
                        <p className="text-xs text-cyan-600">경남 18개 시군 기준</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 경력 분포 */}
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center">
                      <Award className="text-emerald-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-emerald-600">경력 분포</p>
                        <p className="text-2xl font-bold text-emerald-900">
                          {(() => {
                            if (!employeeData || !Array.isArray(employeeData) || employeeData.length === 0) return '0';
                            
                            const activeEmployees = employeeData.filter(emp => {
                              if (!emp.resignDate) return true;
                              try {
                                const resignDate = new Date(emp.resignDate);
                                const today = new Date();
                                return resignDate > today;
                              } catch {
                                return true;
                              }
                            });
                            
                            const socialWorkers = activeEmployees.filter(emp => 
                              emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
                            );
                            const withCareer = socialWorkers.filter(emp => 
                              emp.careerType && emp.careerType.includes('년')
                            );
                            
                            return withCareer.length;
                          })()}명
                        </p>
                        <p className="text-xs text-emerald-600">전담 중 경력정보 보유</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 추가 통계 - 2행 4개 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  {/* 특화서비스 기관 */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center">
                      <Award className="text-purple-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-purple-600">특화서비스 기관</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {institutionData.filter(inst => inst.specializedService === '해당').length}개
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 사회복지사 실배치 */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <Users className="text-blue-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-600">사회복지사 실배치</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {institutionData.reduce((sum, inst) => {
                            const value = Number(inst.actualSocialWorkers) || 
                                        Number(inst.hiredSocialWorkers) || 
                                        Number(inst['전담사회복지사(채용)']) || 
                                        Number(inst['전담사회복지사']) || 0;
                            return sum + (isNaN(value) ? 0 : value);
                          }, 0)}명
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 생활지원사 실배치 */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <Users className="text-green-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-600">생활지원사 실배치</p>
                        <p className="text-2xl font-bold text-green-900">
                          {institutionData.reduce((sum, inst) => {
                            const value = Number(inst.actualLifeSupport) || 
                                        Number(inst.hiredLifeSupport) || 
                                        Number(inst['생활지원사(채용)']) || 
                                        Number(inst['생활지원사']) || 0;
                            return sum + (isNaN(value) ? 0 : value);
                          }, 0)}명
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 평균 충원율 */}
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center">
                      <Award className="text-amber-600 h-6 w-6 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-amber-600">평균 충원율</p>
                        <p className="text-2xl font-bold text-amber-900">
                          {(() => {
                            if (!institutionData || institutionData.length === 0) return '0';
                            
                            // 기관 데이터에서 정원(배정) 계산
                            const totalAllocated = institutionData.reduce((sum, inst) => {
                              const allocatedSocial = Number(inst.allocatedSocialWorkers) || 
                                                     Number(inst['전담사회복지사(배정)']) || 0;
                              const allocatedLife = Number(inst.allocatedLifeSupport) || 
                                                  Number(inst['생활지원사(배정)']) || 0;
                              return sum + allocatedSocial + allocatedLife;
                            }, 0);
                            
                            // 기관 데이터에서 현원(채용) 계산
                            const totalActual = institutionData.reduce((sum, inst) => {
                              const actualSocial = Number(inst.actualSocialWorkers) || 
                                                 Number(inst.hiredSocialWorkers) || 
                                                 Number(inst['전담사회복지사(채용)']) || 0;
                              const actualLife = Number(inst.actualLifeSupport) || 
                                               Number(inst.hiredLifeSupport) || 
                                               Number(inst['생활지원사(채용)']) || 0;
                              return sum + actualSocial + actualLife;
                            }, 0);
                            
                            const fillRate = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;
                            return isNaN(fillRate) ? '0' : Math.round(fillRate);
                          })()}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 운영 현황 분석 */}
                <div className="space-y-6">
                  {/* 시군별 기관 분포 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3">시군별 기관 분포</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {Array.from(
                        institutionData.reduce((acc, inst) => {
                          const district = inst['지자체'] || inst.district || inst['시군구'] || inst['시군'] || '미분류';
                          // 경상남도(광역시) 및 광역지원기관 제외
                          if (district && 
                              district !== '경상남도' && 
                              district !== '미분류' &&
                              district !== '*광역지원기관' &&
                              !district.includes('경상남도') &&
                              !district.includes('광역지원')) {
                            acc.set(district, (acc.get(district) || 0) + 1);
                          }
                          return acc;
                        }, new Map())
                      ).sort(([,a], [,b]) => b - a).map(([district, count]) => (
                        <div key={district} className="flex justify-between p-2 bg-white rounded border">
                          <span>{district}</span>
                          <span className="font-semibold text-blue-600">{count}개</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 운영주체별 분포 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3">운영주체별 기관 분포</h4>
                    <div className="space-y-2">
                      {(() => {
                        const facilityTypeCount = institutionData
                          .filter(inst => {
                            const district = inst.district || inst['지자체'];
                            return district !== '*광역지원기관';
                          })
                          .reduce((acc, inst) => {
                            const type = inst['시설유형구분'] || inst.facilityType || '일반';
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                          }, {});
                        
                        return Object.entries(facilityTypeCount)
                          .sort(([,a], [,b]) => b - a)
                          .map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center p-2 bg-white rounded border">
                              <span className="font-medium">{type}</span>
                              <div className="flex items-center">
                                <div className="w-16 h-2 bg-gray-200 rounded mr-2">
                                  <div 
                                    className="h-full bg-blue-500 rounded" 
                                    style={{width: `${(count / Math.max(...Object.values(facilityTypeCount))) * 100}%`}}
                                  ></div>
                                </div>
                                <span className="font-semibold text-blue-600 w-8 text-right">{count}</span>
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>

                </div>

                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                기관 데이터를 업로드하면 통계가 표시됩니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 인원 배정 및 채용 현황 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 복지부 배정 vs 기관 배정 현황 */}
        <Card>
          <CardHeader className="border-b border-slate-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-slate-900">복지부 배정 vs 기관 자체 배정</h3>
            <p className="text-sm text-slate-500 mt-1">중앙정부 배정과 기관별 실제 배정 현황</p>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 전담사회복지사 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <Users className="text-blue-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">전담사회복지사</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">복지부 배정</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {institutionData.reduce((sum, inst) => {
                        const govAllocated = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                        return sum + govAllocated;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const govAllocated = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                        return sum + govAllocated;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 자체 배정</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                        return sum + allocated;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                        return sum + allocated;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">배정 일치율</span>
                    <span className="text-sm font-bold text-green-600">
                      {(() => {
                        const govTotal = institutionData.reduce((sum, inst) => {
                          const govAllocated = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          return sum + govAllocated;
                        }, 0);
                        const instTotal = institutionData.reduce((sum, inst) => {
                          const allocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          return sum + allocated;
                        }, 0);
                        return govTotal > 0 ? ((instTotal / govTotal) * 100).toFixed(1) : '0.0';
                      })()}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 생활지원사 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <Users className="text-green-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">생활지원사</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">복지부 배정</p>
                    <p className="text-2xl font-bold text-green-600">
                      {institutionData.reduce((sum, inst) => {
                        const govAllocated = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                        return sum + govAllocated;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const govAllocated = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                        return sum + govAllocated;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 자체 배정</p>
                    <p className="text-2xl font-bold text-green-800">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                        return sum + allocated;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                        return sum + allocated;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">배정 일치율</span>
                    <span className="text-sm font-bold text-green-600">
                      {(() => {
                        const govTotal = institutionData.reduce((sum, inst) => {
                          const govAllocated = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          return sum + govAllocated;
                        }, 0);
                        const instTotal = institutionData.reduce((sum, inst) => {
                          const allocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          return sum + allocated;
                        }, 0);
                        return govTotal > 0 ? ((instTotal / govTotal) * 100).toFixed(1) : '0.0';
                      })()}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 대상자 (사후관리 제외) */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <Users className="text-purple-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">대상자 (사후관리 제외)</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">복지부 배정</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {institutionData.reduce((sum, inst) => {
                        const targets = Number(inst.allocatedTargetsGov) || Number(inst['복지부_대상자']) || 0;
                        return sum + targets;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const targets = Number(inst.allocatedTargetsGov) || Number(inst['복지부_대상자']) || 0;
                        return sum + targets;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 자체 배정</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedTargets) || Number(inst['대상자(배정)']) || 0;
                        return sum + allocated;
                      }, 0)}명
                    </p>
                    <p className="text-xs text-gray-500">
                      평균 {Math.round(institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedTargets) || Number(inst['대상자(배정)']) || 0;
                        return sum + allocated;
                      }, 0) / Math.max(1, institutionData.filter(inst => inst.district !== '*광역지원기관').length) * 10) / 10}명/기관
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">배정 일치율</span>
                    <span className="text-sm font-bold text-green-600">
                      {(() => {
                        const govTotal = institutionData.reduce((sum, inst) => {
                          const targets = Number(inst.allocatedTargetsGov) || Number(inst['복지부_대상자']) || 0;
                          return sum + targets;
                        }, 0);
                        const instTotal = institutionData.reduce((sum, inst) => {
                          const allocated = Number(inst.allocatedTargets) || Number(inst['대상자(배정)']) || 0;
                          return sum + allocated;
                        }, 0);
                        return govTotal > 0 ? ((instTotal / govTotal) * 100).toFixed(1) : '0.0';
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기관 배정 대비 실제 채용 현황 */}
        <Card>
          <CardHeader className="border-b border-slate-200 bg-green-50">
            <h3 className="text-lg font-semibold text-slate-900">기관 배정 대비 실제 채용 현황</h3>
            <p className="text-sm text-slate-500 mt-1">기관이 배정한 인원 대비 실제 채용 달성률</p>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 전담사회복지사 채용률 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <Users className="text-blue-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">전담사회복지사</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 배정</p>
                    <p className="text-xl font-bold text-gray-600">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                        return sum + allocated;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">실제 채용</p>
                    <p className="text-xl font-bold text-blue-600">
                      {institutionData.reduce((sum, inst) => {
                        const hired = Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                        return sum + hired;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">채용률</p>
                    <p className="text-xl font-bold text-green-600">
                      {(() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0);
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0);
                        }, 0);
                        return allocated > 0 ? ((hired / allocated) * 100).toFixed(1) : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{width: `${Math.min(100, (() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0);
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0);
                        }, 0);
                        return allocated > 0 ? (hired / allocated) * 100 : 0;
                      })())}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">채용 진행률</p>
                </div>
              </div>

              {/* 생활지원사 채용률 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  <Users className="text-green-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">생활지원사</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 배정</p>
                    <p className="text-xl font-bold text-gray-600">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                        return sum + allocated;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">실제 채용</p>
                    <p className="text-xl font-bold text-green-600">
                      {institutionData.reduce((sum, inst) => {
                        const hired = Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                        return sum + hired;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">채용률</p>
                    <p className="text-xl font-bold text-green-600">
                      {(() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0);
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0);
                        }, 0);
                        return allocated > 0 ? ((hired / allocated) * 100).toFixed(1) : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{width: `${Math.min(100, (() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0);
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0);
                        }, 0);
                        return allocated > 0 ? (hired / allocated) * 100 : 0;
                      })())}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">채용 진행률</p>
                </div>
              </div>

              {/* 전체 종사자 채용률 */}
              <div className="border rounded-lg p-4 bg-amber-50">
                <div className="flex items-center mb-3">
                  <Users className="text-amber-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">전체 종사자</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 배정</p>
                    <p className="text-xl font-bold text-gray-600">
                      {institutionData.reduce((sum, inst) => {
                        const socialAllocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                        const lifeAllocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                        return sum + socialAllocated + lifeAllocated;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">실제 채용</p>
                    <p className="text-xl font-bold text-amber-600">
                      {institutionData.reduce((sum, inst) => {
                        const socialHired = Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                        const lifeHired = Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                        return sum + socialHired + lifeHired;
                      }, 0)}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">종합 채용률</p>
                    <p className="text-xl font-bold text-green-600">
                      {(() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          const socialAllocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeAllocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          return sum + socialAllocated + lifeAllocated;
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          const socialHired = Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeHired = Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          return sum + socialHired + lifeHired;
                        }, 0);
                        return allocated > 0 ? ((hired / allocated) * 100).toFixed(1) : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-amber-600 h-2.5 rounded-full" 
                      style={{width: `${Math.min(100, (() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          const socialAllocated = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeAllocated = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          return sum + socialAllocated + lifeAllocated;
                        }, 0);
                        const hired = institutionData.reduce((sum, inst) => {
                          const socialHired = Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeHired = Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          return sum + socialHired + lifeHired;
                        }, 0);
                        return allocated > 0 ? (hired / allocated) * 100 : 0;
                      })())}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">종합 채용 진행률</p>
                </div>
              </div>

              {/* 대상자(사후관리 제외) 서비스 제공 현황 */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="flex items-center mb-3">
                  <Users className="text-purple-600 h-5 w-5 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-700">대상자 (사후관리 제외)</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">기관 배정</p>
                    <p className="text-xl font-bold text-gray-600">
                      {institutionData.reduce((sum, inst) => {
                        const allocated = Number(inst.allocatedTargets) || 0;
                        return sum + allocated;
                      }, 0).toLocaleString()}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">실제 서비스</p>
                    <p className="text-xl font-bold text-purple-600">
                      {institutionData.reduce((sum, inst) => {
                        const generalIntensive = Number(inst.providedGeneralIntensive) || 0;
                        const specialized = Number(inst.providedSpecialized) || 0;
                        return sum + generalIntensive + specialized;
                      }, 0).toLocaleString()}명
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">서비스 제공률</p>
                    <p className="text-xl font-bold text-green-600">
                      {(() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedTargets) || 0);
                        }, 0);
                        const actualService = institutionData.reduce((sum, inst) => {
                          const generalIntensive = Number(inst.providedGeneralIntensive) || 0;
                          const specialized = Number(inst.providedSpecialized) || 0;
                          return sum + generalIntensive + specialized;
                        }, 0);
                        return allocated > 0 ? ((actualService / allocated) * 100).toFixed(1) : '0.0';
                      })()}%
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{width: `${Math.min(100, (() => {
                        const allocated = institutionData.reduce((sum, inst) => {
                          return sum + (Number(inst.allocatedTargets) || 0);
                        }, 0);
                        const actualService = institutionData.reduce((sum, inst) => {
                          const generalIntensive = Number(inst.providedGeneralIntensive) || 0;
                          const specialized = Number(inst.providedSpecialized) || 0;
                          return sum + generalIntensive + specialized;
                        }, 0);
                        return allocated > 0 ? (actualService / allocated) * 100 : 0;
                      })())}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">서비스 제공 진행률</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 기관별 3단계 분석 */}
      <div className="mt-6">
        <Card>
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">기관별 배정 및 채용 현황 상세 분석</h3>
            <p className="text-sm text-slate-500 mt-1">복지부 배정 → 기관 자체 배정 → 실제 채용 단계별 분석 (충원률: 기관 기준)</p>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 검색 및 필터 */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="기관명 또는 시군구로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setRegionFilter('all')}
                    className={`px-3 py-1 rounded ${regionFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setRegionFilter('정상')}
                    className={`px-3 py-1 rounded ${regionFilter === '정상' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    정상
                  </button>
                  <button
                    onClick={() => setRegionFilter('배정차이')}
                    className={`px-3 py-1 rounded ${regionFilter === '배정차이' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    배정차이
                  </button>
                  <button
                    onClick={() => setRegionFilter('인력부족')}
                    className={`px-3 py-1 rounded ${regionFilter === '인력부족' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    인력부족
                  </button>
                  <button
                    onClick={() => setRegionFilter('심각한인력부족')}
                    className={`px-3 py-1 rounded ${regionFilter === '심각한인력부족' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    심각한인력부족
                  </button>
                </div>
              </div>


              {/* 이슈 유형 범례 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">이슈 유형 범례 (마우스 오버시 상세 정보 표시)</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700">정상: 모든 지표 양호</span>
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">배정차이: 복지부↔기관 배정 불일치</span>
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">인력부족: 충원율 80-90%</span>
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700">심각한 인력부족: 충원율 80% 미만</span>
                </div>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">기관명</th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 bg-gray-50">시군구</th>
                      
                      {/* 전담사회복지사 */}
                      <th colSpan={4} className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-blue-700 bg-blue-50">
                        전담사회복지사
                      </th>
                      
                      {/* 생활지원사 */}
                      <th colSpan={4} className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-green-700 bg-green-50">
                        생활지원사
                      </th>
                      
                      {/* 종합 */}
                      <th colSpan={2} className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-purple-700 bg-purple-50">
                        종합 분석
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-1 bg-gray-50"></th>
                      <th className="border border-gray-300 px-3 py-1 bg-gray-50"></th>
                      
                      {/* 전담사회복지사 세부 */}
                      <th className="border border-gray-300 px-2 py-1 text-xs text-blue-600 bg-blue-50">복지부</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-blue-600 bg-blue-50">기관</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-blue-600 bg-blue-50">실제</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-blue-600 bg-blue-50">충원율</th>
                      
                      {/* 생활지원사 세부 */}
                      <th className="border border-gray-300 px-2 py-1 text-xs text-green-600 bg-green-50">복지부</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-green-600 bg-green-50">기관</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-green-600 bg-green-50">실제</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-green-600 bg-green-50">충원율</th>
                      
                      {/* 종합 세부 */}
                      <th className="border border-gray-300 px-2 py-1 text-xs text-purple-600 bg-purple-50">전체 충원율</th>
                      <th className="border border-gray-300 px-2 py-1 text-xs text-purple-600 bg-purple-50">주요 이슈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // 필터링된 기관 데이터
                      const filteredInstitutions = institutionData
                        .filter(inst => {
                          // 광역지원기관 제외
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          // 검색어 필터
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          return searchMatch && issueMatch;
                        });
                      
                      return filteredInstitutions.map((inst, index) => {
                        // 데이터 파싱
                        const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '미분류';
                        const district = inst['지자체'] || inst.district || inst['시군구'] || '미분류';
                        
                        // 전담사회복지사
                        const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                        const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                        const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                        const socialRate = socialInst > 0 ? Math.round((socialActual / socialInst) * 100) : 0;
                        
                        // 생활지원사
                        const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                        const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                        const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                        const lifeRate = lifeInst > 0 ? Math.round((lifeActual / lifeInst) * 100) : 0;
                        
                        // 종합
                        const totalInst = socialInst + lifeInst;
                        const totalActual = socialActual + lifeActual;
                        const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                        
                        // 복합 이슈 판단 및 상세 설명
                        const issues = [];
                        
                        // 배정차이 체크
                        const socialDiff = socialGov !== socialInst;
                        const lifeDiff = lifeGov !== lifeInst;
                        if (socialDiff || lifeDiff) {
                          let diffDetail = '';
                          if (socialDiff && lifeDiff) diffDetail = '전담·생활 모두';
                          else if (socialDiff) diffDetail = '전담사회복지사';
                          else diffDetail = '생활지원사';
                          
                          issues.push({ 
                            label: '배정차이', 
                            color: 'bg-blue-100 text-blue-700',
                            detail: `${diffDetail} 배정 불일치`
                          });
                        }
                        
                        // 인력부족 체크
                        if (totalRate < 80) {
                          const shortage = Math.round(((totalInst - totalActual) / totalInst) * 100);
                          issues.push({ 
                            label: '심각한 인력부족', 
                            color: 'bg-red-100 text-red-700',
                            detail: `${shortage}% 부족 (${totalInst - totalActual}명)`
                          });
                        } else if (totalRate < 90) {
                          const shortage = Math.round(((totalInst - totalActual) / totalInst) * 100);
                          issues.push({ 
                            label: '인력부족', 
                            color: 'bg-yellow-100 text-yellow-700',
                            detail: `${shortage}% 부족 (${totalInst - totalActual}명)`
                          });
                        }
                        
                        if (issues.length === 0) {
                          issues.push({ 
                            label: '정상', 
                            color: 'bg-green-100 text-green-700',
                            detail: '모든 지표 양호'
                          });
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                              {institutionName.length > 15 ? `${institutionName.slice(0, 15)}...` : institutionName}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-gray-600 text-center">
                              {district}
                            </td>
                            
                            {/* 전담사회복지사 */}
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-blue-50">
                              {socialGov}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-blue-50">
                              {socialInst}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-blue-50">
                              {socialActual}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-blue-50">
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                socialRate >= 100 ? 'bg-green-100 text-green-800' :
                                socialRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {socialRate}%
                              </span>
                            </td>
                            
                            {/* 생활지원사 */}
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-green-50">
                              {lifeGov}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-green-50">
                              {lifeInst}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-green-50">
                              {lifeActual}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-green-50">
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                lifeRate >= 100 ? 'bg-green-100 text-green-800' :
                                lifeRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {lifeRate}%
                              </span>
                            </td>
                            
                            {/* 종합 */}
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-purple-50">
                              <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                                totalRate >= 100 ? 'bg-green-100 text-green-800' :
                                totalRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                                totalRate >= 80 ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {totalRate}%
                              </span>
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs text-center bg-purple-50">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {issues.map((issue, issueIndex) => (
                                  <span 
                                    key={issueIndex} 
                                    className={`px-1 py-0.5 rounded text-xs ${issue.color} cursor-help`}
                                    title={issue.detail}
                                  >
                                    {issue.label}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* 요약 통계 */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">분석 요약</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                  <div>
                    <span className="text-slate-600">분석 대상 기관:</span>
                    <span className="ml-1 font-semibold text-slate-900">
                      {(() => {
                        const filteredCount = institutionData.filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          return searchMatch && issueMatch;
                        }).length;
                        
                        const totalCount = institutionData.filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          return name && !name.includes('광역지원') && !name.includes('사회서비스원');
                        }).length;
                        
                        return `${filteredCount}개 / 전체 ${totalCount}개`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">평균 충원율:</span>
                    <span className="ml-1 font-semibold text-slate-900">
                      {(() => {
                        const filteredInstitutions = institutionData.filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          return searchMatch && issueMatch;
                        });
                        
                        const rates = filteredInstitutions
                          .map(inst => {
                            const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                            const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                            const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                            const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                            const totalInst = socialInst + lifeInst;
                            const totalActual = socialActual + lifeActual;
                            return totalInst > 0 ? (totalActual / totalInst) * 100 : 0;
                          })
                          .filter(rate => rate > 0);
                        
                        const avgRate = rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
                        return Math.round(avgRate);
                      })()}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">우수 기관:</span>
                    <span className="ml-1 font-semibold text-green-600">
                      {institutionData
                        .filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          if (!searchMatch || !issueMatch) return false;
                          
                          // 통계 계산용 변수 (이미 위에서 계산됨)
                          return totalRate >= 100;
                        }).length}개
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">주의 기관:</span>
                    <span className="ml-1 font-semibold text-red-600">
                      {institutionData
                        .filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          if (!searchMatch || !issueMatch) return false;
                          
                          return totalRate < 80;
                        }).length}개
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">배정 차이:</span>
                    <span className="ml-1 font-semibold text-blue-600">
                      {institutionData
                        .filter(inst => {
                          const name = inst['수행기관명'] || inst.institutionName || inst.name || inst['광역명'] || '';
                          if (!name || name.includes('광역지원') || name.includes('사회서비스원')) return false;
                          
                          const institutionName = inst['수행기관명'] || inst.institutionName || inst.name || '';
                          const district = inst['지자체'] || inst.district || inst['시군구'] || '';
                          const searchMatch = searchTerm === '' || 
                            institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            district.toLowerCase().includes(searchTerm.toLowerCase());
                          // 이슈 필터링을 위한 이슈 계산
                          const socialGov = Number(inst.allocatedSocialWorkersGov) || Number(inst['복지부_전담사회복지사']) || 0;
                          const socialInst = Number(inst.allocatedSocialWorkers) || Number(inst['전담사회복지사(배정)']) || 0;
                          const lifeGov = Number(inst.allocatedLifeSupportGov) || Number(inst['복지부_생활지원사']) || 0;
                          const lifeInst = Number(inst.allocatedLifeSupport) || Number(inst['생활지원사(배정)']) || 0;
                          const socialActual = Number(inst.actualSocialWorkers) || Number(inst.hiredSocialWorkers) || Number(inst['전담사회복지사(채용)']) || 0;
                          const lifeActual = Number(inst.actualLifeSupport) || Number(inst.hiredLifeSupport) || Number(inst['생활지원사(채용)']) || 0;
                          
                          const totalInst = socialInst + lifeInst;
                          const totalActual = socialActual + lifeActual;
                          const totalRate = totalInst > 0 ? Math.round((totalActual / totalInst) * 100) : 0;
                          
                          // 이슈 판단
                          const hasAllocationDiff = socialGov !== socialInst || lifeGov !== lifeInst;
                          const hasSevereShortage = totalRate < 80;
                          const hasShortage = totalRate >= 80 && totalRate < 90;
                          const isNormal = !hasAllocationDiff && !hasSevereShortage && !hasShortage;
                          
                          // 이슈 필터
                          let issueMatch = true;
                          if (regionFilter === 'all') {
                            issueMatch = true;
                          } else if (regionFilter === '정상') {
                            issueMatch = isNormal;
                          } else if (regionFilter === '배정차이') {
                            issueMatch = hasAllocationDiff;
                          } else if (regionFilter === '인력부족') {
                            issueMatch = hasShortage;
                          } else if (regionFilter === '심각한인력부족') {
                            issueMatch = hasSevereShortage;
                          }
                          
                          if (!searchMatch || !issueMatch) return false;
                          
                          // 이미 위에서 계산된 hasAllocationDiff 사용
                          return hasAllocationDiff;
                        }).length}개
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}