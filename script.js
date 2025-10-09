const container = document.getElementById("iconContainer");
const icons = document.querySelectorAll(".icon-wrapper");
const resetBtn = document.getElementById("resetBtn");
const screenResetBtn = document.getElementById("screenResetBtn");
const screenMinimizeBtn = document.getElementById("screenMinimizeBtn");
const arrowTop = document.getElementById("arrowTop");
const arrowBottom = document.getElementById("arrowBottom");
const projectScreen = document.querySelector(".project-screen");

let dragging = null;
let startX, startY, origX, origY;
let initialPositions = {};
let screenIconInitialPositions = {}; // 스크린 내부 아이콘 초기 위치 저장
let afIndex = 0; // A~G 올라온 개수
let isResponsive = false; // 반응형 모드 여부
let isFirstLoad = true; // 최초 로드 여부
let imageSizes = {}; // 이미지 크기 저장
let isScreenMinimized = false; // 스크린 최소화 상태

// 그리드 설정 (컨테이너 전체)
const GRID_X = 120;
const GRID_Y = 160;
const GRID_START_X = 80;  // 첫 번째 그리드 셀의 시작점
const GRID_START_Y = 80;
const MARGIN = 80;
const CONTAINER_WIDTH = 2560;
const CONTAINER_HEIGHT = 1440;

// 프로젝트 스크린 그리드 설정
const SCREEN_GRID_X = 120;
const SCREEN_GRID_Y = 160;
const SCREEN_MARGIN_LEFT = 60;
const SCREEN_MARGIN_RIGHT = 60;
const SCREEN_MARGIN_TOP = 100;
const SCREEN_MARGIN_BOTTOM = 60;
const SCREEN_DEFAULT_X = 440;  // 그리드 3,0의 X좌표 (80 + 3*120)
const SCREEN_DEFAULT_Y = 80;   // 그리드 0,0의 Y좌표 (80 + 0*160)
const SCREEN_DEFAULT_WIDTH = 1800;  // 프로젝트 스크린 기본 크기
const SCREEN_DEFAULT_HEIGHT = 1100;

// 각 아이콘의 그리드 위치 (위치별 이니셜 기반)
const iconGridPositions = {
  // 메인화면 왼쪽 (Main: M00-M07)
  'M00': { gridX: 0, gridY: 0 },
  'M01': { gridX: 0, gridY: 1 },
  'M02': { gridX: 0, gridY: 2 },
  'M03': { gridX: 0, gridY: 3 },
  'M04': { gridX: 0, gridY: 4 },
  'M05': { gridX: 0, gridY: 5 },
  'M06': { gridX: 0, gridY: 6 },
  'M07': { gridX: 0, gridY: 7 },
  // 메인화면 왼쪽 A~H (Main: M10-M17)
  'M10': { gridX: 1, gridY: 0 },
  'M11': { gridX: 1, gridY: 1 },
  'M12': { gridX: 1, gridY: 2 },
  'M13': { gridX: 1, gridY: 3 },
  'M14': { gridX: 1, gridY: 4 },
  'M15': { gridX: 1, gridY: 5 },
  'M16': { gridX: 1, gridY: 6 },
  'M17': { gridX: 1, gridY: 7 },
  // 오른쪽 특수 아이콘
  'cabinet': { gridX: 19, gridY: 0 },    // 캐비넷
  'favorites': { gridX: 19, gridY: 1 },  // 즐겨찾기 (Favorites)
  'manager': { gridX: 19, gridY: 2 },    // 관리자 (Manager)
  'park': { gridX: 17, gridY: 7 },       // 공원 (Park)
  'yong': { gridX: 16, gridY: 7 },       // 용 (yLong -> L)
  'trash': { gridX: 19, gridY: 7 }       // 장독대 (Jang)
};

// 그리드 좌표를 픽셀 좌표로 변환 (X: 중앙 정렬, Y: 상단 정렬)
function gridToPixel(gridX, gridY, imageWidth, imageHeight) {
  const centerX = GRID_START_X + (gridX * GRID_X) + (GRID_X / 2);
  const topY = GRID_START_Y + (gridY * GRID_Y);  // Y축은 그리드 상단에 맞춤
  
  return {
    x: centerX - (imageWidth / 2),
    y: topY  // 아이콘 상단을 그리드 상단에 정렬
  };
}

// 프로젝트 스크린 그리드 좌표를 픽셀 좌표로 변환 (중앙 정렬)
function screenGridToPixel(screenGridX, screenGridY, imageWidth, imageHeight) {
  // 스크린의 절대 위치 계산
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  
  // 스크린 내부 그리드의 시작점 계산
  const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
  const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
  
  // 그리드 좌표를 픽셀 좌표로 변환
  const centerX = screenGridStartX + (screenGridX * SCREEN_GRID_X) + (SCREEN_GRID_X / 2);
  const centerY = screenGridStartY + (screenGridY * SCREEN_GRID_Y) + (SCREEN_GRID_Y / 2);
  
  return {
    x: centerX - (imageWidth / 2),
    y: centerY - (imageHeight / 2)
  };
}

// 픽셀 좌표를 프로젝트 스크린 그리드 좌표로 변환
function pixelToScreenGrid(pixelX, pixelY, imageWidth, imageHeight) {
  // 스크린의 절대 위치 계산
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  
  // 스크린 내부 그리드의 시작점 계산
  const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
  const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
  
  // 아이콘의 중심점 계산
  const centerX = pixelX + (imageWidth / 2);
  const centerY = pixelY + (imageHeight / 2);
  
  // 그리드 좌표로 변환
  const gridX = Math.round((centerX - screenGridStartX - SCREEN_GRID_X/2) / SCREEN_GRID_X);
  const gridY = Math.round((centerY - screenGridStartY - SCREEN_GRID_Y/2) / SCREEN_GRID_Y);
  
  return { gridX, gridY };
}

// 스크린 그리드 범위 계산
function getScreenGridBounds() {
  // 스크린의 실제 크기 계산
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
  
  // 그리드 영역 크기 계산
  const gridAreaWidth = screenWidth - SCREEN_MARGIN_LEFT - SCREEN_MARGIN_RIGHT;
  const gridAreaHeight = screenHeight - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM;
  
  // 그리드 개수 계산
  const maxGridX = Math.floor(gridAreaWidth / SCREEN_GRID_X) - 1;
  const maxGridY = Math.floor(gridAreaHeight / SCREEN_GRID_Y) - 1;
  
  return {
    minGridX: 0,
    minGridY: 0,
    maxGridX: maxGridX,
    maxGridY: maxGridY
  };
}

// 스크린 내부 이미지 충돌 감지
function checkScreenImageCollision(gridX, gridY, excludeWrapper = null) {
  const screenWrappers = document.querySelectorAll('.screen-icon-wrapper');
  
  for (let wrapper of screenWrappers) {
    if (wrapper === excludeWrapper) continue;
    
    const wrapperX = parseInt(wrapper.style.left);
    const wrapperY = parseInt(wrapper.style.top);
    const img = wrapper.querySelector('.screen-content-image-element');
    if (!img) continue;
    
    const imgWidth = img.naturalWidth || parseInt(img.style.width) || 120;
    const imgHeight = img.naturalHeight || parseInt(img.style.height) || 160;
    
    const wrapperGrid = pixelToScreenGrid(wrapperX, wrapperY, imgWidth, imgHeight);
    
    // 그리드 위치가 겹치는지 확인
    if (wrapperGrid.gridX === gridX && wrapperGrid.gridY === gridY) {
      return true;
    }
  }
  
  return false;
}

// 스크린 초기화 버튼 위치 업데이트
function updateScreenResetButtonPosition() {
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  
  // 스크린 우측 상단 내부에 배치 (스크린 내부 오른쪽에서 15px, 위에서 15px)
  screenResetBtn.style.left = (screenAbsX + screenWidth - 60) + 'px';
  screenResetBtn.style.top = (screenAbsY + 55) + 'px';
}

// 스크린 최소화 버튼 위치 업데이트
function updateScreenMinimizeButtonPosition() {
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  
  // 현재 스크린의 실제 표시 크기 사용 (최소화 시에도 정확한 위치)
  const screenWidth = projectScreen.offsetWidth || projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  
  // 초기화 버튼 왼쪽에 배치 (초기화 버튼 width는 약 45px)
  screenMinimizeBtn.style.left = (screenAbsX + screenWidth - 115) + 'px';
  screenMinimizeBtn.style.top = (screenAbsY + 55) + 'px';
}

// 스크린 내부에 아이콘 이름 표시
function showScreenTitle(iconName) {
  // 기존 타이틀 제거
  const existingTitle = document.getElementById('screenIconTitle');
  if (existingTitle) {
    existingTitle.remove();
  }
  
  // 타이틀 엘리먼트 생성
  const title = document.createElement('div');
  title.id = 'screenIconTitle';
  title.className = 'screen-icon-title';
  title.textContent = iconName;
  
  // 스크린 위치 계산
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  
  // 스크린 좌측 상단 내부에 배치
  title.style.position = 'absolute';
  title.style.left = (screenAbsX + SCREEN_MARGIN_LEFT) + 'px';
  title.style.top = (screenAbsY + 10) + 'px';
  title.style.zIndex = '1650';
  
  container.appendChild(title);
  
  console.log(`스크린 타이틀 표시: ${iconName}`);
}

// 스크린 타이틀 위치 업데이트
function updateScreenTitlePosition() {
  const title = document.getElementById('screenIconTitle');
  if (!title) return;
  
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  
  title.style.left = (screenAbsX + SCREEN_MARGIN_LEFT) + 'px';
  title.style.top = (screenAbsY + 10) + 'px';  // showScreenTitle과 동일한 값으로 통일
}

