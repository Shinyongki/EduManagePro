const fs = require('fs');
const path = require('path');

// 현재 관리하고 있는 56개 기관 리스트 (광역지원기관 포함)
const managedInstitutions = [
  // 광역지원기관
  '경남광역', '경남광역지원기관', '(광역)(재)경상남도사회서비스원',
  
  // 실제 데이터에서 발견되는 관리 기관들 (현재 29개 + 추가)
  '거제노인통합지원센터',
  '거창노인통합지원센터', 
  '경남노인통합지원센터',
  '김해시종합사회복지관',
  '나누리노인통합지원센터',
  '대한노인회 고성군지회',
  '동진노인통합지원센터',
  '명진노인통합지원센터',
  '밀양노인통합지원센터',
  '보현행원노인통합지원센터',
  '사랑원노인지원센터',
  '사천노인통합지원센터',
  '사회적협동조합 합천지역자활센터',
  '산청성모노인통합지원센터',
  '산청해민노인통합지원센터',
  '생명의전화노인통합지원센터',
  '성요셉소규모노인종합센터',
  '의령노인통합지원센터',
  '진양노인통합지원센터',
  '진주노인통합지원센터',
  '창원도우누리노인통합재가센터',
  '통영노인통합지원센터',
  '통영시종합사회복지관',
  '하동노인통합지원센터',
  '합천노인통합지원센터',
  '화방남해노인통합지원센터',
  '화방재가복지센터',
  '효능원노인통합지원센터',
  
  // 추가 관리 기관들 (현재 '기타 비관리 기관'으로 분류된 것들 중 실제 관리 기관)
  '거제사랑노인복지센터',
  '거창인애노인통합지원센터',
  '경남고용복지센터',
  '경남하동지역자활센터',
  '공덕의집노인통합지원센터',
  '김해돌봄지원센터',
  '마산회원노인종합복지관',
  '마산희망지역자활센터',
  '미타재가복지센터',
  '밀양시자원봉사단체협의회',
  '사단법인 대한노인회 함양군지회',
  '사회복지법인신생원양산재가노인복지센터',
  '사회적협동조합 창녕지역자활센터',
  '산청복음노인통합지원센터',
  '산청한일노인통합지원센터',
  '양산행복한돌봄 사회적협동조합',
  '우리들노인통합지원센터',
  '정현사회적협동조합',
  '진해노인종합복지관',
  '진해서부노인종합복지관',
  '창녕군새누리노인종합센터',
  '코끼리행복복지센터',
  '하늘마음노인통합지원센터',
  '한올생명의집',
  '함안군재가노인통합지원센터',
  '해월노인복지센터',
  '(사)대한노인회함안군지회',
  '마산회원구'
  // 총 56개 기관
];

// 사용자 지정 비관리 기관 목록
const unmanagedInstitutionsList = [
  '강서동행정복지센터',
  '김해시',
  '사천시',
  '장유2동행정복지센터',  
  '창선면행정복지센터',
  '회원2동행정복지센터'
];

// 사용자 지정 종료/폐지 기관 목록
const closedInstitutionsList = [
  '(종료)성로노인통합지원센터',
  '(폐지)거창효노인통합지원센터', 
  '(폐지)경상남도사회서비스원 김해시종합재가센터',
  '(폐지)함양군청',
  // 변형된 형태들도 포함 (괄호 없는 형태)
  '성로노인통합지원센터',
  '거창효노인통합지원센터',
  '경상남도사회서비스원 김해시종합재가센터', 
  '함양군청'
];

