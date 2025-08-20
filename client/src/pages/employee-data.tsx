import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Users, RefreshCw, Download, Settings } from 'lucide-react';
import { Link } from 'wouter';
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

export default function EmployeeDataPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [jobTypeFilter, setJobTypeFilter] = useState('all'); // 'all', 'social-worker', 'life-support'
  const [isExporting, setIsExporting] = useState(false);
  const [isCorrectingData, setIsCorrectingData] = useState(false);
  const { toast } = useToast();
  const { employeeData, setEmployeeData } = useEmployeeStore();

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      console.log(`🔄 종사자 데이터 로드 시작 (강제새로고침: ${forceRefresh})`);
      
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      let indexedData = await educationDB.getItem<any[]>('employeeData');
      
      // 강제 새로고침인 경우에만 서버에서 다시 가져오기 (단, 기존 데이터가 있는 경우에만)
      if (forceRefresh && indexedData && indexedData.length > 0) {
        console.log('🔄 강제 새로고침: 기존 데이터를 다시 보정 적용');
        // 기존 IndexedDB 데이터를 그대로 사용하되 보정만 다시 적용
      } else if (!indexedData || indexedData.length === 0) {
        console.log('📡 IndexedDB에 데이터 없음, 서버에서 데이터 가져오기...');
        try {
          const response = await fetch('/api/employees?limit=100000');
          if (response.ok) {
            const result = await response.json();
            indexedData = result.data || [];
            
            if (indexedData.length > 0) {
              // IndexedDB에 저장
              await educationDB.setItem('employeeData', indexedData);
              console.log(`💾 IndexedDB에 ${indexedData.length}명 데이터 저장 완료`);
            }
          } else {
            console.warn('서버 API 응답 실패:', response.status);
          }
        } catch (error) {
          console.warn('서버 API 호출 실패:', error);
        }
      }
      
      console.log(`🗃️ IndexedDB에서 종사자 데이터 로드: ${indexedData?.length || 0}명`);
      
      if (indexedData && indexedData.length > 0) {
        // 데이터 보정: 컬럼이 밀린 경우 수정 (백현태님 문제 해결)
        const correctedData = indexedData.map(emp => {
          // 백현태님 데이터 보정
          if (emp.name === '백현태' && emp.modifiedDate === 'qorgusxo11') {
            console.log(`🔧 [백현태] 잘못된 필드 매핑 수정`);
            
            return {
              ...emp,
              // 올바른 필드 매핑
              notes: emp.remarks || '개인사유로 인한 퇴사',    // notes를 비고로
              note: emp.remarks || '개인사유로 인한 퇴사',     // note도 비고로
              modifiedDate: emp.mainDuty || '2024-04-01',      // modifiedDate를 수정일로
              mainDuty: '-',                                    // mainDuty는 주요업무
              primaryWork: '-',                                 // primaryWork도 주요업무
              // 이미 올바른 필드들은 유지
              learningId: emp.learningId || 'qorgusxo11',
              updateDate: emp.updateDate || '2024-04-01',
              mainTasks: emp.mainTasks || '-',
              corrected: true,
              correctionType: 'field_mapping_fix'
            };
          }
          
          // 기존 보정 로직도 유지 (일반적인 1칸 밀림)
          if (emp.name === '특화' && emp.careerType && 
              typeof emp.careerType === 'string' && 
              emp.careerType.length >= 2 && 
              emp.careerType.length <= 4 && 
              /^[가-힣]+$/.test(emp.careerType)) {
            
            console.log(`🔧 일반 컬럼 밀림 보정: "${emp.name}" → "${emp.careerType}" (기관: ${emp.institution})`);
            
            return {
              ...emp,
              name: emp.careerType,              // 실제 이름
              careerType: emp.birthDate,         // 경력 (4년이상)
              birthDate: emp.gender,             // 생년월일 (1990-04-10)
              gender: emp.hireDate,              // 성별 (남)
              hireDate: emp.learningId,          // 입사일을 올바른 위치로
              // 보정 표시
              corrected: true,
              originalName: emp.name,
              correctionType: 'column_shift'
            };
          }
          
          return emp;
        });
        
        setEmployeeData(correctedData);
        
        // 보정된 데이터를 IndexedDB에 다시 저장
        try {
          await educationDB.setItem('employeeData', correctedData);
          console.log('✅ 보정된 데이터를 IndexedDB에 저장 완료');
        } catch (error) {
          console.warn('보정된 데이터 저장 실패:', error);
        }
        
        // education-store도 업데이트
        try {
          const { useEducationStore } = await import('@/store/education-store');
          const { setEmployeeData: setEducationEmployeeData } = useEducationStore.getState();
          setEducationEmployeeData(correctedData);
          console.log('✅ education-store도 업데이트 완료');
        } catch (error) {
          console.warn('education-store 업데이트 실패:', error);
        }
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/employees?limit=100000');
        console.log('🌐 서버 응답 상태:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📊 서버에서 받은 데이터:', result);
          console.log('📈 실제 데이터 길이:', result?.data?.length || 0, '(result.data)', result?.length || 0, '(result)');
          
          // 다양한 가능성을 고려해서 데이터 추출
          const actualData = result.data || result || [];
          console.log('🎯 사용할 데이터:', actualData.length, '명');
          
          setEmployeeData(actualData);
        } else {
          console.error('❌ 서버 API 호출 실패:', response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 데이터 보정 전용 함수 (서버 호출 없이 기존 데이터만 보정)
  const correctExistingData = async () => {
    setIsCorrectingData(true);
    try {
      console.log('🔧 기존 데이터 보정 시작...');
      
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const rawResponse = await educationDB.getItem<any>('employeeData');
      
      // 서버 응답 형태에 맞게 데이터 추출
      let rawData = [];
      if (rawResponse && rawResponse.data && Array.isArray(rawResponse.data)) {
        rawData = rawResponse.data;
      } else if (Array.isArray(rawResponse)) {
        rawData = rawResponse;
      }
      
      if (!rawData || rawData.length === 0) {
        console.log('❌ rawData 상태:', rawResponse);
        toast({
          title: "보정할 데이터가 없습니다",
          description: "먼저 종사자 데이터를 업로드해주세요.",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`📊 기존 데이터 ${rawData.length}명에 보정 로직 적용`);
      
      // 동일한 보정 로직 적용
      const correctedData = rawData.map(emp => {
        // 백현태님 데이터 보정 (correctExistingData)
        if (emp.name === '백현태' && emp.modifiedDate === 'qorgusxo11') {
          console.log(`🔧 [보정] 백현태님 잘못된 필드 매핑 수정`);
          
          return {
            ...emp,
            // 올바른 필드 매핑
            notes: emp.remarks || '개인사유로 인한 퇴사',    // notes를 비고로
            note: emp.remarks || '개인사유로 인한 퇴사',     // note도 비고로
            modifiedDate: emp.mainDuty || '2024-04-01',      // modifiedDate를 수정일로
            mainDuty: '-',                                    // mainDuty는 주요업무
            primaryWork: '-',                                 // primaryWork도 주요업무
            // 이미 올바른 필드들은 유지
            learningId: emp.learningId || 'qorgusxo11',
            updateDate: emp.updateDate || '2024-04-01',
            mainTasks: emp.mainTasks || '-',
            corrected: true,
            correctionType: 'field_mapping_fix'
          };
        }
        
        // 일반적인 1칸 밀림 보정
        if (emp.name === '특화' && emp.careerType && 
            typeof emp.careerType === 'string' && 
            emp.careerType.length >= 2 && 
            emp.careerType.length <= 4 && 
            /^[가-힣]+$/.test(emp.careerType)) {
          
          console.log(`🔧 [보정] 일반 컬럼 밀림: "${emp.name}" → "${emp.careerType}"`);
          
          return {
            ...emp,
            name: emp.careerType,
            careerType: emp.birthDate,
            birthDate: emp.gender,
            gender: emp.hireDate,
            hireDate: emp.learningId,
            corrected: true,
            originalName: emp.name,
            originalCareerType: emp.careerType, // 원래 careerType 보존
            correctionType: 'manual_column_shift'
          };
        }
        
        return emp;
      });
      
      // 보정된 데이터를 원본 구조로 다시 감싸서 저장
      const updatedResponse = {
        ...rawResponse,
        data: correctedData
      };
      
      setEmployeeData(correctedData);
      await educationDB.setItem('employeeData', updatedResponse);
      
      // education-store도 업데이트
      try {
        const { useEducationStore } = await import('@/store/education-store');
        const { setEmployeeData: setEducationEmployeeData } = useEducationStore.getState();
        setEducationEmployeeData(correctedData);
        console.log('✅ education-store도 업데이트 완료');
      } catch (error) {
        console.warn('education-store 업데이트 실패:', error);
      }
      
      toast({
        title: "데이터 보정 완료",
        description: `${correctedData.length}명의 데이터에 보정을 적용했습니다.`,
      });
      
    } catch (error) {
      console.error('데이터 보정 실패:', error);
      toast({
        title: "보정 실패",
        description: "데이터 보정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsCorrectingData(false);
    }
  };

  // 🔥 IndexedDB 동기화 함수 추가
  const syncServerToIndexedDB = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 서버 데이터를 IndexedDB로 동기화 시작...');
      
      // 서버에서 모든 데이터 가져오기
      const response = await fetch('/api/employees?limit=100000');
      if (!response.ok) {
        throw new Error('서버 데이터 가져오기 실패');
      }
      
      const result = await response.json();
      const allData = result.data || [];
      
      console.log(`📊 서버에서 ${allData.length}명 데이터 가져옴`);
      
      // IndexedDB에 저장
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const db = new IndexedDBStorage();
      await db.setItem('employeeData', allData);
      
      console.log(`💾 IndexedDB에 ${allData.length}명 저장 완료`);
      
      // 스토어 업데이트
      setEmployeeData(allData);
      
      toast({
        title: "동기화 완료",
        description: `${allData.length}명의 종사자 데이터가 동기화되었습니다.`,
      });
      
    } catch (error) {
      console.error('동기화 실패:', error);
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "파일 선택됨",
        description: `${file.name}이 선택되었습니다.`,
      });
    }
  };

  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      // 1. 서버에 파일 업로드
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/employees/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 2. 서버에서 모든 데이터 가져오기 (종사자 데이터 업로드 후)
      const [employeeResponse, participantResponse, basicResponse, advancedResponse, institutionResponse] = await Promise.all([
        fetch('/api/employees?limit=100000'),
        fetch('/api/participants?limit=100000'),
        fetch('/api/education/basic?limit=100000'),
        fetch('/api/education/advanced?limit=100000'),
        fetch('/api/institutions?limit=100000')
      ]);

      const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
        employeeResponse.ok ? employeeResponse.json() : [],
        participantResponse.ok ? participantResponse.json() : [],
        basicResponse.ok ? basicResponse.json() : [],
        advancedResponse.ok ? advancedResponse.json() : [],
        institutionResponse.ok ? institutionResponse.json() : []
      ]);

      // 3. 날짜별 스냅샷 생성
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

      // 4. IndexedDB 동기화 (현재 스냅샷 기준)
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      await educationDB.setItem('employeeData', employeeData);
      setEmployeeData(employeeData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 종사자 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 종사자 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error; // DateUploadForm에서 에러 처리
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('모든 종사자 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/employees/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 종사자 데이터가 삭제되었습니다.",
      });

      // 스토어 데이터 즉시 초기화 - 빈 배열로 명확히 설정
      setEmployeeData([]);
      console.log('✅ 스토어 employeeData를 빈 배열로 초기화');
      
      // IndexedDB 완전 삭제
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        
        // employeeData 삭제
        await educationDB.removeItem('employeeData');
        console.log('✅ IndexedDB employeeData 삭제 완료');
        
        // 스냅샷에서도 employeeData 제거
        const currentSnapshot = await snapshotManager.getCurrentSnapshot();
        if (currentSnapshot) {
          currentSnapshot.employeeData = [];
          const snapshotList = await snapshotManager.getSnapshotList();
          if (snapshotList.currentSnapshot) {
            snapshotList.snapshots[snapshotList.currentSnapshot].employeeData = [];
            await educationDB.setItem('dataSnapshots', snapshotList);
            console.log('✅ 스냅샷에서 employeeData 제거 완료');
          }
        }
      } catch (e) {
        console.error('IndexedDB 삭제 실패:', e);
      }

      // localStorage 강제 클리어 (Zustand persist 때문에)
      try {
        localStorage.removeItem('employee-store');
        localStorage.removeItem('employee-storage');
        // education-store도 클리어
        const educationStore = localStorage.getItem('education-store');
        if (educationStore) {
          const parsed = JSON.parse(educationStore);
          if (parsed.state) {
            parsed.state.employeeData = [];
            localStorage.setItem('education-store', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.warn('localStorage 클리어 실패:', e);
      }

      // education-store의 employeeData도 초기화
      try {
        const { useEducationStore } = await import('@/store/education-store');
        const { setEmployeeData: setEducationEmployeeData } = useEducationStore.getState();
        setEducationEmployeeData([]);
        console.log('✅ education-store employeeData 초기화 완료');
      } catch (e) {
        console.warn('education-store 초기화 실패:', e);
      }

      // 강제로 페이지 새로고침
      window.location.reload();

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

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "파일을 선택해주세요",
        description: "업로드할 종사자 데이터 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('/api/employees/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      toast({
        title: "업로드 완료",
        description: `${result.count}개의 새로운 종사자 데이터가 업로드되었습니다. (총 ${result.total}명, 재직 중 ${result.active}명)`,
      });
      
      // 파일 선택 초기화
      setUploadedFile(null);
      const fileInput = document.getElementById('employee-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // 목록 탭으로 이동
      setActiveTab('list');
      // Refresh data after upload AND sync to IndexedDB
      await fetchEmployeeData();
      
      // 🔥 중요: 서버에서 데이터를 다시 가져와서 IndexedDB에 저장
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        const serverResponse = await fetch('/api/employees?limit=100000'); // 모든 데이터 가져오기
        if (serverResponse.ok) {
          const serverResult = await serverResponse.json();
          const allEmployeeData = serverResult.data || [];
          
          console.log(`💾 서버에서 ${allEmployeeData.length}명 데이터를 IndexedDB에 동기화`);
          await educationDB.setItem('employeeData', allEmployeeData);
          
          // 스토어도 업데이트
          setEmployeeData(allEmployeeData);
        }
      } catch (syncError) {
        console.error('IndexedDB 동기화 실패:', syncError);
      }
      
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 데이터 필터링 및 페이지네이션 - API 응답 객체 처리 및 배열 체크 추가
  let actualEmployeeData = employeeData;
  
  // API 응답 형태 {data: Array, pagination: Object} 처리
  if (!Array.isArray(employeeData) && employeeData && typeof employeeData === 'object') {
    if (Array.isArray(employeeData.data)) {
      console.log('✅ API 응답 객체에서 데이터 배열 추출:', employeeData.data.length, '개');
      actualEmployeeData = employeeData.data;
    } else {
      console.warn('⚠️ employeeData가 배열이 아닙니다:', typeof employeeData, employeeData);
      actualEmployeeData = [];
    }
  } else if (!Array.isArray(employeeData)) {
    console.warn('⚠️ employeeData가 배열이 아닙니다:', typeof employeeData, employeeData);
    actualEmployeeData = [];
  }
  
  const filteredData = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(item => {
    // 상태 필터링
    if (statusFilter === 'active' && !item.isActive) return false;
    if (statusFilter === 'inactive' && item.isActive) return false;
    
    // 직무 필터링
    if (jobTypeFilter === 'social-worker' && 
        !(item.jobType === '전담사회복지사' || item.jobType === '선임전담사회복지사')) return false;
    if (jobTypeFilter === 'life-support' && 
        !(item.jobType === '생활지원사' || 
          item.jobType?.includes('생활지원') ||
          item.jobType?.includes('요양') ||
          item.jobType?.includes('돌봄') ||
          item.jobType?.includes('케어') ||
          item.jobType?.includes('특화') ||
          // 전담사회복지사가 아닌 모든 직무를 생활지원사로 분류
          (!item.jobType?.includes('전담') && !item.jobType?.includes('사회복지사') && item.jobType && item.jobType !== '전담사회복지사' && item.jobType !== '선임전담사회복지사')
        )) return false;
    
    // 검색어 필터링
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.originalName?.toLowerCase().includes(searchLower) ||
      item.originalCareerType?.toLowerCase().includes(searchLower) ||
      item.institution?.toLowerCase().includes(searchLower) ||
      item.jobType?.toLowerCase().includes(searchLower) ||
      item.careerType?.toLowerCase().includes(searchLower) ||
      item.institutionCode?.toLowerCase().includes(searchLower)
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
      const exportData = filteredData.map(emp => ({
        '광역시': emp.region || emp.province || '',
        '지자체': emp.district || '',
        '광역코드': emp.regionCode || '',
        '광역명': emp.regionName || emp.institution || '',
        '수행기관코드': emp.institutionCode || '',
        '직무구분': emp.jobType || '',
        '담당업무': emp.responsibility || emp.duty || '',
        '성명': emp.name || '',
        '경력구분/엔젯코드': emp.careerType || emp.angelCode || '',
        '생년월일': emp.birthDate || '',
        '성별': emp.gender || '',
        '입사일': emp.hireDate || '',
        '퇴사일': emp.resignDate || '',
        '비고': emp.notes || emp.remarks || emp.note || '',
        '배움터ID': emp.learningId || '',
        '수정일': emp.modifiedDate || '',
        '주요업무': emp.mainDuty || emp.primaryWork || '',
        '상태': emp.isActive ? '재직' : '퇴직'
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '종사자 데이터');

      // 파일명 생성
      const getFilterDescription = () => {
        const parts = [];
        if (statusFilter !== 'all') parts.push(statusFilter === 'active' ? '재직' : '퇴직');
        if (jobTypeFilter !== 'all') {
          if (jobTypeFilter === 'social-worker') parts.push('전담사회복지사');
          if (jobTypeFilter === 'life-support') parts.push('생활지원사');
        }
        if (searchTerm) parts.push(`검색_${searchTerm}`);
        return parts.length > 0 ? `_${parts.join('_')}` : '';
      };

      const today = new Date().toISOString().split('T')[0];
      const fileName = `종사자데이터${getFilterDescription()}_${today}.xlsx`;

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
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">종사자 데이터 관리</h1>
          <p className="text-muted-foreground mt-2">
            종사자 정보를 업로드하고 관리합니다
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
            데이터 목록 ({employeeData?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="space-y-6">
            <DateUploadForm
              onUpload={handleDateUpload}
              isUploading={isUploading}
              title="종사자 데이터 업로드"
              description="Excel 파일을 통해 종사자 정보를 특정 날짜 기준으로 업로드합니다"
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">데이터 관리</CardTitle>
              <CardDescription>종사자 데이터를 관리합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleClearData}
                disabled={isLoading || !actualEmployeeData || actualEmployeeData.length === 0}
              >
                데이터 초기화
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    종사자 데이터 목록
                  </CardTitle>
                  <CardDescription>
                    업로드된 종사자 정보를 조회합니다
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    disabled={isExporting || !employeeData || employeeData.length === 0}
                  >
                    <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                    {isExporting ? '내보내는 중...' : '내보내기'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={correctExistingData}
                    disabled={isCorrectingData || isLoading || !employeeData || employeeData.length === 0}
                  >
                    <Settings className={`h-4 w-4 mr-2 ${isCorrectingData ? 'animate-spin' : ''}`} />
                    {isCorrectingData ? '보정 중...' : '데이터 보정'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEmployeeData(true)}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground">데이터를 불러오는 중...</div>
                </div>
              ) : !actualEmployeeData || actualEmployeeData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 종사자 데이터가 없습니다.
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('upload')}
                  >
                    데이터 업로드하기
                  </Button>
                </div>
              ) : (() => {
                return (
                  <>
                    <div className="mb-4 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-center gap-4 flex-wrap">
                          {jobTypeFilter === 'social-worker' ? (
                            // 전담사회복지사 필터링 시에는 재직 전담사회복지사 수만 표시
                            <div className="p-4 bg-blue-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                  // 전담사회복지사인지 확인
                                  const isSocialWorker = emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사';
                                  if (!isSocialWorker) return false;
                                  
                                  // 퇴사일이 있으면 오늘 날짜와 비교하여 재직 여부 판단
                                  if (emp.resignDate) {
                                    try {
                                      const resignDate = new Date(emp.resignDate);
                                      const today = new Date();
                                      return resignDate > today;
                                    } catch {
                                      return false;
                                    }
                                  }
                                  return emp.isActive;
                                }).length}명
                              </div>
                              <div className="text-xs text-blue-700">재직 전담사회복지사</div>
                            </div>
                          ) : jobTypeFilter === 'life-support' ? (
                            // 생활지원사 필터링 시에는 재직 생활지원사 수만 표시
                            <div className="p-4 bg-green-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                  // 생활지원사인지 확인
                                  if (emp.jobType !== '생활지원사') return false;
                                  
                                  // 퇴사일이 있으면 오늘 날짜와 비교하여 재직 여부 판단
                                  if (emp.resignDate) {
                                    try {
                                      const resignDate = new Date(emp.resignDate);
                                      const today = new Date();
                                      return resignDate > today;
                                    } catch {
                                      return false;
                                    }
                                  }
                                  return emp.isActive;
                                }).length}명
                              </div>
                              <div className="text-xs text-green-700">재직 생활지원사</div>
                            </div>
                          ) : (
                            // 전체 보기 또는 기타 필터링 시에는 전체 재직자 수와 직무별 세부 수 표시
                            <>
                              <div className="p-4 bg-muted rounded-md">
                                <div className="text-lg font-semibold">
                                  {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                    // 퇴사일이 있으면 오늘 날짜와 비교하여 재직 여부 판단
                                    if (emp.resignDate) {
                                      try {
                                        const resignDate = new Date(emp.resignDate);
                                        const today = new Date();
                                        return resignDate > today; // 퇴사일이 미래이면 재직
                                      } catch {
                                        return false; // 퇴사일 파싱 실패시 퇴직으로 간주
                                      }
                                    }
                                    // 퇴사일이 없으면 기본 isActive 값 사용
                                    return emp.isActive;
                                  }).length}명
                                </div>
                                <div className="text-xs text-muted-foreground">전체 재직자</div>
                              </div>
                              <div className="p-4 bg-blue-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                    // 전담사회복지사인지 확인
                                    const isSocialWorker = emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사';
                                    if (!isSocialWorker) return false;
                                    
                                    // 퇴사일이 있으면 오늘 날짜와 비교하여 재직 여부 판단
                                    if (emp.resignDate) {
                                      try {
                                        const resignDate = new Date(emp.resignDate);
                                        const today = new Date();
                                        return resignDate > today;
                                      } catch {
                                        return false;
                                      }
                                    }
                                    return emp.isActive;
                                  }).length}명
                                </div>
                                <div className="text-xs text-blue-600">전담사회복지사</div>
                              </div>
                              <div className="p-4 bg-green-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                    // 생활지원사인지 확인
                                    if (emp.jobType !== '생활지원사') return false;
                                    
                                    // 퇴사일이 있으면 오늘 날짜와 비교하여 재직 여부 판단
                                    if (emp.resignDate) {
                                      try {
                                        const resignDate = new Date(emp.resignDate);
                                        const today = new Date();
                                        return resignDate > today;
                                      } catch {
                                        return false;
                                      }
                                    }
                                    return emp.isActive;
                                  }).length}명
                                </div>
                                <div className="text-xs text-green-600">생활지원사</div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Input
                            placeholder="이름, 기관, 직군, 경력으로 검색..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1); // 검색 시 첫 페이지로
                            }}
                            className="w-full sm:w-64"
                          />
                          <Select value={statusFilter} onValueChange={(value) => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue placeholder="상태 필터" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체</SelectItem>
                              <SelectItem value="active">재직</SelectItem>
                              <SelectItem value="inactive">퇴직</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={jobTypeFilter} onValueChange={(value) => {
                            setJobTypeFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-full sm:w-40">
                              <SelectValue placeholder="직무 필터" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체 직무</SelectItem>
                              <SelectItem value="social-worker">전담사회복지사</SelectItem>
                              <SelectItem value="life-support">생활지원사</SelectItem>
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
                              <SelectItem value="25">25개씩</SelectItem>
                              <SelectItem value="50">50개씩</SelectItem>
                              <SelectItem value="100">100개씩</SelectItem>
                              <SelectItem value="200">200개씩</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportData}
                            disabled={isExporting || filteredData.length === 0}
                            className="flex-shrink-0"
                          >
                            <Download className={`h-4 w-4 mr-1 ${isExporting ? 'animate-spin' : ''}`} />
                            내보내기
                          </Button>
                        </div>
                      </div>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
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
                    
                    <div className="rounded-md border">
                      <div className="overflow-auto max-h-[800px] w-full">
                        <Table className="table-fixed w-full" style={{ minWidth: '2000px' }}>
                          <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                            <TableRow>
                              <TableHead className="w-32 bg-background border-b border-r">광역시</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">지자체</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">광역코드</TableHead>
                              <TableHead className="w-48 bg-background border-b border-r">광역명</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">수행기관코드</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">직무구분</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">담당업무</TableHead>
                              <TableHead className="w-24 bg-background border-b border-r">성명</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">경력구분/엔젤코드</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">생년월일</TableHead>
                              <TableHead className="w-20 text-center bg-background border-b border-r">성별</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">입사일</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">퇴사일</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">비고</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">배움터ID</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">수정일</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">주요업무</TableHead>
                              <TableHead className="w-24 text-center bg-background border-b">상태</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentData.map((employee, index) => (
                              <TableRow key={index} className="hover:bg-muted/50">
                                <TableCell className="border-r">{employee.region || employee.province || '-'}</TableCell>
                                <TableCell className="border-r">{employee.district || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.regionCode || '-'}</TableCell>
                                <TableCell className="border-r">{employee.regionName || employee.institution || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.institutionCode || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  <Badge variant="outline">{employee.jobType || '-'}</Badge>
                                </TableCell>
                                <TableCell className="border-r">{employee.responsibility || employee.duty || '-'}</TableCell>
                                <TableCell className="font-medium border-r">{employee.name}</TableCell>
                                <TableCell className="text-center border-r">{employee.careerType || employee.angelCode || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.birthDate || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.gender || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  {employee.hireDate ? 
                                    (() => {
                                      try {
                                        const date = employee.hireDate instanceof Date ? 
                                          employee.hireDate : 
                                          new Date(employee.hireDate);
                                        return isNaN(date.getTime()) ? employee.hireDate : date.toLocaleDateString('ko-KR');
                                      } catch {
                                        return employee.hireDate;
                                      }
                                    })() : '-'}
                                </TableCell>
                                <TableCell className="text-center border-r">
                                  {employee.resignDate ? 
                                    (() => {
                                      try {
                                        const date = employee.resignDate instanceof Date ? 
                                          employee.resignDate : 
                                          new Date(employee.resignDate);
                                        return isNaN(date.getTime()) ? employee.resignDate : date.toLocaleDateString('ko-KR');
                                      } catch {
                                        return employee.resignDate;
                                      }
                                    })() : '-'}
                                </TableCell>
                                <TableCell className="border-r">{employee.note || employee.remarks || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.learningId || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.modifiedDate || '-'}</TableCell>
                                <TableCell className="border-r">{employee.mainDuty || employee.primaryWork || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                                    {employee.isActive ? '재직' : '퇴직'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}