// 스크린에 이미지 로딩하는 함수 (레이블 포함)
function loadImageToScreen(imagePath, screenGridX, screenGridY, imageId, labelText = '') {
  // 기존 래퍼가 있으면 제거
  const existingWrapper = document.getElementById(imageId + '_wrapper');
  if (existingWrapper) {
    existingWrapper.remove();
  }
  
  // 래퍼 생성
  const wrapper = document.createElement('div');
  wrapper.id = imageId + '_wrapper';
  wrapper.className = 'screen-icon-wrapper';
  wrapper.style.position = 'absolute';
  wrapper.style.zIndex = '1550';
  wrapper.style.cursor = 'grab';
  wrapper.style.transition = 'all 0.5s ease';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '4px';
  
  // 이미지 생성
  const img = new Image();
  img.id = imageId;
  img.src = imagePath;
  img.className = 'screen-content-image-element';
  img.style.display = 'block';
  img.style.pointerEvents = 'none';
  
  img.onload = function() {
    console.log(`이미지 로드 성공: ${imagePath}`);
    
    const imageWidth = img.naturalWidth;
    const imageHeight = img.naturalHeight;
    
    // 스크린 위치 계산
    const screenLeft = projectScreen.style.left;
    const screenTop = projectScreen.style.top;
    const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
    const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
    const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
    const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
    
    // x 좌표는 그리드 중앙 정렬, y 좌표는 그리드 상단 정렬
    const finalX = screenGridStartX + (screenGridX * SCREEN_GRID_X) + (SCREEN_GRID_X / 2) - (imageWidth / 2);
    const finalY = screenGridStartY + (screenGridY * SCREEN_GRID_Y); // 이미지 상단을 그리드 상단에 맞춤
    
    wrapper.style.left = finalX + 'px';
    wrapper.style.top = finalY + 'px';
    
    // 초기 위치 저장
    screenIconInitialPositions[imageId] = {
      gridX: screenGridX,
      gridY: screenGridY,
      left: finalX,
      top: finalY,
      labelText: labelText
    };
    
    // 레이블 생성
    const label = document.createElement('div');
    label.className = 'screen-icon-label';
    label.textContent = labelText || `항목 ${screenGridY + 1}`;
    label.style.background = 'rgba(255, 255, 255, 0.8)';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '3px';
    label.style.fontSize = '12px';
    label.style.textAlign = 'center';
    label.style.minWidth = '60px';
    label.style.color = '#000';
    label.style.fontWeight = 'bold';
    label.style.border = '1px solid #ccc';
    label.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    wrapper.appendChild(img);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
    
    console.log(`래퍼 추가됨: ${wrapper.id}, 위치: (${finalX}, ${finalY})`);
    
    // 드래그 기능 추가
    setupScreenImageDrag(wrapper, imageWidth, imageHeight);
    
    console.log(`이미지 로딩 완료: ${imagePath} -> 스크린 그리드(${screenGridX}, ${screenGridY}) -> 픽셀(${finalX}, ${finalY})`);
  };
  
  img.onerror = function() {
    console.error(`이미지 로딩 실패: ${imagePath}`);
    console.warn(`파일을 확인하세요: ${imagePath}`);
  };
}

// 스크린 이미지 드래그 기능 설정 (래퍼 기반)
function setupScreenImageDrag(wrapper, imageWidth, imageHeight) {
  wrapper.addEventListener("mousedown", (e) => {
    if (dragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    dragging = wrapper;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = parseInt(wrapper.style.left);
    const origY = parseInt(wrapper.style.top);
    
    wrapper.style.cursor = 'grabbing';
    wrapper.style.opacity = '0.7';
    
    // 드래그 중에는 transition 비활성화
    wrapper.style.transition = 'none';
    
    const onMouseMove = (e) => {
      // 마우스 이동 거리만큼 래퍼 이동 (1:1 비율, 메인 아이콘과 동일)
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newX = origX + deltaX;
      const newY = origY + deltaY;
      
      wrapper.style.left = newX + "px";
      wrapper.style.top = newY + "px";
    };
    
    const onMouseUp = (e) => {
      wrapper.style.cursor = 'grab';
      wrapper.style.opacity = '1';
      
      // transition 복원
      wrapper.style.transition = 'all 0.5s ease';
      
      // 현재 위치를 스크린 그리드 좌표로 변환
      const currentX = parseInt(wrapper.style.left);
      const currentY = parseInt(wrapper.style.top);
      const grid = pixelToScreenGrid(currentX, currentY, imageWidth, imageHeight);
      const bounds = getScreenGridBounds();
      
      // 스크린 영역 밖으로 나갔는지 확인
      const screenStyleLeft = projectScreen.style.left;
      const screenStyleTop = projectScreen.style.top;
      const screenAbsX = screenStyleLeft ? parseInt(screenStyleLeft) : SCREEN_DEFAULT_X;
      const screenAbsY = screenStyleTop ? parseInt(screenStyleTop) : SCREEN_DEFAULT_Y;
      const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
      const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
      
      const screenLeft = screenAbsX + SCREEN_MARGIN_LEFT;
      const screenRight = screenAbsX + screenWidth - SCREEN_MARGIN_RIGHT;
      const screenTop = screenAbsY + SCREEN_MARGIN_TOP;
      const screenBottom = screenAbsY + screenHeight - SCREEN_MARGIN_BOTTOM;
      
      const wrapperCenterX = currentX + (imageWidth / 2);
      const wrapperCenterY = currentY + (imageHeight / 2);
      
      // 스크린 영역을 벗어났으면 원래 위치로 복귀
      if (wrapperCenterX < screenLeft || wrapperCenterX > screenRight || 
          wrapperCenterY < screenTop || wrapperCenterY > screenBottom) {
        console.log(`이미지 ${wrapper.id}: 스크린 영역 밖으로 드래그 -> 원래 위치로 복귀`);
        wrapper.style.left = origX + 'px';
        wrapper.style.top = origY + 'px';
      } else {
        // 그리드 경계 내로 제한
        grid.gridX = Math.max(bounds.minGridX, Math.min(grid.gridX, bounds.maxGridX));
        grid.gridY = Math.max(bounds.minGridY, Math.min(grid.gridY, bounds.maxGridY));
        
        // 충돌 체크
        if (checkScreenImageCollision(grid.gridX, grid.gridY, wrapper)) {
          console.log(`이미지 ${wrapper.id}: 그리드(${grid.gridX}, ${grid.gridY})에 다른 이미지 존재 -> 원래 위치로 복귀`);
          wrapper.style.left = origX + 'px';
          wrapper.style.top = origY + 'px';
        } else {
          // 픽셀 위치로 변환하여 적용 (그리드 상단에 정렬 - 이미지 y=0을 그리드 y=0에 맞춤)
          const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
          const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
          
          // x 좌표는 그리드 중앙 정렬, y 좌표는 그리드 상단 정렬
          const finalX = screenGridStartX + (grid.gridX * SCREEN_GRID_X) + (SCREEN_GRID_X / 2) - (imageWidth / 2);
          const finalY = screenGridStartY + (grid.gridY * SCREEN_GRID_Y); // 이미지 상단을 그리드 상단에 맞춤
          
          wrapper.style.left = finalX + 'px';
          wrapper.style.top = finalY + 'px';
          
          console.log(`이미지 스냅: ${wrapper.id} -> 스크린 그리드(${grid.gridX}, ${grid.gridY}) -> 픽셀(${finalX}, ${finalY})`);
        }
      }
      
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      dragging = null;
    };
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

// 여러 이미지를 스크린에 로딩하는 함수
function loadImagesToScreen(imagePathsArray) {
  imagePathsArray.forEach((item, index) => {
    loadImageToScreen(item.path, item.gridX, item.gridY, item.id);
  });
}

// 스크린 내부 모든 아이콘 제거
function clearAllScreenIcons() {
  // 모든 스크린 아이콘 래퍼 제거
  const allWrappers = document.querySelectorAll('.screen-icon-wrapper');
  allWrappers.forEach(wrapper => {
    wrapper.remove();
  });
  
  // 초기 위치 정보는 유지 (로딩 후 덮어쓰기)
  console.log('스크린 내부 모든 아이콘 제거 완료');
}

// 모든 스크린 콘텐츠 제거 (아이콘 + 이미지 + 텍스트)
function clearAllScreenContent() {
  console.log('🧹 모든 스크린 콘텐츠 초기화 시작');
  
  // 1. 스크린 아이콘 래퍼 제거
  const allWrappers = document.querySelectorAll('.screen-icon-wrapper');
  console.log(`제거할 아이콘 래퍼: ${allWrappers.length}개`);
  allWrappers.forEach(wrapper => wrapper.remove());
  
  // 2. 프로젝트 관련 요소들 제거
  const mainImageBg = document.getElementById('projectMainImageBg');
  const designOverview = document.getElementById('projectDesignOverview');
  const textOverlay = document.getElementById('projectTextOverlay');
  const additionalImageDisplay = document.getElementById('additionalImageDisplay');
  const arrowUp = document.getElementById('imageNavigatorArrowUp');
  const arrowDown = document.getElementById('imageNavigatorArrowDown');
  
  if (mainImageBg) {
    console.log('메인 이미지 제거');
    mainImageBg.remove();
  }
  if (designOverview) {
    console.log('설계개요 제거');
    designOverview.remove();
  }
  if (textOverlay) {
    console.log('텍스트 오버레이 제거');
    textOverlay.remove();
  }
  if (additionalImageDisplay) {
    console.log('추가 이미지 제거');
    additionalImageDisplay.remove();
  }
  if (arrowUp) {
    console.log('위쪽 화살표 제거');
    arrowUp.remove();
  }
  if (arrowDown) {
    console.log('아래쪽 화살표 제거');
    arrowDown.remove();
  }
  
  // 3. 스크린 타이틀 숨김
  const screenTitle = document.getElementById('screenTitle');
  if (screenTitle) {
    screenTitle.style.display = 'none';
  }
  
  console.log('✅ 모든 스크린 콘텐츠 초기화 완료');
  
  // 4. 스크린 그리드 다시 표시
  visualizeScreenGrid();
}

// 아이콘별 콘텐츠 로딩 함수 (통합)
function loadIconContent(iconId, iconType) {
  console.log(`📂 ${iconType} 콘텐츠 로딩 시작`);
  
  // 모든 스크린 콘텐츠 완전히 초기화 (프로젝트 이미지 포함)
  console.log('🧹 스크린 완전 초기화 시작...');
  clearAllScreenContent();
  
  // 초기 위치 정보 초기화 (새로운 아이콘을 위해)
  screenIconInitialPositions = {};
  console.log('✅ 스크린 완전 초기화 완료');
  
  // 폴더명 한글 매핑
  const folderNames = {
    'cabinet': '캐비넷',
    'favorites': '즐겨찾기',
    'trash': '장독대',
    'yong': '용',
    'park': '공원'
  };
  
  const folderName = folderNames[iconType] || iconType;
  
  // 이미지 로딩
  console.log(`${iconType} 더블클릭 - icon.png 로딩 시작`);
  
  // 짧은 지연 후 이미지 로딩 (DOM 정리 후)
  setTimeout(() => {
    for (let i = 0; i < 6; i++) {
      // 그리드 좌표를 XY 형식으로 레이블 생성 (0,0 -> 00, 0,1 -> 01, ...)
      const gridLabel = `${folderName}0${i}`;
      
      loadImageToScreen(
        `images/icon.png`, 
        0, 
        i, 
        `${iconType}_img_${i}`,
        gridLabel
      );
    }
  }, 50);
}

// 픽셀 좌표를 가장 가까운 그리드 좌표로 변환
function pixelToGrid(pixelX, pixelY, imageWidth, imageHeight) {
  const centerX = pixelX + (imageWidth / 2);
  const topY = pixelY;  // Y축은 상단 기준
  
  const gridX = Math.round((centerX - GRID_START_X - GRID_X/2) / GRID_X);
  const gridY = Math.round((topY - GRID_START_Y) / GRID_Y);  // Y축은 상단에서 그리드로 나눔
  
  return { gridX, gridY };
}

// 이미지 크기 측정 및 좌표 계산 함수
function calculateImagePositions() {
  const allImages = document.querySelectorAll('img');
  
  allImages.forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      applyCalculatedPosition(img, img.naturalWidth, img.naturalHeight);
    } else {
      img.addEventListener('load', function() {
        applyCalculatedPosition(this, this.naturalWidth, this.naturalHeight);
      });
    }
  });
}

// 이미지 위치 적용 (초기 배치)
function applyCalculatedPosition(img, width, height) {
  // img가 icon-wrapper 내부의 이미지인 경우
  const wrapper = img.closest('.icon-wrapper');
  const element = wrapper || img;
  const id = element.dataset?.id || element.id;
  
  // wrapper인 경우 고정된 아이콘 크기 사용 (90px)
  const finalWidth = wrapper ? 90 : width;
  const finalHeight = wrapper ? 90 : height;
  
  // project_screen은 그리드 시스템 적용하지 않고 고정 좌표 사용
  if (id === 'project') {
    imageSizes[id] = { width: finalWidth, height: finalHeight };
    element.style.width = finalWidth + 'px';
    element.style.height = finalHeight + 'px';
    element.style.left = SCREEN_DEFAULT_X + 'px';
    element.style.top = SCREEN_DEFAULT_Y + 'px';
    console.log(`스크린 위치 설정 (applyCalculatedPosition): (${SCREEN_DEFAULT_X}, ${SCREEN_DEFAULT_Y})`);
    return;
  }
  
  const gridPos = iconGridPositions[id];
  
  if (!gridPos) {
    // 화살표 처리 (원본 크기 사용)
    if (id === 'arrowTop') {
      element.style.left = (140 - width/2) + 'px';
      element.style.top = (70 - height) + 'px';
    } else if (id === 'arrowBottom') {
      element.style.left = (140 - width/2) + 'px';
      element.style.top = (1400 - height) + 'px';
    }
    return;
  }
  
  imageSizes[id] = { width: finalWidth, height: finalHeight };
  
  // wrapper인 경우 크기 설정 안 함 (CSS에서 처리)
  if (!wrapper) {
    element.style.width = finalWidth + 'px';
    element.style.height = finalHeight + 'px';
  }
  
  const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, finalWidth, finalHeight);
  element.style.left = pixelPos.x + 'px';
  element.style.top = pixelPos.y + 'px';
  
  // 초기 로드 시 모든 아이콘 표시 (opacity와 display 명시적 설정)
  element.style.opacity = '1';
  element.style.display = 'flex';  // wrapper는 flex
  
  console.log(`${id} 아이콘 위치 설정: (${pixelPos.x}, ${pixelPos.y}), 크기: ${finalWidth}x${finalHeight}`);
}

