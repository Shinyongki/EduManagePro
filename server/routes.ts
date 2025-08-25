import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sessionManager } from './session-manager';
import { EducationMatcher } from "./education-matching";
import { 
  calculateEducationStatsByJobType,
  calculateDistrictStats,
  calculateInstitutionPerformance,
  calculateTimeSeriesStats
} from "./education-statistics";
import { getAllDistrictInfo, getDistrictByInstitution } from "./district-institutions";
import multer from "multer";
import * as XLSX from "xlsx";
import * as cheerio from "cheerio";

// 기관명에서 시도 정보 추출
function extractSidoFromName(institutionName: string | undefined): string | undefined {
  if (!institutionName) return undefined;
  
  const normalizedName = institutionName.toLowerCase();
  
  // 시/도 매핑
  const sidoMap: Record<string, string> = {
    '서울': '서울특별시',
    '부산': '부산광역시', 
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시',
    '경기': '경기도',
    '강원': '강원특별자치도',
    '충북': '충청북도',
    '충남': '충청남도', 
    '전북': '전북특별자치도',
    '전남': '전라남도',
    '경북': '경상북도',
    '경남': '경상남도',
    '제주': '제주특별자치도'
  };
  
  // 정확한 시도명이 포함된 경우
  for (const [key, value] of Object.entries(sidoMap)) {
    if (normalizedName.includes(key.toLowerCase()) || 
        normalizedName.includes(value.toLowerCase())) {
      return value;
    }
  }
  
  // 특정 지역명으로 시도 추정
  const regionToSido: Record<string, string> = {
    '창원': '경상남도', '진주': '경상남도', '통영': '경상남도', '사천': '경상남도',
    '김해': '경상남도', '밀양': '경상남도', '거제': '경상남도', '양산': '경상남도',
    '수원': '경기도', '성남': '경기도', '안양': '경기도', '부천': '경기도',
    '강남': '서울특별시', '서초': '서울특별시', '송파': '서울특별시', '강동': '서울특별시'
  };
  
  for (const [region, sido] of Object.entries(regionToSido)) {
    if (normalizedName.includes(region.toLowerCase())) {
      return sido;
    }
  }
  
  return undefined;
}

// 기관명에서 시군구 정보 추출  
function extractSigunguFromName(institutionName: string | undefined): string | undefined {
  if (!institutionName) return undefined;
  
  const normalizedName = institutionName.toLowerCase();
  
  // 시/군/구 키워드 매핑
  const sigunguPatterns = [
    // 서울특별시 구
    '강남구', '서초구', '송파구', '강동구', '마포구', '종로구', '중구', '용산구',
    '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구', '도봉구', '노원구',
    '은평구', '서대문구', '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
    
    // 경기도 시/군
    '수원시', '성남시', '안양시', '부천시', '광명시', '평택시', '동두천시', '안산시',
    '고양시', '과천시', '구리시', '남양주시', '오산시', '시흥시', '군포시', '의왕시',
    '하남시', '용인시', '파주시', '이천시', '안성시', '김포시', '화성시', '광주시',
    '양주시', '포천시', '여주시', '연천군', '가평군', '양평군',
    
    // 경상남도 시/군
    '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시',
    '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군',
    '거창군', '합천군'
  ];
  
  // 정확한 매칭 우선
  for (const pattern of sigunguPatterns) {
    if (normalizedName.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  
  // 부분 매칭 (시, 군, 구 제거)
  const partialPatterns = sigunguPatterns.map(p => p.replace(/(시|군|구)$/, ''));
  for (let i = 0; i < partialPatterns.length; i++) {
    if (normalizedName.includes(partialPatterns[i].toLowerCase())) {
      return sigunguPatterns[i];
    }
  }
  
  return undefined;
}

// 복합 헤더 처리 함수
function processComplexHeaders(rawData: any[][], sheetName: string): any[] {
  // 첫 번째 행은 스킵 (인덱스 0)
  // 두 번째 행은 병합된 상위 헤더 (인덱스 1)
  const topHeaders = rawData[1] as any[];
  // 세 번째 행은 세부 헤더 (인덱스 2)
  const subHeaders = rawData[2] as any[];
  
  console.log('상위 헤더 (2번째 행):', topHeaders?.slice(0, 30));
  console.log('세부 헤더 (3번째 행):', subHeaders?.slice(0, 30));
  
  // 실제 Excel 2행 헤더 구조에 정확히 맞춘 컬럼 매핑
  const headerMap: { [key: number]: string } = {
    // 기본 정보 (7개 컬럼)
    0: '광역시',
    1: '지자체', 
    2: '광역코드',
    3: '광역명',
    4: '수행기관코드',
    5: '수행기관위수탁구분',
    6: '위수탁기간',
    
    // 사업수행연도이력 (6개 컬럼: 2020년~2025년)
    7: '2020년',
    8: '2021년', 
    9: '2022년',
    10: '2023년',
    11: '2024년',
    12: '2025년',
    
    // 시설유형구분 (1개 컬럼)
    13: '시설유형구분',
    
    // 특화 및 유관서비스 수행여부 (6개 컬럼) - 실제 인덱스에 맞게 조정
    14: '특화서비스',
    15: '응급안전안심서비스',
    16: '방문요양서비스', 
    17: '재가노인복지서비스',
    18: '사회서비스원 소속',
    19: '사회서비스형 노인일자리 파견 이용',
    
    // 기관정보 (11개 컬럼) - 실제 인덱스에 맞게 조정
    20: '수탁법인명',
    21: '수탁법인번호',
    22: '수탁기관 사업자등록번호',
    23: '수행기관 고유번호',
    24: '수행기관명',
    25: '기관장명',
    26: '우편번호',
    27: '주소',
    28: '배송지우편번호', 
    29: '배송지주소',
    
    // 기본연락망 (5개 컬럼)
    30: '기관 대표전화',
    31: '메인 연락처',
    32: '긴급연락처/핸드폰',
    33: '팩스번호',
    34: '이메일',
    
    // 복지부 배정 인원 (3개 컬럼)
    35: '전담사회복지사(배정)',
    36: '생활지원사(배정)', 
    37: '대상자 ※사후관리 제외(배정)',
    
    // 배정 및 채용 인원 (9개 컬럼) - 실제 Excel 순서에 맞게
    38: '전담사회복지사(배정)',
    39: '전담사회복지사(채용)',
    40: '생활지원사(배정)', 
    41: '생활지원사(채용)',
    42: '대상자 ※사후관리 제외(배정)',
    43: '대상자 ※사후관리 제외(제공_일반+중점)',
    44: '대상자 ※사후관리 제외(제공_일반)',
    45: '대상자 ※사후관리 제외(제공_중점)', 
    46: '대상자 ※사후관리 제외(제공_특화)',
    47: '추가배정인원1', // 예비 필드
    48: '추가배정인원2', // 예비 필드
    
    // 지자체 공무원 정보 (3개 컬럼)
    49: '성명',
    50: '메인 연락처(공무원)',
    51: '이메일(공무원)',
    
    // 관리 정보 (2개 컬럼)
    52: '수정일',
    53: '등록자'
  };
  
  console.log('헤더 매핑 처리 시작...');
  
  const tempData = [];
  // 세 번째 행부터 데이터로 처리 (인덱스 2부터) - '*광역지원기관' 포함
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row.length > 0) {
      const obj: any = {};
      let hasValidData = false;
      
      // 정확한 컬럼 인덱스를 사용하여 데이터 매핑 (중복 필드명 처리 포함)
      Object.entries(headerMap).forEach(([index, header]) => {
        const colIndex = parseInt(index);
        if (row[colIndex] !== undefined && row[colIndex] !== null) {
          let finalFieldName = header;
          
          // 중복 필드명 처리: 위치에 따라 처음부터 구분된 필드명 사용
          if (colIndex >= 35 && colIndex <= 37) {
            // 복지부 배정 인원 섹션 (컬럼 35-37)
            finalFieldName = header + '_복지부';
          } else if (colIndex >= 38 && colIndex <= 46) {
            // 배정 및 채용 인원 섹션 (컬럼 38-46)
            finalFieldName = header + '_기관';
          }
          
          obj[finalFieldName] = row[colIndex];
          if (row[colIndex] !== '' && row[colIndex] !== null) {
            hasValidData = true;
          }
        }
      });
      
      // 생활지원사(배정) 데이터 디버깅 - 첫 10개 행에서 주변 컬럼 값들 확인
      if (i < 12) { // 2행부터 시작하므로 i < 12는 첫 10개 데이터 행
        console.log(`행 ${i-1} 배정/채용 인원 관련 컬럼 데이터:`);
        for (let col = 35; col <= 46; col++) {
          console.log(`  컬럼 ${col}: ${row[col]} (${headerMap[col] || '매핑안됨'})`);
        }
      }
      
      // XLSX 라이브러리가 생성하는 __EMPTY_ 필드들도 포함
      for (let j = 0; j < row.length; j++) {
        if (!headerMap[j] && row[j] !== undefined && row[j] !== null) {
          obj[`__EMPTY_${j}`] = row[j];
          if (row[j] !== '' && row[j] !== null) {
            hasValidData = true;
          }
        }
      }
      
      // 최소한 하나의 유효한 데이터가 있는 행만 추가
      if (hasValidData) {
        tempData.push(obj);
      }
    }
  }
  
  console.log(`시트 '${sheetName}' 복합 헤더 처리 완료: ${tempData.length}개 데이터`);
  if (tempData.length > 0) {
    console.log('첫 번째 데이터 샘플:', Object.keys(tempData[0]).slice(0, 10));
  }
  return tempData;
}

// 코드 시트 데이터 (기관 정보)
const institutionCodes = [
  { code: "A48000002", name: "(재)경상남도 사회서비스원", region: "경상남도", district: "*광역지원기관" },
  { code: "A48310001", name: "거제노인통합지원센터", region: "경상남도", district: "거제시" },
  { code: "A48310002", name: "거제사랑노인복지센터", region: "경상남도", district: "거제시" },
  { code: "A48880002", name: "거창노인통합지원센터", region: "경상남도", district: "거창군" },
  { code: "A48880003", name: "거창인애노인통합지원센터", region: "경상남도", district: "거창군" },
  { code: "A48880004", name: "해월노인복지센터", region: "경상남도", district: "거창군" },
  { code: "A48820003", name: "대한노인회 고성군지회(노인맞춤돌봄서비스)", region: "경상남도", district: "고성군" },
  { code: "A48820004", name: "한올생명의집", region: "경상남도", district: "고성군" },
  { code: "A48250001", name: "효능원노인법인신생원양산재가노인복지센터", region: "경상남도", district: "김해시" },
  { code: "A48330004", name: "양산행복한돌봄 사회적협동조합", region: "경상남도", district: "양산시" },
  { code: "A48330005", name: "성요셉소규모노인종합센터", region: "경상남도", district: "양산시" },
  { code: "A48720001", name: "의령노인통합지원센터", region: "경상남도", district: "의령군" },
  { code: "A48170001", name: "진양노인통합지원센터", region: "경상남도", district: "진주시" },
  { code: "A48170002", name: "진주노인통합지원센터", region: "경상남도", district: "진주시" },
  { code: "A48170003", name: "나누리노인통합지원센터", region: "경상남도", district: "진주시" },
  { code: "A48170004", name: "공덕의집노인통합지원센터", region: "경상남도", district: "진주시" },
  { code: "A48170005", name: "하늘마음노인통합지원센터", region: "경상남도", district: "진주시" },
  { code: "A48730001", name: "(사)대한노인회함안군지회", region: "경상남도", district: "함안군" },
  { code: "A48730002", name: "함안군재가노인통합지원센터", region: "경상남도", district: "함안군" },
  { code: "A48870002", name: "사단법인 대한노인회 함양군지회", region: "경상남도", district: "함양군" },
  { code: "A48890003", name: "미타재가복지센터", region: "경상남도", district: "합천군" },
  { code: "A48890004", name: "합천노인통합지원센터", region: "경상남도", district: "합천군" },
  { code: "A48890005", name: "코끼리행복복지센터", region: "경상남도", district: "합천군" },
  { code: "A48890006", name: "사회적협동조합 합천지역자활센터", region: "경상남도", district: "합천군" },
  { code: "A48740001", name: "사회적협동조합 창녕지역자활센터", region: "경상남도", district: "창녕군" },
  { code: "A48740002", name: "창녕군새누리노인종합센터", region: "경상남도", district: "창녕군" },
  { code: "A48120001", name: "동진노인통합지원센터", region: "경상남도", district: "창원시" },
];

