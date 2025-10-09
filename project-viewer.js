// ==================== 프로젝트 뷰어 (메인화면 아이콘 더블클릭 시 표시) ====================

// 프로젝트 데이터 표시
async function displayProjectData(iconId) {
  console.log(`${iconId} 프로젝트 데이터 로드 시작`);
  
  // 기존 프로젝트 요소들 완전히 제거 (중복 방지)
  console.log('🧹 기존 프로젝트 요소 제거 중...');
  const mainImageBg = document.getElementById('projectMainImageBg');
  const designOverview = document.getElementById('projectDesignOverview');
  const textOverlay = document.getElementById('projectTextOverlay');
  const additionalImageDisplay = document.getElementById('additionalImageDisplay');
  const arrowUp = document.getElementById('imageNavigatorArrowUp');
  const arrowDown = document.getElementById('imageNavigatorArrowDown');
  
  if (mainImageBg) mainImageBg.remove();
  if (designOverview) designOverview.remove();
  if (textOverlay) textOverlay.remove();
  if (additionalImageDisplay) additionalImageDisplay.remove();
  if (arrowUp) arrowUp.remove();
  if (arrowDown) arrowDown.remove();
  console.log('✅ 기존 프로젝트 요소 제거 완료');
  
  // IndexedDB에서 데이터 로드
  const storageKey = `projectData_${iconId}`;
  
  // manager-mainscreen.js의 loadProjectFromDB 함수 사용
  const projectData = await loadProjectFromDB(storageKey);
  
  if (!projectData) {
    console.log(`${iconId}에 저장된 프로젝트 데이터가 없습니다.`);
    showNoDataMessage(iconId);
    return;
  }
  
  console.log('프로젝트 데이터 로드됨:', projectData);
  
  // 대표 이미지 표시
  if (projectData.mainImage) {
    displayMainImageOnScreen(projectData);
  }
  
  // 텍스트 오버레이
  displayProjectTextOverlay(projectData);
  
  // 추가 이미지가 있으면 상하 화살표 표시 (메인 이미지 포함 루프)
  if (projectData.additionalImages && projectData.additionalImages.length > 0) {
    showAdditionalImagesNavigator(projectData.additionalImages, projectData);
  }
}

// 인덱스로 이미지 표시 (메인 또는 추가) - 페이드 효과 적용
function showImageByIndex(allImages, index) {
  const imageInfo = allImages[index];
  
  if (imageInfo.type === 'main') {
    // 메인 이미지로 전환
    console.log('메인 이미지로 전환');
    
    // 추가 이미지 즉시 숨김
    const existingAdditional = document.getElementById('additionalImageDisplay');
    if (existingAdditional) {
      existingAdditional.style.display = 'none';
      existingAdditional.style.visibility = 'hidden';
      existingAdditional.style.zIndex = '-1';
    }
    
    // 메인 이미지 즉시 표시
    const mainImageBg = document.getElementById('projectMainImageBg');
    if (mainImageBg) {
      mainImageBg.style.display = 'flex';
      mainImageBg.style.visibility = 'visible';
      mainImageBg.style.zIndex = '1500';
      mainImageBg.style.opacity = '1';
    }
    
    // 텍스트 오버레이 즉시 표시
    const textOverlay = document.getElementById('projectTextOverlay');
    if (textOverlay) {
      textOverlay.style.display = 'block';
      textOverlay.style.visibility = 'visible';
      textOverlay.style.zIndex = '1550';
      textOverlay.style.opacity = '1';
    }
  } else {
    // 추가 이미지로 전환
    console.log(`추가 이미지 ${imageInfo.data.index}로 전환`);
    
    // 메인 이미지 즉시 숨김
    const mainImageBg = document.getElementById('projectMainImageBg');
    if (mainImageBg) {
      mainImageBg.style.display = 'none';
      mainImageBg.style.visibility = 'hidden';
      mainImageBg.style.zIndex = '-1';
    }
    
    // 텍스트 오버레이 즉시 숨김
    const textOverlay = document.getElementById('projectTextOverlay');
    if (textOverlay) {
      textOverlay.style.display = 'none';
      textOverlay.style.visibility = 'hidden';
      textOverlay.style.zIndex = '-1';
    }
    
    // 추가 이미지 표시 (즉시)
    showAdditionalImage(imageInfo.data, imageInfo.data.index);
  }
}