// 초기 위치 저장
function saveInitialPositions() {
  if (isFirstLoad) {
    document.querySelectorAll('.icon-wrapper').forEach(el => {
      const key = el.dataset?.id || el.id;
      const label = el.querySelector('.icon-label');
      initialPositions[key] = {
        left: el.style.left,
        top: el.style.top,
        opacity: el.style.opacity || '1',
        transform: el.style.transform || 'translateY(0)',
        labelText: label ? label.textContent : ''
      };
    });
    localStorage.setItem('rabbitHomepage_initialPositions', JSON.stringify(initialPositions));
    isFirstLoad = false;
  }
}

// 저장된 초기 위치 불러오기
function loadInitialPositions() {
  const saved = localStorage.getItem('rabbitHomepage_initialPositions');
  if (saved) {
    initialPositions = JSON.parse(saved);
    
    // M00 아이콘 위치 검증 (화면 밖에 있으면 초기화)
    if (initialPositions['M00']) {
      const m00Left = initialPositions['M00'].left;
      const m00Top = initialPositions['M00'].top;
      
      // 화면 밖에 있으면 (x < 0 또는 y < 0 또는 x > 컨테이너 너비 또는 y > 컨테이너 높이)
      if (m00Left < 0 || m00Top < 0 || m00Left > CONTAINER_WIDTH || m00Top > CONTAINER_HEIGHT) {
        console.warn(`⚠️ M00 아이콘이 화면 밖에 있습니다. (left: ${m00Left}, top: ${m00Top})`);
        console.log('🔄 M00 아이콘 위치 초기화 중...');
        delete initialPositions['M00'];  // M00 위치 삭제
      }
    }
    
    // 주의: 레이블 텍스트는 HTML에서 직접 가져오므로 복원하지 않음
    // 이전 버전과의 호환성을 위해 저장된 레이블은 무시하고 HTML의 레이블을 사용
    console.log('초기 위치 데이터 로드됨 (레이블은 HTML 기준 사용)');
  }
  
  // 모든 메인 아이콘에 프로젝트 이미지 적용
  updateAllMainIconImages();
}

// 모든 메인 아이콘에 프로젝트 이미지 적용
async function updateAllMainIconImages() {
  const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                       'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
  
  // IndexedDB에서 로드 (비동기)
  for (const iconId of mainIconIds) {
    const projectKey = `projectData_${iconId}`;
    
    try {
      // manager-mainscreen.js의 loadProjectFromDB 함수 사용
      const projectData = await loadProjectFromDB(projectKey);
      
      if (projectData) {
        updateIconImage(iconId, projectData);
      }
    } catch (e) {
      console.error(`${iconId} 프로젝트 데이터 로드 실패:`, e);
    }
  }
}

// 아이콘에 프로젝트 이미지 및 레이블 적용
function updateIconImage(iconId, projectData) {
  console.log(`🔄 아이콘 업데이트 시작: ${iconId}`, projectData);
  
  const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
  if (!iconWrapper) {
    console.warn(`❌ 아이콘 ${iconId}를 찾을 수 없습니다.`);
    return;
  }
  
  const iconImg = iconWrapper.querySelector('.icon-image');  // .icon-image로 수정
  const iconLabel = iconWrapper.querySelector('.icon-label');
  
  if (!iconImg || !iconLabel) {
    console.warn(`❌ 아이콘 이미지 또는 레이블을 찾을 수 없습니다.`);
    return;
  }
  
  // 메인 이미지가 있으면 아이콘 이미지로 설정
  if (projectData.mainImage) {
    iconImg.src = projectData.mainImage;
    // CSS에서 width: 90px, height: 90px, object-fit: cover 적용됨
    console.log(`✅ ${iconId} 아이콘 이미지 업데이트됨: ${projectData.mainImage}`);
  }
  
  // 사업명이 있으면 레이블 변경
  if (projectData.projectName && projectData.projectName.text) {
    iconLabel.textContent = projectData.projectName.text;
    console.log(`✅ ${iconId} 레이블 업데이트됨: ${projectData.projectName.text}`);
  }
}

// 기존 코드 삭제
// loadInitialPositions();


// 동적 스케일링 함수
function updateContainerScale() {
  const container = document.getElementById('iconContainer');
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 컨테이너 크기
  const containerWidth = 2560;
  const containerHeight = 1440;
  
  // 스케일 계산 (화면에 완전히 맞도록)
  const scaleX = viewportWidth / containerWidth;
  const scaleY = viewportHeight / containerHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // 스케일 적용
  container.style.transform = `scale(${scale})`;
  
  // 컨테이너가 화면 중앙에 위치하도록 조정
  const scaledWidth = containerWidth * scale;
  const scaledHeight = containerHeight * scale;
  
  // 화면 중앙에 배치
  container.style.position = 'absolute';
  container.style.left = '50%';
  container.style.top = '50%';
  container.style.transform = `translate(-50%, -50%) scale(${scale})`;
  
  console.log(`Container scale updated: ${scale.toFixed(3)} (viewport: ${viewportWidth}x${viewportHeight}, scaled: ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)})`);
}

