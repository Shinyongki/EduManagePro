// Simple script to count active employees from API
const response = await fetch('http://localhost:3001/api/employees');
const employees = await response.json();

console.log('=== 종사자 데이터 현황 ===');
console.log('전체 종사자 수:', employees.length);

const activeEmployees = employees.filter(emp => emp.isActive === true);
const inactiveEmployees = employees.filter(emp => emp.isActive === false);

console.log('\n=== 상태별 현황 ===');
console.log('재직 중 (isActive: true):', activeEmployees.length, '명');
console.log('퇴직 (isActive: false):', inactiveEmployees.length, '명');

// 재직 중인 전담사회복지사 수
const activeSocialWorkers = activeEmployees.filter(emp => 
  emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
);

// 재직 중인 생활지원사 수  
const activeLifeSupport = activeEmployees.filter(emp => 
  emp.jobType === '생활지원사'
);

console.log('\n=== 재직 중인 직무별 현황 ===');
console.log('전담사회복지사 (재직):', activeSocialWorkers.length, '명');
console.log('생활지원사 (재직):', activeLifeSupport.length, '명');

console.log('\n=== 답변 ===');
console.log(`종사자 데이터목록에서 '상태' 헤더에 '재직'으로 표시된 숫자는 총 ${activeEmployees.length}명입니다.`);