// 데이터 없음 메시지
function showNoDataMessage(iconId) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
  `;
  
  const icon = document.createElement('div');
  icon.style.cssText = 'font-size: 48px; margin-bottom: 15px;';
  icon.textContent = '📭';
  
  const title = document.createElement('h3');
  title.style.cssText = 'margin: 0 0 10px 0; color: #2c3e50;';
  title.textContent = '프로젝트 데이터 없음';
  
  const message = document.createElement('p');
  message.style.cssText = 'color: #7f8c8d; margin-bottom: 20px;';
  message.textContent = `${iconId}에 저장된 데이터가 없습니다.`;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '확인';
  closeBtn.style.cssText = `
    padding: 10px 24px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  `;
  closeBtn.onclick = () => {
    console.log('확인 버튼 클릭됨');
    overlay.remove();
  };
  
  overlay.appendChild(icon);
  overlay.appendChild(title);
  overlay.appendChild(message);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  
  console.log('데이터 없음 팝업 표시됨');
}

// 스크린에 대표 이미지 표시 (원본 크기)
function displayMainImageOnScreen(projectData) {
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : 440;
  const screenAbsY = screenTop ? parseInt(screenTop) : 80;
  
  const SCREEN_WIDTH = projectScreen.naturalWidth || 1800;
  const SCREEN_HEIGHT = projectScreen.naturalHeight || 1100;
  
  // 메인 이미지 배치 영역: y+45부터 마진 없이 꽉 차게
  const imageAreaX = screenAbsX;
  const imageAreaY = screenAbsY + 45;  // 스크린 상단에서 45px 아래
  const imageAreaWidth = SCREEN_WIDTH;
  const imageAreaHeight = SCREEN_HEIGHT - 45;  // y+45부터 스크린 끝까지
  
  // 배경 컨테이너 (검은색)
  const bgContainer = document.createElement('div');
  bgContainer.id = 'projectMainImageBg';
  bgContainer.className = 'screen-content-element';
  bgContainer.style.cssText = `
    position: absolute;
    left: ${imageAreaX}px;
    top: ${imageAreaY}px;
    z-index: 1500;
    width: ${imageAreaWidth}px;
    height: ${imageAreaHeight}px;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
  `;
  
  // 이미지 엘리먼트 생성
  const img = document.createElement('img');
  img.id = 'projectMainImage';
  img.src = projectData.mainImage;
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
  `;
  
  img.onload = () => {
    console.log(`✅ 대표 이미지 로드 완료: ${img.naturalWidth}x${img.naturalHeight}`);
    console.log(`📍 메인 이미지 위치: left=${imageAreaX}, top=${imageAreaY}`);
    console.log(`📐 메인 이미지 크기: ${imageAreaWidth}x${imageAreaHeight}`);
  };
  
  bgContainer.appendChild(img);
  container.appendChild(bgContainer);
}