// 페이지가 완전히 로드된 후 초기 위치 불러오기, 저장 및 이미지 위치 계산
window.addEventListener('load', () => {
  setTimeout(() => {
    // 스크린 초기 위치 강제 설정 (항상 기본 위치로)
    projectScreen.style.left = SCREEN_DEFAULT_X + 'px';
    projectScreen.style.top = SCREEN_DEFAULT_Y + 'px';
    console.log(`스크린 초기 위치 설정: (${SCREEN_DEFAULT_X}, ${SCREEN_DEFAULT_Y})`);
    
    loadInitialPositions(); // 이 위치로 이동
    calculateImagePositions();
    saveInitialPositions();
    updateContainerScale();
    updateScreenResetButtonPosition(); // 스크린 초기화 버튼 위치 설정
    updateScreenMinimizeButtonPosition(); // 스크린 최소화 버튼 위치 설정
    visualizeMainGrid(); // 메인 그리드 시각화
    visualizeScreenGrid(); // 스크린 그리드 시각화
    
    // 홈페이지 접속 시 스크린 최소화 상태로 시작
    setTimeout(() => {
      minimizeScreen();
      console.log('🔽 초기 로드: 스크린 최소화 상태로 설정됨');
    }, 200);
  }, 100);
});


// 스냅 기능 (마그네틱) - 그리드 안의 이미지 위치 유지
function snapToGrid(icon) {
  if (icon.classList.contains('project-screen')) return; // 프로젝트 스크린 제외
  
  const id = icon.dataset?.id;
  const size = imageSizes[id] || { width: 120, height: 160 };
  
  const currentX = parseInt(icon.style.left);
  const currentY = parseInt(icon.style.top);
  
  // 현재 위치에서 가장 가까운 그리드 찾기
  const grid = pixelToGrid(currentX, currentY, size.width, size.height);
  
  // 마진 영역 체크 - 마진 영역에 배치되지 않도록 제한
  const minGridX = 0;
  const minGridY = 0;
  const maxGridX = Math.floor((CONTAINER_WIDTH - GRID_START_X) / GRID_X) - 1;
  const maxGridY = Math.floor((CONTAINER_HEIGHT - GRID_START_Y) / GRID_Y) - 1;
  
  // 그리드 경계 내로 제한
  grid.gridX = Math.max(minGridX, Math.min(grid.gridX, maxGridX));
  grid.gridY = Math.max(minGridY, Math.min(grid.gridY, maxGridY));
  
  // 픽셀 위치로 변환하여 적용
  const pixelPos = gridToPixel(grid.gridX, grid.gridY, size.width, size.height);
  icon.style.left = pixelPos.x + 'px';
  icon.style.top = pixelPos.y + 'px';
  
  return grid;
}

// 충돌 감지 (그리드 기반)
function checkCollision(gridX, gridY, spanX = 1, spanY = 1, excludeIcon = null) {
  for (let icon of document.querySelectorAll('.icon-wrapper')) {
    if (icon === excludeIcon) continue;
    if (icon.classList.contains('project-screen')) continue;
    
    const id = icon.dataset?.id;
    const iconGrid = pixelToGrid(
      parseInt(icon.style.left),
      parseInt(icon.style.top),
      imageSizes[id]?.width || 120,
      imageSizes[id]?.height || 160
    );
    
    const iconSpan = iconGridPositions[id] || { spanX: 1, spanY: 1 };
    
    // 그리드 범위 겹침 체크
    if (gridX < iconGrid.gridX + (iconSpan.spanX || 1) &&
        gridX + spanX > iconGrid.gridX &&
        gridY < iconGrid.gridY + (iconSpan.spanY || 1) &&
        gridY + spanY > iconGrid.gridY) {
      return true;
    }
  }
  return false;
}

// 겹침 방지 (그리드 기반) - 마진 영역 고려
function preventOverlap(draggedIcon) {
  const id = draggedIcon.dataset?.id;
  const size = imageSizes[id] || { width: 120, height: 160 };
  
  const currentX = parseInt(draggedIcon.style.left);
  const currentY = parseInt(draggedIcon.style.top);
  
  const grid = pixelToGrid(currentX, currentY, size.width, size.height);
  
  // 마진 영역 체크 - 마진 영역에 배치되지 않도록 제한
  const minGridX = 0;
  const minGridY = 0;
  const maxGridX = Math.floor((CONTAINER_WIDTH - GRID_START_X) / GRID_X) - 1;
  const maxGridY = Math.floor((CONTAINER_HEIGHT - GRID_START_Y) / GRID_Y) - 1;
  
  // 그리드 경계 내로 제한
  grid.gridX = Math.max(minGridX, Math.min(grid.gridX, maxGridX));
  grid.gridY = Math.max(minGridY, Math.min(grid.gridY, maxGridY));
  
  // 충돌 시 가장 가까운 빈 그리드 찾기
  if (checkCollision(grid.gridX, grid.gridY, 1, 1, draggedIcon)) {
    // 주변 그리드에서 빈 공간 찾기 (마진 영역 내에서만)
    for (let offset = 1; offset <= 3; offset++) {
      const directions = [
        { x: grid.gridX + offset, y: grid.gridY },
        { x: grid.gridX - offset, y: grid.gridY },
        { x: grid.gridX, y: grid.gridY + offset },
        { x: grid.gridX, y: grid.gridY - offset }
      ];
      
      for (let dir of directions) {
        // 마진 영역 체크
        if (dir.x >= minGridX && dir.x <= maxGridX && 
            dir.y >= minGridY && dir.y <= maxGridY &&
            !checkCollision(dir.x, dir.y, 1, 1, draggedIcon)) {
          const pixelPos = gridToPixel(dir.x, dir.y, size.width, size.height);
          draggedIcon.style.left = pixelPos.x + 'px';
          draggedIcon.style.top = pixelPos.y + 'px';
          return;
        }
      }
    }
  }
}

