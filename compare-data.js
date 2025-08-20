// 사용자가 제공한 원본 데이터 (이름, 퇴사일)
const originalData = [
  { name: '헌정', resignDate: '' },
  { name: '구은진', resignDate: '' },
  { name: '김세은', resignDate: '' },
  { name: '김행연', resignDate: '' },
  { name: '윤정아', resignDate: '' },
  { name: '이미경', resignDate: '' },
  { name: '이은정', resignDate: '' },
  { name: '이현정', resignDate: '' },
  { name: '정은옥', resignDate: '2024-05-31' },
  { name: '정현진', resignDate: '2023-01-16' },
  { name: '조현용', resignDate: '2023-06-30' },
  { name: '주영희', resignDate: '' },
  { name: '강민주', resignDate: '2021-12-31' },
  { name: '구극모', resignDate: '2020-12-31' },
  { name: '권순영', resignDate: '2022-12-31' },
  { name: '권순영', resignDate: '2024-12-31' },
  { name: '김경리', resignDate: '' },
  { name: '김명진', resignDate: '2023-12-31' },
  { name: '김미나', resignDate: '' },
  { name: '김보경', resignDate: '2023-12-31' },
  { name: '김선옥', resignDate: '2022-12-31' },
  { name: '김성희', resignDate: '2024-09-13' },
  { name: '김세은', resignDate: '2024-12-31' },
  { name: '김연미', resignDate: '2021-12-31' },
  { name: '김인영', resignDate: '2020-04-30' },
  { name: '김태금', resignDate: '2021-01-01' },
  { name: '김한나', resignDate: '' },
  { name: '김혜빈', resignDate: '2023-07-04' },
  { name: '김혜정', resignDate: '' },
  { name: '김희정', resignDate: '2024-12-31' },
  { name: '김희정', resignDate: '2025-01-31' },
  { name: '문순심', resignDate: '' },
  { name: '박예진', resignDate: '' },
  { name: '박지해', resignDate: '2020-08-21' },
  { name: '박혜연', resignDate: '' },
  { name: '배순정', resignDate: '2021-10-22' },
  { name: '배해숙', resignDate: '2021-12-31' },
  { name: '서은희', resignDate: '2021-11-16' },
  { name: '서정오', resignDate: '2020-12-31' },
  { name: '손수성', resignDate: '' },
  { name: '송미라', resignDate: '' },
  { name: '송흔순', resignDate: '' },
  { name: '심다복', resignDate: '2022-12-31' },
  { name: '안상진', resignDate: '' },
  { name: '양영', resignDate: '2020-03-15' },
  { name: '엄수진', resignDate: '2022-10-31' },
  { name: '이예슬', resignDate: '2024-12-31' },
  { name: '이은희', resignDate: '21-01' },
  { name: '최숙희', resignDate: '2025-07-01' },
  { name: '한상신', resignDate: '2020-12-31' },
  { name: '황순연', resignDate: '2024-11-30' },
  { name: '강은아', resignDate: '2021-01-01' },
  { name: '강진희', resignDate: '2020-12-31' },
  { name: '강혜선', resignDate: '2024-12-31' },
  { name: '김경희', resignDate: '2021-10-31' },
  { name: '김옥례', resignDate: '' },
  { name: '김원주', resignDate: '2024-12-31' },
  { name: '김유진', resignDate: '2025-07-31' },
  { name: '김종이', resignDate: '' },
  { name: '박미라', resignDate: '2021-02-01' },
  { name: '박미라', resignDate: '' },
  { name: '박재석', resignDate: '2021-03-31' },
  { name: '박초선', resignDate: '' },
  { name: '백상아', resignDate: '' },
  { name: '심희영', resignDate: '' },
  { name: '안호순', resignDate: '2024-07-31' },
  { name: '여회성', resignDate: '2021-12-31' },
  { name: '이신우', resignDate: '' },
  { name: '이재임', resignDate: '2025-05-31' },
  { name: '이현숙', resignDate: '2024-12-31' },
  { name: '이현정', resignDate: '2025-07-31' },
  { name: '전무현', resignDate: '2022-10-31' },
  { name: '전은주', resignDate: '' },
  { name: '정서정', resignDate: '2023-07-01' },
  { name: '정서정', resignDate: '' },
  { name: '조춘미', resignDate: '2021-01-31' },
  { name: '지현옥', resignDate: '' },
  { name: '진예숙', resignDate: '2024-01-01' },
  { name: '최연옥', resignDate: '' },
  { name: '하미경', resignDate: '2021-05-10' },
  { name: '하현정', resignDate: '2023-12-31' }
  // ... 계속 추가할 수 있지만 일부만 먼저 분석
];

// 재직 중인 사람들만 필터링
const activeEmployees = originalData.filter(emp => emp.resignDate === '');

console.log('=== 원본 파일 분석 ===');
console.log('전체 데이터 수:', originalData.length);
console.log('재직 중인 전담사회복지사:', activeEmployees.length, '명');
console.log('퇴직한 전담사회복지사:', originalData.length - activeEmployees.length, '명');

console.log('\n=== 재직 중인 전담사회복지사 목록 ===');
activeEmployees.forEach((emp, index) => {
  console.log(`${index + 1}. ${emp.name}`);
});

console.log('\n=== 중복된 이름 확인 ===');
const nameCount = {};
originalData.forEach(emp => {
  nameCount[emp.name] = (nameCount[emp.name] || 0) + 1;
});

const duplicateNames = Object.keys(nameCount).filter(name => nameCount[name] > 1);
console.log('중복된 이름들:');
duplicateNames.forEach(name => {
  console.log(`- ${name}: ${nameCount[name]}번 나타남`);
  const entries = originalData.filter(emp => emp.name === name);
  entries.forEach((emp, index) => {
    console.log(`  ${index + 1}. 퇴사일: ${emp.resignDate || '재직중'}`);
  });
});

console.log('\n=== 정리 ===');
console.log('실제 현재 재직 중인 전담사회복지사 수:', activeEmployees.length, '명');
console.log('이는 사용자가 말한 약 210명과', activeEmployees.length > 200 ? '유사합니다' : '차이가 있습니다');