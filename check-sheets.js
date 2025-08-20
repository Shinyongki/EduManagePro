import XLSX from 'xlsx';

try {
  const workbook = XLSX.readFile('수행기관 일반 현황.xls');
  console.log('실제 시트 이름들:', workbook.SheetNames);
  
  // 각 시트의 상세 정보
  workbook.SheetNames.forEach((name, i) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    console.log(`시트 ${i+1} '${name}': 범위 ${sheet['!ref']}, 행수: ${range.e.r + 1}`);
  });
} catch(e) {
  console.error('오류:', e.message);
}