// 아이콘 드래그 기능
console.log('총 아이콘 개수:', icons.length);
icons.forEach((icon, index) => {
  console.log(`아이콘 ${index + 1}:`, icon.dataset.id, icon.classList.toString());
  
  icon.addEventListener("mousedown", (e) => {
    if (dragging) return;
    
    // 반응형 모드에서 1~8, A~H 드래그 비활성화
    if (isResponsive && (icon.classList.contains('icon-left') || icon.classList.contains('icon-af'))) {
      return;
    }
    
    e.preventDefault();
    
    dragging = icon;
    startX = e.clientX;
    startY = e.clientY;
    origX = parseInt(icon.style.left);
    origY = parseInt(icon.style.top);
    icon.classList.add("dragging");
    
    // 드래그 중에는 transition 비활성화하여 부드러운 움직임
    icon.style.transition = "none";

    const onMouseMove = (e) => {
      // 마우스 이동 거리만큼 아이콘 이동 (1:1 비율)
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newX = origX + deltaX;
      const newY = origY + deltaY;
      
      // 화면 경계 체크만 적용 (드래그 중에는 그리드 스냅 없음)
      const isProjectScreen = icon.classList.contains('project-screen');
      const iconWidth = isProjectScreen ? (icon.naturalWidth || 1800) : (icon.naturalWidth || 120);
      const iconHeight = isProjectScreen ? (icon.naturalHeight || 1100) : (icon.naturalHeight || 120);

      const boundedX = Math.max(isProjectScreen ? 0 : MARGIN, Math.min(newX, CONTAINER_WIDTH - (isProjectScreen ? 0 : MARGIN) - iconWidth));
      const boundedY = Math.max(isProjectScreen ? 0 : MARGIN, Math.min(newY, CONTAINER_HEIGHT - (isProjectScreen ? 0 : MARGIN) - iconHeight));
      
      icon.style.left = boundedX + "px";
      icon.style.top = boundedY + "px";
    };

    const onMouseUp = (e) => {
      icon.classList.remove("dragging");
      
      // transition 복원
      icon.style.transition = "all 0.5s ease";
      
      // 프로젝트 스크린이 아닌 경우에만 그리드 적용 (마그네틱 기능)
      if (!icon.classList.contains('project-screen')) {
        snapToGrid(icon);
        preventOverlap(icon);
      }
      
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      dragging = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // 클릭 이벤트 추가 (레이블 확장/축소)
  icon.addEventListener("click", (e) => {
    // 드래그 중이거나 레이블 편집 중이면 무시
    if (dragging || e.target.classList.contains('icon-label')) return;
    
    // active 클래스 토글
    icon.classList.toggle('active');
    console.log(`아이콘 ${icon.dataset.id} 클릭, active: ${icon.classList.contains('active')}`);
  });

  // 더블클릭 이벤트 추가
  icon.addEventListener("dblclick", (e) => {
    e.preventDefault();
    
    if (icon.classList.contains('project-screen')) {
      // 프로젝트 스크린 더블클릭 시 내용 표시 로직
      console.log("Project Screen 더블클릭");
    } else if (icon.classList.contains('icon-right')) {
      const iconId = icon.dataset.id;
      
      // 아이콘 이름 매핑
      const iconNames = {
        'cabinet': '캐비넷',
        'favorites': '즐겨찾기',
        'manager': '관리자',
        'park': '공원',
        'yong': '용',
        'trash': '장독대'
      };
      
      // 스크린 타이틀 표시
      const iconName = iconNames[iconId] || iconId;
      showScreenTitle(iconName);
      
      // 오른쪽 아이콘별 특수 처리
      const contentIcons = ['cabinet', 'favorites', 'trash', 'yong', 'park'];
      
      if (iconId === 'manager') {
        // 관리자 모드 UI 표시 (manager.js)
        if (typeof showManagerUI === 'function') {
          showManagerUI();
        } else {
          console.error('showManagerUI 함수를 찾을 수 없습니다. manager.js가 로드되었는지 확인하세요.');
        }
      } else if (contentIcons.includes(iconId)) {
        // 콘텐츠를 가진 아이콘들은 통합 함수로 처리
        // 최소화 상태면 먼저 최대화
        if (isScreenMinimized) {
          console.log(`📺 스크린 최소화 상태 → 최대화 (${iconId})`);
          maximizeScreen();
          // 최대화 애니메이션 완료 후 내용 로드
          setTimeout(() => {
            loadIconContent(iconId, iconId);
          }, 400);
        } else {
          loadIconContent(iconId, iconId);
        }
      } else {
        // 그 외 아이콘들은 기존 방식으로 처리
        projectScreen.src = `images/project_screen_${iconId}.png`;
        console.log(`${iconId} 더블클릭, projectScreen 업데이트`);
      }
    } else if (icon.classList.contains('icon-left') || icon.classList.contains('icon-af')) {
      // 왼쪽 아이콘들 (M00~M17) 더블클릭 시 프로젝트 데이터 표시
      const iconId = icon.dataset.id;
      const iconLabel = icon.querySelector('.icon-label');
      const iconName = iconLabel ? iconLabel.textContent : `아이콘 ${iconId}`;
      
      console.log(`🖱️ 메인 아이콘 ${iconId} 더블클릭됨`);
      
      // 최소화 상태면 먼저 최대화
      if (isScreenMinimized) {
        console.log('📺 스크린 최소화 상태 → 최대화');
        maximizeScreen();
        // 최대화 애니메이션 완료 후 내용 로드
        setTimeout(() => {
          loadProjectContent(iconId, iconName);
        }, 400);
      } else {
        loadProjectContent(iconId, iconName);
      }
    }
  });

  // 라벨 더블클릭 이벤트 추가 (글씨 부분에서만 작동)
  const label = icon.querySelector('.icon-label');
  if (label) {
    console.log('레이블 발견:', label.textContent, '아이콘:', icon.dataset.id);
  }
});

// 프로젝트 내용 로드 헬퍼 함수
function loadProjectContent(iconId, iconName) {
  // 모든 스크린 내용 완전히 초기화 (이미지 포함)
  console.log('🧹 스크린 초기화 시작...');
  clearAllScreenContent();
  console.log('✅ 스크린 초기화 완료');
  
  showScreenTitle(iconName);
  console.log(`📺 스크린 타이틀 표시: ${iconName}`);
  console.log(`📂 프로젝트 데이터 로드 시도: ${iconId}`);
      
  // 프로젝트 데이터 표시 (project-viewer.js)
  if (typeof displayProjectData === 'function') {
    displayProjectData(iconId);
  } else {
    console.error('❌ displayProjectData 함수를 찾을 수 없습니다.');
  }
}

// 라벨 이벤트 리스너 등록
icons.forEach(icon => {
  // 라벨 더블클릭 이벤트 추가 (글씨 부분에서만 작동)
  const label = icon.querySelector('.icon-label');
  if (label) {
    console.log('레이블 발견:', label.textContent, '아이콘:', icon.dataset.id);
    
    // 레이블에 호버 효과로 편집 가능함을 표시
    label.style.cursor = 'text';
    
    // 클릭 이벤트도 추가하여 이벤트가 작동하는지 확인
    label.addEventListener("click", (e) => {
      console.log('레이블 클릭 이벤트 발생:', label.textContent);
    });
    
    // 더블클릭 이벤트 설정
    label.addEventListener("dblclick", function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('레이블 더블클릭 이벤트 발생:', label.textContent);
      const originalText = label.textContent;
      
      // 편집 모드 활성화
      label.contentEditable = true;
      label.focus();
      label.style.background = 'rgba(255, 255, 255, 0.95)';
      label.style.userSelect = 'text';
      label.style.border = '2px solid #007BFF';
      
      // 전체 텍스트 선택
      setTimeout(() => {
        const range = document.createRange();
        range.selectNodeContents(label);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
      
      const finishEdit = () => {
        console.log('편집 완료:', label.textContent);
        if (label.textContent.trim() === '') {
          label.textContent = originalText;
        }
        label.contentEditable = false;
        label.style.background = 'rgba(255, 255, 255, 0.8)';
        label.style.userSelect = 'none';
        label.style.border = '1px solid #ccc';
      };
      
      // 이벤트 리스너 추가
      const blurHandler = () => finishEdit();
      const keyHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit();
        }
        if (e.key === 'Escape') {
          label.textContent = originalText;
          finishEdit();
        }
      };
      
      label.addEventListener('blur', blurHandler, { once: true });
      label.addEventListener('keydown', keyHandler, { once: true });
    });
  }
});

// 프로젝트 스크린 드래그 기능 (별도 처리)
projectScreen.addEventListener("mousedown", (e) => {
  if (dragging) return;
  
  e.preventDefault();
  
  dragging = projectScreen;
  startX = e.clientX;
  startY = e.clientY;
  origX = parseInt(projectScreen.style.left);
  origY = parseInt(projectScreen.style.top);
  projectScreen.classList.add("dragging");
  
  // 드래그 중에는 transition 비활성화하여 부드러운 움직임
  projectScreen.style.transition = "none";
  
  // 드래그 중 투명도 효과
  projectScreen.style.opacity = "0.7";
  
  // 스크린 내부 래퍼들과 콘텐츠 요소들의 transition도 비활성화
  const screenElements = document.querySelectorAll('.screen-icon-wrapper, .screen-content-element');
  screenElements.forEach(element => {
    element.style.transition = 'none';
  });

  const onMouseMove = (e) => {
    // 마우스 이동 거리만큼 아이콘 이동 (1:1 비율)
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newX = origX + deltaX;
    const newY = origY + deltaY;
    
    // 프로젝트 스크린은 화면 경계 체크만 적용 (그리드 스냅 없음)
    const iconWidth = projectScreen.naturalWidth || 1800;
    const iconHeight = projectScreen.naturalHeight || 1100;

    const boundedX = Math.max(0, Math.min(newX, CONTAINER_WIDTH - iconWidth));
    const boundedY = Math.max(0, Math.min(newY, CONTAINER_HEIGHT - iconHeight));
    
    projectScreen.style.left = boundedX + "px";
    projectScreen.style.top = boundedY + "px";
    
    // 스크린 내부 래퍼들과 콘텐츠 요소들도 함께 이동
    const screenElements = document.querySelectorAll('.screen-icon-wrapper, .screen-content-element');
    screenElements.forEach(element => {
      // 현재 위치 가져오기
      const currentX = parseInt(element.style.left);
      const currentY = parseInt(element.style.top);
      
      // 스크린 드래그 시작 시점의 요소 위치 저장 (한 번만)
      if (!element.dataset.screenDragStartX) {
        element.dataset.screenDragStartX = currentX;
        element.dataset.screenDragStartY = currentY;
      }
      
      const elemOrigX = parseInt(element.dataset.screenDragStartX);
      const elemOrigY = parseInt(element.dataset.screenDragStartY);
      
      // 스크린 이동량만큼 요소도 이동
      const elemNewX = elemOrigX + (boundedX - origX);
      const elemNewY = elemOrigY + (boundedY - origY);
      
      element.style.left = elemNewX + 'px';
      element.style.top = elemNewY + 'px';
    });
    
    // 스크린 그리드, 초기화 버튼, 최소화 버튼, 타이틀도 실시간 업데이트
    // 최소화 상태가 아닐 때만 그리드 업데이트
    if (!isScreenMinimized) {
      visualizeScreenGrid();
    }
    updateScreenResetButtonPosition();
    updateScreenMinimizeButtonPosition();
    updateScreenTitlePosition();
  };

  const onMouseUp = (e) => {
    projectScreen.classList.remove("dragging");
    
    // transition 복원
    projectScreen.style.transition = "all 0.5s ease";
    
    // 투명도 복원
    projectScreen.style.opacity = "1";
    
    // 스크린 내부 요소들의 드래그 시작 위치 데이터 제거 및 transition 복원
    const screenElements = document.querySelectorAll('.screen-icon-wrapper, .screen-content-element');
    screenElements.forEach(element => {
      delete element.dataset.screenDragStartX;
      delete element.dataset.screenDragStartY;
    });
    
    // transition 복원 (icon-wrapper만)
    document.querySelectorAll('.screen-icon-wrapper').forEach(wrapper => {
      wrapper.style.transition = 'all 0.5s ease';
    });
    
    // 스크린 그리드, 초기화 버튼, 타이틀 위치 업데이트
    visualizeScreenGrid();
    updateScreenResetButtonPosition();
    updateScreenTitlePosition();
    
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    dragging = null;
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

// 초기화 버튼 (메인)
resetBtn.addEventListener("click", () => {
  // 프로젝트 스크린 초기화 (별도 처리)
  projectScreen.style.left = SCREEN_DEFAULT_X + 'px';
  projectScreen.style.top = SCREEN_DEFAULT_Y + 'px';
  projectScreen.style.opacity = '1';
  projectScreen.style.transform = 'translateY(0)';
  
  // 아이콘 래퍼들 초기화
  document.querySelectorAll(".icon-wrapper").forEach(el => {
    let key = el.dataset?.id || el.id;
    
    if (initialPositions[key]) {
      el.style.left = initialPositions[key].left;
      el.style.top = initialPositions[key].top;
      el.style.opacity = initialPositions[key].opacity || "1";
      el.style.transform = initialPositions[key].transform || "translateY(0)";
      
      // 라벨 텍스트 복원
      const label = el.querySelector('.icon-label');
      if (label && initialPositions[key].labelText) {
        label.textContent = initialPositions[key].labelText;
      }
    }
  });
  
  // 스크린 내부 아이콘들도 초기화
  console.log('스크린 내부 아이콘 초기화 시작');
  Object.keys(screenIconInitialPositions).forEach(imageId => {
    const wrapper = document.getElementById(imageId + '_wrapper');
    if (wrapper && screenIconInitialPositions[imageId]) {
      const initPos = screenIconInitialPositions[imageId];
      
      // 스크린 위치 계산 (초기화된 스크린 위치 기준으로)
      const screenAbsX = SCREEN_DEFAULT_X;
      const screenAbsY = SCREEN_DEFAULT_Y;
      const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
      const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
      
      // 이미지 크기 가져오기
      const img = wrapper.querySelector('.screen-content-image-element');
      const imageWidth = img ? (img.naturalWidth || 120) : 120;
      const imageHeight = img ? (img.naturalHeight || 160) : 160;
      
      // 초기 그리드 위치를 픽셀 좌표로 변환
      const finalX = screenGridStartX + (initPos.gridX * SCREEN_GRID_X) + (SCREEN_GRID_X / 2) - (imageWidth / 2);
      const finalY = screenGridStartY + (initPos.gridY * SCREEN_GRID_Y);
      
      wrapper.style.left = finalX + 'px';
      wrapper.style.top = finalY + 'px';
      
      // 레이블 텍스트 복원
      const label = wrapper.querySelector('.screen-icon-label');
      if (label && initPos.labelText) {
        label.textContent = initPos.labelText;
      }
      
      console.log(`${imageId} 초기화: 그리드(${initPos.gridX}, ${initPos.gridY}) -> 픽셀(${finalX}, ${finalY})`);
    }
  });
  console.log('스크린 내부 아이콘 초기화 완료');
  
  // A~H 상태 초기화
  afIndex = 0;
  arrowTop.classList.remove("show");
  
  // 반응형 모드 해제
  if (isResponsive) {
    toggleResponsiveMode(false);
  }
  
  // 스크린 그리드, 초기화 버튼, 타이틀 위치 업데이트
  setTimeout(() => {
    visualizeScreenGrid();
    updateScreenResetButtonPosition();
    updateScreenTitlePosition();
  }, 100);
  
  console.log('초기화 완료 - 저장된 초기 위치로 복원');
});

// 스크린 초기화 버튼 (스크린 내부 아이콘 초기화)
screenResetBtn.addEventListener("click", () => {
  console.log('스크린 내부 아이콘 초기화 시작');
  
  // 모든 스크린 내부 래퍼를 초기 위치로 복원
  Object.keys(screenIconInitialPositions).forEach(imageId => {
    const wrapper = document.getElementById(imageId + '_wrapper');
    if (wrapper && screenIconInitialPositions[imageId]) {
      const initPos = screenIconInitialPositions[imageId];
      
      // 스크린 위치 계산 (현재 스크린 위치 기준으로 재계산)
      const screenLeft = projectScreen.style.left;
      const screenTop = projectScreen.style.top;
      const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
      const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
      const screenGridStartX = screenAbsX + SCREEN_MARGIN_LEFT;
      const screenGridStartY = screenAbsY + SCREEN_MARGIN_TOP;
      
      // 이미지 크기 가져오기
      const img = wrapper.querySelector('.screen-content-image-element');
      const imageWidth = img ? (img.naturalWidth || 120) : 120;
      const imageHeight = img ? (img.naturalHeight || 160) : 160;
      
      // 초기 그리드 위치를 현재 스크린 위치 기준으로 픽셀 좌표로 변환
      // x: 중앙 정렬, y: 상단 정렬 (loadImageToScreen과 동일)
      const finalX = screenGridStartX + (initPos.gridX * SCREEN_GRID_X) + (SCREEN_GRID_X / 2) - (imageWidth / 2);
      const finalY = screenGridStartY + (initPos.gridY * SCREEN_GRID_Y);  // Y축은 상단 정렬
      
      wrapper.style.left = finalX + 'px';
      wrapper.style.top = finalY + 'px';
      
      // 레이블 텍스트 복원
      const label = wrapper.querySelector('.screen-icon-label');
      if (label && initPos.labelText) {
        label.textContent = initPos.labelText;
      }
      
      console.log(`${imageId} 초기화: 그리드(${initPos.gridX}, ${initPos.gridY}) -> 픽셀(${finalX}, ${finalY})`);
    }
  });
  
  console.log('스크린 내부 아이콘 초기화 완료');
});

// 프로젝트 스크린 위치 감시
function checkProjectScreenPosition() {
  const projectX = parseInt(projectScreen.style.left);
  
  // gridX: 0~1 영역 계산 (80px ~ 320px)
  const grid0Start = GRID_START_X; // 80px
  const grid1End = GRID_START_X + (2 * GRID_X); // 80 + (2 * 120) = 320px
  
  console.log(`Project screen position check: x=${projectX}, grid0Start=${grid0Start}, grid1End=${grid1End}, isResponsive=${isResponsive}`);
  
  if (projectX >= grid0Start && projectX <= grid1End && !isResponsive) {
    isResponsive = true;
    toggleResponsiveMode(true);
    console.log('Entering responsive mode');
  } else if ((projectX < grid0Start || projectX > grid1End) && isResponsive) {
    isResponsive = false;
    toggleResponsiveMode(false);
    console.log('Exiting responsive mode');
  }
}

// 반응형 모드 토글
function toggleResponsiveMode(enable) {
  const afIcons = document.querySelectorAll(".icon-wrapper.icon-af");
  const baseIcons = document.querySelectorAll(".icon-wrapper:not(.icon-af):not(.icon-right):not(.project-screen)");
  
  if (enable) {
    // 1~8번 아이콘들을 초기 그리드 위치로 복원
    baseIcons.forEach((icon) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // iconGridPositions에서 초기 그리드 위치 가져오기
      const gridPos = iconGridPositions[id];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, size.width, size.height);
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.transform = "translateY(0)";
      }
    });
    
    // A~H 아이콘들을 아래로 이동 (숨김 처리) - gridY: 8 위치
    afIcons.forEach((icon, index) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      const pixelPos = gridToPixel(0, 8, size.width, size.height);
      
      icon.style.left = pixelPos.x + 'px';
      icon.style.top = pixelPos.y + 'px';
      icon.style.opacity = "0";
      icon.style.display = "block";
    });
    arrowBottom.classList.add("show");
    afIndex = 0;
  } else {
    // 원래 위치로 복원 (화면이 커진 경우) - iconGridPositions 사용
    afIcons.forEach((icon) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // iconGridPositions에서 초기 그리드 위치 가져오기
      const gridPos = iconGridPositions[id];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, size.width, size.height);
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.transform = "translateY(0)";
        icon.style.display = "block";
      }
    });
    
    // 1~8번도 초기 위치로 복원 - iconGridPositions 사용
    baseIcons.forEach((icon) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // iconGridPositions에서 초기 그리드 위치 가져오기
      const gridPos = iconGridPositions[id];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, size.width, size.height);
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.transform = "translateY(0)";
      }
    });
    
    arrowBottom.classList.remove("show");
    arrowTop.classList.remove("show");
    afIndex = 0;
  }
}

