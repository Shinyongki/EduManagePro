// Search for specific person and analyze missing data
const response = await fetch('http://localhost:3001/api/employees');
const employees = await response.json();

console.log('=== 육은종 검색 결과 ===');

// 정확한 이름으로 검색
const exactMatch = employees.filter(emp => emp.name === '육은종');
console.log('정확한 이름 매치:', exactMatch.length, '건');

// 부분 일치 검색
const partialMatch = employees.filter(emp => 
  emp.name && emp.name.includes('육')
);
console.log('육이 포함된 이름:', partialMatch.length, '건');
if (partialMatch.length > 0) {
  partialMatch.forEach(emp => {
    console.log(`- ${emp.name} (${emp.isActive ? '재직' : '퇴직'})`);
  });
}

// 은이 포함된 이름 검색
const eunsMatch = employees.filter(emp => 
  emp.name && emp.name.includes('은')
);
console.log('은이 포함된 이름:', eunsMatch.length, '건');
if (eunsMatch.length > 5) {
  console.log('처음 10명:');
  eunsMatch.slice(0, 10).forEach(emp => {
    console.log(`- ${emp.name} (${emp.isActive ? '재직' : '퇴직'})`);
  });
} else {
  eunsMatch.forEach(emp => {
    console.log(`- ${emp.name} (${emp.isActive ? '재직' : '퇴직'})`);
  });
}

// 종이 포함된 이름 검색
const jongMatch = employees.filter(emp => 
  emp.name && emp.name.includes('종')
);
console.log('종이 포함된 이름:', jongMatch.length, '건');
if (jongMatch.length > 5) {
  console.log('처음 10명:');
  jongMatch.slice(0, 10).forEach(emp => {
    console.log(`- ${emp.name} (${emp.isActive ? '재직' : '퇴직'})`);
  });
} else {
  jongMatch.forEach(emp => {
    console.log(`- ${emp.name} (${emp.isActive ? '재직' : '퇴직'})`);
  });
}

// 데이터 품질 검사
console.log('\n=== 데이터 품질 검사 ===');
const noName = employees.filter(emp => !emp.name || emp.name.trim() === '');
console.log('이름이 없는 레코드:', noName.length, '건');

const strangeNames = employees.filter(emp => 
  emp.name && (emp.name.length > 5 || emp.name.includes(' ') || /[0-9]/.test(emp.name))
);
console.log('이상한 이름 패턴:', strangeNames.length, '건');
if (strangeNames.length > 0) {
  console.log('이상한 이름들:');
  strangeNames.slice(0, 10).forEach(emp => {
    console.log(`- "${emp.name}" (길이: ${emp.name.length})`);
  });
}

console.log('\n=== 전체 통계 ===');
console.log('총 종사자 수:', employees.length);
console.log('재직 중:', employees.filter(emp => emp.isActive).length);
console.log('전담사회복지사 (재직):', employees.filter(emp => 
  emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')
).length);