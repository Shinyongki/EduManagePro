const fs = require('fs');
const path = require('path');

// 폐지/종료된 기관 패턴
const closedInstitutionPatterns = [
  '(폐지)',
  '(종료)',
  '폐지',
  '종료'
];

// 계약종료 관련 패턴 (종사자 데이터용)
const contractEndedPatterns = [
  '계약종료'
];

function isClosedInstitution(institutionName) {
  if (!institutionName) return false;
  
  return closedInstitutionPatterns.some(pattern => 
    institutionName.includes(pattern)
  );
}

function isContractEnded(employeeData) {
  const fieldsToCheck = [
    employeeData.notes,
    employeeData.remarks,
    employeeData.note,
    employeeData.name
  ];
  
  return fieldsToCheck.some(field => {
    if (!field) return false;
    return contractEndedPatterns.some(pattern => 
      field.toString().includes(pattern)
    );
  });
}

function cleanEducationParticipants() {
  const filePath = path.join(__dirname, '../data/education-participants.json');
  console.log('📋 교육 참가자 데이터에서 폐지/종료 기관 제거...');
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`원본 참가자 데이터: ${data.length}건`);
    
    const filteredData = data.filter(participant => {
      if (isClosedInstitution(participant.institution)) {
        console.log(`❌ 제거: ${participant.name} (${participant.institution})`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ 필터링 후: ${filteredData.length}건`);
    console.log(`🗑️ 제거된 데이터: ${data.length - filteredData.length}건`);
    
    // 백업 생성
    const backupPath = filePath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`📦 백업 생성: ${backupPath}`);
    
    // 필터링된 데이터 저장
    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
    console.log(`✅ 교육 참가자 데이터 정리 완료`);
    
    return {
      original: data.length,
      filtered: filteredData.length,
      removed: data.length - filteredData.length
    };
    
  } catch (error) {
    console.error('교육 참가자 데이터 처리 중 오류:', error);
    return null;
  }
}

function cleanEmployeeData() {
  const filePath = path.join(__dirname, '../data/employee-data.json');
  console.log('\n👥 종사자 데이터에서 계약종료 데이터 제거...');
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`원본 종사자 데이터: ${data.length}건`);
    
    const filteredData = data.filter(employee => {
      if (isContractEnded(employee)) {
        console.log(`❌ 제거: ${employee.name || '이름없음'} (계약종료 관련)`);
        return false;
      }
      if (isClosedInstitution(employee.institution)) {
        console.log(`❌ 제거: ${employee.name || '이름없음'} (${employee.institution})`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ 필터링 후: ${filteredData.length}건`);
    console.log(`🗑️ 제거된 데이터: ${data.length - filteredData.length}건`);
    
    // 백업 생성
    const backupPath = filePath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`📦 백업 생성: ${backupPath}`);
    
    // 필터링된 데이터 저장
    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
    console.log(`✅ 종사자 데이터 정리 완료`);
    
    return {
      original: data.length,
      filtered: filteredData.length,
      removed: data.length - filteredData.length
    };
    
  } catch (error) {
    console.error('종사자 데이터 처리 중 오류:', error);
    return null;
  }
}

function cleanEducationData() {
  const basicPath = path.join(__dirname, '../data/education-data.json');
  console.log('\n📚 교육 데이터에서 폐지/종료 기관 제거...');
  
  try {
    const data = JSON.parse(fs.readFileSync(basicPath, 'utf8'));
    console.log(`원본 교육 데이터: ${data.length}건`);
    
    const filteredData = data.filter(education => {
      if (isClosedInstitution(education.institution)) {
        console.log(`❌ 제거: ${education.name} (${education.institution})`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ 필터링 후: ${filteredData.length}건`);
    console.log(`🗑️ 제거된 데이터: ${data.length - filteredData.length}건`);
    
    // 백업 생성
    const backupPath = basicPath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`📦 백업 생성: ${backupPath}`);
    
    // 필터링된 데이터 저장
    fs.writeFileSync(basicPath, JSON.stringify(filteredData, null, 2));
    console.log(`✅ 교육 데이터 정리 완료`);
    
    return {
      original: data.length,
      filtered: filteredData.length,
      removed: data.length - filteredData.length
    };
    
  } catch (error) {
    console.error('교육 데이터 처리 중 오류:', error);
    return null;
  }
}

// 메인 실행 함수
function main() {
  console.log('🧹 폐지/종료된 기관 데이터 정리 시작\n');
  console.log('대상 기관:');
  console.log('- (폐지)함양군청');
  console.log('- (폐지)거창효노인통합지원센터');  
  console.log('- (폐지)경상남도사회서비스원 김해시종합재가센터');
  console.log('- (종료)성로노인통합지원센터');
  console.log('- (종료)경상남도사회서비스원 창원시종합재가센터');
  console.log('- 계약종료 관련 종사자\n');
  
  const results = {};
  
  // 교육 참가자 데이터 정리
  results.participants = cleanEducationParticipants();
  
  // 종사자 데이터 정리
  results.employees = cleanEmployeeData();
  
  // 교육 데이터 정리
  results.education = cleanEducationData();
  
  // 결과 요약
  console.log('\n📊 정리 결과 요약:');
  console.log('=====================================');
  
  if (results.participants) {
    console.log(`📋 교육 참가자: ${results.participants.removed}건 제거 (${results.participants.original} → ${results.participants.filtered})`);
  }
  
  if (results.employees) {
    console.log(`👥 종사자: ${results.employees.removed}건 제거 (${results.employees.original} → ${results.employees.filtered})`);
  }
  
  if (results.education) {
    console.log(`📚 교육 데이터: ${results.education.removed}건 제거 (${results.education.original} → ${results.education.filtered})`);
  }
  
  const totalRemoved = (results.participants?.removed || 0) + 
                      (results.employees?.removed || 0) + 
                      (results.education?.removed || 0);
  
  console.log(`🗑️ 총 ${totalRemoved}건 제거 완료`);
  console.log('\n✅ 정리 작업이 완료되었습니다.');
  console.log('💾 원본 파일은 .backup.json으로 백업되었습니다.');
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  cleanEducationParticipants,
  cleanEmployeeData,
  cleanEducationData,
  main
};