import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Users, RefreshCw, Download, Settings, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
import EmployeeStatistics from "@/components/employees/employee-statistics";
import { GWANGYEOK_MANAGERS, getGwangyeokManager } from "@/constants/managers";

export default function EmployeeDataPage() {
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [jobTypeFilter, setJobTypeFilter] = useState('all'); // 'all', 'social-worker', 'life-support'
  const [managerFilter, setManagerFilter] = useState('all'); // 'all', '이정혜', '이연숙', '김수연', '신용기'
  const [isExporting, setIsExporting] = useState(false);
  const [isCorrectingData, setIsCorrectingData] = useState(false);
  const { toast } = useToast();
  const { employeeData, setEmployeeData, loadEmployeeData, loadInstitutionData } = useEmployeeStore();

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🔄 초기 데이터 로딩 시작...');
      
      // 먼저 store의 자동 로딩 시도 (기관 데이터와 직원 데이터 모두)
      try {
        await Promise.all([
          loadEmployeeData(),
          loadInstitutionData()
        ]);
        console.log('✅ Store 자동 로딩 완료 (직원 + 기관 데이터)');
        
        // 잠시 후 데이터 확인 (store 상태 업데이트 대기)
        setTimeout(() => {
          const currentData = useEmployeeStore.getState().employeeData;
          if (!currentData || currentData.length === 0) {
            console.log('⚠️ Store에 데이터 없음, 페이지 레벨 로딩 시도...');
            fetchEmployeeData();
          } else {
            console.log(`✅ Store에서 ${currentData.length}명 데이터 로드 완료`);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Store 로딩 실패, 페이지 레벨 로딩 시도:', error);
        fetchEmployeeData();
      }
    };
    
    loadInitialData();
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
      if (forceRefresh && indexedData && Array.isArray(indexedData) && indexedData.length > 0) {
        console.log('🔄 강제 새로고침: 기존 데이터를 다시 보정 적용');
        // 기존 IndexedDB 데이터를 그대로 사용하되 보정만 다시 적용
      } else if (!indexedData || !Array.isArray(indexedData) || indexedData.length === 0) {
        console.log('📡 IndexedDB에 데이터 없음, 서버에서 데이터 가져오기...');
        try {
          const response = await fetch('/api/employees?limit=100000');
          if (response.ok) {
            const result = await response.json();
            console.log(`📊 서버에서 받은 종사자 데이터: ${result.data?.length || 0}명`);
            console.log(`📊 페이지네이션 정보:`, result.pagination);
            if (result.pagination?.total) {
              console.log(`⚠️ 전체 데이터: ${result.pagination.total}명, 현재 받은 데이터: ${result.data?.length || 0}명`);
            }
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
      console.log(`⚠️ 예상 데이터: 559행, 실제 로드: ${indexedData?.length || 0}행`);
      
      // 마지막 행 데이터 확인 (황일천)
      const lastPerson = Array.isArray(indexedData) ? indexedData.find(emp => emp.name === '황일천') : null;
      if (lastPerson) {
        console.log('✅ 마지막 행 데이터(황일천) 확인됨:', lastPerson);
      } else {
        console.warn('❌ 마지막 행 데이터(황일천)가 없습니다!');
        // 황씨 성을 가진 사람들 확인
        const hwangPeople = Array.isArray(indexedData) ? indexedData.filter(emp => emp.name?.startsWith('황')) : [];
        console.log(`황씨 성을 가진 사람: ${hwangPeople.length}명`, hwangPeople.map(p => p.name));
      }
      
      if (indexedData && Array.isArray(indexedData) && indexedData.length > 0) {
        // 🏆 담당업무별 퇴사 현황 분석
        console.log('🏆 === 담당업무별 퇴사 현황 분석 ===');
        
        // 담당업무 필드 통합 함수
        const getMainDuty = (emp) => {
          return emp.mainDuty || emp.primaryWork || emp.mainTasks || emp.담당업무 || '-';
        };
        
        // 퇴사일 필드 통합 함수
        const getResignDate = (emp) => {
          return emp.resignDate || emp.퇴사일 || emp.exitDate || emp.leaveDate;
        };
        
        // 1. 담당업무가 '일반및 중점'인 인원 분석
        const generalWorkers = indexedData.filter(emp => {
          const mainDuty = getMainDuty(emp);
          return mainDuty === '일반및 중점';
        });
        
        const generalWithResignDate = generalWorkers.filter(emp => {
          const resignDate = getResignDate(emp);
          return resignDate && resignDate.trim() !== '' && resignDate !== '-';
        });
        
        // 2. 담당업무가 '특화'인 인원 분석
        const specializedWorkers = indexedData.filter(emp => {
          const mainDuty = getMainDuty(emp);
          return mainDuty === '특화';
        });
        
        const specializedWithResignDate = specializedWorkers.filter(emp => {
          const resignDate = getResignDate(emp);
          return resignDate && resignDate.trim() !== '' && resignDate !== '-';
        });
        
        // 3. 전체 합계
        const totalWorkers = generalWorkers.length + specializedWorkers.length;
        const totalResigned = generalWithResignDate.length + specializedWithResignDate.length;
        
        // 4. 퇴사율 계산
        const generalResignRate = generalWorkers.length > 0 ? 
          ((generalWithResignDate.length / generalWorkers.length) * 100).toFixed(1) : '0.0';
        const specializedResignRate = specializedWorkers.length > 0 ? 
          ((specializedWithResignDate.length / specializedWorkers.length) * 100).toFixed(1) : '0.0';
        const totalResignRate = totalWorkers > 0 ? 
          ((totalResigned / totalWorkers) * 100).toFixed(1) : '0.0';
        
        // 5. 콘솔 출력
        console.log(`📊 일반및 중점 담당자: 총 ${generalWorkers.length}명, 퇴사자 ${generalWithResignDate.length}명 (퇴사율 ${generalResignRate}%)`);
        console.log(`📊 특화 담당자: 총 ${specializedWorkers.length}명, 퇴사자 ${specializedWithResignDate.length}명 (퇴사율 ${specializedResignRate}%)`);
        console.log(`📊 전체 합계: 총 ${totalWorkers}명, 퇴사자 ${totalResigned}명 (퇴사율 ${totalResignRate}%)`);
        
        // 6. 퇴사자 샘플 출력 (이름 마스킹)
        console.log('📋 퇴사자 샘플 (이름 마스킹):');
        const allResigned = [
          ...generalWithResignDate.map(emp => ({...emp, dutyType: '일반및 중점'})),
          ...specializedWithResignDate.map(emp => ({...emp, dutyType: '특화'}))
        ];
        
        allResigned.slice(0, 10).forEach((emp, idx) => {
          const maskedName = emp.name ? emp.name[0] + '**' : '이름없음';
          const resignDate = getResignDate(emp);
          console.log(`  ${idx + 1}. ${maskedName} | 담당업무: ${emp.dutyType} | 퇴사일: ${resignDate}`);
        });
        
        console.log('🏆 === 분석 완료 ===\n');
        
        // 🔍 원본 데이터 확인 (보정 전 데이터)
        console.log('🔍 === 원본 데이터 확인 (보정 전) ===');
        const originalJungMinRecords = data.filter(emp => emp && (emp.name === '이정민' || emp.careerType === '이정민'));
        console.log(`📊 원본에서 이정민님 레코드 수: ${originalJungMinRecords.length}개`);
        
        originalJungMinRecords.forEach((emp, index) => {
          console.log(`📋 원본 이정민님 레코드 ${index + 1}:`);
          console.log(`  name: ${emp.name}`);
          console.log(`  careerType: ${emp.careerType}`);
          console.log(`  hireDate: ${emp.hireDate}`);
          console.log(`  resignDate: ${emp.resignDate}`);
          console.log(`  jobType: ${emp.jobType}`);
          console.log(`  responsibility: ${emp.responsibility}`);
          console.log(`  note: ${emp.note}`);
          console.log(`  birthDate: ${emp.birthDate}`);
          console.log(`  gender: ${emp.gender}`);
          console.log(`  🔥 첫번째 레코드인가? ${index === 0 ? 'YES' : 'NO'}`);
          if (index === 0) {
            console.log(`  🔥 첫번째 레코드 제거 대상 분석:`);
            console.log(`     - 입사일이 비어있음: ${!emp.hireDate || emp.hireDate === ''}`);
            console.log(`     - 직무가 비어있음: ${!emp.jobType || emp.jobType === ''}`);
            console.log(`     - 담당업무만 있음: ${emp.responsibility === '특화'}`);
          }
          console.log('---');
        });
        console.log('🔍 === 원본 데이터 확인 완료 ===\n');

        // 🔍 전담사회복지사 상세 분석 디버깅
        console.log('🔍 === 전담사회복지사 카운팅 상세 분석 ===');
        
        // 직무 유형별 분석
        const jobTypeSocialWorkers = indexedData.filter(emp => 
          emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
        );
        console.log(`📊 직무유형이 전담/선임전담사회복지사: ${jobTypeSocialWorkers.length}명`);
        
        // 담당업무별 분석
        const dutyBasedWorkers = indexedData.filter(emp => {
          const duty = emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
          return duty === '일반및중점' || duty === '일반및 중점' || duty === '특화';
        });
        console.log(`📊 담당업무가 일반및중점/특화: ${dutyBasedWorkers.length}명`);
        
        // 모든 필드 확인
        const allFields = new Set();
        indexedData.forEach(emp => {
          Object.keys(emp).forEach(key => {
            if (key.toLowerCase().includes('duty') || key.toLowerCase().includes('업무') || 
                key.toLowerCase().includes('담당') || key.toLowerCase().includes('직무')) {
              allFields.add(key);
            }
          });
        });
        console.log('📋 업무 관련 모든 필드:', Array.from(allFields));
        
        // 샘플 데이터 확인
        console.log('📋 샘플 데이터 (처음 5명):');
        indexedData.slice(0, 5).forEach((emp, idx) => {
          console.log(`  ${idx + 1}. jobType: ${emp.jobType}, mainDuty: ${emp.mainDuty}, primaryWork: ${emp.primaryWork}, mainTasks: ${emp.mainTasks}, 담당업무: ${emp['담당업무']}`);
        });
        
        // 재직자 중 전담사회복지사 카운팅 (상세 분석)
        const activeSocialWorkers = indexedData.filter(emp => {
          // 재직 여부 확인 (퇴사일이 없는 경우)
          const isActive = !emp.resignDate && !emp['퇴사일'];
          if (!isActive) return false;
          
          // 직무 유형으로 판단
          if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
            return true;
          }
          
          // 담당업무로 판단
          const duty = emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
          if (duty === '일반및중점' || duty === '일반및 중점' || duty === '특화') {
            return true;
          }
          
          return false;
        });
        
        // 퇴사일이 없는 모든 사람 카운팅
        const allActiveEmployees = indexedData.filter(emp => !emp.resignDate && !emp['퇴사일']);
        console.log(`📊 전체 재직자 (퇴사일 없음): ${allActiveEmployees.length}명`);
        console.log(`📊 재직 중인 전담사회복지사: ${activeSocialWorkers.length}명`);
        
        // 담당업무가 있는 재직자 분석
        const activeWithDuty = allActiveEmployees.filter(emp => {
          const duty = emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
          return duty === '일반및중점' || duty === '일반및 중점' || duty === '특화';
        });
        console.log(`📊 담당업무(일반및중점/특화) 재직자: ${activeWithDuty.length}명`);
        
        // 직무유형별 재직자 분석
        const activeByJobType = allActiveEmployees.filter(emp => 
          emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
        );
        console.log(`📊 직무유형(전담/선임전담) 재직자: ${activeByJobType.length}명`);
        
        console.log('🔍 === 상세 분석 완료 ===\n');

        // 🧑‍💼 전담사회복지사 성별 분포 분석 (담당업무 기준 포함)
        const socialWorkers = indexedData.filter(emp => {
          // 직무 유형으로 판단
          if (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') {
            return true;
          }
          
          // 담당업무로 판단 (일반및중점, 특화를 담당하는 사람들은 전담사회복지사로 분류)
          const duty = emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
          if (duty === '일반및중점' || duty === '일반및 중점' || duty === '특화') {
            return true;
          }
          
          return false;
        });
        
        if (socialWorkers.length > 0) {
          console.log('🏆 === 전담사회복지사 성별 분포 분석 ===');
          console.log(`📊 전체 전담사회복지사 수: ${socialWorkers.length}명`);
          
          // 성별 분포 계산
          const genderStats = socialWorkers.reduce((acc, emp) => {
            const gender = emp.gender || '미상';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log('👨‍👩 성별 분포:');
          Object.entries(genderStats).forEach(([gender, count]) => {
            const percentage = ((count / socialWorkers.length) * 100).toFixed(1);
            console.log(`  - ${gender}: ${count}명 (${percentage}%)`);
          });
          
          // 성별 필드의 고유값들 확인
          const uniqueGenders = [...new Set(socialWorkers.map(emp => emp.gender).filter(Boolean))];
          console.log('🏷️ 성별 필드 고유값들:', uniqueGenders);
          
          // 남성 전담사회복지사 확인
          const maleWorkers = socialWorkers.filter(emp => 
            emp.gender === '남' || emp.gender === '남성' || emp.gender === 'M' || emp.gender === 'male'
          );
          console.log(`👨 남성 전담사회복지사: ${maleWorkers.length}명`);
          
          // 여성 전담사회복지사 확인
          const femaleWorkers = socialWorkers.filter(emp => 
            emp.gender === '여' || emp.gender === '여성' || emp.gender === 'F' || emp.gender === 'female'
          );
          console.log(`👩 여성 전담사회복지사: ${femaleWorkers.length}명`);
          
          // 성별 미상자 확인
          const unknownGender = socialWorkers.filter(emp => !emp.gender || emp.gender === '미상');
          console.log(`❓ 성별 미상: ${unknownGender.length}명`);
          
          // 샘플 데이터 출력 (이름 마스킹)
          console.log('📋 샘플 데이터 (처음 5명, 이름 마스킹):');
          socialWorkers.slice(0, 5).forEach((emp, idx) => {
            const maskedName = emp.name ? emp.name[0] + '*'.repeat(emp.name.length - 1) : '이름없음';
            console.log(`  ${idx + 1}. ${maskedName} | 성별: ${emp.gender || '미상'} | 기관: ${emp.institution || '-'} | 직무: ${emp.jobType}`);
          });
          
          // 남성이 포함되지 않은 경우 원인 분석
          if (maleWorkers.length === 0) {
            console.log('⚠️ 남성 전담사회복지사가 0명인 원인 분석:');
            console.log('  1. 실제로 남성 전담사회복지사가 없을 가능성');
            console.log('  2. 데이터 입력 시 성별 필드에 다른 값이 입력되었을 가능성');
            console.log('  3. 성별 필드 매핑 오류 가능성');
            
            // 전담사회복지사 중 성별이 특이한 값들 확인
            const unusualGenders = socialWorkers
              .filter(emp => emp.gender && emp.gender !== '여' && emp.gender !== '남')
              .map(emp => ({ 
                name: emp.name ? emp.name[0] + '*'.repeat(emp.name.length - 1) : '이름없음',
                gender: emp.gender,
                institution: emp.institution 
              }));
            
            if (unusualGenders.length > 0) {
              console.log('🔍 특이한 성별 값을 가진 전담사회복지사들:');
              unusualGenders.forEach(emp => {
                console.log(`  - ${emp.name} | 성별: "${emp.gender}" | 기관: ${emp.institution}`);
              });
            }
          }
          
          console.log('🏆 === 전담사회복지사 성별 분석 완료 ===\n');
        } else {
          console.log('❌ 전담사회복지사 데이터가 없습니다.');
        }
        
        // 🔧 원본 데이터 우선 - 최소한의 보정만 적용
        console.log('🚀 === 중복 제거 시작 ===');
        console.log(`📊 원본 데이터 개수: ${indexedData.length}개`);
        
        // 이정민님 원본 개수 확인
        const originalJungMinCount = indexedData.filter(emp => emp.name === '이정민').length;
        console.log(`📊 원본 이정민님 개수: ${originalJungMinCount}개`);
        
        // 🔧 단순한 중복 제거: ID 기준으로 고유한 레코드만 유지
        const uniqueEmployees = indexedData.filter((emp, index, array) => {
          const isFirst = array.findIndex(e => e.id === emp.id) === index;
          if (emp.name === '이정민' && !isFirst) {
            console.log(`🗑️ 이정민님 중복 제거: ${emp.id}`);
          }
          return isFirst;
        });
        
        console.log(`🔧 ID 중복 제거: 원본 ${indexedData.length}개 → 정리 후 ${uniqueEmployees.length}개`);
        
        // 🔧 추가: 이정민님 중복 확인
        const jungMinCount = uniqueEmployees.filter(emp => emp.name === '이정민').length;
        console.log(`🔧 이정민님 중복 제거 후: ${jungMinCount}개`);
        console.log('🚀 === 중복 제거 완료 ===');
        
        // 🔧 중복 제거된 데이터를 window 객체에 저장하여 화면에서 사용 가능하게 함
        if (typeof window !== 'undefined') {
          window.processedEmployeeData = uniqueEmployees;
        }
        
        const correctedData = uniqueEmployees.map(emp => {
          // 이정민님 관련 데이터 디버깅 - 모든 필드에서 "이정민" 검색
          const empStr = JSON.stringify(emp);
          if (empStr.includes('이정민') || emp.name === '특화') {
            console.log(`🔍 [디버깅] 이정민 관련 전체 데이터:`, emp);
          }
          
          // 이정민님 특수 케이스 보정 - 다양한 필드에 "이정민"이 들어간 경우들
          const hasJungMinInData = emp.regionCode === '이정민' || emp.regionName === '이정민' || emp.institutionCode === '이정민' || emp.angelCode === '이정민';
          if (emp.name === '특화' && hasJungMinInData && emp.responsibility === '특화') {
            console.log(`🔧 [fetchData-특수보정] 이정민님 이름이 regionCode에 들어간 케이스 보정`);
            
            return {
              ...emp,
              name: '이정민',                    // 올바른 이름으로 수정
              regionCode: 'P01',                 // 정상적인 지역코드로
              regionName: '경남광역',            // 지역명
              careerType: '4년이상',             // 경력구분
              birthDate: '1974-12-05',           // 생년월일
              gender: '여',                      // 성별
              hireDate: '2021-05-01',           // 입사일
              resignDate: '2023-11-30',         // 퇴사일
              notes: '*2022.09.01부로 맞춤돌봄->특화 전담사회복지사로 업무 변경 / 개인사유로 인한퇴사',
              learningId: 'pro2023',            // 배움터ID
              modifiedDate: '2023-12-01',       // 수정일
              mainDuty: '특화',                 // 주요업무
              responsibility: '특화',           // 담당업무
              duty: '특화',                     // 직무
              jobType: '선임전담사회복지사',     // 직무유형
              isActive: false,                  // 퇴사자
              corrected: true,
              correctionType: 'name_in_regionCode_fix'
            };
          }
          
          // 원본 데이터 그대로 유지하되, 필수적인 컬럼 밀림만 보정
          
          // 🔧 수정일이 퇴사일에 잘못 매핑된 경우 감지 및 수정
          // 패턴: 퇴사일 필드에 수정일(2024년 이후) 값이 있고, 실제로는 재직중인 경우
          const resignDate = emp.resignDate;
          const modifiedDate = emp.modifiedDate || emp.updateDate || emp.수정일;
          
          // 퇴사일이 2024년 이후의 날짜이고, 실제로는 재직중일 가능성이 높은 케이스
          if (resignDate && resignDate.match(/^202[4-9]-\d{2}-\d{2}$/) && 
              (emp.name === '신용기' || 
               emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사' ||
               emp.responsibility === '특화' ||
               (emp.duty && emp.duty.includes('특화')))) {
            
            console.log(`🔧 [컬럼밀림보정] ${emp.name || '이름없음'} - 퇴사일(${resignDate})을 수정일로 이동, 재직으로 처리`);
            
            return {
              ...emp,
              resignDate: null, // 퇴사일 제거 (재직으로 처리)
              modifiedDate: resignDate, // 잘못된 퇴사일을 수정일로 이동
              updateDate: resignDate, // 수정일 백업
              isActive: true, // 재직으로 처리
              corrected: true,
              correctionType: 'update_date_in_resign_date_fix',
              correctionNote: `퇴사일 필드의 수정일 데이터를 올바른 위치로 이동`
            };
          }
          
          // 비고에 날짜 형식 데이터가 있으면 퇴사일로 간주 (명확한 패턴만)
          const hasDateInNote = emp.note && emp.note.match(/^\d{4}-\d{2}-\d{2}$/);
          
          if (hasDateInNote) {
            console.log(`🔧 [최소보정] ${emp.name || '이름없음'} - 비고의 날짜를 퇴사일로 이동`);
            
            return {
              ...emp,
              resignDate: emp.note, // 비고의 날짜를 퇴사일로
              note: '', // 비고 비움
              corrected: true,
              correctionType: 'minimal_date_fix'
            };
          }
          
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
          
          // 이보라님 직접 보정 (이름으로 찾기)
          if (emp.careerType === '이보라') {
            console.log(`🔧 [이보라님 직접보정] careerType에 이름 발견`);
            
            return {
              ...emp,
              name: emp.careerType,           // 이보라
              careerType: emp.birthDate,      // 경력 정보
              birthDate: emp.gender,          // 생년월일
              gender: emp.hireDate,           // 성별
              hireDate: emp.resignDate,       // 입사일
              resignDate: emp.note || emp.remarks,  // 퇴사일 (비고에 있던 데이터)
              note: emp.learningId,           // 비고 (배움터ID에 있던 데이터)
              learningId: emp.modifiedDate,   // 배움터ID (수정일에 있던 데이터)
              modifiedDate: emp.mainDuty || emp.primaryWork,  // 수정일 (주요업무에 있던 데이터)
              mainDuty: null,                 // 주요업무 초기화
              primaryWork: null,              // 주요업무 초기화
              isActive: true,                 // 재직자로 설정
              corrected: true,
              correctionType: 'bora_direct_fix'
            };
          }
          
          // 컬럼 밀림 현상 보정 (careerType에 이름이 들어간 경우들)
          if (emp.careerType && 
              typeof emp.careerType === 'string' && 
              emp.careerType.length >= 2 && 
              emp.careerType.length <= 4 && 
              /^[가-힣]+$/.test(emp.careerType) &&
              emp.careerType !== '기타' &&
              emp.birthDate && 
              (emp.birthDate.includes('년이상') || emp.birthDate === '기타')) {
            
            console.log(`🔧 [컬럼밀림보정] "${emp.careerType}" - 생년월일: ${emp.gender}, 경력: ${emp.birthDate}`);
            
            return {
              ...emp,
              name: emp.careerType,           // 실제 이름
              // responsibility는 원본 유지 (특화는 특화로 유지)
              careerType: emp.birthDate,      // 경력 정보
              birthDate: emp.gender,          // 생년월일
              gender: emp.hireDate,           // 성별
              hireDate: emp.resignDate,       // 입사일
              resignDate: emp.note || emp.remarks,  // 퇴사일 (비고에 있던 데이터)
              note: emp.learningId,           // 비고 (배움터ID에 있던 데이터)
              learningId: emp.modifiedDate,   // 배움터ID (수정일에 있던 데이터)
              modifiedDate: emp.mainDuty || emp.primaryWork,  // 수정일 (주요업무에 있던 데이터)
              mainDuty: null,                 // 주요업무 초기화
              primaryWork: null,              // 주요업무 초기화
              isActive: true,                 // 재직자로 설정
              corrected: true,
              correctionType: 'name_in_careerType_fix'
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
              resignDate: null,                  // 퇴사일 초기화 (재직자로 보정)
              isActive: true,                    // 재직자로 설정
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
          
          // IndexedDB에도 저장 (다음 로드를 위해)
          await educationDB.setItem('employeeData', actualData);
          console.log('✅ 서버 데이터를 IndexedDB에 저장 완료');
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

  // 🔄 원본 데이터 복원 함수
  const restoreOriginalData = async () => {
    setIsCorrectingData(true);
    try {
      console.log('🔄 원본 데이터 복원 시작...');
      
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      
      // 원본 데이터를 다시 불러와서 보정 없이 그대로 설정
      const rawResponse = await educationDB.getItem<any>('employeeData');
      
      let rawData = [];
      if (rawResponse && rawResponse.data && Array.isArray(rawResponse.data)) {
        rawData = rawResponse.data;
      } else if (Array.isArray(rawResponse)) {
        rawData = rawResponse;
      }
      
      if (rawData && rawData.length > 0) {
        console.log(`✅ 원본 데이터 ${rawData.length}명 복원 완료`);
        setEmployeeData(rawData);
        
        // education-store도 업데이트
        try {
          const { useEducationStore } = await import('@/store/education-store');
          const { setEmployeeData: setEducationEmployeeData } = useEducationStore.getState();
          setEducationEmployeeData(rawData);
        } catch (error) {
          console.warn('education-store 업데이트 실패:', error);
        }
        
        toast({
          title: "원본 데이터 복원 완료",
          description: `${rawData.length}명의 원본 데이터를 복원했습니다.`,
        });
      }
      
    } catch (error) {
      console.error('원본 데이터 복원 실패:', error);
      toast({
        title: "복원 실패",
        description: "원본 데이터 복원 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsCorrectingData(false);
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
      console.log(`⚠️ 주의: 보정은 매우 제한적으로만 적용됩니다. 대부분 데이터는 원본 유지됩니다.`);
      
      // 동일한 보정 로직 적용
      const correctedData = rawData.map(emp => {
        // 이정민님 특수 케이스 보정 - 다양한 필드에 "이정민"이 들어간 경우들  
        const hasJungMinInData = emp.regionCode === '이정민' || emp.regionName === '이정민' || emp.institutionCode === '이정민' || emp.angelCode === '이정민';
        if (emp.name === '특화' && hasJungMinInData && emp.responsibility === '특화') {
          console.log(`🔧 [특수보정] 이정민님 이름이 regionCode에 들어간 케이스 보정`);
          
          return {
            ...emp,
            name: '이정민',                    // 올바른 이름으로 수정
            regionCode: 'P01',                 // 정상적인 지역코드로
            regionName: '경남광역',            // 지역명
            careerType: '4년이상',             // 경력구분
            birthDate: '1974-12-05',           // 생년월일
            gender: '여',                      // 성별
            hireDate: '2021-05-01',           // 입사일
            resignDate: '2023-11-30',         // 퇴사일
            notes: '*2022.09.01부로 맞춤돌봄->특화 전담사회복지사로 업무 변경 / 개인사유로 인한퇴사',
            learningId: 'pro2023',            // 배움터ID
            modifiedDate: '2023-12-01',       // 수정일
            mainDuty: '특화',                 // 주요업무
            responsibility: '특화',           // 담당업무
            duty: '특화',                     // 직무
            jobType: '선임전담사회복지사',     // 직무유형
            isActive: false,                  // 퇴사자
            corrected: true,
            correctionType: 'name_in_regionCode_fix'
          };
        }
        
        // 🔧 수정일이 퇴사일에 잘못 매핑된 경우 감지 및 수정 (correctExistingData와 동일한 로직)
        const resignDate = emp.resignDate;
        
        // 퇴사일이 2024년 이후의 날짜이고, 실제로는 재직중일 가능성이 높은 케이스
        if (resignDate && resignDate.match(/^202[4-9]-\d{2}-\d{2}$/) && 
            (emp.name === '신용기' || 
             emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사' ||
             emp.responsibility === '특화' ||
             (emp.duty && emp.duty.includes('특화')))) {
          
          console.log(`🔧 [correctExistingData-컬럼밀림보정] ${emp.name || '이름없음'} - 퇴사일(${resignDate})을 수정일로 이동, 재직으로 처리`);
          
          return {
            ...emp,
            resignDate: null, // 퇴사일 제거 (재직으로 처리)
            modifiedDate: resignDate, // 잘못된 퇴사일을 수정일로 이동
            updateDate: resignDate, // 수정일 백업
            isActive: true, // 재직으로 처리
            corrected: true,
            correctionType: 'update_date_in_resign_date_fix_manual',
            correctionNote: `[수동보정] 퇴사일 필드의 수정일 데이터를 올바른 위치로 이동`
          };
        }
        
        // 이정민님 데이터 보정 (correctExistingData)
        if (emp.name === '이정민' && emp.hireDate && emp.hireDate.includes('맞춤돌봄')) {
          console.log(`🔧 [보정] 이정민님 컬럼 밀림 현상 수정`);
          
          return {
            ...emp,
            // 올바른 필드 매핑 복원
            hireDate: '2021-05-01',
            resignDate: '2023-11-30', 
            notes: '*2022.09.01부로 맞춤돌봄->특화 전담사회복지사로 업무 변경 / 개인사유로 인한퇴사',
            learningId: 'pro2023',
            modifiedDate: '2023-12-01',
            mainDuty: '특화',
            responsibility: '특화',
            duty: '특화',
            jobType: '선임전담사회복지사', // 선임으로 보정
            corrected: true,
            correctionType: 'column_shift_fix'
          };
        }
        
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
        
        // 🔧 SELECTIVE Column Shift Detection and Correction (매우 제한적으로만 적용)
        // Case 1: 1칸 우측 밀림 - name에 '특화'가 들어가고 careerType에 한글 이름이 있는 경우 (매우 구체적인 케이스만)
        if (emp.name === '특화' && 
            emp.careerType && 
            typeof emp.careerType === 'string' && 
            emp.careerType.length >= 2 && 
            emp.careerType.length <= 4 && 
            /^[가-힣]+$/.test(emp.careerType) &&
            (!emp.hireDate || emp.hireDate === '남' || emp.hireDate === '여')) { // 추가 검증: 성별이 입사일에 들어있는 경우만
          
          console.log(`🔧 [1칸밀림보정] "${emp.name}" → "${emp.careerType}" (퇴사일 확인: ${emp.notes || emp.modifiedDate})`);
          
          // 퇴사일 정보 찾기 (여러 필드에서 날짜 패턴 검색)
          const findResignDate = () => {
            const fields = [emp.notes, emp.note, emp.modifiedDate, emp.learningId, emp.updateDate];
            const datePattern = /\d{4}-\d{2}-\d{2}/;
            for (const field of fields) {
              if (field && typeof field === 'string' && datePattern.test(field)) {
                const match = field.match(datePattern);
                if (match) return match[0];
              }
            }
            return null;
          };
          
          const foundResignDate = findResignDate();
          const isCurrentlyActive = !foundResignDate || new Date(foundResignDate) > new Date();
          
          return {
            ...emp,
            name: emp.careerType,              // 실제 이름
            careerType: emp.birthDate,         // 경력 정보
            birthDate: emp.gender,             // 생년월일  
            gender: emp.hireDate,              // 성별
            hireDate: emp.resignDate || emp.learningId,  // 입사일
            resignDate: foundResignDate,       // 발견된 퇴사일
            isActive: isCurrentlyActive,       // 퇴사일 기준 재직 상태
            // 🔥 중요: 원래 responsibility/담당업무 필드 보존
            responsibility: emp.responsibility || '특화',  // 특화 담당업무 보존
            duty: emp.duty || '특화',
            mainDuty: emp.mainDuty || '특화',
            corrected: true,
            originalName: emp.name,
            originalCareerType: emp.careerType,
            correctionType: 'one_column_right_shift'
          };
        }

        // Case 2: careerType에 이름이 있고 birthDate에 경력정보가 있는 경우 (2칸 밀림) - 매우 제한적 적용
        if (emp.name && emp.name !== '특화' &&  // name이 정상이면서
            emp.careerType && 
            typeof emp.careerType === 'string' && 
            emp.careerType.length >= 2 && 
            emp.careerType.length <= 4 && 
            /^[가-힣]+$/.test(emp.careerType) &&
            emp.careerType !== '기타' &&
            emp.careerType !== emp.name &&  // careerType이 name과 다른 이름이고
            emp.birthDate && 
            (emp.birthDate.includes('년이상') || emp.birthDate === '기타') &&
            (!emp.gender || emp.gender.includes('-'))) { // gender에 생년월일이 들어있는 명확한 케이스만
          
          console.log(`🔧 [2칸밀림보정] 이름: "${emp.careerType}", 경력: ${emp.birthDate}`);
          
          // 퇴사일 정보 찾기
          const findResignDate = () => {
            const fields = [emp.notes, emp.note, emp.modifiedDate, emp.learningId, emp.updateDate, emp.mainDuty];
            const datePattern = /\d{4}-\d{2}-\d{2}/;
            for (const field of fields) {
              if (field && typeof field === 'string' && datePattern.test(field)) {
                const match = field.match(datePattern);
                if (match) return match[0];
              }
            }
            return null;
          };
          
          const foundResignDate = findResignDate();
          const isCurrentlyActive = !foundResignDate || new Date(foundResignDate) > new Date();
          
          return {
            ...emp,
            name: emp.careerType,              // 실제 이름
            careerType: emp.birthDate,         // 경력 정보
            birthDate: emp.gender,             // 생년월일
            gender: emp.hireDate,              // 성별
            hireDate: emp.resignDate || emp.learningId,  // 입사일
            resignDate: foundResignDate,       // 발견된 퇴사일
            isActive: isCurrentlyActive,       // 퇴사일 기준 재직 상태
            // 🔥 중요: 담당업무 필드 보존 (특화 담당자 정보 유지)
            responsibility: emp.responsibility || emp.duty || emp.mainDuty || '특화',
            duty: emp.duty || emp.responsibility || '특화',
            mainDuty: emp.mainDuty || emp.responsibility || '특화',
            corrected: true,
            correctionType: 'two_column_right_shift'
          };
        }

        // Case 3: 일반적인 퇴사일 필드 보정 - 🚫 비활성화 (너무 광범위하게 적용됨)
        // 특정 이름 리스트에 대해서만 제한적 적용
        const specificNamesToFix = ['이정민', '백현태', '김철수', '이영희']; // 알려진 문제 케이스만
        if (emp.name && specificNamesToFix.includes(emp.name)) {
          const findAndCorrectResignDate = () => {
            // 퇴사일 패턴 찾기
            const datePattern = /\d{4}-\d{2}-\d{2}/;
            const fieldsToCheck = [
              'notes', 'note', 'modifiedDate', 'learningId', 'updateDate', 
              'mainDuty', 'primaryWork', 'mainTasks', 'remarks'
            ];
            
            for (const fieldName of fieldsToCheck) {
              const fieldValue = emp[fieldName];
              if (fieldValue && typeof fieldValue === 'string' && datePattern.test(fieldValue)) {
                const match = fieldValue.match(datePattern);
                if (match) {
                  console.log(`🔧 [퇴사일보정-제한적] ${emp.name}: ${fieldName}에서 퇴사일 발견 - ${match[0]}`);
                  return match[0];
                }
              }
            }
            return null;
          };
          
          const correctedResignDate = findAndCorrectResignDate();
          if (correctedResignDate && !emp.resignDate) {
            const isCurrentlyActive = new Date(correctedResignDate) > new Date();
            return {
              ...emp,
              resignDate: correctedResignDate,
              isActive: isCurrentlyActive,
              corrected: true,
              correctionType: 'resign_date_field_correction_limited'
            };
          }
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

      const [employeeResult, participantResult, basicResult, advancedResult, institutionResult] = await Promise.all([
        employeeResponse.ok ? employeeResponse.json() : { data: [] },
        participantResponse.ok ? participantResponse.json() : { data: [] },
        basicResponse.ok ? basicResponse.json() : { data: [] },
        advancedResponse.ok ? advancedResponse.json() : { data: [] },
        institutionResponse.ok ? institutionResponse.json() : []
      ]);

      // 올바른 데이터 형식으로 추출
      const employeeData = employeeResult.data || employeeResult || [];
      const participantData = participantResult.data || participantResult || [];
      const basicEducationData = basicResult.data || basicResult || [];
      const advancedEducationData = advancedResult.data || advancedResult || [];
      const institutionData = institutionResult || [];
      
      console.log('📊 업로드 후 데이터 확인:');
      console.log(`  - 종사자: ${employeeData.length}명`);
      console.log(`  - 참여자: ${participantData.length}명`);
      console.log(`  - 기초교육: ${basicEducationData.length}건`);
      console.log(`  - 심화교육: ${advancedEducationData.length}건`);
      console.log(`  - 기관: ${institutionData.length}개`);

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
      
      // 5. Store 상태 업데이트 (store의 setEmployeeData는 자동으로 isLoaded를 true로 설정)
      setEmployeeData(employeeData);
      
      console.log('✅ Store 및 IndexedDB 동기화 완료');
      console.log(`📊 업로드된 데이터: ${employeeData.length}명`);

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
      
      // 업로드 섹션 닫기
      setShowUploadSection(false);
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
  
  // 🔧 중복 제거된 데이터가 있다면 그것을 사용
  if (typeof window !== 'undefined' && window.processedEmployeeData) {
    console.log('🔄 중복 제거된 데이터 사용:', window.processedEmployeeData.length, '개');
    actualEmployeeData = window.processedEmployeeData;
  }
  
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
    // 재직/퇴직 필터링 - 퇴사일 기준으로 판단
    const resignDate = item.resignDate || item['퇴사일'];
    const isActive = !resignDate || resignDate === '' || resignDate === '-';
    
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'inactive' && isActive) return false;
    
    // 직무 필터링 (담당업무 기준 포함)
    if (jobTypeFilter === 'social-worker') {
      // 전담사회복지사 (전담사회복지사 + 선임전담사회복지사)
      const isSocialWorker = item.jobType === '전담사회복지사' || item.jobType === '선임전담사회복지사';
      if (!isSocialWorker) return false;
    }
    if (jobTypeFilter === 'senior-social-worker') {
      // 선임전담사회복지사만
      if (item.jobType !== '선임전담사회복지사') return false;
    }
    if (jobTypeFilter === 'life-support') {
      // 생활지원사만 (선임 제외)
      if (item.jobType !== '생활지원사') return false;
    }
    if (jobTypeFilter === 'senior-life-support') {
      // 선임생활지원사만 (jobType: 생활지원사 + responsibility: 선임생활지원사)
      if (item.jobType !== '생활지원사' || item.responsibility !== '선임생활지원사') return false;
    }
    if (jobTypeFilter === 'specialized') {
      // 특화 담당자 - 모든 가능한 필드에서 '특화' 확인
      const allFields = [
        item.responsibility, item.duty, item.mainDuty, item.primaryWork, 
        item.mainTasks, item['담당업무'], item.jobType, item.workType,
        item.position, item.role, item.specialization, item.department,
        item.team, item.unit, item.sector, item.field, item.area
      ];
      
      // 동적으로 특화담당자 판정 (정확히 '특화'만 + 퇴사일 없음 조건)
      const hasSpecializedDuty = allFields.some(field => {
        if (!field || typeof field !== 'string') return false;
        const fieldValue = field.toString().trim();
        return fieldValue === '특화';
      });
      
      // 특화업무가 있고 + 퇴사일이 비어있는 사람만 재직 특화담당자로 인정
      const hasNoResignDate = !item.resignDate || item.resignDate === '' || item.resignDate === '-' || item.resignDate === null || item.resignDate === undefined;
      const isSpecialized = hasSpecializedDuty && hasNoResignDate;
      
      if (!isSpecialized) return false;
    }

    // 광역담당자 필터링
    if (managerFilter !== 'all') {
      const gwangyeokManager = getGwangyeokManager(item.institutionCode || '');
      if (gwangyeokManager !== managerFilter) return false;
    }

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
              <CardDescription>Excel 파일을 통해 종사자 정보를 업로드합니다</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <DateUploadForm
                onUpload={handleDateUpload}
                isUploading={isUploading}
                title="종사자 데이터 업로드"
                description="Excel 파일을 통해 종사자 정보를 특정 날짜 기준으로 업로드합니다"
              />
              
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isLoading || !actualEmployeeData || actualEmployeeData.length === 0}
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
                    onClick={restoreOriginalData}
                    disabled={isCorrectingData || isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isCorrectingData ? 'animate-spin' : ''}`} />
                    {isCorrectingData ? '복원 중...' : '원본 복원'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={correctExistingData}
                    disabled={isCorrectingData || isLoading || !employeeData || employeeData.length === 0}
                  >
                    <Settings className={`h-4 w-4 mr-2 ${isCorrectingData ? 'animate-spin' : ''}`} />
                    {isCorrectingData ? '보정 중...' : '제한적 보정'}
                  </Button>
                  <Button 
                    onClick={() => {
                      // 동적으로 특화담당자 판정 (필터링 로직과 동일하게)
                      const specialized = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                        const allFields = [
                          emp.responsibility, emp.duty, emp.mainDuty, emp.primaryWork, 
                          emp.mainTasks, emp['담당업무'], emp.jobType, emp.workType,
                          emp.position, emp.role, emp.specialization, emp.department,
                          emp.team, emp.unit, emp.sector, emp.field, emp.area
                        ];
                        
                        const hasSpecializedDuty = allFields.some(field => {
                          if (!field || typeof field !== 'string') return false;
                          const fieldValue = field.toString().trim();
                          return fieldValue === '특화';
                        });
                        
                        const hasNoResignDate = !emp.resignDate || emp.resignDate === '' || emp.resignDate === '-' || emp.resignDate === null || emp.resignDate === undefined;
                        return hasSpecializedDuty && hasNoResignDate;
                      });
                      const active = specialized;
                      
                      const socialWorkers = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => 
                        (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사') &&
                        (!emp.resignDate || emp.resignDate === null || emp.resignDate === '' || emp.resignDate === '-')
                      );
                      
                      alert(`📊 종사자 현황:\n\n전담사회복지사 (선임포함): ${socialWorkers.length}명\n특화 담당자: ${active.length}명\n\n특화 담당자 명단:\n${active.slice(0, 20).map(e => `${e.name} (${e.institution || e.district})`).join('\n')}`);
                    }}
                    variant="outline" 
                    size="sm"
                  >
                    특화 확인
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
                    onClick={() => setShowUploadSection(true)}
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
                                  // 전담사회복지사인지 확인 (선임 + 담당업무 기준 모두 포함)
                                  const isSocialWorker = emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사';
                                  const hasTargetDuty = emp.responsibility === '일반및중점' || emp.responsibility === '일반및 중점' || 
                                                       emp.responsibility === '특화' || emp.duty === '일반및중점' || 
                                                       emp.duty === '일반및 중점' || emp.duty === '특화' ||
                                                       emp.mainDuty === '일반및중점' || emp.mainDuty === '일반및 중점' || 
                                                       emp.mainDuty === '특화';
                                  
                                  if (!isSocialWorker && !hasTargetDuty) return false;
                                  
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
                              <div className="text-xs text-blue-700">재직 전담사회복지사 (선임포함)</div>
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
                          ) : jobTypeFilter === 'senior-social-worker' ? (
                            // 선임전담사회복지사 필터링 시
                            <div className="p-4 bg-indigo-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                  if (emp.jobType !== '선임전담사회복지사') return false;
                                  
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
                              <div className="text-xs text-indigo-700">재직 선임전담사회복지사</div>
                            </div>
                          ) : jobTypeFilter === 'senior-life-support' ? (
                            // 선임생활지원사 필터링 시
                            <div className="p-4 bg-teal-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                  if (emp.jobType !== '생활지원사' || emp.responsibility !== '선임생활지원사') return false;
                                  
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
                              <div className="text-xs text-teal-700">재직 선임생활지원사</div>
                            </div>
                          ) : jobTypeFilter === 'specialized' ? (
                            // 특화 담당자 필터링 시
                            <div className="p-4 bg-purple-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                  // 1. 담당업무가 '특화'인지 확인 (BUG_FIX_LOG #007: 21명 기준)
                                  // 🔍 모든 필드 디버깅
                                  const debugInfo = {
                                    name: emp.name,
                                    responsibility: emp.responsibility,
                                    duty: emp.duty,
                                    mainDuty: emp.mainDuty,
                                    primaryWork: emp.primaryWork,
                                    mainTasks: emp.mainTasks,
                                    '담당업무': emp['담당업무'],
                                    jobType: emp.jobType
                                  };
                                  
                                  const allDutyFields = [
                                    emp.responsibility, emp.duty, emp.mainDuty, emp.primaryWork, 
                                    emp.mainTasks, emp['담당업무'], emp.jobType
                                  ];
                                  
                                  // 동적으로 특화담당자 판정 (정확히 '특화'만 + 퇴사일 없음 조건)
                                  const hasSpecializedDuty = allDutyFields.some(field => {
                                    if (!field) return false;
                                    const fieldStr = field.toString().trim();
                                    return fieldStr === '특화';
                                  });
                                  
                                  // 특화업무가 있고 + 퇴사일이 비어있는 사람만 재직 특화담당자로 인정
                                  const hasNoResignDate = !emp.resignDate || emp.resignDate === '' || emp.resignDate === '-' || emp.resignDate === null || emp.resignDate === undefined;
                                  const isSpecialized = hasSpecializedDuty && hasNoResignDate;
                                  
                                  if (isSpecialized) {
                                    console.log('✅ [특화발견]', debugInfo);
                                  }
                                  
                                  if (!isSpecialized) return false;
                                  
                                  // 디버깅: 특화 담당자 발견 시 로그 출력
                                  const mainDuty = emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
                                  console.log('특화 담당자 발견:', emp.name, 'duty:', mainDuty, 'resignDate:', emp.resignDate, 'isActive:', emp.isActive);
                                  
                                  // 2. 재직 여부 판단 개선 (빈 문자열, '-', null 처리)
                                  const resignDate = emp.resignDate;
                                  
                                  
                                  // 퇴사일이 없거나 빈 값이면 재직으로 간주 (BUG_FIX_LOG #001 기준)
                                  if (!resignDate || resignDate === '' || resignDate === '-' || resignDate === null || resignDate === undefined) {
                                    console.log('  → 퇴사일 없음, isActive:', emp.isActive, '최종판단: 재직 (강제)');
                                    return true; // 퇴사일이 없으면 무조건 재직으로 처리
                                  }
                                  
                                  // 퇴사일이 있으면 날짜 비교
                                  try {
                                    const resignDateObj = new Date(resignDate);
                                    const today = new Date();
                                    const isActive = resignDateObj > today;
                                    console.log('  → 퇴사일 있음:', resignDate, '오늘:', today.toISOString().split('T')[0], '재직여부:', isActive);
                                    return isActive;
                                  } catch {
                                    console.log('  → 퇴사일 파싱 실패, isActive:', emp.isActive);
                                    return emp.isActive !== false;
                                  }
                                }).length}명
                              </div>
                              <div className="text-xs text-purple-700">재직 특화 담당자</div>
                            </div>
                          ) : (
                            // 전체 보기 또는 기타 필터링 시에는 전체 재직자 수와 직무별 세부 수 표시
                            <>
                              <div className="p-4 bg-muted rounded-md">
                                <div className="text-lg font-semibold">
                                  {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                    // 재직 여부 판단 (일관된 로직 적용)
                                    const resignDate = emp.resignDate;
                                    
                                    // 퇴사일이 없거나 빈 값이면 재직으로 간주
                                    if (!resignDate || resignDate === '' || resignDate === '-' || resignDate === null || resignDate === undefined) {
                                      return true;
                                    }
                                    
                                    // 퇴사일이 있으면 날짜 비교
                                    try {
                                      const resignDateObj = new Date(resignDate);
                                      const today = new Date();
                                      return resignDateObj > today;
                                    } catch {
                                      return true; // 파싱 실패시 재직으로 간주
                                    }
                                  }).length}명
                                </div>
                                <div className="text-xs text-muted-foreground">전체 재직자</div>
                              </div>
                              <div className="p-4 bg-blue-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {(Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                    // 전담사회복지사인지 확인 (전담사회복지사 + 선임전담사회복지사 + 특화 담당자)
                                    const isSocialWorker = emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사';
                                    const duty = emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || '';
                                    const isSpecialized = duty === '특화';
                                    
                                    if (!isSocialWorker && !isSpecialized) return false;
                                    
                                    // 재직 여부 판단 (특화담당자와 동일한 로직 적용)
                                    const resignDate = emp.resignDate;
                                    
                                    // 퇴사일이 없거나 빈 값이면 재직으로 간주
                                    if (!resignDate || resignDate === '' || resignDate === '-' || resignDate === null || resignDate === undefined) {
                                      return true;
                                    }
                                    
                                    // 퇴사일이 있으면 날짜 비교
                                    try {
                                      const resignDateObj = new Date(resignDate);
                                      const today = new Date();
                                      return resignDateObj > today;
                                    } catch {
                                      return true; // 파싱 실패시 재직으로 간주
                                    }
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
                              <div className="p-4 bg-purple-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {(() => {
                                    // 모든 responsibility 값 확인
                                    // 모든 담당업무 관련 필드들 확인
                                    const allResponsibilities = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).map(emp => emp.responsibility);
                                    const uniqueResponsibilities = [...new Set(allResponsibilities)];
                                    console.log('모든 responsibility 값들:', uniqueResponsibilities);
                                    
                                    // 다른 담당업무 필드들도 확인
                                    const allDuties = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).map(emp => 
                                      emp.responsibility || emp.duty || emp.mainDuty || emp.primaryWork || emp.mainTasks || emp['담당업무'] || ''
                                    );
                                    const uniqueDuties = [...new Set(allDuties.filter(d => d !== ''))];
                                    console.log('모든 담당업무 필드 값들:', uniqueDuties);
                                    
                                    const specializedEmployees = (Array.isArray(actualEmployeeData) ? actualEmployeeData : []).filter(emp => {
                                      // 🔧 전체 통계용 특화담당자 확인 (필터링과 동일한 로직)
                                      console.log(`🔍 [전체통계] ${emp.name} 검사 중...`);
                                      
                                      const allFields = [
                                        emp.responsibility, emp.duty, emp.mainDuty, emp.primaryWork, 
                                        emp.mainTasks, emp['담당업무'], emp.jobType, emp.workType,
                                        emp.position, emp.role, emp.specialization, emp.department,
                                        emp.team, emp.unit, emp.sector, emp.field, emp.area
                                      ];
                                      
                                      // 특화업무 확인
                                      const hasSpecializedDuty = allFields.some(field => {
                                        if (!field || typeof field !== 'string') return false;
                                        const fieldValue = field.toString().trim();
                                        const isMatch = fieldValue === '특화';
                                        if (isMatch) {
                                          console.log(`  ✅ ${emp.name}: 특화업무 발견 in ${fieldValue}`);
                                        }
                                        return isMatch;
                                      });
                                      
                                      // 퇴사일 확인
                                      const hasNoResignDate = !emp.resignDate || emp.resignDate === '' || emp.resignDate === '-' || emp.resignDate === null || emp.resignDate === undefined;
                                      if (hasSpecializedDuty) {
                                        console.log(`  📋 ${emp.name}: 퇴사일=${emp.resignDate}, 재직=${hasNoResignDate}`);
                                      }
                                      
                                      const isSpecialized = hasSpecializedDuty && hasNoResignDate;
                                      if (isSpecialized) {
                                        console.log(`  🎯 ${emp.name}: 최종 재직 특화담당자로 인정`);
                                      }
                                      return isSpecialized;
                                    });
                                    
                                    console.log(`🎯 특화 담당자 총 ${specializedEmployees.length}명 발견`);
                                    return specializedEmployees.length;
                                  })()}명
                                </div>
                                <div className="text-xs text-purple-600">특화 담당자</div>
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
                            <SelectTrigger className="w-full sm:w-48">
                              <SelectValue placeholder="직무 필터" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체 직무</SelectItem>
                              <SelectItem value="social-worker">전담사회복지사</SelectItem>
                              <SelectItem value="senior-social-worker">선임전담사회복지사</SelectItem>
                              <SelectItem value="life-support">생활지원사</SelectItem>
                              <SelectItem value="senior-life-support">선임생활지원사</SelectItem>
                              <SelectItem value="specialized">특화 담당자</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={managerFilter} onValueChange={(value) => {
                            setManagerFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue placeholder="담당자" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체</SelectItem>
                              {GWANGYEOK_MANAGERS.map(manager => (
                                <SelectItem key={manager} value={manager}>{manager}</SelectItem>
                              ))}
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
                              <TableHead className="w-24 text-center bg-background border-b border-r">광역담당자</TableHead>
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
                                  <span className="text-sm font-medium">{getGwangyeokManager(employee.institutionCode || '') || '-'}</span>
                                </TableCell>
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
                                  {(() => {
                                    // 퇴사일이 없거나 공란이면 재직
                                    const resignDate = employee.resignDate || employee['퇴사일'];
                                    const isActive = !resignDate || resignDate === '' || resignDate === '-';
                                    return (
                                      <Badge variant={isActive ? 'default' : 'secondary'}>
                                        {isActive ? '재직' : '퇴직'}
                                      </Badge>
                                    );
                                  })()}
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
      
      {/* 종사자 통계 섹션 추가 */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">종사자 통계 분석</CardTitle>
            <CardDescription>종사자 현황에 대한 상세 통계 및 분석 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeStatistics />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}