// 아래쪽 화살표 클릭 (A~H 위로 등장, 1~8 줄어듦)
arrowBottom.addEventListener("click", () => {
  const afIcons = document.querySelectorAll(".icon-wrapper.icon-af");
  const baseIcons = document.querySelectorAll(".icon-wrapper:not(.icon-af):not(.icon-right):not(.project-screen)");
  
  // 화살표의 아래쪽 y좌표 계산 (동적으로)
  const arrowTopRect = arrowTop.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const arrowTopBottomY = arrowTopRect.bottom - containerRect.top;

  if (afIndex < afIcons.length) {
    // A~H 아이콘들을 순차적으로 이동
    afIcons.forEach((icon, index) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      if (index < afIndex) {
        // 이미 등장한 아이콘들 - 한 칸씩 위로 이동
        const targetGridY = 7 - afIndex + index;
        const pixelPos = gridToPixel(0, targetGridY, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.display = "block";
        icon.style.transition = "all 0.5s ease";
      } else if (index === afIndex) {
        // 현재 클릭으로 등장할 아이콘 - gridY: 6에서 페이드인
        const pixelPos = gridToPixel(0, 7, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.display = "block";
        icon.style.transition = "all 0.5s ease";
      } else {
        // 아직 등장하지 않은 아이콘들 - 투명 상태로 gridY: 8에 대기
        const pixelPos = gridToPixel(0, 8, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "0";
        icon.style.transition = "all 0.5s ease";
      }
    });
    
    // 1~8번 아이콘들을 한 칸씩 위로 이동
    baseIcons.forEach((icon, index) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // 현재 위치에서 한 칸 위로 이동
      const currentGrid = pixelToGrid(parseInt(icon.style.left), parseInt(icon.style.top), size.width, size.height);
      const newGridY = currentGrid.gridY - 1;
      
      if (newGridY >= 0) {
        const pixelPos = gridToPixel(currentGrid.gridX, newGridY, size.width, size.height);
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.transition = "all 0.5s ease";
      } else {
        // 화면 밖으로 이동 (숨김) - gridY: -1 위치
        const pixelPos = gridToPixel(0, -1, size.width, size.height);
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "0";
        icon.style.transition = "all 0.5s ease";
      }
    });
    
    afIndex++;
  }
  
  // 모든 A~H가 올라왔으면 위쪽 화살표 표시
  if (afIndex === afIcons.length) {
    arrowTop.classList.add("show");
  }
  
  // 1번 아이콘이 화면 밖으로 나갔는지 체크
  checkFirstIconPosition();
});

// 위쪽 화살표 클릭 (되돌리기)
arrowTop.addEventListener("click", () => {
  const afIcons = document.querySelectorAll(".icon-wrapper.icon-af");
  const baseIcons = document.querySelectorAll(".icon-wrapper:not(.icon-af):not(.icon-right):not(.project-screen)");

  if (afIndex > 0) {
    afIndex--;
    
    // 1~8 아이콘들을 순차적으로 이동 (8, 7, 6, 5, 4, 3, 2, 1 순서)
    baseIcons.forEach((icon, index) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // afIndex가 감소할 때마다 1~8 아이콘이 하나씩 나타남 (8번부터 역순)
      // afIndex=8일 때: 아무것도 등장하지 않음    
      // afIndex=7일 때: 8번(index 7) 등장
      // afIndex=6일 때: 7번(index 6) 등장
      // afIndex=5일 때: 6번(index 5) 등장
      // afIndex=4일 때: 5번(index 4) 등장
      const targetIndex = afIndex; // afIndex=6일 때 6번(7번), afIndex=5일 때 5번(6번)...
      
      if (index === targetIndex) {
        // 현재 클릭으로 등장할 아이콘 - gridY: 0에서 페이드인
        const pixelPos = gridToPixel(0, 0, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.display = "block";
        icon.style.transition = "all 0.5s ease";
      } else if (index > targetIndex) {
        // 이미 등장한 아이콘들 - 한 칸씩 아래로 이동
        const targetGridY = index - targetIndex;
        const pixelPos = gridToPixel(0, targetGridY, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.display = "block";
        icon.style.transition = "all 0.5s ease";
      } else {
        // 아직 등장하지 않은 아이콘들 - 투명 상태로 gridY: -1에 대기
        const pixelPos = gridToPixel(0, -1, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "0";
        icon.style.transition = "all 0.5s ease";
      }
    });
    
    // A~H 아이콘들을 등장의 역순으로 이동
    afIcons.forEach((icon, index) => {
      const id = icon.dataset.id;
      const size = imageSizes[id] || { width: 120, height: 160 };
      
      // 등장 순서: A(0), B(1), C(2), D(3), E(4), F(5), G(6), H(7)
      // 사라지는 순서: H(7), G(6), F(5), E(4), D(3), C(2), B(1), A(0)
      
      if (index < afIndex) {
        // 아직 사라지지 않은 아이콘들 - 한 칸씩 아래로 이동
        const targetGridY = 7 - afIndex + index + 1; // 한 칸씩 아래로 이동
        const pixelPos = gridToPixel(0, targetGridY, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "1";
        icon.style.transition = "all 0.5s ease";
      } else {
        // 사라진 아이콘들 - gridY: 8로 이동하고 투명 처리
        const pixelPos = gridToPixel(0, 8, size.width, size.height);
        
        icon.style.left = pixelPos.x + 'px';
        icon.style.top = pixelPos.y + 'px';
        icon.style.opacity = "0";
        icon.style.transition = "all 0.5s ease";
      }
    });
  }
  
  // 모든 A~H가 내려갔으면 위쪽 화살표 숨김
  if (afIndex === 0) {
    arrowTop.classList.remove("show");
  }
  
  // 1번 아이콘 위치 체크
  checkFirstIconPosition();
});

// M00 아이콘이 { gridX: 0, gridY: 0 } 위치에 있지 않은 경우 arrowTop 표시
function checkFirstIconPosition() {
  const firstIcon = document.querySelector('.icon-wrapper[data-id="M00"]');
  
  if (!firstIcon) {
    console.log("M00 아이콘을 찾을 수 없습니다.");
    return;
  }
  
  const firstIconTop = parseInt(firstIcon.style.top);
  const firstIconLeft = parseInt(firstIcon.style.left);
  
  // 1번 아이콘의 그리드 좌표 계산
  const firstIconGrid = pixelToGrid(firstIconLeft, firstIconTop, 
    imageSizes['1']?.width || 120, imageSizes['1']?.height || 160);
  
  console.log(`Checking arrowTop visibility. 1번 아이콘 위치: left=${firstIconLeft}, top=${firstIconTop}`);
  console.log(`1번 아이콘 그리드 좌표: gridX=${firstIconGrid.gridX}, gridY=${firstIconGrid.gridY}`);
  
  // 1번 아이콘이 { gridX: 0, gridY: 0 } 위치에 있지 않으면 arrowTop 표시
  const isAtGrid00 = (firstIconGrid.gridX === 0 && firstIconGrid.gridY === 0);
  
  console.log(`1번 아이콘이 { gridX: 0, gridY: 0 }에 있는가: ${isAtGrid00}`);
  
  if (!isAtGrid00) {
    arrowTop.classList.add("show");
    console.log("arrowTop shown - 1번 아이콘이 { gridX: 0, gridY: 0 }에 없음");
  } else {
    arrowTop.classList.remove("show");
    console.log("arrowTop hidden - 1번 아이콘이 { gridX: 0, gridY: 0 }에 있음");
  }
}

// 이벤트 리스너 등록
window.addEventListener("resize", () => {
  updateContainerScale();
  checkProjectScreenPosition();
});

// 메인 컨테이너 그리드 시각화 (디버그용)
function visualizeMainGrid() {
  // 기존 그리드 제거
  const existingGrid = document.getElementById('mainGridVisualization');
  if (existingGrid) {
    existingGrid.remove();
  }
  
  // 그리드 컨테이너 생성
  const gridContainer = document.createElement('div');
  gridContainer.id = 'mainGridVisualization';
  gridContainer.style.position = 'absolute';
  gridContainer.style.left = GRID_START_X + 'px';
  gridContainer.style.top = GRID_START_Y + 'px';
  gridContainer.style.width = (CONTAINER_WIDTH - GRID_START_X - MARGIN) + 'px';
  gridContainer.style.height = (CONTAINER_HEIGHT - GRID_START_Y - MARGIN) + 'px';
  gridContainer.style.pointerEvents = 'none';
  gridContainer.style.zIndex = '100';
  gridContainer.style.border = '2px dashed blue';
  
  // 그리드 개수 계산
  const maxGridX = Math.floor((CONTAINER_WIDTH - GRID_START_X - MARGIN) / GRID_X);
  const maxGridY = Math.floor((CONTAINER_HEIGHT - GRID_START_Y - MARGIN) / GRID_Y);
  
  // 그리드 셀 생성
  for (let y = 0; y < maxGridY; y++) {
    for (let x = 0; x < maxGridX; x++) {
      const cell = document.createElement('div');
      cell.style.position = 'absolute';
      cell.style.left = (x * GRID_X) + 'px';
      cell.style.top = (y * GRID_Y) + 'px';
      cell.style.width = GRID_X + 'px';
      cell.style.height = GRID_Y + 'px';
      cell.style.border = '1px dashed rgba(0, 150, 255, 0.2)';
      cell.style.boxSizing = 'border-box';
      
      // 그리드 좌표 표시
      const label = document.createElement('div');
      label.textContent = `${x},${y}`;
      label.style.fontSize = '10px';
      label.style.color = 'cyan';
      label.style.position = 'absolute';
      label.style.top = '2px';
      label.style.left = '2px';
      cell.appendChild(label);
      
      gridContainer.appendChild(cell);
    }
  }
  
  container.appendChild(gridContainer);
  
  console.log(`메인 그리드 생성: ${maxGridX}x${maxGridY} (총 ${maxGridX * maxGridY}개 셀)`);
  console.log(`메인 그리드 시작점: (${GRID_START_X}, ${GRID_START_Y})`);
  console.log(`메인 그리드 크기: ${GRID_X}x${GRID_Y}`);
}

// 프로젝트 스크린 그리드 시각화 (디버그용)
function visualizeScreenGrid() {
  // 기존 그리드 제거
  const existingGrid = document.getElementById('screenGridVisualization');
  if (existingGrid) {
    existingGrid.remove();
  }
  
  // 스크린 위치와 크기 계산
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
  
  // 그리드 컨테이너 생성
  const gridContainer = document.createElement('div');
  gridContainer.id = 'screenGridVisualization';
  gridContainer.style.position = 'absolute';
  gridContainer.style.left = (screenAbsX + SCREEN_MARGIN_LEFT) + 'px';
  gridContainer.style.top = (screenAbsY + SCREEN_MARGIN_TOP) + 'px';
  gridContainer.style.width = (screenWidth - SCREEN_MARGIN_LEFT - SCREEN_MARGIN_RIGHT) + 'px';
  gridContainer.style.height = (screenHeight - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM) + 'px';
  gridContainer.style.pointerEvents = 'none';
  gridContainer.style.zIndex = '9999';  // 모든 요소 위에 표시 (메인: 1500, 추가: 1650, 텍스트: 1550, 화살표: 1700)
  gridContainer.style.border = '2px dashed red';
  
  // 그리드 범위 계산
  const bounds = getScreenGridBounds();
  
  // 그리드 셀 생성
  for (let y = 0; y <= bounds.maxGridY; y++) {
    for (let x = 0; x <= bounds.maxGridX; x++) {
      const cell = document.createElement('div');
      cell.style.position = 'absolute';
      cell.style.left = (x * SCREEN_GRID_X) + 'px';
      cell.style.top = (y * SCREEN_GRID_Y) + 'px';
      cell.style.width = SCREEN_GRID_X + 'px';
      cell.style.height = SCREEN_GRID_Y + 'px';
      cell.style.border = '1px dashed rgba(0, 255, 0, 0.3)';
      cell.style.boxSizing = 'border-box';
      
      // 그리드 좌표 표시
      const label = document.createElement('div');
      label.textContent = `${x},${y}`;
      label.style.fontSize = '10px';
      label.style.color = 'lime';
      label.style.position = 'absolute';
      label.style.top = '2px';
      label.style.left = '2px';
      cell.appendChild(label);
      
      gridContainer.appendChild(cell);
    }
  }
  
  container.appendChild(gridContainer);
  
  console.log(`스크린 그리드 생성: ${bounds.maxGridX + 1}x${bounds.maxGridY + 1} (총 ${(bounds.maxGridX + 1) * (bounds.maxGridY + 1)}개 셀)`);
  console.log(`스크린 위치: (${screenAbsX}, ${screenAbsY}), 크기: ${screenWidth}x${screenHeight}`);
  console.log(`그리드 영역: 좌우마진 ${SCREEN_MARGIN_LEFT}, 상마진 ${SCREEN_MARGIN_TOP}, 하마진 ${SCREEN_MARGIN_BOTTOM}`);
}

// 메인 그리드 토글 함수 (콘솔에서 호출 가능)
window.toggleMainGrid = function() {
  const grid = document.getElementById('mainGridVisualization');
  if (grid) {
    grid.remove();
    console.log('메인 그리드 숨김');
  } else {
    visualizeMainGrid();
    console.log('메인 그리드 표시');
  }
};

// 스크린 그리드 토글 함수 (콘솔에서 호출 가능)
window.toggleScreenGrid = function() {
  const grid = document.getElementById('screenGridVisualization');
  if (grid) {
    grid.remove();
    console.log('스크린 그리드 숨김');
  } else {
    visualizeScreenGrid();
    console.log('스크린 그리드 표시');
  }
};

// 모든 그리드 토글 함수 (콘솔에서 호출 가능)
window.toggleAllGrids = function() {
  window.toggleMainGrid();
  window.toggleScreenGrid();
};

// 스크린 그리드 정보 출력 함수 (콘솔에서 호출 가능)
window.getScreenGridInfo = function() {
  const bounds = getScreenGridBounds();
  const screenLeft = projectScreen.style.left;
  const screenTop = projectScreen.style.top;
  const screenAbsX = screenLeft ? parseInt(screenLeft) : SCREEN_DEFAULT_X;
  const screenAbsY = screenTop ? parseInt(screenTop) : SCREEN_DEFAULT_Y;
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
  
  const info = {
    스크린위치: { x: screenAbsX, y: screenAbsY },
    스크린크기: { width: screenWidth, height: screenHeight },
    마진: {
      좌: SCREEN_MARGIN_LEFT,
      우: SCREEN_MARGIN_RIGHT,
      상: SCREEN_MARGIN_TOP,
      하: SCREEN_MARGIN_BOTTOM
    },
    그리드크기: { x: SCREEN_GRID_X, y: SCREEN_GRID_Y },
    그리드개수: { 
      가로: bounds.maxGridX + 1, 
      세로: bounds.maxGridY + 1,
      총개수: (bounds.maxGridX + 1) * (bounds.maxGridY + 1)
    },
    그리드영역: {
      시작X: screenAbsX + SCREEN_MARGIN_LEFT,
      시작Y: screenAbsY + SCREEN_MARGIN_TOP,
      너비: screenWidth - SCREEN_MARGIN_LEFT - SCREEN_MARGIN_RIGHT,
      높이: screenHeight - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM
    }
  };
  
  console.table(info);
  return info;
};

// 프로젝트 스크린 위치 체크를 위한 주기적 업데이트
setInterval(() => {
  checkProjectScreenPosition();
  checkFirstIconPosition();
}, 100);

// 스크린 아이콘 상태 확인 함수 (디버깅용)
window.checkScreenIcons = function() {
  const wrappers = document.querySelectorAll('.screen-icon-wrapper');
  console.log(`현재 스크린에 표시된 아이콘 개수: ${wrappers.length}`);
  wrappers.forEach((wrapper, index) => {
    console.log(`  ${index + 1}. ID: ${wrapper.id}, 위치: (${wrapper.style.left}, ${wrapper.style.top})`);
  });
  console.log('초기 위치 정보:', screenIconInitialPositions);
  return wrappers.length;
};

// localStorage 초기화 함수 (디버깅용)
window.resetM00Position = function() {
  const saved = localStorage.getItem('rabbitHomepage_initialPositions');
  if (saved) {
    const positions = JSON.parse(saved);
    delete positions['M00'];
    localStorage.setItem('rabbitHomepage_initialPositions', JSON.stringify(positions));
    console.log('✅ M00 아이콘 위치 초기화 완료. 페이지를 새로고침하세요.');
  } else {
    console.log('저장된 위치 정보가 없습니다.');
  }
};

// 전체 아이콘 위치 초기화 함수
window.resetAllPositions = function() {
  localStorage.removeItem('rabbitHomepage_initialPositions');
  console.log('✅ 모든 아이콘 위치 초기화 완료. 페이지를 새로고침하세요.');
  location.reload();
};

// ==================== 스크린 최소화/최대화 기능 ====================

// 스크린 최소화/최대화 토글
screenMinimizeBtn.addEventListener('click', () => {
  if (isScreenMinimized) {
    // 최대화 (원래 크기로)
    maximizeScreen();
  } else {
    // 최소화 (10% 크기로)
    minimizeScreen();
  }
});

// 스크린 최소화
function minimizeScreen() {
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
  
  // 10% 크기로 축소
  const newWidth = screenWidth * 0.1;
  const newHeight = screenHeight * 0.1;
  
  projectScreen.style.width = newWidth + 'px';
  projectScreen.style.height = newHeight + 'px';
  projectScreen.style.transition = 'all 0.3s ease';
  
  // 스크린 내부 요소 숨김
  const screenTitle = document.getElementById('screenIconTitle');
  const allWrappers = document.querySelectorAll('.screen-icon-wrapper');
  const mainImageBg = document.getElementById('projectMainImageBg');
  const designOverview = document.getElementById('projectDesignOverview');
  const textOverlay = document.getElementById('projectTextOverlay');
  const additionalImageDisplay = document.getElementById('additionalImageDisplay');
  const arrowUp = document.getElementById('imageNavigatorArrowUp');
  const arrowDown = document.getElementById('imageNavigatorArrowDown');
  
  if (screenTitle) screenTitle.style.display = 'none';
  allWrappers.forEach(w => w.style.display = 'none');
  if (mainImageBg) mainImageBg.style.display = 'none';
  if (designOverview) designOverview.style.display = 'none';
  if (textOverlay) textOverlay.style.display = 'none';
  if (additionalImageDisplay) additionalImageDisplay.style.display = 'none';
  if (arrowUp) arrowUp.style.display = 'none';
  if (arrowDown) arrowDown.style.display = 'none';
  
  // 그리드 비활성화 (숨김)
  const mainGridVisualization = document.getElementById('mainGridVisualization');
  const screenGridVisualization = document.getElementById('screenGridVisualization');
  if (mainGridVisualization) {
    mainGridVisualization.style.display = 'none';
    console.log('✅ 메인 그리드 비활성화됨');
  }
  if (screenGridVisualization) {
    screenGridVisualization.style.display = 'none';
    console.log('✅ 스크린 그리드 비활성화됨');
  }
  
  // 버튼 위치 업데이트 (최소화된 스크린 기준)
  setTimeout(() => {
    updateScreenMinimizeButtonPosition();
  }, 350); // transition 완료 후
  
  // 버튼 텍스트 변경
  screenMinimizeBtn.textContent = '최대화';
  screenResetBtn.style.display = 'none'; // 초기화 버튼 숨김
  
  isScreenMinimized = true;
  console.log('✅ 스크린 최소화됨 (10%)');
}

// 스크린 최대화
function maximizeScreen() {
  const screenWidth = projectScreen.naturalWidth || SCREEN_DEFAULT_WIDTH;
  const screenHeight = projectScreen.naturalHeight || SCREEN_DEFAULT_HEIGHT;
  
  // 원래 크기로 복원
  projectScreen.style.width = screenWidth + 'px';
  projectScreen.style.height = screenHeight + 'px';
  projectScreen.style.transition = 'all 0.3s ease';
  
  // 스크린 내부 요소 표시
  const screenTitle = document.getElementById('screenIconTitle');
  const allWrappers = document.querySelectorAll('.screen-icon-wrapper');
  const mainImageBg = document.getElementById('projectMainImageBg');
  const designOverview = document.getElementById('projectDesignOverview');
  const textOverlay = document.getElementById('projectTextOverlay');
  const additionalImageDisplay = document.getElementById('additionalImageDisplay');
  const arrowUp = document.getElementById('imageNavigatorArrowUp');
  const arrowDown = document.getElementById('imageNavigatorArrowDown');
  
  if (screenTitle) screenTitle.style.display = 'block';
  allWrappers.forEach(w => w.style.display = 'flex');
  if (mainImageBg) mainImageBg.style.display = 'flex';
  if (designOverview) designOverview.style.display = 'block';
  if (textOverlay) textOverlay.style.display = 'block';
  if (additionalImageDisplay) additionalImageDisplay.style.display = 'flex';
  if (arrowUp) arrowUp.style.display = 'block';
  if (arrowDown) arrowDown.style.display = 'block';
  
  // 그리드 재활성화 (표시)
  const mainGridVisualization = document.getElementById('mainGridVisualization');
  const screenGridVisualization = document.getElementById('screenGridVisualization');
  if (mainGridVisualization) {
    mainGridVisualization.style.display = 'block';
    console.log('✅ 메인 그리드 활성화됨');
  }
  if (screenGridVisualization) {
    screenGridVisualization.style.display = 'block';
    console.log('✅ 스크린 그리드 활성화됨');
  }
  
  // 버튼 위치 업데이트
  setTimeout(() => {
    updateScreenResetButtonPosition();
    updateScreenMinimizeButtonPosition();
  }, 350); // transition 완료 후
  
  // 버튼 텍스트 변경
  screenMinimizeBtn.textContent = '최소화';
  screenResetBtn.style.display = 'block'; // 초기화 버튼 표시
  
  isScreenMinimized = false;
  console.log('✅ 스크린 최대화됨');
}

// 콘솔 안내 메시지
console.log('%c그리드 시스템이 활성화되었습니다!', 'color: #00ff00; font-size: 14px; font-weight: bold;');
console.log('%c사용 가능한 명령어:', 'color: #ffff00; font-size: 12px;');
console.log('  toggleMainGrid() - 메인 그리드 표시/숨김');
console.log('  toggleScreenGrid() - 스크린 그리드 표시/숨김');
console.log('  toggleAllGrids() - 모든 그리드 표시/숨김');
console.log('  getScreenGridInfo() - 스크린 그리드 정보 출력');
console.log('  checkScreenIcons() - 스크린 아이콘 상태 확인');
console.log('  resetM00Position() - M00 아이콘 위치 초기화');
console.log('  resetAllPositions() - 모든 아이콘 위치 초기화');