function analyzeInstitutions() {
  console.log('📊 기관 분석 시작\n');
  
  // 참가자 데이터 읽기
  const participantsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/education-participants.json'), 'utf8')
  );
  
  // 종사자 데이터 읽기
  const employeesData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/employee-data.json'), 'utf8')
  );
  
  // 교육 데이터 읽기
  const educationData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/education-data.json'), 'utf8')
  );
  
  // 모든 데이터에서 기관명 추출
  const allInstitutions = new Set();
  
  participantsData.forEach(p => {
    if (p.institution) {
      allInstitutions.add(p.institution.trim());
    }
  });
  
  employeesData.forEach(e => {
    if (e.institution) {
      allInstitutions.add(e.institution.trim());
    }
  });
  
  educationData.forEach(ed => {
    if (ed.institution) {
      allInstitutions.add(ed.institution.trim());
    }
  });
  
  const institutionsList = Array.from(allInstitutions).sort();
  
  console.log(`🏢 전체 발견된 기관 수: ${institutionsList.length}개\n`);
  
  // 종료/폐지 기관 분류
  const closedInstitutions = institutionsList.filter(inst => 
    inst.includes('(종료)') || 
    inst.includes('(폐지)') || 
    inst.includes('종료') || 
    inst.includes('폐지')
  );
  
  // 종료/폐지 기관 분류 (사용자 지정 + 패턴 매칭)
  const allClosedInstitutions = institutionsList.filter(inst => {
    // 사용자 지정 종료/폐지 기관 목록 확인 (정확한 매칭)
    const isInClosedList = closedInstitutionsList.some(closed => {
      // 정확히 일치하는 경우
      if (inst === closed) return true;
      
      // 괄호가 있는 형태와 없는 형태 매칭
      const normalizedInst = inst.replace(/\(종료\)|\(폐지\)/g, '').trim();
      const normalizedClosed = closed.replace(/\(종료\)|\(폐지\)/g, '').trim();
      
      // 정확히 같은 기관명인 경우만 매칭 (부분 문자열 매칭 제외)
      return normalizedInst === normalizedClosed;
    });
    
    // 패턴 매칭 (괄호가 포함된 경우만)
    const hasClosedPattern = inst.includes('(종료)') || inst.includes('(폐지)');
    
    return isInClosedList || hasClosedPattern;
  });

  // 관리 기관과 비관리 기관 분류
  const managedFound = [];
  const unmanagedInstitutions = [];
  const specifiedUnmanagedInstitutions = [];
  
  institutionsList.forEach(inst => {
    // 종료/폐지 기관은 제외
    if (allClosedInstitutions.includes(inst)) {
      return;
    }
    
    // 사용자 지정 비관리 기관 먼저 확인
    const isSpecifiedUnmanaged = unmanagedInstitutionsList.includes(inst);
    if (isSpecifiedUnmanaged) {
      specifiedUnmanagedInstitutions.push(inst);
      return;
    }
    
    // 관리 기관 목록과 매칭 (유연한 매칭)
    const isManaged = managedInstitutions.some(managed => {
      const normalizedManaged = managed.toLowerCase().replace(/\s+/g, '');
      const normalizedInst = inst.toLowerCase().replace(/\s+/g, '');
      
      return normalizedInst.includes(normalizedManaged) || 
             normalizedManaged.includes(normalizedInst) ||
             normalizedInst === normalizedManaged;
    });
    
    if (isManaged) {
      managedFound.push(inst);
    } else {
      unmanagedInstitutions.push(inst);
    }
  });
  
  // 결과 출력
  console.log('🟢 관리 중인 기관들:');
  console.log('=====================================');
  managedFound.forEach((inst, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${inst}`);
  });
  console.log(`\n✅ 관리 기관 총 ${managedFound.length}개`);
  
  console.log('\n🟡 사용자 지정 비관리 기관들:');
  console.log('=====================================');
  specifiedUnmanagedInstitutions.forEach((inst, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${inst}`);
  });
  console.log(`\n📌 지정 비관리 기관 총 ${specifiedUnmanagedInstitutions.length}개`);
  
  console.log('\n🟠 기타 관리하지 않는 기관들:');
  console.log('=====================================');
  unmanagedInstitutions.forEach((inst, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${inst}`);
  });
  console.log(`\n⚠️ 기타 비관리 기관 총 ${unmanagedInstitutions.length}개`);
  
  if (allClosedInstitutions.length > 0) {
    console.log('\n🔴 종료/폐지 기관들 (삭제 대상):');
    console.log('=====================================');
    allClosedInstitutions.forEach((inst, idx) => {
      console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${inst}`);
    });
    console.log(`\n🗑️ 종료/폐지 기관 총 ${allClosedInstitutions.length}개`);
  }
  
  // 전체 요약
  console.log('\n📊 분석 요약:');
  console.log('=====================================');
  console.log(`전체 기관: ${institutionsList.length}개`);
  console.log(`관리 기관: ${managedFound.length}개`);
  console.log(`지정 비관리 기관: ${specifiedUnmanagedInstitutions.length}개`);
  console.log(`기타 비관리 기관: ${unmanagedInstitutions.length}개`);
  console.log(`종료/폐지 기관: ${allClosedInstitutions.length}개`);
  console.log(`목표 관리 기관 수: 56개`);
  console.log(`현재와 목표 차이: ${managedFound.length - 56}개`);
  
  // 데이터별 분포 확인
  console.log('\n📋 데이터별 기관 분포:');
  console.log('=====================================');
  
  const participantInstitutions = [...new Set(participantsData.map(p => p.institution).filter(Boolean))];
  const employeeInstitutions = [...new Set(employeesData.map(e => e.institution).filter(Boolean))];
  const educationInstitutions = [...new Set(educationData.map(ed => ed.institution).filter(Boolean))];
  
  console.log(`참가자 데이터: ${participantInstitutions.length}개 기관`);
  console.log(`종사자 데이터: ${employeeInstitutions.length}개 기관`);
  console.log(`교육 데이터: ${educationInstitutions.length}개 기관`);
  
  // JSON 파일로 결과 저장
  const result = {
    totalInstitutions: institutionsList.length,
    managedInstitutions: managedFound,
    specifiedUnmanagedInstitutions: specifiedUnmanagedInstitutions,
    unmanagedInstitutions: unmanagedInstitutions,
    closedInstitutions: allClosedInstitutions,
    summary: {
      managed: managedFound.length,
      specifiedUnmanaged: specifiedUnmanagedInstitutions.length,
      unmanaged: unmanagedInstitutions.length,
      closed: allClosedInstitutions.length,
      target: 56
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../data/institution-analysis.json'),
    JSON.stringify(result, null, 2)
  );
  
  console.log('\n💾 분석 결과가 data/institution-analysis.json에 저장되었습니다.');
  
  return result;
}

// 스크립트 실행
if (require.main === module) {
  analyzeInstitutions();
}

module.exports = { analyzeInstitutions };