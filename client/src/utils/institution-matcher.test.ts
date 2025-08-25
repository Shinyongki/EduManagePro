/**
 * 기관명 매칭 유틸리티 테스트
 */

import { 
  normalizeInstitutionName, 
  isInstitutionMatch,
  isInstitutionCodeMatch,
  matchInstitution,
  debugInstitutionMatch 
} from './institution-matcher';

// 테스트 케이스
const testCases = [
  {
    name1: '(광역)(재)경상남도사회서비스원',
    name2: '경상남도사회서비스원',
    expectedMatch: true,
    description: '광역 표시와 법인 형태 제거'
  },
  {
    name1: '창원시종합사회복지관',
    name2: '창원시 종합사회복지관',
    expectedMatch: true,
    description: '공백 차이 무시'
  },
  {
    name1: '거제노인통합지원센터',
    name2: '거제노인종합복지관',
    expectedMatch: false,
    description: '다른 시설 유형'
  },
  {
    name1: '김해시노인종합복지관',
    name2: '김해시 노인복지관',
    expectedMatch: true,
    description: '종합 표기 통일'
  },
  {
    name1: '(사)경남장애인복지관',
    name2: '경남장애인종합복지관',
    expectedMatch: true,
    description: '법인 형태와 종합 표기'
  },
  {
    name1: '진주시 사회복지관',
    name2: '진주시사회복지관',
    expectedMatch: true,
    description: '공백 차이'
  },
  {
    name1: '*광역지원기관 경상남도사회서비스원',
    name2: '(광역)(재)경상남도사회서비스원',
    expectedMatch: true,
    description: '광역 표시 다양한 형태'
  }
];

// 테스트 실행
export function runInstitutionMatcherTests() {
  console.log('\\n========== 기관명 매칭 테스트 ==========\\n');
  
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach((testCase, index) => {
    const result = isInstitutionMatch(testCase.name1, testCase.name2);
    const passed = result === testCase.expectedMatch;
    
    if (passed) {
      passCount++;
      console.log(`✅ Test ${index + 1} PASSED: ${testCase.description}`);
    } else {
      failCount++;
      console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
    }
    
    console.log(`   입력1: "${testCase.name1}"`);
    console.log(`   입력2: "${testCase.name2}"`);
    console.log(`   정규화1: "${normalizeInstitutionName(testCase.name1)}"`);
    console.log(`   정규화2: "${normalizeInstitutionName(testCase.name2)}"`);
    console.log(`   예상: ${testCase.expectedMatch}, 결과: ${result}`);
    
    // 상세 디버깅 정보
    const debug = debugInstitutionMatch(testCase.name1, testCase.name2);
    console.log(`   키워드1: [${debug.keywords1.join(', ')}]`);
    console.log(`   키워드2: [${debug.keywords2.join(', ')}]`);
    console.log(`   지역1: ${debug.location1}, 지역2: ${debug.location2}`);
    console.log(`   시설유형1: ${debug.facility1}, 시설유형2: ${debug.facility2}`);
    console.log('');
  });
  
  console.log('\\n========== 테스트 결과 ==========');
  console.log(`✅ 성공: ${passCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`총 테스트: ${testCases.length}개\\n`);
  
  // 코드 매칭 테스트
  console.log('\\n========== 기관코드 매칭 테스트 ==========\\n');
  
  const codeTests = [
    { code1: 'A48000002', code2: 'A48000002', expected: true },
    { code1: 'A48000002', code2: 'a48000002', expected: true },
    { code1: 'A48000002', code2: 'A48000003', expected: false },
    { code1: ' A48000002 ', code2: 'A48000002', expected: true },
  ];
  
  codeTests.forEach((test, index) => {
    const result = isInstitutionCodeMatch(test.code1, test.code2);
    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} Code Test ${index + 1}: "${test.code1}" vs "${test.code2}" = ${result} (예상: ${test.expected})`);
  });
  
  // 종합 매칭 테스트
  console.log('\\n========== 종합 매칭 테스트 ==========\\n');
  
  const inst1 = { code: 'A48000002', name: '(광역)(재)경상남도사회서비스원' };
  const inst2 = { code: 'A48000002', name: '경남사회서비스원' };
  const inst3 = { code: undefined, name: '경상남도사회서비스원' };
  const inst4 = { code: 'A48000003', name: '다른기관' };
  
  console.log('inst1 vs inst2 (같은 코드, 다른 이름):', matchInstitution(inst1, inst2));
  console.log('inst1 vs inst3 (코드 없음, 유사 이름):', matchInstitution(inst1, inst3));
  console.log('inst1 vs inst4 (다른 코드, 다른 이름):', matchInstitution(inst1, inst4));
}

// 브라우저 환경에서 실행 가능하도록
if (typeof window !== 'undefined') {
  (window as any).runInstitutionMatcherTests = runInstitutionMatcherTests;
}