// 텍스트 오버레이 표시
function displayProjectTextOverlay(projectData) {
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : 440;
  const screenAbsY = screenTop ? parseInt(screenTop) : 80;
  
  // 설계개요는 마진 바로 위쪽 (screenAbsY + 45 - 30)
  const designOverviewY = screenAbsY + 15;
  
  // 나머지 텍스트는 마진 안쪽 (screenAbsX + 60, screenAbsY + 100)
  const textGridStartX = screenAbsX + 60;
  const textGridStartY = screenAbsY + 100;
  
  // 설계개요 고정 텍스트 (마진 라인 바로 위쪽)
  const designOverviewContainer = document.createElement('div');
  designOverviewContainer.id = 'projectDesignOverview';
  designOverviewContainer.className = 'screen-content-element';
  designOverviewContainer.style.cssText = `
    position: absolute;
    left: ${screenAbsX + 60}px;
    top: ${designOverviewY}px;
    z-index: 1550;
    font-family: 'WAGURI', sans-serif;
    pointer-events: none;
    opacity: 1;
    visibility: visible;
  `;
  
  const designOverviewText = document.createElement('div');
  const designOverviewColor = projectData.designOverview?.color || '#ffffff';
  designOverviewText.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    color: ${designOverviewColor};
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  `;
  designOverviewText.textContent = '설계개요';
  designOverviewContainer.appendChild(designOverviewText);
  
  // iconContainer에 추가
  const container = document.getElementById('iconContainer');
  if (container) {
    container.appendChild(designOverviewContainer);
    console.log('✅ 설계개요 텍스트 표시됨:', designOverviewColor);
  } else {
    console.error('❌ iconContainer를 찾을 수 없습니다.');
  }
  
  // 나머지 텍스트 컨테이너 (마진 안쪽)
  const textContainer = document.createElement('div');
  textContainer.id = 'projectTextOverlay';
  textContainer.className = 'screen-content-element';
  textContainer.style.cssText = `
    position: absolute;
    left: ${textGridStartX}px;
    top: ${textGridStartY}px;
    z-index: 1550;
    font-family: 'WAGURI', sans-serif;
    pointer-events: none;
    opacity: 1;
    visibility: visible;
  `;
  
  // 사업명 (18px, bold)
  if (projectData.projectName && projectData.projectName.text) {
    const bText = document.createElement('div');
    const yearRange = projectData.projectName.startYear || projectData.projectName.endYear 
      ? ` (${projectData.projectName.startYear || ''} ~ ${projectData.projectName.endYear || ''})` 
      : '';
    bText.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.projectName.color};
      margin-bottom: 12px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    `;
    bText.textContent = `${projectData.projectName.text}${yearRange}`;
    textContainer.appendChild(bText);
  }
  
  // 주용도, 대지위치, 건축면적, 연면적 (18px, bold)
  const items = [
    { key: 'usage', label: '주용도' },
    { key: 'location', label: '대지위치' },
    { key: 'buildingArea', label: '건축면적' },
    { key: 'totalArea', label: '연면적' }
  ];
  
  items.forEach(item => {
    if (projectData[item.key] && projectData[item.key].text) {
      const div = document.createElement('div');
      div.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: ${projectData[item.key].color};
        margin-bottom: 10px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      `;
      div.textContent = `${item.label}: ${projectData[item.key].text}`;
      textContainer.appendChild(div);
    }
  });
  
  // 설계자 (18px, bold)
  if (projectData.designers && projectData.designers.length > 0) {
    const gText = document.createElement('div');
    gText.style.cssText = 'margin-top: 15px; margin-bottom: 10px;';
    
    projectData.designers.forEach((designer, index) => {
      const designerDiv = document.createElement('div');
      designerDiv.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: ${designer.color};
        margin-bottom: 8px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      `;
      const prefix = index === 0 ? '설계자: ' : '      ';
      designerDiv.textContent = `${prefix}${designer.field} - ${designer.office}`;
      gText.appendChild(designerDiv);
    });
    
    textContainer.appendChild(gText);
  }
  
  // 담당업무 (18px, bold)
  if (projectData.staff && projectData.staff.length > 0) {
    const hText = document.createElement('div');
    hText.style.cssText = 'margin-top: 15px;';
    
    projectData.staff.forEach((member, index) => {
      const staffDiv = document.createElement('div');
      staffDiv.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: ${member.color};
        margin-bottom: 8px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      `;
      const prefix = index === 0 ? '담당업무: ' : '         ';
      staffDiv.textContent = `${prefix}${member.name} ${member.position} - ${member.role}`;
      hText.appendChild(staffDiv);
    });
    
    textContainer.appendChild(hText);
  }
  
  // iconContainer에 추가
  const iconContainer = document.getElementById('iconContainer');
  if (iconContainer) {
    iconContainer.appendChild(textContainer);
    console.log('✅ 텍스트 오버레이 표시됨');
  } else {
    console.error('❌ iconContainer를 찾을 수 없습니다.');
  }
}

// 추가 이미지 네비게이터 (상하 화살표) - 메인 이미지 포함 루프
function showAdditionalImagesNavigator(images, mainImageData) {
  console.log('이미지 네비게이터 표시: 메인 + 추가', images.length, '개');
  
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : 440;
  const screenAbsY = screenTop ? parseInt(screenTop) : 80;
  const screenWidth = projectScreen.naturalWidth || 1800;
  const screenHeight = projectScreen.naturalHeight || 1100;
  
  // 메인 이미지를 포함한 전체 이미지 배열
  const allImages = [
    { type: 'main', data: mainImageData },
    ...images.map(img => ({ type: 'additional', data: img }))
  ];
  
  let currentImageIndex = 0;  // 메인 이미지부터 시작
  
  // 화살표 이미지 로드하여 원본 크기 확인
  const SCREEN_MARGIN_TOP = 100;
  const SCREEN_MARGIN_BOTTOM = 60;
  
  // 위쪽 화살표 (icon_arrow1.png) - 원본 사이즈
  const arrowUp = document.createElement('img');
  arrowUp.id = 'imageNavigatorArrowUp';
  arrowUp.className = 'screen-content-element';
  arrowUp.src = 'images/icon_arrow1.png';
  arrowUp.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 1700;
    transition: all 0.5s ease;
  `;
  arrowUp.title = '이전 이미지';
  
  arrowUp.onload = () => {
    const arrowWidth = arrowUp.naturalWidth;
    const arrowHeight = arrowUp.naturalHeight;
    // 마진 경계(y=SCREEN_MARGIN_TOP)에서 -30px, 화살표 중앙이 그 위치에
    const arrowCenterY = screenAbsY + SCREEN_MARGIN_TOP - 30;
    arrowUp.style.left = (screenAbsX + screenWidth/2 - arrowWidth/2) + 'px';
    arrowUp.style.top = (arrowCenterY - arrowHeight/2) + 'px';
    console.log(`위 화살표: 원본 ${arrowWidth}x${arrowHeight}, 중앙 Y=${arrowCenterY}`);
  };
  
  arrowUp.onmouseenter = () => {
    arrowUp.style.transform = 'scale(1.1)';
  };
  arrowUp.onmouseleave = () => {
    arrowUp.style.transform = 'scale(1)';
  };
  
  arrowUp.onclick = () => {
    currentImageIndex--;
    if (currentImageIndex < 0) {
      currentImageIndex = allImages.length - 1;
    }
    showImageByIndex(allImages, currentImageIndex);
  };
  
  // 아래쪽 화살표 (icon_arrow2.png) - 원본 사이즈
  const arrowDown = document.createElement('img');
  arrowDown.id = 'imageNavigatorArrowDown';
  arrowDown.className = 'screen-content-element';
  arrowDown.src = 'images/icon_arrow2.png';
  arrowDown.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 1700;
    transition: all 0.5s ease;
  `;
  arrowDown.title = '다음 이미지';
  
  arrowDown.onload = () => {
    const arrowWidth = arrowDown.naturalWidth;
    const arrowHeight = arrowDown.naturalHeight;
    // 마진 경계(y=SCREEN_HEIGHT - SCREEN_MARGIN_BOTTOM)에서 +30px, 화살표 중앙이 그 위치에
    const arrowCenterY = screenAbsY + screenHeight - SCREEN_MARGIN_BOTTOM + 30;
    arrowDown.style.left = (screenAbsX + screenWidth/2 - arrowWidth/2) + 'px';
    arrowDown.style.top = (arrowCenterY - arrowHeight/2) + 'px';
    console.log(`아래 화살표: 원본 ${arrowWidth}x${arrowHeight}, 중앙 Y=${arrowCenterY}`);
  };
  
  arrowDown.onmouseenter = () => {
    arrowDown.style.transform = 'scale(1.1)';
  };
  arrowDown.onmouseleave = () => {
    arrowDown.style.transform = 'scale(1)';
  };
  
  arrowDown.onclick = () => {
    currentImageIndex++;
    if (currentImageIndex >= allImages.length) {
      currentImageIndex = 0;
    }
    showImageByIndex(allImages, currentImageIndex);
  };
  
  container.appendChild(arrowUp);
  container.appendChild(arrowDown);
  
  // 마우스 휠 스크롤 이벤트 추가
  const handleWheel = (e) => {
    // 관리자 UI가 열려있으면 스크롤 비활성화
    const managerOverlay = document.getElementById('managerOverlay');
    if (managerOverlay) {
      return; // 관리자 UI가 활성화되어 있으면 스크롤 무시
    }
    
    // 프로젝트 스크린 영역 내에서만 작동
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const screenRect = projectScreen.getBoundingClientRect();
    
    if (mouseX >= screenRect.left && mouseX <= screenRect.right &&
        mouseY >= screenRect.top && mouseY <= screenRect.bottom) {
      e.preventDefault();
      
      if (e.deltaY > 0) {
        // 아래로 스크롤 -> 다음 이미지
        currentImageIndex++;
        if (currentImageIndex >= allImages.length) {
          currentImageIndex = 0;
        }
      } else {
        // 위로 스크롤 -> 이전 이미지
        currentImageIndex--;
        if (currentImageIndex < 0) {
          currentImageIndex = allImages.length - 1;
        }
      }
      
      showImageByIndex(allImages, currentImageIndex);
    }
  };
  
  window.addEventListener('wheel', handleWheel, { passive: false });
  console.log('마우스 휠 스크롤 이벤트 추가됨');
  
  // 네비게이터 데이터 저장 (다른 함수에서 접근 가능하도록)
  window.imageNavigatorData = {
    allImages: allImages,
    getCurrentIndex: () => currentImageIndex,
    setCurrentIndex: (index) => { currentImageIndex = index; }
  };
}

// 추가 이미지 표시 (페이드 효과)
function showAdditionalImage(imageData, index) {
  console.log(`추가 이미지 ${index} 표시:`, imageData);
  
  // 기존 추가 이미지가 있으면 재사용, 없으면 생성
  let existingImage = document.getElementById('additionalImageDisplay');
  if (existingImage) {
    // 현재 스크린 위치 가져오기
    const screenLeft = projectScreen.style.left;
    const screenTop = projectScreen.style.top;
    const screenAbsX = screenLeft ? parseInt(screenLeft) : 440;
    const screenAbsY = screenTop ? parseInt(screenTop) : 80;
    
    // 위치 업데이트
    const imageAreaX = screenAbsX;
    const imageAreaY = screenAbsY + 45;
    existingImage.style.left = imageAreaX + 'px';
    existingImage.style.top = imageAreaY + 'px';
    console.log(`🔄 추가 이미지 위치 업데이트: left=${imageAreaX}, top=${imageAreaY}`);
    
    // 기존 이미지 즉시 교체 (페이드 효과 없음)
    const img = existingImage.querySelector('img');
    if (img) {
      const newSrc = imageData.imageData || imageData.src;
      img.src = newSrc;
      console.log('추가 이미지 교체:', newSrc);
    }
    
    // 설명 텍스트 업데이트
    const descText = existingImage.querySelector('.additional-image-desc');
    if (descText) {
      descText.remove();
    }
    
    if (imageData.description && imageData.description.text) {
      const newDescText = document.createElement('div');
      newDescText.className = 'additional-image-desc';
      newDescText.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        font-size: 20px;
        font-weight: bold;
        color: ${imageData.description.color || '#ffffff'};
        font-family: 'WAGURI', sans-serif;
        background: rgba(255, 255, 255, 0.9);
        padding: 3px 15px;
        border-radius: 8px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        line-height: 1.2;
        display: inline-block;
        max-width: calc(100% - 40px);
        z-index: 1700;
      `;
      newDescText.textContent = imageData.description.text;
      existingImage.appendChild(newDescText);
    }
    
    // 즉시 표시
    existingImage.style.display = 'flex';
    existingImage.style.visibility = 'visible';
    existingImage.style.zIndex = '1650';
    existingImage.style.opacity = '1';
    return;
  }
  
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : 440;
  const screenAbsY = screenTop ? parseInt(screenTop) : 80;
  
  const SCREEN_WIDTH = projectScreen.naturalWidth || 1800;
  const SCREEN_HEIGHT = projectScreen.naturalHeight || 1100;
  
  // 추가 이미지 배치 영역: y+45부터 마진 없이 꽉 차게 (메인과 동일)
  const imageAreaX = screenAbsX;
  const imageAreaY = screenAbsY + 45;  // y+45부터 시작
  const imageAreaWidth = SCREEN_WIDTH;
  const imageAreaHeight = SCREEN_HEIGHT - 45;
  
  // 이미지 컨테이너 (검은색 배경) - 즉시 표시
  const imageContainer = document.createElement('div');
  imageContainer.id = 'additionalImageDisplay';
  imageContainer.className = 'screen-content-element';  // 스크린과 함께 이동
  imageContainer.style.cssText = `
    position: absolute;
    left: ${imageAreaX}px;
    top: ${imageAreaY}px;
    z-index: 1650;
    width: ${imageAreaWidth}px;
    height: ${imageAreaHeight}px;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
  `;
  
  // 이미지
  const img = document.createElement('img');
  img.src = imageData.imageData || imageData.src;
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
  `;
  
  img.onload = () => {
    console.log(`✅ 추가 이미지 로드 완료: ${img.naturalWidth}x${img.naturalHeight}`);
    console.log(`📍 추가 이미지 위치: left=${imageAreaX}, top=${imageAreaY}`);
    console.log(`📐 추가 이미지 크기: ${imageAreaWidth}x${imageAreaHeight}`);
  };
  
  imageContainer.appendChild(img);
  
  // 설명 텍스트 (있는 경우)
  if (imageData.description && imageData.description.text) {
    const descText = document.createElement('div');
    descText.className = 'additional-image-desc';
    descText.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 20px;
      font-weight: bold;
      color: ${imageData.description.color};
      background: rgba(255, 255, 255, 0.9);
      padding: 3px 15px;
      border-radius: 8px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
      line-height: 1.2;
      display: inline-block;
      max-width: calc(100% - 40px);
    `;
    descText.textContent = imageData.description.text;
    imageContainer.appendChild(descText);
  }
  
  container.appendChild(imageContainer);
  
  // 즉시 표시 (페이드 효과 없음)
  imageContainer.style.opacity = '1';
}

console.log('%c✅ 프로젝트 뷰어 모듈 로드됨', 'color: #27ae60; font-weight: bold; font-size: 14px;');

