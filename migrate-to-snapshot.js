// 기존 데이터를 첫 번째 스냅샷으로 마이그레이션하는 스크립트
// 브라우저 콘솔에서 실행

async function migrateToSnapshot() {
  console.log('🔄 기존 데이터를 첫 번째 스냅샷으로 마이그레이션 시작...');
  
  try {
    // IndexedDB에서 기존 데이터 로드
    const { IndexedDBStorage } = await import('./client/src/lib/indexeddb.js');
    const { snapshotManager } = await import('./client/src/lib/snapshot-manager.js');
    
    const db = new IndexedDBStorage();
    
    // 기존 데이터들 수집
    const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
      db.getItem('employeeData') || [],
      db.getItem('participantData') || [],
      db.getItem('basicEducationData') || [],
      db.getItem('advancedEducationData') || [],
      db.getItem('institutionData') || []
    ]);
    
    console.log('📊 기존 데이터 수집 완료:');
    console.log(`- 종사자: ${employeeData.length}명`);
    console.log(`- 참가자: ${participantData.length}명`);
    console.log(`- 기본교육: ${basicEducationData.length}개`);
    console.log(`- 심화교육: ${advancedEducationData.length}개`);
    console.log(`- 기관: ${institutionData.length}개`);
    
    // 오늘 날짜로 첫 번째 스냅샷 생성
    const today = new Date().toISOString().split('T')[0];
    
    await snapshotManager.createSnapshot(
      today,
      {
        employeeData,
        participantData,
        basicEducationData,
        advancedEducationData,
        institutionData
      },
      '기존 데이터 마이그레이션 - 첫 번째 스냅샷'
    );
    
    console.log(`✅ 마이그레이션 완료! ${today} 날짜로 첫 번째 스냅샷이 생성되었습니다.`);
    
    // 현재 스냅샷 확인
    const currentSnapshot = await snapshotManager.getCurrentSnapshot();
    if (currentSnapshot) {
      console.log('🎯 현재 활성 스냅샷:', currentSnapshot.date);
      console.log('📋 메타데이터:', currentSnapshot.metadata);
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}

// 실행
migrateToSnapshot();