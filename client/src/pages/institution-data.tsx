import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, List, Eye, Building, Download, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { institutionData, setInstitutionData } = useEmployeeStore();

  useEffect(() => {
    fetchInstitutionData();
  }, []);

  const fetchInstitutionData = async () => {
    setIsLoading(true);
    try {
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const indexedData = await educationDB.getItem<any[]>('institutionData');
      
      console.log(`🗃️ IndexedDB에서 기관 데이터 로드: ${indexedData?.length || 0}개`);
      
      if (indexedData && indexedData.length > 0) {
        setInstitutionData(indexedData);
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/institutions');
        if (response.ok) {
          const data = await response.json();
          setInstitutionData(data);
        }
      }
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            데이터 업로드
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            데이터 목록 ({institutionData.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="space-y-6">
            <DateUploadForm
              onUpload={handleDateUpload}
              isUploading={isUploading}
              title="기관현황 데이터 업로드"
              description="Excel 파일을 통해 기관현황 데이터를 특정 날짜 기준으로 업로드합니다"
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">데이터 관리</CardTitle>
              <CardDescription>기관 현황 데이터를 관리합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleClearData}
                disabled={isLoading || !institutionData || institutionData.length === 0}
              >
                데이터 초기화
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
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
                    onClick={() => setActiveTab('upload')}
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-lg font-semibold">{filteredData.length}개</div>
                      <div className="text-sm text-muted-foreground">
                        {searchTerm || regionFilter !== 'all' ? '검색 결과' : '총 기관'}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-lg font-semibold">
                        {institutionData.reduce((sum, inst) => sum + inst.actualSocialWorkers, 0)}명
                      </div>
                      <div className="text-sm text-muted-foreground">사회복지사 실배치</div>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-lg font-semibold">
                        {institutionData.reduce((sum, inst) => sum + inst.actualLifeSupport, 0)}명
                      </div>
                      <div className="text-sm text-muted-foreground">생활지원사 실배치</div>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-lg font-semibold">
                        {Math.round(
                          institutionData.reduce((sum, inst) => {
                            const total = inst.allocatedSocialWorkers + inst.allocatedLifeSupport;
                            const actual = inst.actualSocialWorkers + inst.actualLifeSupport;
                            return sum + (total > 0 ? (actual / total) * 100 : 0);
                          }, 0) / institutionData.length
                        )}%
                      </div>
                      <div className="text-sm text-muted-foreground">평균 충원율</div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}