// 캐비넷 프로젝트를 꿀단지로 복사하는 임시 스크립트

async function copyCabinetToTrash() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 캐비넷 → 꿀단지 복사 시작...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const cabinetIconIds = ['C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07',
                          'C10', 'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17'];
  
  let copiedCount = 0;
  let skippedCount = 0;
  
  for (const cabinetIconId of cabinetIconIds) {
    const cabinetStorageKey = `projectData_${cabinetIconId}`;
    
    // 캐비넷 데이터 로드
    const cabinetData = await loadProjectFromDB(cabinetStorageKey);
    
    if (cabinetData) {
      // 꿀단지 iconId로 변경 (C → T)
      const trashIconId = cabinetIconId.replace('C', 'T');
      const trashStorageKey = `projectData_${trashIconId}`;
      
      // 데이터 복사 (iconId만 변경)
      const trashData = {
        ...cabinetData,
        iconId: trashIconId,
        gridPosition: cabinetData.gridPosition  // 동일한 그리드 위치
      };
      
      // 꿀단지에 저장
      await saveProjectToDB(trashStorageKey, trashData);
      
      console.log(`✅ ${cabinetIconId} → ${trashIconId} 복사됨: ${cabinetData.projectName?.text || cabinetIconId}`);
      console.log(`   - Base64: ${cabinetData.mainImage ? '✅' : '❌'}`);
      console.log(`   - 경로: ${cabinetData.mainImagePath || '(없음)'}`);
      console.log(`   - 추가 이미지: ${cabinetData.additionalImages?.length || 0}개`);
      copiedCount++;
    } else {
      console.log(`⏭️ ${cabinetIconId} 건너뜀 (데이터 없음)`);
      skippedCount++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 복사 완료 요약:');
  console.log(`   복사됨: ${copiedCount}개`);
  console.log(`   건너뜀: ${skippedCount}개 (데이터 없음)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (copiedCount > 0) {
    alert(`✅ 캐비넷 → 꿀단지 복사 완료!\n\n${copiedCount}개 프로젝트가 꿀단지로 복사되었습니다.\n\n관리자 → 꿀단지 메뉴에서 확인할 수 있습니다.`);
    
    // 페이지 새로고침하여 변경사항 반영
    console.log('🔄 페이지 새로고침 중...');
    setTimeout(() => {
      location.reload();
    }, 1000);
  } else {
    alert('⚠️ 복사할 캐비넷 프로젝트가 없습니다.');
  }
}

// 스크립트 로드 시 자동 실행
console.log('🚀 캐비넷 → 꿀단지 복사 스크립트 로드됨');
console.log('💡 실행하려면 콘솔에서 copyCabinetToTrash() 입력');

