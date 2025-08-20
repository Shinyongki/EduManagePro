// Test name recognition for '육은종'
const testNames = ['육은종', '김철수', '이영희', '박민수', '최지영', '진법규'];

console.log('=== 이름 인식 테스트 ===');

const commonSurnames = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', 
  '권', '황', '안', '송', '류', '전', '홍', '고', '문', '양', '손', '배', '백', '허', 
  '유', '남', '심', '노', '하', '곽', '성', '차', '주', '우', '구', '원', '탁', '연', 
  '방', '남궁', '제갈', '선우', '독고', '육', '마', '변', '사', '소', '엄', '공',
  '예', '현', '봉', '가', '강전', '설', '당', '목', '도', '견', '연성', '기', '석', '로'
];

testNames.forEach(name => {
  const isValidName = name && name.length >= 2 && name.length <= 4 && /^[가-힣]+$/.test(name);
  const hasValidSurname = commonSurnames.some(surname => name.startsWith(surname));
  
  console.log(`${name}: 유효한이름=${isValidName}, 유효한성씨=${hasValidSurname}, 인식=${isValidName && hasValidSurname ? 'O' : 'X'}`);
});

console.log('\n=== 육씨 성씨 확인 ===');
console.log('육씨가 목록에 있는가:', commonSurnames.includes('육'));
console.log('육으로 시작하는 이름들:');
testNames.filter(name => name.startsWith('육')).forEach(name => {
  console.log(`- ${name}`);
});