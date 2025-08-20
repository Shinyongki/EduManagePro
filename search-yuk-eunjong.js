// 육은종 검색 및 분석 스크립트
import fetch from 'node-fetch';

async function searchYukEunjong() {
  try {
    console.log('=== 육은종 검색 시작 ===');
    
    // 서버에서 모든 종사자 데이터 가져오기
    const response = await fetch('http://localhost:3006/api/employees');
    const employees = await response.json();
    
    console.log(`총 종사자 수: ${employees.length}`);
    
    // 정확한 이름으로 검색
    const exactMatch = employees.filter(emp => emp.name === '육은종');
    console.log(`정확한 매치 (육은종): ${exactMatch.length}건`);
    
    if (exactMatch.length > 0) {
      console.log('=== 육은종 발견! ===');
      exactMatch.forEach((emp, index) => {
        console.log(`${index + 1}. 육은종:`);
        console.log(`   - 상태: ${emp.isActive ? '재직' : '퇴직'}`);
        console.log(`   - 직무: ${emp.jobType}`);
        console.log(`   - 기관: ${emp.regionName || emp.institution}`);
        console.log(`   - 입사일: ${emp.hireDate}`);
        console.log(`   - 퇴사일: ${emp.resignDate || '없음'}`);
        console.log(`   - ID: ${emp.id}`);
        console.log('');
      });
    } else {
      console.log('❌ 육은종을 찾을 수 없습니다!');
    }
    
    // '육'이 포함된 모든 이름 검색
    const yukNames = employees.filter(emp => emp.name && emp.name.includes('육'));
    console.log(`\n'육'이 포함된 이름: ${yukNames.length}건`);
    
    if (yukNames.length > 0) {
      console.log('=== 육씨 성을 가진 사람들 ===');
      yukNames.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} (${emp.isActive ? '재직' : '퇴직'}) - ${emp.jobType}`);
      });
    }
    
    // 재직 중인 전담사회복지사 수 확인
    const activeSocialWorkers = employees.filter(emp => 
      emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')
    );
    console.log(`\n재직 중인 전담사회복지사: ${activeSocialWorkers.length}명`);
    
    // 재직 중인 생활지원사 수 확인
    const activeLifeSupport = employees.filter(emp => 
      emp.isActive && emp.jobType === '생활지원사'
    );
    console.log(`재직 중인 생활지원사: ${activeLifeSupport.length}명`);
    
    // 전체 재직자 수 확인
    const activeEmployees = employees.filter(emp => emp.isActive);
    console.log(`전체 재직자: ${activeEmployees.length}명`);
    
    // 사용자가 언급한 누락된 사람들 중 몇 명 검색
    const missingPeople = ['육은종', '강갑순', '강경민', '강경숙', '강경자', '강경화', '강계복', '강계숙', '강근영', '강근옥'];
    
    console.log('\n=== 누락 확인된 사람들 검색 ===');
    missingPeople.forEach(name => {
      const found = employees.filter(emp => emp.name === name);
      console.log(`${name}: ${found.length > 0 ? '✓ 발견' : '❌ 누락'} (${found.length}건)`);
      
      if (found.length > 0) {
        found.forEach(emp => {
          console.log(`   - ${emp.isActive ? '재직' : '퇴직'}, ${emp.jobType}, ${emp.institutionCode}`);
        });
      }
    });
    
  } catch (error) {
    console.error('검색 중 오류 발생:', error.message);
  }
}

// 스크립트 실행
searchYukEunjong().then(() => {
  console.log('\n검색 완료!');
  process.exit(0);
}).catch(err => {
  console.error('실행 오류:', err);
  process.exit(1);
});