// 코드 시트 데이터 (교육과정 정보) - 코드.xlsx에서 추출한 완전한 데이터
const courseCodes = [
  { name: "2025년 광역, 일반 및 중점 전담사회복지사 기본교육", category: "기초교육", operator: "중앙", code: "전담공통기본" },
  { name: "2025년 광역, 일반 및 중점 전담사회복지사 기본교육_재응시", category: "기초교육", operator: "중앙", code: "전담공통기본" },
  { name: "2025년 광역, 일반 및 중점 전담사회복지사 심화교육(신규자)", category: "심화교육", operator: "중앙", code: "전담신규심화" },
  { name: "2025년 광역, 일반 및 중점 전담사회복지사 심화교육(신규자)_재응시", category: "심화교육", operator: "중앙", code: "전담신규심화" },
  { name: "2025년 생활지원사 기본교육", category: "기초교육", operator: "중앙", code: "생활지원사신규기본" },
  { name: "2025년 생활지원사 기본교육_재응시", category: "기초교육", operator: "중앙", code: "생활지원사신규기본" },
  { name: "2025년 생활지원사 심화교육(A형)", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(A형)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(B형)", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(B형)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(C형)", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(C형)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(D형)", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(D형)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(E형)", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(E형)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사경력심화" },
  { name: "2025년 생활지원사 심화교육(신규자)", category: "심화교육", operator: "중앙", code: "생활지원사신규심화" },
  { name: "2025년 생활지원사 심화교육(신규자)_재응시", category: "심화교육", operator: "중앙", code: "생활지원사신규심화" },
  { name: "2025년 전담사회복지사 심화교육(강점관점 해결중심 상담의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(강점관점 해결중심 상담의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(고위험 노인의 사례관리)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(고위험 노인의 사례관리)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(관계성장을 위한 자기이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(관계성장을 위한 자기이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(내러티브 노인상담의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(내러티브 노인상담의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(노년기 정신건강의 문제와 인지기능 저하의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(노년기 정신건강의 문제와 인지기능 저하의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(노인맞춤돌봄서비스 제공절차의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(노인복지의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(노인복지의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(동기강화 상담의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(동기강화 상담의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(사례관리의 실제)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(사례관리의 실제)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(스마트 돌봄)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(스마트 돌봄)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(아름다운 직장문화 만들기)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(아름다운 직장문화 만들기)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(인지치료 상담의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(인지치료 상담의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(자살예방)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(자살예방)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(종사자가 알아야 할 기초노무지식)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(종사자가 알아야 할 기초노무지식)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(지역사회 자원연계의 이해)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(지역사회 자원연계의 이해)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(집단프로그램의 이해와 실제)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(집단프로그램의 이해와 실제)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(치매예방)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(치매예방)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(특화서비스 집단별 접근방법)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(특화서비스 집단프로그램의 실제)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(특화서비스 집단프로그램의 실제)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(특화서비스 행정실무)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(특화서비스 행정실무)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(프로그램 기획과 운영)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(프로그램 기획과 운영)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(학대예방)", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 전담사회복지사 심화교육(학대예방)_재응시", category: "심화교육", operator: "중앙", code: "전담경력심화" },
  { name: "2025년 특화서비스 전담사회복지사 기본교육", category: "기초교육", operator: "중앙", code: "특전공통기본" },
  { name: "2025년 특화서비스 전담사회복지사 기본교육_재응시", category: "기초교육", operator: "중앙", code: "특전공통기본" },
  { name: "2025년 특화서비스 전담사회복지사 심화교육(신규자)", category: "심화교육", operator: "중앙", code: "특전신규심화" },
  { name: "2025년 특화서비스 전담사회복지사 심화교육(신규자)_재응시", category: "심화교육", operator: "중앙", code: "특전신규심화" }
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Multer configuration for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Clear all education data route
  app.delete("/api/education/clear", async (req, res) => {
    try {
      await storage.saveEducationData([]);
      console.log('모든 교육 데이터 삭제 완료');
      res.json({ message: "All education data cleared successfully" });
    } catch (error) {
      console.error('Failed to clear education data:', error);
      res.status(500).json({ error: "Failed to clear education data" });
    }
  });

  // Session management routes
  app.post("/api/session", async (req, res) => {
    try {
      const sessionId = await sessionManager.createSession();
      res.json({ sessionId });
    } catch (error) {
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/session/:sessionId", async (req, res) => {
    try {
      const session = await sessionManager.getSession(req.params.sessionId);
      res.json(session);
    } catch (error) {
      res.status(404).json({ error: "Session not found" });
    }
  });

  app.delete("/api/session/:sessionId", async (req, res) => {
    try {
      await sessionManager.deleteSession(req.params.sessionId);
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/session/:sessionId/finalize", async (req, res) => {
    try {
      await sessionManager.finalizeAndCleanupSession(req.params.sessionId);
      res.json({ message: "Session finalized and cleaned up" });
    } catch (error) {
      res.status(500).json({ error: "Failed to finalize session" });
    }
  });

  // Education Participants API routes
  app.get("/api/participants", async (req, res) => {
    try {
      const participants = await storage.getEducationParticipants();
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/participants", async (req, res) => {
    try {
      await storage.saveEducationParticipant(req.body);
      res.status(201).json({ message: "Participant saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save participant" });
    }
  });

  // Clear all participant data - MUST be before parameterized routes
  app.delete("/api/participants/clear", async (req, res) => {
    try {
      await storage.clearAllParticipants();
      console.log('모든 참가자 데이터 삭제 완료');
      res.json({ message: "All participant data cleared successfully", count: 0 });
    } catch (error) {
      console.error('Failed to clear participant data:', error);
      res.status(500).json({ error: "Failed to clear participant data" });
    }
  });

  // Clear basic education data
  app.delete("/api/education/basic/clear", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const nonBasicEducationData = educationData.filter(item => item.courseType !== '기본');
      await storage.saveEducationData(nonBasicEducationData);
      console.log('기본교육 데이터 삭제 완료');
      res.json({ message: "Basic education data cleared successfully" });
    } catch (error) {
      console.error('Failed to clear basic education data:', error);
      res.status(500).json({ error: "Failed to clear basic education data" });
    }
  });

  // Clear advanced education data
  app.delete("/api/education/advanced/clear", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const nonAdvancedEducationData = educationData.filter(item => item.courseType !== '심화');
      await storage.saveEducationData(nonAdvancedEducationData);
      console.log('심화교육 데이터 삭제 완료');
      res.json({ message: "Advanced education data cleared successfully" });
    } catch (error) {
      console.error('Failed to clear advanced education data:', error);
      res.status(500).json({ error: "Failed to clear advanced education data" });
    }
  });

  // Clear institution data
  app.delete("/api/institutions/clear", async (req, res) => {
    try {
      await storage.saveInstitutionData([]);
      console.log('기관현황 데이터 삭제 완료');
      res.json({ message: "Institution data cleared successfully" });
    } catch (error) {
      console.error('Failed to clear institution data:', error);
      res.status(500).json({ error: "Failed to clear institution data" });
    }
  });


  app.put("/api/participants/:id", async (req, res) => {
    try {
      await storage.updateEducationParticipant(req.params.id, req.body);
      res.json({ message: "Participant updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update participant" });
    }
  });

  app.delete("/api/participants/:id", async (req, res) => {
    try {
      await storage.deleteEducationParticipant(req.params.id);
      res.json({ message: "Participant deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete participant" });
    }
  });

  // Participants file upload route
  app.post("/api/participants/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const validParticipants: any[] = [];
      const errors: string[] = [];
      let processedCount = 0;

      console.log('업로드된 데이터 샘플:', data.slice(0, 2));
      console.log('첫 번째 행 키들:', Object.keys(data[0] || {}));

      // First pass: validate and prepare all participants
      for (const row of data as any[]) {
        try {
          // 엑셀 헤더가 __EMPTY 형태로 파싱되는 문제 해결
          // 첫 번째 헤더 행을 건너뛰고 실제 데이터부터 처리
          const keys = Object.keys(row);
          const values = Object.values(row);
          
          // 헤더 행인지 확인 (첫 번째 값이 'No' 또는 헤더명인 경우)
          if (values[0] === 'No' || values[0] === '번호' || typeof values[0] === 'string' && values[0].includes('회원목록')) {
            continue; // 헤더 행은 건너뛰기
          }

          // 순서대로 매핑 (엑셀 컬럼 순서 기준)
          const participant = {
            id: values[7] || `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID 컬럼
            no: Number(values[0]) || undefined, // No 컬럼
            institution: values[1] || '', // 소속
            institutionCode: values[2] || '', // 기관코드
            institutionType: values[3] || '', // 유형
            name: values[4] || '', // 회원명
            gender: values[5] || '', // 성별
            birthDate: values[6] || '', // 생년월일
            phone: values[8] || '', // 휴대전화
            email: values[9] || '', // 이메일
            courseCount: Number(values[10]) || 0, // 수강건수
            lastAccessDate: values[11] || '', // 접속일
            registrationDate: values[12] || '', // 가입일
            jobType: values[13] || '', // 직군
            hireDate: values[14] || '', // 입사일
            resignDate: values[15] || '', // 퇴사일
            specialization: values[16] || '', // 특화
            middleManager: values[17] || '', // 중간관리자
            topManager: values[18] || '', // 최고관리자
            career: values[19] || '', // 경력
            participatesInLegalBusiness: values[20] || '', // 시법사업참여여부
            emailConsent: values[21] || '', // 이메일수신동의여부
            smsConsent: values[22] || '', // SMS수신동의 여부
            status: values[23] || '', // 상태
            finalCompletion: values[24] || '', // 최종수료
            basicTraining: values[25] || '', // 기초직무
            advancedEducation: values[26] || '', // 심화교육
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          console.log('처리된 participant 데이터:', { 
            name: participant.name, 
            institution: participant.institution,
            id: participant.id
          });

          validParticipants.push(participant);
          processedCount++;
        } catch (error) {
          errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Second pass: batch save all valid participants
      if (validParticipants.length > 0) {
        console.log(`Batch saving ${validParticipants.length} participants...`);
        await storage.batchSaveEducationParticipants(validParticipants);
      }

      res.json({
        message: "File processed successfully",
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Education Enrollments API routes
  app.get("/api/enrollments", async (req, res) => {
    try {
      const enrollments = await storage.getEducationEnrollments();
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  app.get("/api/participants/:participantId/enrollments", async (req, res) => {
    try {
      const enrollments = await storage.getEnrollmentsByParticipant(req.params.participantId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch participant enrollments" });
    }
  });

  app.post("/api/enrollments", async (req, res) => {
    try {
      await storage.saveEducationEnrollment(req.body);
      res.status(201).json({ message: "Enrollment saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save enrollment" });
    }
  });

  app.put("/api/enrollments/:id", async (req, res) => {
    try {
      await storage.updateEducationEnrollment(req.params.id, req.body);
      res.json({ message: "Enrollment updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update enrollment" });
    }
  });

  app.delete("/api/enrollments/:id", async (req, res) => {
    try {
      await storage.deleteEducationEnrollment(req.params.id);
      res.json({ message: "Enrollment deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete enrollment" });
    }
  });


  // Get code data
  app.get("/api/codes/institutions", async (req, res) => {
    try {
      res.json(institutionCodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch institution codes" });
    }
  });

  app.get("/api/codes/courses", async (req, res) => {
    try {
      res.json(courseCodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch course codes" });
    }
  });

  // Get education data
  app.get("/api/education", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      res.json(educationData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch education data" });
    }
  });

  // Session-based basic education data
  app.get("/api/session/:sessionId/education/basic", async (req, res) => {
    try {
      const data = await sessionManager.getSessionEducationData(req.params.sessionId, 'basic');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session basic education data" });
    }
  });

  app.post("/api/session/:sessionId/education/basic", async (req, res) => {
    try {
      await sessionManager.saveSessionEducationData(req.params.sessionId, 'basic', req.body);
      res.json({ message: "Basic education data saved to session" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save session basic education data" });
    }
  });

  // Session-based advanced education data
  app.get("/api/session/:sessionId/education/advanced", async (req, res) => {
    try {
      const data = await sessionManager.getSessionEducationData(req.params.sessionId, 'advanced');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session advanced education data" });
    }
  });

  app.post("/api/session/:sessionId/education/advanced", async (req, res) => {
    try {
      await sessionManager.saveSessionEducationData(req.params.sessionId, 'advanced', req.body);
      res.json({ message: "Advanced education data saved to session" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save session advanced education data" });
    }
  });

  // Get basic education data (legacy)
  app.get("/api/education/basic", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const basicEducationData = educationData.filter(item => item.courseType === '기본');
      
      console.log(`기본교육 데이터 ${basicEducationData.length}개 반환`);
      
      res.json(basicEducationData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch basic education data" });
    }
  });

  // Get advanced education data (legacy)
  app.get("/api/education/advanced", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const advancedEducationData = educationData.filter(item => item.courseType === '심화');
      res.json(advancedEducationData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch advanced education data" });
    }
  });

  // Session-based education data upload route
  app.post("/api/session/:sessionId/education/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const sessionId = req.params.sessionId;
      const type = req.body.type || 'basic'; // 'basic' or 'advanced'

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: true, cellText: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Process data (similar to existing upload logic)
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      let headerRowIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (Array.isArray(row) && row.length > 10 && 
            (row.includes('연번') || row.includes('과정명') || row.includes('수강생명'))) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('헤더 행을 찾을 수 없습니다.');
      }
      
      const headers = rawData[headerRowIndex];
      const data = [];
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const obj = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined && row[index] !== null) {
            const value = String(row[index]).trim();
            obj[header] = value;
          }
        });
        data.push(obj);
      }

      let processedCount = 0;
      const errors: string[] = [];
      const educationData: any[] = [];

      // Process each row (reuse existing processing logic)
      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        try {
          // Date parsing helper
          const parseDate = (dateStr: any): Date | undefined => {
            if (!dateStr) return undefined;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? undefined : date;
          };

          // VLOOKUP helper
          const vlookupCourseCategory = (courseName: string): string => {
            const courseInfo = courseCodes.find(course => course.name === courseName);
            if (courseInfo) {
              if (courseInfo.category === '기초교육') return '기본';
              if (courseInfo.category === '심화교육') return '심화';
              return courseInfo.category;
            }
            return '기타';
          };

          // Course type determination
          const determineCourseType = (course: string, type: string): string => {
            const vlookupResult = vlookupCourseCategory(course);
            if (vlookupResult !== '기타') return vlookupResult;
            
            if (course.includes('기본교육') || course.includes('생활지원사 기본교육')) return '기본';
            if (course.includes('심화교육')) return '심화';
            if (course.includes('공무원 교육') || course.includes('예방교육')) return '특별';
            
            if (type === 'advanced') return '심화';
            if (type === 'basic') return '기본';
            
            return '기타';
          };

          // Status parsing
          const parseStatus = (status: string): string => {
            if (!status) return '미수료';
            const lowerStatus = status.toLowerCase();
            if (lowerStatus.includes('수료') && !lowerStatus.includes('미수료')) return '수료';
            if (lowerStatus.includes('미수료')) return '미수료';
            if (lowerStatus.includes('취소') || lowerStatus.includes('수강취소')) return '수강취소';
            if (lowerStatus.includes('진행') || lowerStatus.includes('ing')) return '진행중';
            if (lowerStatus.includes('정상')) return '진행중';
            return '미수료';
          };

          const studentId = row['ID'] || `edu_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const courseName = row['과정명'] || '';
          
          const education = {
            id: studentId,
            serialNumber: row['연번'] || String(index + 1),
            name: row['수강생명'] || '',
            institution: row['수행기관명'] || '',
            institutionCode: row['기관코드'] || '',
            course: courseName,
            courseType: determineCourseType(courseName, type),
            status: parseStatus(row['수료여부'] || ''),
            rawStatus: row['상태'] || '',
            completionDate: parseDate(row['수료일'])?.toISOString() || undefined,
            email: row['이메일'] || undefined,
            jobType: row['직군'] || undefined,
            hireDate: parseDate(row['입사일']),
            resignDate: parseDate(row['퇴사일']),
            year: row['년도/차수'] || row['년도차수'] || row['년도'] || row['차수'] || undefined,
            applicationDate: parseDate(row['교육신청일자'])?.toISOString() || undefined,
            institutionType: row['수행기관명유형'] || undefined,
            region: row['시도'] || row['광역시'] || row['광역명'] || row['시·도'] || extractSidoFromName(row['수행기관명']) || undefined,
            district: row['시군구'] || row['지자체'] || row['시·군·구'] || extractSigunguFromName(row['수행기관명']) || undefined,
            specialization: row['추가정보(특화)'] || undefined,
            middleManager: row['추가정보(중간관리자)'] || undefined,
            topManager: row['추가정보(최고관리자)'] || undefined,
            targetInfo: row['정보(신규과정대상)'] || undefined,
            educationHours: parseFloat(String(row['교육시간'] || '0').replace(/[^0-9.]/g, '')) || 0,
            progress: parseFloat(String(row['진도율'] || '0').replace(/[^0-9.]/g, '')) || 0,
            score: parseFloat(String(row['점수'] || '0').replace(/[^0-9.]/g, '')) || 0,
            categoryVlookup: vlookupCourseCategory(courseName),
            concatenatedKey: `${studentId}${courseName}`,
          };

          educationData.push(education);
          processedCount++;
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Save to session instead of global storage
      await sessionManager.saveSessionEducationData(sessionId, type, educationData);

      res.json({
        message: "Education file processed and saved to session",
        sessionId,
        count: processedCount,
        type,
        errors: errors.length > 0 ? errors : undefined,
      });

    } catch (error) {
      console.error("Session education upload error:", error);
      res.status(500).json({ 
        error: "Failed to process education file", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Education data upload route (legacy)
  app.post("/api/education/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: true, cellText: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      
      // 먼저 헤더가 있는 행을 찾기 위해 배열 형태로 읽기
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // 헤더가 있는 행 찾기 (보통 2행째부터 시작)
      let headerRowIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (Array.isArray(row) && row.length > 10 && 
            (row.includes('연번') || row.includes('과정명') || row.includes('수강생명'))) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('헤더 행을 찾을 수 없습니다.');
      }
      
      // 헤더 행부터 시작하여 객체 배열로 변환
      const headers = rawData[headerRowIndex];
      const data = [];
      
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const obj = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined && row[index] !== null) {
            // 모든 값을 문자열로 변환하여 데이터 손실 방지, 빈 문자열도 유지
            const value = String(row[index]).trim();
            obj[header] = value;
          }
        });
        data.push(obj);
      }

      const type = req.body.type || 'basic'; // 'basic' or 'advanced'
      let processedCount = 0;
      const errors: string[] = [];
      const educationData: any[] = [];

      // 디버깅: 첫 번째 데이터 로그 출력
      if (data.length > 0) {
        console.log('첫 번째 데이터 샘플:', JSON.stringify(data[0], null, 2));
        console.log('헤더 확인:', Object.keys(data[0]));
        console.log('년도/차수 관련 필드 확인:');
        console.log('- 년도/차수:', data[0]['년도/차수']);
        console.log('- 년도차수:', data[0]['년도차수']);
        console.log('- 년도:', data[0]['년도']);
        console.log('- 차수:', data[0]['차수']);
        console.log('- 실제 모든 헤더:', Object.keys(data[0]).filter(key => key.includes('년') || key.includes('차')));
      }

      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        try {
          // 날짜 파싱 헬퍼 함수
          const parseDate = (dateStr: any): Date | undefined => {
            if (!dateStr) return undefined;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? undefined : date;
          };

          // VLOOKUP 함수 구현: 과정명으로 교육분류 찾기
          const vlookupCourseCategory = (courseName: string): string => {
            const courseInfo = courseCodes.find(course => course.name === courseName);
            if (courseInfo) {
              // 기초교육 -> 기본, 심화교육 -> 심화로 매핑
              if (courseInfo.category === '기초교육') return '기본';
              if (courseInfo.category === '심화교육') return '심화';
              return courseInfo.category;
            }
            return '기타';
          };

          // CONCATENATE 함수 구현: ID + 과정명 연결
          const concatenateIdAndCourse = (id: string, courseName: string): string => {
            return `${id}${courseName}`;
          };

          // 과정 타입 결정 헬퍼 함수 (VLOOKUP 우선 사용)
          const determineCourseType = (course: string, type: string): string => {
            // 1. VLOOKUP으로 정확한 매칭 시도
            const vlookupResult = vlookupCourseCategory(course);
            if (vlookupResult !== '기타') return vlookupResult;
            
            // 2. 패턴 매칭 fallback
            if (course.includes('기본교육') || course.includes('생활지원사 기본교육')) return '기본';
            if (course.includes('심화교육')) return '심화';
            if (course.includes('공무원 교육') || course.includes('예방교육')) return '특별';
            
            // 3. 업로드 시 지정된 타입 사용
            if (type === 'advanced') return '심화';
            if (type === 'basic') return '기본';
            
            return '기타';
          };

          // 상태 파싱 헬퍼 함수
          const parseStatus = (status: string): string => {
            if (!status) return '미수료';
            const lowerStatus = status.toLowerCase();
            if (lowerStatus.includes('수료') && !lowerStatus.includes('미수료')) return '수료';
            if (lowerStatus.includes('미수료')) return '미수료';
            if (lowerStatus.includes('취소') || lowerStatus.includes('수강취소')) return '수강취소';
            if (lowerStatus.includes('진행') || lowerStatus.includes('ing')) return '진행중';
            if (lowerStatus.includes('정상')) return '진행중'; // '정상' 상태를 '진행중'으로 매핑
            return '미수료';
          };

          // 실제 엑셀 헤더명으로 매핑
          const studentId = row['ID'] || `edu_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const courseName = row['과정명'] || '';
          const studentName = row['수강생명'] || '';
          
          // 학생 이름 디버깅 (처음 10개만)
          if (index < 10) {
            console.log(`학생 ${index + 1}: ${studentName}, 수료여부: ${row['수료여부']}, 상태: ${row['상태']}`);
            console.log(`  과정명: ${courseName}, 결정된 courseType: ${determineCourseType(courseName, type)}, 업로드 type: ${type}`);
          }
          
          // 신용기 데이터 디버깅
          if (studentName === '신용기' || studentName.includes('신용기')) {
            console.log('=== 신용기 원본 데이터 ===');
            console.log('수강생명:', studentName);
            console.log('수료여부:', row['수료여부']);
            console.log('상태:', row['상태']);
            console.log('파싱된 수료여부:', parseStatus(row['수료여부'] || ''));
            console.log('원본 상태:', row['상태']);
            console.log('전체 row 데이터:', JSON.stringify(row, null, 2));
            console.log('========================');
          }
          
          const education = {
            id: studentId,
            serialNumber: row['연번'] || String(index + 1), // 원본 파일의 연번을 문자열로 보존
            name: row['수강생명'] || '',
            institution: row['수행기관명'] || '',
            institutionCode: row['기관코드'] || '',
            course: courseName,
            courseType: determineCourseType(courseName, type),
            status: parseStatus(row['수료여부'] || ''), // 수료여부 -> status
            rawStatus: row['상태'] || '', // 상태 -> rawStatus
            completionDate: parseDate(row['수료일'])?.toISOString() || undefined,
            email: row['이메일'] || undefined,
            jobType: row['직군'] || undefined,
            hireDate: parseDate(row['입사일']),
            resignDate: parseDate(row['퇴사일']),
            // 추가 필드들 (엑셀 실제 헤더명 사용)
            year: row['년도/차수'] || row['년도차수'] || row['년도'] || row['차수'] || undefined,
            applicationDate: parseDate(row['교육신청일자'])?.toISOString() || undefined,
            institutionType: row['수행기관명유형'] || undefined,
            region: row['시도'] || row['광역시'] || row['광역명'] || row['시·도'] || extractSidoFromName(row['수행기관명']) || undefined,
            district: row['시군구'] || row['지자체'] || row['시·군·구'] || extractSigunguFromName(row['수행기관명']) || undefined,
            specialization: row['추가정보(특화)'] || undefined,
            middleManager: row['추가정보(중간관리자)'] || undefined,
            topManager: row['추가정보(최고관리자)'] || undefined,
            targetInfo: row['정보(신규과정대상)'] || undefined,
            educationHours: parseFloat(String(row['교육시간'] || '0').replace(/[^0-9.]/g, '')) || 0,
            progress: parseFloat(String(row['진도율'] || '0').replace(/[^0-9.]/g, '')) || 0,
            score: parseFloat(String(row['점수'] || '0').replace(/[^0-9.]/g, '')) || 0,
            // 엑셀 함수 계산 필드들
            categoryVlookup: vlookupCourseCategory(courseName), // =VLOOKUP(C3,코드!$H$3:$K$87,2,FALSE)
            concatenatedKey: concatenateIdAndCourse(studentId, courseName), // =CONCATENATE(L3,C3)
          };

          educationData.push(education);
          processedCount++;
        } catch (error) {
          errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await storage.saveEducationData(educationData);

      res.json({
        message: "Education file processed successfully",
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined,
        type: type,
        debug: {
          dataLength: data.length,
          firstRowKeys: data.length > 0 ? Object.keys(data[0]) : [],
          sampleData: data.length > 0 ? data[0] : null
        }
      });

    } catch (error) {
      console.error("Education upload error:", error);
      res.status(500).json({ 
        error: "Failed to process education file", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get employee data
  app.get("/api/employees", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string || '';
      const statusFilter = req.query.status as string || 'all';
      const jobTypeFilter = req.query.jobType as string || 'all';
      
      const allEmployeeData = await storage.getEmployeeData();
      
      // Apply filters
      let filteredData = allEmployeeData;
      
      // Status filter
      if (statusFilter === 'active') {
        filteredData = filteredData.filter(emp => emp.isActive);
      } else if (statusFilter === 'inactive') {
        filteredData = filteredData.filter(emp => !emp.isActive);
      }
      
      // Job type filter
      if (jobTypeFilter === 'social-worker') {
        filteredData = filteredData.filter(emp => 
          emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사');
      } else if (jobTypeFilter === 'life-support') {
        filteredData = filteredData.filter(emp => emp.jobType === '생활지원사');
      }
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(emp =>
          emp.name?.toLowerCase().includes(searchLower) ||
          emp.institution?.toLowerCase().includes(searchLower) ||
          emp.jobType?.toLowerCase().includes(searchLower) ||
          emp.careerType?.toLowerCase().includes(searchLower) ||
          emp.institutionCode?.toLowerCase().includes(searchLower)
        );
      }
      
      const total = filteredData.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const data = filteredData.slice(startIndex, endIndex);
      
      res.json({
        data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        statistics: {
          totalEmployees: allEmployeeData.length,
          activeEmployees: allEmployeeData.filter(emp => emp.isActive).length,
          socialWorkers: allEmployeeData.filter(emp => 
            emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')).length,
          lifeSupport: allEmployeeData.filter(emp => 
            emp.isActive && emp.jobType === '생활지원사').length,
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee data" });
    }
  });

  // Clear employee data - MUST be before parameterized routes
  app.delete("/api/employees/clear", async (req, res) => {
    console.log('=== 종사자 데이터 삭제 API 호출됨 ===');
    try {
      console.log('종사자 데이터 삭제 시작...');
      const beforeCount = (await storage.getEmployeeData()).length;
      console.log(`삭제 전 종사자 수: ${beforeCount}`);
      
      await storage.saveEmployeeData([]);
      
      const afterCount = (await storage.getEmployeeData()).length;
      console.log(`삭제 후 종사자 수: ${afterCount}`);
      console.log('종사자 데이터 삭제 완료');
      
      res.json({ message: "Employee data cleared successfully", beforeCount, afterCount });
    } catch (error) {
      console.error('Failed to clear employee data:', error);
      res.status(500).json({ error: "Failed to clear employee data" });
    }
  });

  // Get institution data
  app.get("/api/institutions", async (req, res) => {
    try {
      const institutionData = await storage.getInstitutionData();
      res.json(institutionData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch institution data" });
    }
  });


  // Employee data upload route
  app.post("/api/employees/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 파일 내용을 문자열로 변환하여 HTML인지 확인
      const fileContent = req.file.buffer.toString('utf8');
      const fileStart = fileContent.substring(0, 200).trim(); // 처음 200자만 확인
      const isHtmlFile = fileStart.startsWith('<!DOCTYPE html') || 
                        fileStart.includes('<html') || 
                        fileStart.includes('<table') ||
                        fileContent.includes('<td') ||
                        fileContent.includes('<tr');

      console.log('\n=== 종사자 데이터 업로드 분석 ===');
      console.log('파일 시작 부분:', fileStart.substring(0, 50));
      console.log('파일 형식 감지:', isHtmlFile ? 'HTML' : 'Excel');
      console.log('HTML 감지 조건들:');
      console.log('  DOCTYPE:', fileStart.startsWith('<!DOCTYPE html'));
      console.log('  <html>:', fileStart.includes('<html'));
      console.log('  <table>:', fileStart.includes('<table'));
      console.log('  <td>:', fileContent.includes('<td'));
      console.log('  <tr>:', fileContent.includes('<tr'));

      if (isHtmlFile) {
        // 개선된 HTML 파싱 로직 (헤더 기반)
        return await handleImprovedHtmlEmployeeUpload(req, res, fileContent);
      } else {
        // 기존 Excel 파싱 로직
        return await handleExcelEmployeeUpload(req, res);
      }
    } catch (error) {
      console.error('Employee upload error:', error);
      res.status(500).json({ error: "Failed to process employee file" });
    }
  });

  // HTML 파일 처리 함수 (헤더 기반)
  async function handleHtmlEmployeeUpload(req: any, res: any, htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    
    let processedCount = 0;
    const errors: string[] = [];
    const employeeData: any[] = [];
    let jinBeopGyuFound = false;
    
    console.log('HTML 파싱 시작...');
    
    // 테이블 찾기
    const tables = $('table');
    console.log(`발견된 테이블 수: ${tables.length}`);
    
    if (tables.length === 0) {
      throw new Error('HTML에서 테이블을 찾을 수 없습니다.');
    }
    
    // 가장 큰 테이블 선택 (데이터가 가장 많을 것으로 예상)
    let largestTable = tables.first();
    let maxRows = 0;
    
    tables.each((i, table) => {
      const rowCount = $(table).find('tr').length;
      console.log(`테이블 ${i + 1}: ${rowCount}행`);
      if (rowCount > maxRows) {
        maxRows = rowCount;
        largestTable = $(table);
      }
    });
    
    console.log(`선택된 테이블: ${maxRows}행`);
    
    // 테이블 행 처리
    const rows = largestTable.find('tr');
    console.log(`전체 행 수: ${rows.length}`);
    
    // 각 행을 처리하여 종사자 데이터 추출
    rows.each((rowIndex, row) => {
      const cells = $(row).find('td');
      if (cells.length < 5) return; // 최소 필드 수를 더 낮춤
      
      const cellValues = [];
      cells.each((cellIndex, cell) => {
        const cellText = $(cell).text().trim();
        cellValues.push(cellText);
      });
      
      // 진법규가 포함된 행인지 확인
      const hasJinBeopGyu = cellValues.some(value => value === '진법규');
      if (hasJinBeopGyu) {
        console.log(`=== 진법규 포함 행 발견! 행 ${rowIndex} ===`);
        console.log('셀 데이터:', cellValues);
        console.log('셀 개수:', cellValues.length);
        jinBeopGyuFound = true;
      }
      
      // 의미있는 데이터인지 확인 (이름 필드가 있는지)
      const hasValidName = cellValues.some(value => {
        if (!value || value.length < 2 || value.length > 4) return false;
        if (!/^[가-힣]+$/.test(value)) return false;
        
        const commonSurnames = [
          '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', 
          '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '백', '허', 
          '유', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '원', '탁', '연', 
          '방', '남궁', '제갈', '선우', '독고', '진', '육', '마', '변', '사', '소', '엄', '공',
          '예', '현', '봉', '가', '강전', '설', '당', '목', '도', '견', '연성', '기', '석', '로'
        ];
        
        return commonSurnames.some(surname => value.startsWith(surname));
      });
      
      // 진법규가 포함된 행은 무조건 처리
      const forceProcess = hasJinBeopGyu;
      
      if ((hasValidName && cellValues.length >= 3) || forceProcess) { // 조건을 더 완화 (5 -> 3)
        try {
          // 종사자 데이터 매핑 - 더 유연한 방식으로 변경
          const employee = {
            id: `employee_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            region: '',
            district: '',
            regionCode: '',
            regionName: '',
            institutionCode: '',
            jobType: '',
            responsibility: '',
            name: '',
            careerType: '',
            birthDate: '',
            gender: '',
            hireDate: '',
            resignDate: '',
            notes: '',
            learningId: '',
            modifiedDate: '',
            mainDuty: '',
            angelCode: '',
            institution: '',
            province: '',
            duty: '',
            remarks: '',
            note: '',
            primaryWork: '',
            isActive: true,
            workDays: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // 이름을 먼저 찾기 (전체 셀에서 검색)
          let nameIndex = -1;
          for (let i = 0; i < cellValues.length; i++) {
            const value = cellValues[i];
            if (value && value.length >= 2 && value.length <= 4 && /^[가-힣]+$/.test(value)) {
              const commonSurnames = [
                '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', 
                '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '백', '허', 
                '유', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '원', '탁', '연', 
                '방', '남궁', '제갈', '선우', '독고', '진', '육', '마', '변', '사', '소', '엄', '공',
                '예', '현', '봉', '가', '강전', '설', '당', '목', '도', '견', '연성', '기', '석', '로'
              ];
              
              if (commonSurnames.some(surname => value.startsWith(surname))) {
                employee.name = value;
                nameIndex = i;
                break;
              }
            }
          }
          
          // 이름이 발견된 경우에만 계속 처리
          if (employee.name && nameIndex >= 0) {
            // 이름을 기준으로 앞뒤 필드들을 유추해서 매핑
            if (nameIndex >= 7) {
              // 표준 구조로 추정: 광역시, 지자체, 광역코드, 광역명, 수행기관코드, 직무구분, 담당업무, [이름]
              employee.region = cellValues[nameIndex - 7] || '';
              employee.district = cellValues[nameIndex - 6] || '';
              employee.regionCode = cellValues[nameIndex - 5] || '';
              employee.regionName = cellValues[nameIndex - 4] || '';
              employee.institutionCode = cellValues[nameIndex - 3] || '';
              employee.jobType = cellValues[nameIndex - 2] || '';
              employee.responsibility = cellValues[nameIndex - 1] || '';
            } else {
              // 부분적 매핑
              for (let i = 0; i < nameIndex; i++) {
                if (i === nameIndex - 1) employee.responsibility = cellValues[i] || '';
                else if (i === nameIndex - 2) employee.jobType = cellValues[i] || '';
                else if (i === nameIndex - 3) employee.institutionCode = cellValues[i] || '';
                else if (i === 0) employee.region = cellValues[i] || '';
                else if (i === 1) employee.district = cellValues[i] || '';
              }
            }
            
            // 이름 이후 필드들 매핑
            if (nameIndex + 1 < cellValues.length) employee.careerType = cellValues[nameIndex + 1] || '';
            if (nameIndex + 2 < cellValues.length) employee.birthDate = cellValues[nameIndex + 2] || '';
            if (nameIndex + 3 < cellValues.length) employee.gender = cellValues[nameIndex + 3] || '';
            if (nameIndex + 4 < cellValues.length) employee.hireDate = cellValues[nameIndex + 4] || '';
            if (nameIndex + 5 < cellValues.length) employee.resignDate = cellValues[nameIndex + 5] || '';
            if (nameIndex + 6 < cellValues.length) employee.notes = cellValues[nameIndex + 6] || '';
            if (nameIndex + 7 < cellValues.length) employee.learningId = cellValues[nameIndex + 7] || '';
            if (nameIndex + 8 < cellValues.length) employee.modifiedDate = cellValues[nameIndex + 8] || '';
            if (nameIndex + 9 < cellValues.length) employee.mainDuty = cellValues[nameIndex + 9] || '';
            
            // 날짜 형식 정리 및 유효성 검사
            const isValidDate = (dateStr: string) => {
              if (!dateStr || dateStr.trim() === '') return false;
              // 잘못된 날짜 형식들 필터링
              if (dateStr.includes('202520') || dateStr.match(/^\d{1,2}-\d{1,2}$/) || dateStr.match(/^\d{1}-\d{1,2}-\d{1,2}$/)) {
                return false;
              }
              // 기본적인 날짜 형식만 허용
              return dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || dateStr.match(/^\d{8}$/) || dateStr.match(/^\d{4}\.\d{2}\.\d{2}$/);
            };
            
            // 퇴사일 유효성 검사 후 활성 상태 결정
            const hasValidResignDate = isValidDate(employee.resignDate);
            employee.isActive = !hasValidResignDate;
            
            // 유효하지 않은 퇴사일은 제거
            if (!hasValidResignDate) {
              employee.resignDate = '';
            }
            
            // 날짜 형식 정리 (유효한 날짜만)
            const normalizeDate = (dateStr: string) => {
              if (!dateStr || dateStr.trim() === '') return '';
              
              // 잘못된 형식 제거
              if (dateStr.includes('202520') || dateStr.match(/^\d{1,2}-\d{1,2}$/) || dateStr.match(/^\d{1}-\d{1,2}-\d{1,2}$/)) {
                return '';
              }
              
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateStr;
              } else if (dateStr.match(/^\d{8}$/)) {
                return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
              } else if (dateStr.match(/^\d{4}\.\d{2}\.\d{2}$/)) {
                return dateStr.replace(/\./g, '-');
              }
              return '';
            };
            
            employee.birthDate = normalizeDate(employee.birthDate);
            employee.hireDate = normalizeDate(employee.hireDate);
            employee.resignDate = normalizeDate(employee.resignDate);
            
            employee.province = employee.region;
            employee.duty = employee.responsibility;
            employee.remarks = employee.notes;
            employee.note = employee.notes;
            employee.primaryWork = employee.mainDuty;
            
            employeeData.push(employee);
            processedCount++;
            
            // 진법규 확인을 위한 로그
            if (employee.name === '진법규') {
              console.log('=== 진법규 데이터 성공적으로 처리! ===');
              console.log('원시 셀 데이터:', cellValues);
              console.log('처리된 데이터:', employee);
            }
          } else if (hasJinBeopGyu) {
            console.log('=== 진법규가 포함된 행이지만 이름을 찾지 못함 ===');
            console.log('셀 데이터:', cellValues);
          }
        } catch (error) {
          if (hasJinBeopGyu) {
            console.log('=== 진법규 처리 중 에러 발생 ===');
            console.log('에러:', error);
          }
          errors.push(`Row ${rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
    
    console.log(`HTML 파싱 완료: ${processedCount}명 처리`);
    console.log(`진법규 발견 여부: ${jinBeopGyuFound}`);
    
    // 기존 데이터 가져오기
    const existingEmployeeData = await storage.getEmployeeData();
    
    // 중복 제거 로직 개선 - 더 엄격한 중복 검사
    const createUniqueKey = (emp: any) => {
      // 이름, 생년월일, 입사일, 기관코드 조합으로 더 정확한 중복 판단
      return `${emp.name}-${emp.birthDate || ''}-${emp.hireDate || ''}-${emp.institutionCode || emp.regionCode || ''}-${emp.careerType || emp.angelCode || ''}`;
    };
    
    // 기존 데이터의 고유키 집합 생성
    const existingKeys = new Set(existingEmployeeData.map(createUniqueKey));
    
    // 새로운 데이터에서 중복 제거
    const uniqueNewData = [];
    const newDataKeys = new Set();
    
    for (const employee of employeeData) {
      const key = createUniqueKey(employee);
      if (!existingKeys.has(key) && !newDataKeys.has(key)) {
        uniqueNewData.push(employee);
        newDataKeys.add(key);
      } else {
        console.log(`중복 데이터 제외: ${employee.name} (${key})`);
      }
    }
    
    console.log(`중복 제거 후: ${uniqueNewData.length}명 (원본: ${employeeData.length}명)`);
    
    // 기존 데이터와 새 데이터 병합
    const mergedData = [...existingEmployeeData, ...uniqueNewData];
    await storage.saveEmployeeData(mergedData);
    
    res.json({
      message: "Employee file processed successfully",
      count: uniqueNewData.length,
      total: mergedData.length,
      active: mergedData.filter(emp => emp.isActive).length,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        totalRows: rows.length,
        processedCount,
        originalCount: employeeData.length,
        uniqueNewCount: uniqueNewData.length,
        jinBeopGyuFound,
        sampleData: uniqueNewData.slice(0, 2)
      }
    });
  }

  // 기존 Excel 파일 처리 함수
  // 개선된 HTML 파일 처리 함수 (헤더 기반)
  async function handleImprovedHtmlEmployeeUpload(req: any, res: any, htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    
    console.log('=== 개선된 HTML 파싱 시작 (헤더 기반) ===');
    
    // 테이블 찾기
    const tables = $('table');
    if (tables.length === 0) {
      throw new Error('HTML에서 테이블을 찾을 수 없습니다.');
    }
    
    // 가장 큰 테이블 선택
    let largestTable = tables.first();
    let maxRows = 0;
    
    tables.each((i, table) => {
      const rowCount = $(table).find('tr').length;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        largestTable = $(table);
      }
    });
    
    const rows = largestTable.find('tr');
    console.log(`선택된 테이블: ${maxRows}행`);
    
    // 헤더 행 찾기
    let headerRow = null;
    let headerIndex = -1;
    let columnMapping = {};
    
    // 첫 몇 행에서 헤더 찾기 - 더 정교한 분석
    console.log('=== 헤더 검색 분석 ===');
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const row = rows.eq(i);
      const cells = row.find('td, th');
      const cellTexts = [];
      
      cells.each((j, cell) => {
        cellTexts.push($(cell).text().trim());
      });
      
      console.log(`행 ${i}: [${cellTexts.slice(0, 8).join(', ')}${cellTexts.length > 8 ? '...' : ''}] (총 ${cellTexts.length}개)`);
      
      // 헤더로 보이는 행인지 확인 - 더 엄격한 조건
      const hasNameHeader = cellTexts.some(text => 
        text.includes('성명') || text.includes('이름')
      );
      
      const hasRegionData = cellTexts.some(text => 
        text.includes('경상남도') || text.includes('경기도') || text.includes('서울')
      );
      
      const hasInstitutionCode = cellTexts.some(text => 
        /^A\d+/.test(text) // A로 시작하는 기관코드 패턴
      );
      
      console.log(`  체크: 성명=${hasNameHeader}, 지역데이터=${hasRegionData}, 기관코드=${hasInstitutionCode}`);
      
      // 헤더 조건을 더 관대하게: 성명 헤더만 있으면 일단 후보로 고려
      if (hasNameHeader && cellTexts.length >= 5) {
        console.log(`*** 헤더 후보 발견! 행 ${i}:`, cellTexts);
        console.log(`    컬럼수: ${cellTexts.length}, 성명위치 예상: ${cellTexts.findIndex(t => t.includes('성명'))}`);
        
        // 첫 번째 성명 헤더를 찾은 경우 사용
        if (!headerRow) {
          headerRow = cellTexts;
          headerIndex = i;
          console.log('헤더 발견:', headerRow);
        
        // 컬럼 매핑 생성
        cellTexts.forEach((header, index) => {
          const cleanHeader = header.toLowerCase().trim();
          
          if (cleanHeader.includes('성명') || cleanHeader.includes('이름')) {
            columnMapping.name = index;
          } else if (cleanHeader.includes('광역시') || cleanHeader.includes('시도')) {
            columnMapping.region = index;
          } else if (cleanHeader.includes('지자체') || cleanHeader.includes('시군구')) {
            columnMapping.district = index;
          } else if (cleanHeader.includes('광역코드')) {
            columnMapping.regionCode = index;
          } else if (cleanHeader.includes('광역명')) {
            columnMapping.regionName = index;
          } else if (cleanHeader.includes('기관코드')) {
            columnMapping.institutionCode = index;
          } else if (cleanHeader.includes('직무구분') || cleanHeader.includes('직무')) {
            columnMapping.jobType = index;
          } else if (cleanHeader.includes('담당업무') || cleanHeader.includes('업무')) {
            columnMapping.responsibility = index;
          } else if (cleanHeader.includes('경력구분') || cleanHeader.includes('경력')) {
            columnMapping.careerType = index;
          } else if (cleanHeader.includes('엔젤코드')) {
            columnMapping.angelCode = index;
          } else if (cleanHeader.includes('생년월일')) {
            columnMapping.birthDate = index;
          } else if (cleanHeader.includes('성별')) {
            columnMapping.gender = index;
          } else if (cleanHeader.includes('입사일')) {
            columnMapping.hireDate = index;
          } else if (cleanHeader.includes('퇴사일')) {
            columnMapping.resignDate = index;
          } else if (cleanHeader.includes('비고')) {
            columnMapping.notes = index;
          } else if (cleanHeader.includes('배움터') || cleanHeader.includes('id')) {
            columnMapping.learningId = index;
          } else if (cleanHeader.includes('수정일')) {
            columnMapping.modifiedDate = index;
          } else if (cleanHeader.includes('담당업무')) {
            columnMapping.mainDuty = index; // 담당업무를 mainDuty에 매핑
          } else if (cleanHeader.includes('주요업무')) {
            // 주요업무는 별도 처리하지 않음
          }
        });
        
        break;
        }
      }
    }
    
    if (!headerRow || columnMapping.name === undefined) {
      throw new Error('성명 헤더를 찾을 수 없습니다. 헤더가 있는 HTML 파일인지 확인해주세요.');
    }
    
    console.log('컬럼 매핑:', columnMapping);
    
    // 데이터 행 처리
    const employeeData = [];
    let processedCount = 0;
    let jinBeopGyuFound = false;
    let yukEunJongFound = false;
    
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows.eq(i);
      const cells = row.find('td');
      
      if (cells.length < 3) continue;
      
      const cellValues = [];
      cells.each((j, cell) => {
        cellValues.push($(cell).text().trim());
      });
      
      // 헤더와 데이터 컬럼 수가 다른 경우 동적 매핑 적용
      let name = '';
      let actualNameIndex = -1;
      
      if (headerRow && headerRow.length !== cellValues.length) {
        // 컬럼 수가 다른 경우: 실제 이름 위치 찾기 (지역명 제외)
        actualNameIndex = cellValues.findIndex(cell => {
          const trimmed = cell.trim();
          return trimmed && 
            trimmed.length >= 2 && trimmed.length <= 4 && 
            /^[가-힣]+$/.test(trimmed) &&
            // 지역명 제외
            !trimmed.includes('경상남도') && !trimmed.includes('경기도') && 
            !trimmed.includes('서울') && !trimmed.includes('부산') &&
            !trimmed.endsWith('시') && !trimmed.endsWith('군') && !trimmed.endsWith('구') &&
            !trimmed.includes('광역') && !trimmed.includes('특별') &&
            // 기관코드 제외
            !/^[A-Z]\d+/.test(trimmed) && !/^P\d+/.test(trimmed) &&
            // 직무구분 제외
            !trimmed.includes('전담') && !trimmed.includes('생활지원') && !trimmed.includes('선임') &&
            // 업무구분 제외
            !trimmed.includes('일반') && !trimmed.includes('중점') && !trimmed.includes('및') && 
            !trimmed.includes('특화') &&
            // 기타 제외
            !trimmed.includes('년이상') && !trimmed.includes('미만')
        });
        
        if (actualNameIndex >= 0) {
          name = cellValues[actualNameIndex];
          console.log(`동적 매핑: ${name} (위치 ${actualNameIndex})`);
        } else {
          // 특화가 이름 자리에 있는 경우 특별 처리
          const namePosition = columnMapping.name || 2;
          if (cellValues[namePosition] === '특화' && cellValues[namePosition + 1]) {
            const nextCell = cellValues[namePosition + 1].trim();
            if (nextCell.length >= 2 && nextCell.length <= 4 && /^[가-힣]+$/.test(nextCell)) {
              name = nextCell;
              actualNameIndex = namePosition + 1;
              console.log(`특화 밀림 보정: ${name} (위치 ${actualNameIndex})`);
            }
          }
        }
      } else {
        // 컬럼 수가 같은 경우: 기존 헤더 매핑 사용
        name = cellValues[columnMapping.name] || '';
      }
      
      // 육은종 특별 추적
      if (cellValues.join('|').includes('육은종')) {
        console.log('=== 육은종 포함 행 발견! ===');
        console.log('셀 데이터:', cellValues);
        console.log('헤더 컬럼수:', headerRow?.length || 0, 'vs 데이터 컬럼수:', cellValues.length);
        console.log('이름 인덱스 (헤더기준):', columnMapping.name);
        console.log('추출된 이름:', name);
        
        // 실제 육은종 위치 찾기
        const actualNameIndex = cellValues.findIndex(cell => cell.trim() === '육은종');
        console.log('실제 육은종 위치:', actualNameIndex);
        
        if (actualNameIndex >= 0) {
          console.log('*** 동적 매핑 적용: 육은종 위치 기준으로 컬럼 재조정');
          // 육은종이 실제로 있는 위치를 이름 컬럼으로 사용
          const correctedName = cellValues[actualNameIndex];
          console.log('보정된 이름:', correctedName);
          
          // 임시로 올바른 데이터로 처리
          if (correctedName === '육은종') {
            const correctedEmployee = {
              id: `employee_${Date.now()}_${Math.random().toString(36).substring(2)}`,
              name: correctedName,
              region: cellValues[0] || '',
              district: cellValues[1] || '',
              regionCode: cellValues[2] || '',
              regionName: cellValues[3] || '',
              institutionCode: cellValues[4] || '',
              jobType: cellValues[5] || '',
              responsibility: cellValues[6] || '',
              careerType: cellValues[actualNameIndex + 1] || '',
              birthDate: cellValues[actualNameIndex + 2] || '',
              gender: cellValues[actualNameIndex + 3] || '',
              hireDate: cellValues[actualNameIndex + 4] || '',
              resignDate: cellValues[actualNameIndex + 5] || '',
              notes: '',
              learningId: '',
              modifiedDate: '',
              mainDuty: '',
              angelCode: '',
              institution: cellValues[3] || '',
              province: cellValues[0] || '',
              duty: cellValues[6] || '',
              remarks: '',
              note: '',
              primaryWork: '',
              isActive: !cellValues[actualNameIndex + 5] || cellValues[actualNameIndex + 5].trim() === '',
              workDays: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            employeeData.push(correctedEmployee);
            processedCount++;
            yukEunJongFound = true;
            console.log('*** 육은종 성공적으로 처리됨!', correctedEmployee);
          }
        }
      }
      
      if (!name || name.length < 2 || name.length > 10 || !/^[가-힣]+$/.test(name)) {
        continue;
      }
      
      // 동적 매핑이 적용된 경우 해당 위치 기준으로 데이터 추출
      let employee;
      if (actualNameIndex >= 0) {
        // 특화 밀림 보정인지 확인
        const isSpecializedShift = cellValues[columnMapping.name || 2] === '특화';
        const dutyValue = isSpecializedShift ? '특화' : (cellValues[6] || '');
        
        // 동적 매핑으로 생성
        employee = {
          id: `employee_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          name: name,
          region: cellValues[0] || '',
          district: cellValues[1] || '',
          regionCode: cellValues[2] || '',
          regionName: cellValues[3] || '',
          institutionCode: cellValues[4] || '',
          jobType: cellValues[5] || '',
          responsibility: dutyValue,
          careerType: cellValues[actualNameIndex + 1] || '',
          birthDate: cellValues[actualNameIndex + 2] || '',
          gender: cellValues[actualNameIndex + 3] || '',
          hireDate: cellValues[actualNameIndex + 4] || '',
          resignDate: cellValues[actualNameIndex + 5] || '',
          notes: cellValues[actualNameIndex + 6] || '',
          learningId: cellValues[actualNameIndex + 7] || '',
          modifiedDate: cellValues[actualNameIndex + 8] || '',
          mainDuty: dutyValue,
          angelCode: '',
          institution: cellValues[3] || '',
          province: cellValues[0] || '',
          duty: dutyValue,
          remarks: cellValues[actualNameIndex + 6] || '',
          note: cellValues[actualNameIndex + 6] || '',
          primaryWork: cellValues[actualNameIndex + 9] || '',
          isActive: !cellValues[actualNameIndex + 5] || cellValues[actualNameIndex + 5].trim() === '',
          workDays: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        // 기존 헤더 매핑으로 생성
        const resignDate = columnMapping.resignDate !== undefined ? (cellValues[columnMapping.resignDate] || '') : '';
        
        employee = {
        id: `employee_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        name: name,
        region: columnMapping.region !== undefined ? (cellValues[columnMapping.region] || '') : '',
        district: columnMapping.district !== undefined ? (cellValues[columnMapping.district] || '') : '',
        regionCode: columnMapping.regionCode !== undefined ? (cellValues[columnMapping.regionCode] || '') : '',
        regionName: columnMapping.regionName !== undefined ? (cellValues[columnMapping.regionName] || '') : '',
        institutionCode: columnMapping.institutionCode !== undefined ? (cellValues[columnMapping.institutionCode] || '') : '',
        jobType: columnMapping.jobType !== undefined ? (cellValues[columnMapping.jobType] || '') : '',
        responsibility: columnMapping.responsibility !== undefined ? (cellValues[columnMapping.responsibility] || '') : '',
        careerType: columnMapping.careerType !== undefined ? (cellValues[columnMapping.careerType] || '') : '',
        angelCode: columnMapping.angelCode !== undefined ? (cellValues[columnMapping.angelCode] || '') : '',
        birthDate: columnMapping.birthDate !== undefined ? (cellValues[columnMapping.birthDate] || '') : '',
        gender: columnMapping.gender !== undefined ? (cellValues[columnMapping.gender] || '') : '',
        hireDate: columnMapping.hireDate !== undefined ? (cellValues[columnMapping.hireDate] || '') : '',
        resignDate: resignDate,
        notes: columnMapping.notes !== undefined ? (cellValues[columnMapping.notes] || '') : '',
        learningId: columnMapping.learningId !== undefined ? (cellValues[columnMapping.learningId] || '') : '',
        modifiedDate: columnMapping.modifiedDate !== undefined ? (cellValues[columnMapping.modifiedDate] || '') : '',
        mainDuty: columnMapping.mainDuty !== undefined ? (cellValues[columnMapping.mainDuty] || '') : '',
        
        // 추가 필드들
        institution: columnMapping.regionName !== undefined ? (cellValues[columnMapping.regionName] || '') : '',
        province: columnMapping.region !== undefined ? (cellValues[columnMapping.region] || '') : '',
        duty: columnMapping.responsibility !== undefined ? (cellValues[columnMapping.responsibility] || '') : '',
        remarks: columnMapping.notes !== undefined ? (cellValues[columnMapping.notes] || '') : '',
        note: columnMapping.notes !== undefined ? (cellValues[columnMapping.notes] || '') : '',
        primaryWork: columnMapping.mainDuty !== undefined ? (cellValues[columnMapping.mainDuty] || '') : '',
        
        // 상태 계산 (퇴사일이 없으면 재직)
        isActive: !resignDate || resignDate.trim() === '',
        workDays: 0,
        createdAt: new Date(),
        updatedAt: new Date()
        };
      }
      
      employeeData.push(employee);
      processedCount++;
      
      // 특정 이름 확인
      if (name === '진법규') {
        jinBeopGyuFound = true;
        console.log('=== 진법규 발견! ===');
        console.log('데이터:', employee);
      }
      
      if (name === '육은종') {
        yukEunJongFound = true;
        console.log('=== 육은종 발견! ===');
        console.log('데이터:', employee);
      }
    }
    
    console.log(`헤더 기반 파싱 완료: ${processedCount}명 처리`);
    console.log(`진법규 발견 여부: ${jinBeopGyuFound}`);
    console.log(`육은종 발견 여부: ${yukEunJongFound}`);
    
    // 육은종이 발견되지 않았을 때 추가 분석
    if (!yukEunJongFound) {
      console.log('\n=== 육은종 미발견 원인 분석 ===');
      console.log('1. 컬럼 매핑 확인:', columnMapping);
      console.log('2. 이름 컬럼 인덱스:', columnMapping.name);
      
      // 전체 테이블에서 '육은종' 검색
      console.log('3. 전체 테이블에서 육은종 검색 중...');
      const allRows = largestTable.find('tr');
      let foundInRawTable = false;
      
      allRows.each((i, row) => {
        const rowText = $(row).text();
        if (rowText.includes('육은종')) {
          foundInRawTable = true;
          console.log(`   - 행 ${i}에서 발견: ${rowText.trim()}`);
          
          const cells = $(row).find('td, th');
          const cellValues = [];
          cells.each((j, cell) => {
            cellValues.push($(cell).text().trim());
          });
          console.log(`   - 셀 분해:`, cellValues);
        }
      });
      
      if (!foundInRawTable) {
        console.log('   - 전체 테이블에서 육은종을 찾을 수 없음');
      }
    }
    
    // 기존 데이터 가져오기
    const existingEmployeeData = await storage.getEmployeeData();
    
    // 중복 제거 로직
    const createUniqueKey = (emp: any) => {
      return `${emp.name}-${emp.birthDate || ''}-${emp.hireDate || ''}-${emp.institutionCode || emp.regionCode || ''}-${emp.careerType || emp.angelCode || ''}`;
    };
    
    const existingKeys = new Set(existingEmployeeData.map(createUniqueKey));
    const uniqueNewData = [];
    const newDataKeys = new Set();
    
    for (const employee of employeeData) {
      const key = createUniqueKey(employee);
      if (!existingKeys.has(key) && !newDataKeys.has(key)) {
        uniqueNewData.push(employee);
        newDataKeys.add(key);
      } else {
        console.log(`중복 데이터 제외: ${employee.name} (${key})`);
      }
    }
    
    console.log(`중복 제거 후: ${uniqueNewData.length}명 (원본: ${employeeData.length}명)`);
    
    // 기존 데이터와 새 데이터 병합
    const mergedData = [...existingEmployeeData, ...uniqueNewData];
    await storage.saveEmployeeData(mergedData);
    
    res.json({
      message: "Employee file processed successfully (Header-based parsing)",
      count: uniqueNewData.length,
      total: mergedData.length,
      active: mergedData.filter(emp => emp.isActive).length,
      foundTargets: {
        jinBeopGyu: jinBeopGyuFound,
        yukEunJong: yukEunJongFound
      },
      debug: {
        totalRows: rows.length,
        headerIndex: headerIndex,
        columnMapping: columnMapping,
        processedCount: processedCount,
        duplicatesRemoved: employeeData.length - uniqueNewData.length
      }
    });
  }

  async function handleExcelEmployeeUpload(req: any, res: any) {
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', raw: true, cellText: false });
        
      let processedCount = 0;
      const errors: string[] = [];
      const employeeData: any[] = [];
      
      console.log('\n=== 종사자 데이터 업로드 분석 ===');
      console.log('워크북 시트 목록:', workbook.SheetNames);
      
      // 모든 시트를 검사하여 데이터가 가장 많은 시트 찾기
      let bestSheet = '';
      let maxRows = 0;
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const rowCount = range.e.r - range.s.r + 1;
        console.log(`시트 "${sheetName}": ${rowCount}행`);
        
        if (rowCount > maxRows) {
          maxRows = rowCount;
          bestSheet = sheetName;
        }
      }
      
      console.log(`선택된 시트: "${bestSheet}" (${maxRows}행)`);
      
      const worksheet = workbook.Sheets[bestSheet];
      
      // 배열 형태로 읽어서 헤더를 수동으로 처리
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        raw: true,
        defval: '',
        blankrows: false
      });
      
      console.log('전체 행 수:', rawData.length);
      console.log('\n모든 행 데이터:');
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        console.log(`행 ${i} (${row ? row.length : 0}열):`, row);
      }
      
      // 시트에 더 많은 데이터가 있는지 직접 확인
      console.log('\n=== 시트 범위 재확인 ===');
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log(`실제 시트 범위: ${worksheet['!ref']}`);
      console.log(`시작: 행${range.s.r+1}, 열${range.s.c+1}`);
      console.log(`끝: 행${range.e.r+1}, 열${range.e.c+1}`);
      console.log(`총 행 수: ${range.e.r - range.s.r + 1}`);
      console.log(`총 열 수: ${range.e.c - range.s.c + 1}`);
      
      // 원시 셀 데이터 확인
      console.log('\n=== 원시 셀 데이터 샘플 ===');
      for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
        const rowData = [];
        for (let c = range.s.c; c <= Math.min(range.s.c + 10, range.e.c); c++) {
          const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
          const cell = worksheet[cellAddress];
          rowData.push(cell ? cell.v || cell.w || cell.t : null);
        }
        console.log(`원시 행 ${r}:`, rowData);
      }

      // 교육 업로드처럼 헤더 찾기 - 더 유연한 검색
      console.log('\n=== 헤더 행 검색 ===');
      let headerRowIndex = -1;
      let sectionType = '';
      
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (Array.isArray(row) && row.length > 3) {
          const rowStr = row.join('').toLowerCase();
          console.log(`행 ${i} 검사: "${rowStr}"`);
          
          // 전담사회복지사 헤더 찾기 - 간단한 조건
          if (rowStr.includes('성명') && rowStr.includes('경력구분')) {
            headerRowIndex = i;
            sectionType = '전담사회복지사';
            console.log(`전담사회복지사 헤더 발견: 행 ${i}`);
            console.log('헤더 내용:', row);
            break;
          }
          // 생활지원사 헤더 찾기 (다음 단계에서 처리)
          else if (rowStr.includes('성명') && rowStr.includes('엔젤')) {
            headerRowIndex = i;
            sectionType = '생활지원사';
            console.log(`생활지원사 헤더 발견: 행 ${i}`);
            console.log('헤더 내용:', row);
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        // 헤더를 찾지 못한 경우 더 넓은 범위로 검색
        console.log('\n=== 확장 헤더 검색 ===');
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (Array.isArray(row) && row.length > 2) {
            // 단순히 이름이나 기관이 포함된 행 찾기
            const hasNameField = row.some(cell => 
              cell && cell.toString().toLowerCase().includes('이름')
            );
            const hasInstitutionField = row.some(cell => 
              cell && cell.toString().toLowerCase().includes('기관')
            );
            
            if (hasNameField || hasInstitutionField) {
              headerRowIndex = i;
              sectionType = '전담사회복지사';
              console.log(`확장 검색으로 헤더 발견: 행 ${i}`);
              console.log('헤더 내용:', row);
              break;
            }
          }
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('헤더 행을 찾을 수 없습니다. 파일 구조를 확인해주세요.');
      }
      
      // 두 행의 헤더를 합쳐서 처리 (종사자 데이터는 2행 헤더 구조)
      const header1 = rawData[0] || []; // 첫 번째 헤더 행 (광역시, 지자체, 광역코드 등)
      const header2 = rawData[1] || []; // 두 번째 헤더 행 (직무구분, 담당업무, 성명 등)
      
      console.log('\n=== 헤더 분석 (2행 구조) ===');
      console.log('첫 번째 헤더:', header1);
      console.log('두 번째 헤더:', header2);
      
      // 두 헤더를 결합하여 완전한 헤더 생성
      const combinedHeaders = [];
      const maxLength = Math.max(header1.length, header2.length);
      
      for (let i = 0; i < maxLength; i++) {
        const h1 = header1[i] ? header1[i].toString().trim() : '';
        const h2 = header2[i] ? header2[i].toString().trim() : '';
        
        // 두 번째 헤더가 비어있지 않으면 두 번째 헤더 사용
        // 그렇지 않으면 첫 번째 헤더 사용
        let finalHeader = '';
        if (h2 && h2 !== '') {
          finalHeader = h2;
        } else if (h1 && h1 !== '') {
          finalHeader = h1;
        } else {
          finalHeader = `col_${i}`;
        }
        
        combinedHeaders.push(finalHeader);
        console.log(`헤더 ${i}: "${h1}" + "${h2}" = "${finalHeader}"`);
      }
      
      console.log('결합된 헤더:', combinedHeaders);
      const cleanHeaders = combinedHeaders;
      
      // 전체 데이터 처리 - 모든 섹션을 순차적으로 처리
      const allData = [];
      let currentHeaders = cleanHeaders;
      let currentSectionType = sectionType;
      let i = 2; // 2행 헤더 다음부터 시작
      
      console.log(`\n=== 첫 번째 섹션 (${currentSectionType}) 처리 시작 ===`);
      
      while (i < rawData.length) {
        const row = rawData[i];
        if (!row || row.length === 0) {
          i++;
          continue;
        }
        
        const rowStr = row.join('').toLowerCase();
        
        // 새로운 섹션 헤더 확인 (생활지원사 섹션)
        if (rowStr.includes('생활지원사') && 
            (rowStr.includes('이름') || rowStr.includes('성명'))) {
          console.log(`\n=== 생활지원사 섹션 발견: 행 ${i} ===`);
          currentSectionType = '생활지원사';
          
          // 생활지원사 헤더 처리 (현재 행과 다음 행이 헤더일 수 있음)
          const lifeHeader1 = rawData[i] || [];
          const lifeHeader2 = rawData[i + 1] || [];
          
          console.log('생활지원사 첫 번째 헤더:', lifeHeader1);
          console.log('생활지원사 두 번째 헤더:', lifeHeader2);
          
          // 생활지원사 헤더 결합
          const lifeCombinedHeaders = [];
          const lifeMaxLength = Math.max(lifeHeader1.length, lifeHeader2.length);
          
          for (let j = 0; j < lifeMaxLength; j++) {
            const h1 = lifeHeader1[j] ? lifeHeader1[j].toString().trim() : '';
            const h2 = lifeHeader2[j] ? lifeHeader2[j].toString().trim() : '';
            
            let finalHeader = '';
            if (h2 && h2 !== '') {
              finalHeader = h2;
            } else if (h1 && h1 !== '') {
              finalHeader = h1;
            } else {
              finalHeader = `col_${j}`;
            }
            
            lifeCombinedHeaders.push(finalHeader);
          }
          
          currentHeaders = lifeCombinedHeaders;
          console.log('생활지원사 결합된 헤더:', currentHeaders);
          
          // 헤더 행들을 건너뛰고 데이터 행부터 처리
          i += 2;
          continue;
        }
        
        // 빈 헤더 행이나 구분선 건너뛰기
        if (rowStr.includes('광역시') || rowStr.includes('직무구분') || 
            rowStr.includes('---') || rowStr.trim() === '') {
          i++;
          continue;
        }
        
        // 데이터 행 처리
        const obj = {};
        currentHeaders.forEach((header, index) => {
          if (row[index] !== undefined && row[index] !== null) {
            const value = row[index].toString().trim();
            obj[header] = value;
          }
        });
        
        // 의미있는 데이터가 있는지 확인
        const hasData = Object.values(obj).some(value => 
          value && value.toString().trim().length > 0
        );
        
        if (hasData) {
          obj._sectionType = currentSectionType; // 섹션 정보 저장
          allData.push(obj);
        }
        
        i++;
      }
      
      const data = allData;
      
      console.log(`\n=== ${sectionType} 데이터 처리 ===`);
      console.log(`추출된 데이터 행 수: ${data.length}`);
      
      if (data.length > 0) {
        console.log('첫 번째 데이터 샘플:', JSON.stringify(data[0], null, 2));
      }
      
      // 헤더 기반으로 데이터 처리
      for (const [index, row] of data.entries()) {
        try {
          // 헤더 기반으로 필드 찾기
          let name = '';
          let institutionCode = '';
          let institution = '';
          let birthDate = '';
          let gender = '';
          let hireDate = '';
          let resignDate = '';
          let careerType = '';
          let notes = '';
          let angelCode = '';
          
          // 헤더명으로 데이터 추출
          for (const [headerName, value] of Object.entries(row)) {
            if (!value || value === '') continue;
            
            const header = headerName.toLowerCase();
            const cellValue = value.toString().trim();
            
            // 이름 필드
            if (header.includes('이름') || header.includes('성명')) {
              // 한국 이름 패턴 확인
              if (cellValue.length >= 2 && cellValue.length <= 4 && 
                  /^[가-힣]+$/.test(cellValue)) {
                const commonSurnames = [
                  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', 
                  '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '백', '허', 
                  '유', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '원', '탁', '연', 
                  '방', '남궁', '제갈', '선우', '독고', '육', '마', '변', '사', '소', '엄', '공',
                  '예', '현', '봉', '가', '강전', '설', '당', '목', '도', '견', '연성', '기', '석', '로'
                ];
                
                if (commonSurnames.some(surname => cellValue.startsWith(surname))) {
                  name = cellValue;
                }
              }
            }
            // 기관코드
            else if (header.includes('기관코드') || header.includes('코드')) {
              if (/^A48\d{5,6}$/.test(cellValue)) {
                institutionCode = cellValue;
              }
            }
            // 기관명
            else if (header.includes('기관') || header.includes('시설')) {
              if (cellValue.length > 3 && 
                  (cellValue.includes('센터') || cellValue.includes('기관') || 
                   cellValue.includes('원') || cellValue.includes('복지관'))) {
                institution = cellValue;
              }
            }
            // 생년월일
            else if (header.includes('생년월일') || header.includes('출생')) {
              if (cellValue.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/) || 
                  cellValue.match(/^\d{8}$/)) {
                let dateValue = cellValue;
                if (/^\d{8}$/.test(cellValue)) {
                  dateValue = `${cellValue.substring(0,4)}-${cellValue.substring(4,6)}-${cellValue.substring(6,8)}`;
                }
                birthDate = dateValue.replace(/[/.]/g, '-');
              }
            }
            // 성별
            else if (header.includes('성별')) {
              if (cellValue === '남' || cellValue === '여') {
                gender = cellValue;
              }
            }
            // 입사일
            else if (header.includes('입사') || header.includes('채용')) {
              if (cellValue.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/) || 
                  cellValue.match(/^\d{8}$/)) {
                let dateValue = cellValue;
                if (/^\d{8}$/.test(cellValue)) {
                  dateValue = `${cellValue.substring(0,4)}-${cellValue.substring(4,6)}-${cellValue.substring(6,8)}`;
                }
                hireDate = dateValue.replace(/[/.]/g, '-');
              }
            }
            // 퇴사일
            else if (header.includes('퇴사') || header.includes('퇴직')) {
              if (cellValue.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/) || 
                  cellValue.match(/^\d{8}$/)) {
                let dateValue = cellValue;
                if (/^\d{8}$/.test(cellValue)) {
                  dateValue = `${cellValue.substring(0,4)}-${cellValue.substring(4,6)}-${cellValue.substring(6,8)}`;
                }
                resignDate = dateValue.replace(/[/.]/g, '-');
              }
            }
            // 경력
            else if (header.includes('경력') || header.includes('근무')) {
              if (/\d+년/.test(cellValue) || 
                  ['신규', '기타', '경력', '신규자', '경력자'].includes(cellValue)) {
                careerType = cellValue;
              }
            }
            // 비고 (정확한 매칭)
            else if (header === '비고') {
              notes = cellValue;
              console.log(`비고 필드 발견: "${cellValue}"`);
            }
            // 엔젤코드
            else if (header.includes('엔젤') || header.includes('angel')) {
              if (/^[a-zA-Z0-9]+$/.test(cellValue) && cellValue.length >= 3) {
                angelCode = cellValue;
              }
            }
          }
          
          // 이름이 있는 경우에만 처리
          if (name) {
            console.log(`\n데이터 ${index + 1}: 이름 = "${name}"`);
            console.log(`기관: ${institution}, 코드: ${institutionCode}`);
            console.log(`생년월일: ${birthDate}, 성별: ${gender}`);
            console.log(`입사일: ${hireDate}, 퇴사일: ${resignDate}`);
            
            // 추가 필드들을 헤더 기반으로 추출
            let region = '';
            let district = '';
            let regionCode = '';
            let regionName = '';
            let responsibility = '';
            let learningId = '';
            let modifiedDate = '';
            let mainDuty = '';
            
            // 헤더명으로 추가 데이터 추출
            for (const [headerName, value] of Object.entries(row)) {
              if (!value || value === '') continue;
              
              const header = headerName.toLowerCase();
              const cellValue = value.toString().trim();
              
              if (header.includes('광역시') || header.includes('시도')) {
                region = cellValue;
              } else if (header.includes('지자체') || header.includes('시군구')) {
                district = cellValue;
              } else if (header.includes('광역코드')) {
                regionCode = cellValue;
              } else if (header.includes('광역명')) {
                regionName = cellValue;
              } else if (header.includes('수행기관코드')) {
                if (!institutionCode) institutionCode = cellValue;
              } else if (header === '담당업무') {
                responsibility = cellValue;
                mainDuty = cellValue; // 담당업무를 mainDuty에도 매핑
              } else if (header.includes('배움터') && header.includes('id')) {
                learningId = cellValue;
              } else if (header.includes('수정일')) {
                modifiedDate = cellValue;
              } else if (header === '주요업무') {
                // 주요업무는 별도로 처리하지 않고 담당업무를 우선
              }
            }

            // 모든 원본 헤더 데이터를 보존하면서 주요 필드들을 추출
            const employee = {
              id: `employee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: name,
              institution: institution || '',
              institutionCode: institutionCode || '',
              jobType: sectionType, // 현재 섹션 타입으로 설정
              careerType: careerType || '',
              angelCode: angelCode || '',
              birthDate: birthDate || '',
              gender: gender || '',
              hireDate: hireDate || '',
              resignDate: resignDate || '',
              isActive: !resignDate,
              workDays: 0,
              notes: notes || '',
              // 추가 필드들
              region: region || '',
              province: region || '',
              district: district || '',
              regionCode: regionCode || '',
              regionName: regionName || institution || '',
              responsibility: responsibility || '',
              duty: responsibility || '',
              learningId: learningId || '',
              modifiedDate: modifiedDate || '',
              mainDuty: mainDuty || '',
              primaryWork: mainDuty || '',
              remarks: notes || '',
              note: notes || '',
            };
            
            console.log('생성된 직원 데이터:', employee);
            employeeData.push(employee);
            processedCount++;
          }
          
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`행 ${index + 1} 처리 오류:`, error);
        }
      }


      console.log(`\n총 처리된 종사자 수: ${processedCount}`);
      console.log('처리된 종사자 샘플:', employeeData.slice(0, 3));

      // 기존 데이터 가져오기
      const existingEmployeeData = await storage.getEmployeeData();
      
      // 중복 제거 로직 - 이름, 기관코드, 입사일, 퇴사일 조합으로 고유성 판단
      // 같은 이름이어도 다른 근무 이력은 별도로 관리
      const createUniqueKey = (emp: any) => {
        const resignStatus = emp.resignDate ? 'resigned' : 'active';
        return `${emp.name}-${emp.institutionCode || emp.regionCode || ''}-${emp.hireDate || ''}-${emp.angelCode || emp.careerType || ''}-${resignStatus}-${emp.resignDate || ''}`;
      };
      
      // 기존 데이터의 고유키 집합 생성
      const existingKeys = new Set(existingEmployeeData.map(createUniqueKey));
      
      // 새로운 데이터에서 중복 제거
      const uniqueNewData = [];
      const newDataKeys = new Set();
      
      for (const employee of employeeData) {
        const key = createUniqueKey(employee);
        if (!existingKeys.has(key) && !newDataKeys.has(key)) {
          uniqueNewData.push(employee);
          newDataKeys.add(key);
        } else {
          console.log(`중복 데이터 제외: ${employee.name} (${key})`);
        }
      }
      
      console.log(`중복 제거 후: ${uniqueNewData.length}명 (원본: ${employeeData.length}명)`);
      
      // 기존 데이터와 새 데이터 병합
      const mergedData = [...existingEmployeeData, ...uniqueNewData];
      await storage.saveEmployeeData(mergedData);

      res.json({
        message: "Employee file processed successfully",
        count: uniqueNewData.length,
        total: mergedData.length,
        active: mergedData.filter(emp => emp.isActive).length,
        errors: errors.length > 0 ? errors : undefined,
        debug: {
          totalRows: rawData.length,
          processedCount,
          originalCount: employeeData.length,
          uniqueNewCount: uniqueNewData.length,
          sampleData: uniqueNewData.slice(0, 2)
        }
      });
    } catch (error) {
      console.error("Employee upload error:", error);
      res.status(500).json({ 
        error: "Failed to process employee file",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Institution data upload route
  app.post("/api/institutions/upload", upload.single('file'), async (req, res) => {
    try {
      console.log('=== 기관 데이터 업로드 시작 ===');
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      console.log('시트 이름들:', workbook.SheetNames);
      
      // 모든 시트를 확인하여 가장 적합한 시트를 자동으로 선택
      let data: any[] = [];
      let selectedSheet = '';
      let maxDataCount = 0;
      
      console.log('모든 시트에서 복합 헤더 처리 시도...');
      
      // 모든 시트를 순회하며 가장 많은 데이터가 있는 시트 선택
      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          console.log(`시트 '${sheetName}' 원시 데이터로 읽기: ${rawData.length}개 행`);
          
          if (rawData.length > 3) {
            // 복합 헤더 처리 시도
            const processedData = processComplexHeaders(rawData, sheetName);
            console.log(`시트 '${sheetName}' 복합 헤더 처리 결과: ${processedData.length}개 데이터`);
            
            // 가장 많은 데이터가 있는 시트 선택
            if (processedData.length > maxDataCount) {
              data = processedData;
              selectedSheet = sheetName;
              maxDataCount = processedData.length;
              console.log(`새로운 최적 시트 선택: '${sheetName}' (${processedData.length}개 데이터)`);
            }
          } else {
            // 복합 헤더가 아닌 경우 일반 처리
            const simpleData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`시트 '${sheetName}' 일반 처리 결과: ${simpleData.length}개 데이터`);
            
            if (simpleData.length > maxDataCount) {
              data = simpleData;
              selectedSheet = sheetName;
              maxDataCount = simpleData.length;
              console.log(`새로운 최적 시트 선택 (일반): '${sheetName}' (${simpleData.length}개 데이터)`);
            }
          }
        } catch (error) {
          console.log(`시트 '${sheetName}' 처리 중 오류:`, error);
          continue;
        }
      }
      
      console.log(`최종 선택된 시트: '${selectedSheet}', 총 ${data.length}개 데이터`);
      
      if (data.length === 0) {
        console.log('모든 시트에서 데이터를 찾을 수 없습니다.');
        return res.status(400).json({ error: "파일에서 유효한 데이터를 찾을 수 없습니다." });
      }
      
      
      // 첫 번째 행의 헤더 확인
      if (data.length > 0) {
        console.log('첫 번째 행 헤더:', Object.keys(data[0]));
        console.log('첫 번째 데이터 샘플:', JSON.stringify(data[0], null, 2));
      }

      let processedCount = 0;
      const errors: string[] = [];
      const institutionData: any[] = [];

      for (const row of data as any[]) {
        try {
          // 디버깅: 실제 키 확인
          if (processedCount === 0) {
            console.log('첫 번째 행의 키들:', Object.keys(row).slice(0, 30));
            console.log('첫 번째 행 데이터 샘플:', row);
          }
          
          // 기관 코드로 institutionCodes에서 정보 찾기
          const institutionCode = row['수행기관코드'] || `INST_${processedCount}`;
          const institutionInfo = institutionCodes.find(inst => inst.code === institutionCode);
          
          const institution = {
            id: `institution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            
            // 1. 기관 기본 정보 - institutionCodes 배열 우선, Excel 데이터 fallback
            code: institutionCode,
            name: row['수행기관명'] || institutionInfo?.name || '',
            region: institutionInfo?.region || row['광역시'] || '',
            district: institutionInfo?.district || row['지자체'] || '',
            areaCode: row['광역코드'] || '',
            areaName: row['광역명'] || '',
            contractType: row['수행기관위수탁구분'] || '',
            contractPeriod: row['위수탁기간'] || '',
            manager: row['기관장명'] || '',
            
            // 2. 사업수행연도이력
            year2020: row['2020년'] || '',
            year2021: row['2021년'] || '',
            year2022: row['2022년'] || '',
            year2023: row['2023년'] || '',
            year2024: row['2024년'] || '',
            year2025: row['2025년'] || '',
            
            // 3. 시설 및 서비스 정보
            facilityType: row['시설유형구분'] || '',
            specializedService: row['특화서비스'] || '',
            emergencyService: row['응급안전안심서비스'] || '',
            homeVisitService: row['방문요양서비스'] || '',
            elderlyWelfareService: row['재가노인복지서비스'] || '',
            socialServiceOrg: row['사회서비스원 소속'] || '',
            elderlyJobDispatch: row['사회서비스형 노인일자리 파견 이용'] || '',
            
            // 4. 법인 정보
            operatingOrg: row['수탁법인명'] || '',
            operationType: row['수탁법인번호'] || '',
            consignmentOrg: row['수탁기관 사업자등록번호'] || '',
            institutionId: row['수행기관 고유번호'] || '',
            
            // 5. 주소 정보
            postalCode: row['우편번호'] || '',
            baseAddress: row['주소'] || '',
            deliveryPostalCode: row['배송지우편번호'] || '',
            detailAddress: row['배송지주소'] || '',
            
            // 6. 연락처 정보
            mainContact: row['기관 대표전화'] || '',
            responsibleContact: row['메인 연락처'] || '',
            emergencyContact: row['긴급연락처/핸드폰'] || '',
            faxNumber: row['팩스번호'] || '',
            email: row['이메일'] || '',
            
            // 7. 복지부 배정 인원
            allocatedSocialWorkersGov: parseInt(row['전담사회복지사(배정)_복지부']) || 0,
            allocatedLifeSupportGov: parseInt(row['생활지원사(배정)_복지부']) || 0,
            allocatedTargetsGov: parseInt(row['대상자 ※사후관리 제외(배정)_복지부']) || 0,
            
            // 8. 배정 및 채용 인원
            allocatedSocialWorkers: parseInt(row['전담사회복지사(배정)_기관']) || 0,
            hiredSocialWorkers: parseInt(row['전담사회복지사(채용)_기관']) || 0,
            allocatedLifeSupport: parseInt(row['생활지원사(배정)_기관']) || 0,
            hiredLifeSupport: parseInt(row['생활지원사(채용)_기관']) || 0,
            allocatedTargets: parseInt(row['대상자 ※사후관리 제외(배정)_기관']) || 0,
            providedGeneralIntensive: parseInt(row['대상자 ※사후관리 제외(제공_일반+중점)_기관']) || 0,
            providedGeneral: parseInt(row['대상자 ※사후관리 제외(제공_일반)_기관']) || 0,
            providedIntensive: parseInt(row['대상자 ※사후관리 제외(제공_중점)_기관']) || 0,
            providedSpecialized: parseInt(row['대상자 ※사후관리 제외(제공_특화)_기관']) || 0,
            
            // 9. 지자체 공무원 정보
            officialName: row['성명'] || '',
            officialContact: row['메인 연락처(공무원)'] || '',
            officialEmail: row['이메일(공무원)'] || '',
            
            // 10. 관리 정보
            modifiedDate: row['수정일'] || '',
            registrant: row['등록자'] || '',
            
            // 11. 시스템 정보
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // 디버깅을 위해 기관명 필드 확인
          console.log(`Row ${processedCount + 1} 기관명 후보들:`, {
            '수행기관명': row['수행기관명'],
            '__EMPTY_13': row['__EMPTY_13'],
            '기관명': row['기관명'],
            '기관정보': row['기관정보'],
            '최종 선택된 name': institution.name
          });
          
          // 빈 이름이 아닌 경우만 추가 (또는 수행기관코드가 있으면 추가)
          if ((institution.name && institution.name.trim() !== '') || 
              (institution.code && institution.code.trim() !== '' && institution.code !== `INST_${processedCount}`)) {
            institutionData.push(institution);
            processedCount++;
            
            if (processedCount <= 3) {
              console.log(`기관 ${processedCount}:`, institution);
            }
          } else {
            console.log(`기관 ${processedCount + 1} 스킵됨 - 이름과 코드가 모두 비어있음`);
          }
        } catch (error) {
          errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`총 ${processedCount}개 기관 데이터 처리됨`);
      
      await storage.saveInstitutionData(institutionData);
      
      // 저장 후 확인
      const savedData = await storage.getInstitutionData();
      console.log(`저장 후 기관 데이터 수: ${savedData.length}`);

      res.json({
        message: "Institution file processed successfully",
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('기관 업로드 오류:', error);
      res.status(500).json({ error: "Failed to process institution file" });
    }
  });

  // Education Matching API routes
  app.get("/api/education-matching", async (req, res) => {
    try {
      const participants = await storage.getEducationParticipants();
      const basicEducationData = await storage.getEducationData();
      const advancedEducationData = await storage.getEducationData();
      
      // 기본/심화로 분리 (실제로는 courseType으로 구분해야 함)
      const basicData = basicEducationData.filter(data => 
        data.courseType === '기본' || data.courseType === '법정'
      );
      const advancedData = advancedEducationData.filter(data => 
        data.courseType === '심화' || data.courseType === '특별'
      );
      
      const matchingResults = EducationMatcher.matchEducationWithParticipants(
        participants,
        basicData,
        advancedData
      );
      
      res.json(matchingResults);
    } catch (error) {
      res.status(500).json({ error: "Failed to match education data" });
    }
  });

  app.get("/api/employee-statistics", async (req, res) => {
    try {
      const employees = await storage.getEmployeeData();
      const institutions = await storage.getInstitutionData();
      
      const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(emp => emp.isActive).length,
        socialWorkers: employees.filter(emp => 
          emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')
        ).length,
        lifeSupport: employees.filter(emp => emp.isActive && emp.jobType === '생활지원사').length,
        unknownJobType: employees.filter(emp => emp.isActive && (!emp.jobType || emp.jobType === '')).length,
        totalInstitutions: institutions.length,
        averageEmployeesPerInstitution: institutions.length > 0 ? employees.length / institutions.length : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch employee statistics:', error);
      res.status(500).json({ error: "Failed to fetch employee statistics" });
    }
  });

  app.get("/api/education-statistics", async (req, res) => {
    try {
      const participants = await storage.getEducationParticipants();
      const basicEducationData = await storage.getEducationData();
      const advancedEducationData = await storage.getEducationData();
      
      const basicData = basicEducationData.filter(data => 
        data.courseType === '기본' || data.courseType === '법정'
      );
      const advancedData = advancedEducationData.filter(data => 
        data.courseType === '심화' || data.courseType === '특별'
      );
      
      const matchingResults = EducationMatcher.matchEducationWithParticipants(
        participants,
        basicData,
        advancedData
      );
      
      const statistics = EducationMatcher.calculateEducationStatistics(matchingResults);
      res.json(statistics);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate statistics" });
    }
  });

  app.get("/api/participants/:id/education-status", async (req, res) => {
    try {
      const participantId = req.params.id;
      const participants = await storage.getEducationParticipants();
      const participant = participants.find(p => p.id === participantId);
      
      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }
      
      const basicEducationData = await storage.getEducationData();
      const advancedEducationData = await storage.getEducationData();
      
      const basicData = basicEducationData.filter(data => 
        data.courseType === '기본' || data.courseType === '법정'
      );
      const advancedData = advancedEducationData.filter(data => 
        data.courseType === '심화' || data.courseType === '특별'
      );
      
      const matchingResults = EducationMatcher.matchEducationWithParticipants(
        [participant],
        basicData,
        advancedData
      );
      
      const result = matchingResults[0];
      const progress = EducationMatcher.calculateParticipantProgress(result);
      
      res.json({ ...result, progress });
    } catch (error) {
      res.status(500).json({ error: "Failed to get participant education status" });
    }
  });

  // 통합 연동분석 API
  app.get("/api/integrated-analysis", async (req, res) => {
    try {
      const { IntegratedAnalysisService } = await import('./integrated-analysis');
      const analysisData = await IntegratedAnalysisService.generateAnalysis();
      const summary = IntegratedAnalysisService.calculateSummaryStats(analysisData);
      
      res.json({
        data: analysisData,
        summary: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to generate integrated analysis:', error);
      res.status(500).json({ error: "Failed to generate integrated analysis" });
    }
  });

  // 교육 통계 API 라우트
  
  // 시군별 기관 정보 조회
  app.get("/api/districts", async (req, res) => {
    try {
      const districtInfo = getAllDistrictInfo();
      res.json(districtInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch district information" });
    }
  });

  // 직군별 교육 통계 (기본교육)
  app.get("/api/statistics/basic-education/by-job-type", async (req, res) => {
    try {
      const basicEducationData = await storage.getEducationData();
      const basicData = basicEducationData.filter(item => item.courseType === '기본');
      const stats = calculateEducationStatsByJobType(basicData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate basic education statistics by job type" });
    }
  });

  // 직군별 교육 통계 (심화교육)
  app.get("/api/statistics/advanced-education/by-job-type", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const advancedData = educationData.filter(item => item.courseType === '심화');
      const stats = calculateEducationStatsByJobType(advancedData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate advanced education statistics by job type" });
    }
  });

  // 시군별 교육 현황 통계 (기본교육)
  app.get("/api/statistics/basic-education/by-district", async (req, res) => {
    try {
      const basicEducationData = await storage.getEducationData();
      const basicData = basicEducationData.filter(item => item.courseType === '기본');
      const stats = calculateDistrictStats(basicData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate basic education statistics by district" });
    }
  });

  // 시군별 교육 현황 통계 (심화교육)
  app.get("/api/statistics/advanced-education/by-district", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const advancedData = educationData.filter(item => item.courseType === '심화');
      const stats = calculateDistrictStats(advancedData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate advanced education statistics by district" });
    }
  });

  // 기관 성과 분석 (동적 기준)
  app.get("/api/statistics/institution-performance", async (req, res) => {
    try {
      const excellentThreshold = parseInt(req.query.excellent as string) || 80;
      const improvementThreshold = parseInt(req.query.improvement as string) || 60;
      
      const educationData = await storage.getEducationData();
      const basicData = educationData.filter(item => item.courseType === '기본');
      const advancedData = educationData.filter(item => item.courseType === '심화');
      
      const performance = calculateInstitutionPerformance(
        basicData,
        advancedData,
        excellentThreshold,
        improvementThreshold
      );
      
      res.json({
        ...performance,
        criteria: {
          excellentThreshold,
          improvementThreshold
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate institution performance" });
    }
  });

  // 시계열 통계 (기본교육)
  app.get("/api/statistics/basic-education/time-series", async (req, res) => {
    try {
      const basicEducationData = await storage.getEducationData();
      const basicData = basicEducationData.filter(item => item.courseType === '기본');
      const stats = calculateTimeSeriesStats(basicData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate basic education time series statistics" });
    }
  });

  // 시계열 통계 (심화교육)
  app.get("/api/statistics/advanced-education/time-series", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const advancedData = educationData.filter(item => item.courseType === '심화');
      const stats = calculateTimeSeriesStats(advancedData);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate advanced education time series statistics" });
    }
  });

  // 전체 교육 통계 대시보드 데이터
  app.get("/api/statistics/dashboard", async (req, res) => {
    try {
      const educationData = await storage.getEducationData();
      const basicData = educationData.filter(item => item.courseType === '기본');
      const advancedData = educationData.filter(item => item.courseType === '심화');
      
      const excellentThreshold = parseInt(req.query.excellent as string) || 80;
      const improvementThreshold = parseInt(req.query.improvement as string) || 60;
      
      const dashboardData = {
        basicEducation: {
          jobTypeStats: calculateEducationStatsByJobType(basicData),
          districtStats: calculateDistrictStats(basicData),
          timeSeriesStats: calculateTimeSeriesStats(basicData)
        },
        advancedEducation: {
          jobTypeStats: calculateEducationStatsByJobType(advancedData),
          districtStats: calculateDistrictStats(advancedData),
          timeSeriesStats: calculateTimeSeriesStats(advancedData)
        },
        institutionPerformance: calculateInstitutionPerformance(
          basicData,
          advancedData,
          excellentThreshold,
          improvementThreshold
        ),
        districtInfo: getAllDistrictInfo(),
        totalStats: {
          totalDistricts: getAllDistrictInfo().length,
          totalInstitutions: getAllDistrictInfo().reduce((sum, district) => sum + district.totalInstitutions, 0),
          totalBasicParticipants: basicData.length,
          totalAdvancedParticipants: advancedData.length,
          totalParticipants: educationData.length
        }
      };
      
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate dashboard statistics" });
    }
  });

  // 디버그 로그 API
  app.post("/api/debug-log", (req, res) => {
    const { message } = req.body;
    console.log(`🔍 CLIENT DEBUG: ${message}`);
    res.json({ success: true });
  });

  const httpServer = createServer(app);

  return httpServer;
}
