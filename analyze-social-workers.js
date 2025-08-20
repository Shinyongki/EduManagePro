const { storage } = require('./server/storage.js');

async function analyzeSocialWorkers() {
  try {
    const employees = await storage.getEmployeeData();
    console.log('총 종사자 수:', employees.length);
    
    const activeEmployees = employees.filter(emp => emp.isActive);
    console.log('재직 중인 종사자 수:', activeEmployees.length);
    
    const socialWorkers = activeEmployees.filter(emp => 
      emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사'
    );
    
    console.log('\n=== 전담사회복지사 분석 ===');
    console.log('전담사회복지사 수:', socialWorkers.length);
    
    // Group by jobType
    const byJobType = {};
    socialWorkers.forEach(emp => {
      const jobType = emp.jobType || '미분류';
      if (!byJobType[jobType]) byJobType[jobType] = [];
      byJobType[jobType].push(emp);
    });
    
    console.log('\n직무별 분포:');
    Object.keys(byJobType).forEach(jobType => {
      console.log(`- ${jobType}: ${byJobType[jobType].length}명`);
    });
    
    // Sample of first 30 social workers
    console.log('\n=== 전담사회복지사 목록 (처음 30명) ===');
    socialWorkers.slice(0, 30).forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} | ${emp.jobType} | ${emp.institution || emp.regionName || '-'} | ${emp.hireDate || '-'}`);
    });
    
    if (socialWorkers.length > 30) {
      console.log(`... 및 ${socialWorkers.length - 30}명 더`);
    }
    
    // Check for potential data issues
    console.log('\n=== 데이터 품질 확인 ===');
    const withoutJobType = activeEmployees.filter(emp => !emp.jobType || emp.jobType.trim() === '');
    console.log('jobType이 비어있는 재직자:', withoutJobType.length, '명');
    
    const withoutName = activeEmployees.filter(emp => !emp.name || emp.name.trim() === '');
    console.log('이름이 비어있는 재직자:', withoutName.length, '명');
    
    // Check for unusual names that might be region names
    const suspiciousNames = socialWorkers.filter(emp => {
      const name = emp.name || '';
      return name.includes('시') || name.includes('군') || name.includes('구') || name.includes('동') || name.includes('면');
    });
    
    console.log('\n의심스러운 이름 (지역명일 가능성):', suspiciousNames.length, '명');
    if (suspiciousNames.length > 0) {
      console.log('의심스러운 이름들:');
      suspiciousNames.slice(0, 10).forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} | ${emp.institution || emp.regionName || '-'}`);
      });
    }
    
    // Sample of employees without jobType
    if (withoutJobType.length > 0) {
      console.log('\njobType이 비어있는 종사자들 (처음 10명):');
      withoutJobType.slice(0, 10).forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name || '이름없음'} | ${emp.institution || emp.regionName || '기관없음'}`);
      });
    }
    
    // Check life support workers too
    const lifeSupportWorkers = activeEmployees.filter(emp => emp.jobType === '생활지원사');
    console.log('\n생활지원사 수:', lifeSupportWorkers.length, '명');
    
  } catch (error) {
    console.error('분석 실패:', error);
  }
}

analyzeSocialWorkers();