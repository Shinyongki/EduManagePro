import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

async function uploadFile() {
  try {
    console.log('파일 업로드 시작...');
    
    // FormData 생성
    const form = new FormData();
    const filePath = '수행기관 일반 현황.xls';
    
    if (!fs.existsSync(filePath)) {
      console.log('파일이 존재하지 않습니다:', filePath);
      return;
    }
    
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream, '수행기관 일반 현황.xls');
    
    console.log('서버에 업로드 요청 중...');
    
    const response = await axios.post('http://localhost:3009/api/institutions/upload', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30초 타임아웃
    });
    
    console.log('업로드 성공!');
    console.log('응답:', response.data);
    
  } catch (error) {
    console.error('업로드 오류:', error.response?.data || error.message);
  }
}

uploadFile();