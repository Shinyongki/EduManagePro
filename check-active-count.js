import { storage } from './server/storage.js';

async function checkActiveEmployees() {
  try {
    const employees = await storage.getEmployeeData();
    console.log('=== 종사자 데이터 분석 ===');
    console.log('전체 종사자 수:', employees.length);
    
    const activeEmployees = employees.filter(emp => emp.isActive);
    const inactiveEmployees = employees.filter(emp => !emp.isActive);
    
    console.log('\n=== 상태별 분포 ===');
    console.log('재직 중 (isActive: true):', activeEmployees.length, '명');
    console.log('퇴직 (isActive: false):', inactiveEmployees.length, '명');
    
    // 직무별 재직자 분포
    const activeSocialWorkers = activeEmployees.filter(emp => 
      emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
    );
    const activeLifeSupport = activeEmployees.filter(emp => 
      emp.jobType === '생활지원사'
    );
    const activeOthers = activeEmployees.filter(emp => 
      emp.jobType && emp.jobType !== '전담사회복지사' && 
      emp.jobType !== '선임전담사회복지사' && emp.jobType !== '생활지원사'
    );
    const activeNoJobType = activeEmployees.filter(emp => !emp.jobType || emp.jobType.trim() === '');
    
    console.log('\n=== 재직자 직무별 분포 ===');
    console.log('전담사회복지사 (재직):', activeSocialWorkers.length, '명');
    console.log('생활지원사 (재직):', activeLifeSupport.length, '명');
    console.log('기타 직무 (재직):', activeOthers.length, '명');
    console.log('직무 미분류 (재직):', activeNoJobType.length, '명');
    
    // 퇴사일 관련 검증
    const withResignDate = employees.filter(emp => emp.resignDate && emp.resignDate.trim() !== '');
    const withoutResignDate = employees.filter(emp => !emp.resignDate || emp.resignDate.trim() === '');
    
    console.log('\n=== 퇴사일 기준 분포 ===');
    console.log('퇴사일 있음:', withResignDate.length, '명');
    console.log('퇴사일 없음 (재직 추정):', withoutResignDate.length, '명');
    
    // 상태와 퇴사일 일치성 검증
    const inconsistent = employees.filter(emp => {
      const hasResignDate = emp.resignDate && emp.resignDate.trim() !== '';
      return (emp.isActive && hasResignDate) || (!emp.isActive && !hasResignDate);
    });
    
    console.log('\n=== 데이터 일치성 검증 ===');
    console.log('상태와 퇴사일이 일치하지 않는 데이터:', inconsistent.length, '명');
    
    if (inconsistent.length > 0) {
      console.log('불일치 데이터 예시 (처음 5개):');
      inconsistent.slice(0, 5).forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} - isActive: ${emp.isActive}, 퇴사일: "${emp.resignDate}"`);
      });
    }
    
  } catch (error) {
    console.error('분석 실패:', error);
  }
}

checkActiveEmployees();