const container = document.getElementById("iconContainer");
const icons = document.querySelectorAll(".icon-wrapper");
const resetBtn = document.getElementById("resetBtn");
const arrowTop = document.getElementById("arrowTop");
const arrowBottom = document.getElementById("arrowBottom");

let dragging = null;
let startX, startY, origX, origY;
let initialPositions = {};
let afIndex = 0; // A~G 올라온 개수
let isResponsive = false; // 반응형 모드 여부
let isFirstLoad = true; // 최초 로드 여부
let imageSizes = {}; // 이미지 크기 저장

// 그리드 설정 (컨테이너 전체)
const GRID_X = 120;
const GRID_Y = 160;
const GRID_START_X = 80;  // 첫 번째 그리드 셀의 시작점
const GRID_START_Y = 80;
const MARGIN = 80;
const CONTAINER_WIDTH = 2560;
const CONTAINER_HEIGHT = 1440;

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
  'yong': { gridX: 19, gridY: 5 },       // 용
  'park': { gridX: 19, gridY: 6 },       // 공원
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
  
  console.log('🔄 메인 아이콘 업데이트 시작...');
  
  // 먼저 모든 메인 아이콘 숨김
  mainIconIds.forEach(iconId => {
    const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
    if (iconWrapper) {
      iconWrapper.style.display = 'none';
      iconWrapper.style.visibility = 'hidden';
    }
  });
  
  // IndexedDB에서 로드 (비동기)
  for (const iconId of mainIconIds) {
    const projectKey = `projectData_${iconId}`;
    
    try {
      // manager-mainscreen.js의 loadProjectFromDB 함수 사용
      const projectData = await loadProjectFromDB(projectKey);
      
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      
      if (projectData) {
        // 프로젝트 데이터가 있으면 아이콘 업데이트 및 표시
        updateIconImage(iconId, projectData);
        if (iconWrapper) {
          iconWrapper.style.display = 'flex';
          iconWrapper.style.visibility = 'visible';
          console.log(`✅ ${iconId} 아이콘 표시됨 (프로젝트 있음)`);
        }
      } else {
        // 프로젝트 데이터가 없으면 아이콘 숨김 유지
        console.log(`❌ ${iconId} 아이콘 숨김 (프로젝트 없음)`);
      }
    } catch (e) {
      console.error(`${iconId} 프로젝트 데이터 로드 실패:`, e);
    }
  }
  
  console.log('✅ 메인 아이콘 업데이트 완료');
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
    loadInitialPositions();
    calculateImagePositions();
    saveInitialPositions();
    updateContainerScale();
    visualizeMainGrid(); // 메인 그리드 시각화
    
    // 캐비넷/장독대 아이콘 이벤트 등록
    initializeCabinetTrashIcons();
    
    // 전광판 초기화
    loadMarqueeText();
    initMarquee();
    
    // 메인 루프 시작
    startMainImageLoop();
  }, 100);
});


// 스냅 기능 (마그네틱) - 그리드 안의 이미지 위치 유지
function snapToGrid(icon) {
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
      const iconWidth = icon.naturalWidth || 120;
      const iconHeight = icon.naturalHeight || 120;

      const boundedX = Math.max(MARGIN, Math.min(newX, CONTAINER_WIDTH - MARGIN - iconWidth));
      const boundedY = Math.max(MARGIN, Math.min(newY, CONTAINER_HEIGHT - MARGIN - iconHeight));
      
      icon.style.left = boundedX + "px";
      icon.style.top = boundedY + "px";
    };

    const onMouseUp = (e) => {
      icon.classList.remove("dragging");
      
      // transition 복원
      icon.style.transition = "all 0.5s ease";
      
      // 그리드 적용 (마그네틱 기능)
        snapToGrid(icon);
        preventOverlap(icon);
      
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      dragging = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // 클릭 이벤트 추가 (메인 아이콘은 이미지 표시, 다른 아이콘은 레이블 확장/축소)
  icon.addEventListener("click", (e) => {
    // 드래그 중이거나 레이블 편집 중이면 무시
    if (dragging || e.target.classList.contains('icon-label')) return;
    
    // 메인화면 아이콘 (M00~M17) 클릭 시 이미지 표시
    if (icon.classList.contains('icon-left') || icon.classList.contains('icon-af')) {
      const iconId = icon.dataset.id;
      console.log(`🖱️ 메인 아이콘 ${iconId} 클릭됨 - 이미지 표시`);
      showProjectImageOnMainGrid(iconId);
    } else {
      // 다른 아이콘들은 active 클래스 토글
    icon.classList.toggle('active');
    console.log(`아이콘 ${icon.dataset.id} 클릭, active: ${icon.classList.contains('active')}`);
    }
  });

  // 더블클릭 이벤트 추가
  icon.addEventListener("dblclick", (e) => {
    e.preventDefault();
    
    if (icon.classList.contains('icon-right')) {
      const iconId = icon.dataset.id;
      
      if (iconId === 'manager') {
        // 관리자 모드 UI 표시 (manager.js)
        if (typeof showManagerUI === 'function') {
          showManagerUI();
        } else {
          console.error('showManagerUI 함수를 찾을 수 없습니다. manager.js가 로드되었는지 확인하세요.');
        }
      }
      // 다른 오른쪽 아이콘들은 더블클릭 기능 제거 (스크린 없음)
    }
    // 메인 아이콘들 (M00~M17)은 클릭으로만 작동하므로 더블클릭 기능 제거
  });

  // 라벨 더블클릭 이벤트 추가 (글씨 부분에서만 작동)
  const label = icon.querySelector('.icon-label');
  if (label) {
    console.log('레이블 발견:', label.textContent, '아이콘:', icon.dataset.id);
  }
});


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


// 화면 초기화 함수 (완전 리프레시)
function resetMainScreen() {
  console.log('🔄 화면 리프레시...');
  
  // 캐비넷/장독대 모드였다면 메인 모드로 복귀
  if (currentGridMode !== 'main') {
    returnToMainMode();
  } else {
    location.reload();
  }
}

// 초기화 버튼 (메인)
resetBtn.addEventListener("click", resetMainScreen);

// F5 키 감지 (리프레시)
window.addEventListener("keydown", (e) => {
  if (e.key === 'F5') {
    // F5는 기본 동작(새로고침) 허용
    console.log('🔄 F5 키: 페이지 새로고침');
  }
});


// 반응형 모드 토글
function toggleResponsiveMode(enable) {
  const afIcons = document.querySelectorAll(".icon-wrapper.icon-af");
  const baseIcons = document.querySelectorAll(".icon-wrapper:not(.icon-af):not(.icon-right)");
  
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

// 프로젝트 스크린 위치 체크를 위한 주기적 업데이트
setInterval(() => {
  checkFirstIconPosition();
}, 100);


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

// ==================== 메인 그리드 이미지 표시 기능 ====================

// 현재 표시 중인 이미지 데이터
let currentDisplayedProject = {
  iconId: null,
  mainImage: null,
  additionalImages: [],
  currentImageIndex: 0  // 현재 표시 중인 이미지 인덱스 (0: 메인, 1~: 추가)
};

// 관리자 창 열림 상태
let isManagerOverlayOpen = false;

// 자동 루프 관련 변수
let mainLoopImages = [];  // 루프할 이미지 배열
let currentLoopIndex = 0;  // 현재 루프 인덱스
let loopIntervalId = null;  // 루프 타이머 ID
let isLoopActive = false;  // 루프 활성화 상태

// 메인 그리드에 프로젝트 이미지 표시
async function showProjectImageOnMainGrid(iconId) {
  console.log(`📷 메인 그리드에 이미지 표시 시작: ${iconId}`);
  
  // 1. 12분할 뷰 즉시 완전 제거
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    console.log('🗑️ 12분할 뷰 즉시 제거');
    gridView.remove();
  }
  hide12GridArrows();
  const pieceBtn = document.getElementById('pieceButton');
  if (pieceBtn) pieceBtn.remove();
  isGrid12ViewMode = false;
  
  // 2. 자동 루프 중지
  stopMainImageLoop();
  
  // 프로젝트 데이터 로드
  const storageKey = `projectData_${iconId}`;
  const projectData = await loadProjectFromDB(storageKey);
  
  if (!projectData) {
    console.log(`❌ ${iconId}에 저장된 프로젝트 데이터 없음`);
    alert(`${iconId}에 등록된 프로젝트가 없습니다.`);
    return;
  }
  
  if (!projectData.mainImage) {
    console.log(`❌ ${iconId}에 메인 이미지 없음`);
    alert(`${iconId}에 등록된 이미지가 없습니다.`);
    return;
  }
  
  console.log(`✅ 프로젝트 데이터 로드 완료`, projectData);
  console.log(`📸 메인 이미지:`, projectData.mainImage ? `있음 (${projectData.mainImage.length} bytes)` : '없음');
  console.log(`📸 추가 이미지:`, projectData.additionalImages?.length || 0, '개');
  
  // 3. 기존 프로젝트 이미지 즉시 제거
  const existingProjectImage = document.getElementById('mainGridDisplayImage');
  if (existingProjectImage) {
    console.log('🗑️ 기존 프로젝트 이미지 즉시 제거');
    existingProjectImage.remove();
  }
  
  // 4. 텍스트 오버레이 즉시 제거
  const existingText = document.getElementById('mainGridTextOverlay');
  if (existingText) {
    console.log('🗑️ 기존 텍스트 오버레이 즉시 제거');
    existingText.remove();
  }
  
  // 5. 네비게이션 화살표 제거
  hideImageNavigationArrows();
  
  // 현재 프로젝트 정보 저장
  currentDisplayedProject = {
    iconId: iconId,
    mainImage: projectData.mainImage,
    additionalImages: projectData.additionalImages || [],
    currentImageIndex: 0
  };
  
  console.log(`🔄 현재 표시 프로젝트:`, currentDisplayedProject.iconId);
  console.log(`🔄 추가 이미지 배열 타입:`, Array.isArray(currentDisplayedProject.additionalImages) ? 'Array' : typeof currentDisplayedProject.additionalImages);
  if (currentDisplayedProject.additionalImages.length > 0) {
    console.log(`🔄 첫 번째 추가 이미지 타입:`, typeof currentDisplayedProject.additionalImages[0]);
  }
  
  // 이미지 표시 (그리드 6,1부터 17,6까지 = 1440x960)
  displayImageOnMainGrid(projectData.mainImage, 0);
  
  // 텍스트 오버레이 표시 (그리드 3,1에서 시작)
  displayProjectTextOnMainGrid(projectData);
  
  // 추가 이미지가 있으면 네비게이션 화살표 표시
  if (currentDisplayedProject.additionalImages.length > 0) {
    showImageNavigationArrows();
  }
}

// 메인 그리드에 이미지 표시 (실제 렌더링)
function displayImageOnMainGrid(imageData, imageIndex) {
  console.log(`🖼️ 이미지 표시 중... (인덱스: ${imageIndex})`);
  
  // 12분할 뷰 즉시 제거 (있다면)
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    console.log('🗑️ displayImageOnMainGrid: 12분할 뷰 즉시 제거');
    gridView.remove();
    hide12GridArrows();
    const pieceBtn = document.getElementById('pieceButton');
    if (pieceBtn) pieceBtn.remove();
    isGrid12ViewMode = false;
  }
  
  // 기존 이미지 페이드아웃 후 제거
  const existingImage = document.getElementById('mainGridDisplayImage');
  
  // 그리드 6,1의 픽셀 좌표 계산
  const startGridX = 6;
  const startGridY = 1;
  const imageWidth = 1440;  // 12 그리드 * 120px (6~17 = 12칸)
  const imageHeight = 960;  // 6 그리드 * 160px (1~6 = 6칸)
  
  // 픽셀 좌표 계산
  const pixelX = GRID_START_X + (startGridX * GRID_X);
  const pixelY = GRID_START_Y + (startGridY * GRID_Y);
  
  console.log(`📍 이미지 위치: (${pixelX}, ${pixelY}), 크기: ${imageWidth}x${imageHeight}`);
  
  // 새 이미지 생성 함수
  const createNewImage = () => {
    // 12분할 뷰 다시 한 번 확인 (혹시 모를 경우)
    const checkGridView = document.getElementById('grid12View');
    if (checkGridView) {
      console.log('⚠️ createNewImage: 12분할 뷰 발견! 즉시 제거');
      checkGridView.remove();
      hide12GridArrows();
      const checkPieceBtn = document.getElementById('pieceButton');
      if (checkPieceBtn) checkPieceBtn.remove();
    }
    
    // 이미지 요소 생성 (처음에는 숨김)
    const img = document.createElement('img');
    img.id = 'mainGridDisplayImage';
    img.src = imageData;
    img.style.cssText = `
      position: absolute;
      left: ${pixelX}px;
      top: ${pixelY}px;
      width: ${imageWidth}px;
      height: ${imageHeight}px;
      z-index: 500;
      object-fit: cover;
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    container.appendChild(img);
    
    // 이미지 로드 완료 후 표시
    img.onload = () => {
      requestAnimationFrame(() => {
        img.style.opacity = '1';
      });
    };
  };
  
  // 기존 이미지가 있으면 크로스 페이드 (기존 페이드아웃과 새 이미지 페이드인 동시 진행)
  if (existingImage) {
    // 새 이미지를 먼저 생성 (opacity: 0)
    createNewImage();
    
    // 기존 이미지 페이드아웃
    existingImage.style.transition = 'opacity 0.3s ease';
    existingImage.style.opacity = '0';
    existingImage.style.zIndex = '499';  // 새 이미지보다 아래
    
    // 300ms 후 기존 이미지 제거
    setTimeout(() => {
      existingImage.remove();
    }, 300);
  } else {
    // 기존 이미지 없으면 바로 표시
    createNewImage();
  }
  
  console.log(`✅ 이미지 표시 완료`);
}

// 메인 그리드 이미지 제거
function clearMainGridImages() {
  console.log(`🧹 메인 그리드 이미지 제거`);
  
  // 12분할 뷰 제거 (있다면)
  if (isGrid12ViewMode) {
    const gridView = document.getElementById('grid12View');
    if (gridView) gridView.remove();
    hide12GridArrows();
    const pieceBtn = document.getElementById('pieceButton');
    if (pieceBtn) pieceBtn.remove();
    isGrid12ViewMode = false;
  }
  
  // ID로 찾아서 즉시 제거
  const existingImage = document.getElementById('mainGridDisplayImage');
  if (existingImage) {
    console.log('🗑️ mainGridDisplayImage 즉시 제거');
    existingImage.remove();
  }
  
  // 모든 프로젝트 이미지 제거 (ID 패턴 매칭)
  const allProjectImages = document.querySelectorAll('[id^="mainGridDisplayImage"]');
  allProjectImages.forEach(img => {
    console.log('🗑️ 추가 프로젝트 이미지 제거:', img.id);
    img.remove();
  });
  
  // z-index 499~501 범위의 이미지 제거 (크로스페이드 중인 이미지)
  const container = document.querySelector('.container');
  if (container) {
    const allImages = container.querySelectorAll('img');
    allImages.forEach(img => {
      const zIndex = parseInt(img.style.zIndex) || 0;
      if (zIndex >= 499 && zIndex <= 501) {
        console.log('🗑️ 페이드 중인 프로젝트 이미지 제거 (z-index:', zIndex, ')');
        img.remove();
      }
    });
  }
  
  // 텍스트 오버레이 제거
  const existingText = document.getElementById('mainGridTextOverlay');
  if (existingText) {
    console.log('🗑️ mainGridTextOverlay 즉시 제거');
    existingText.remove();
  }
  
  // 모든 텍스트 오버레이 제거
  const allTextOverlays = document.querySelectorAll('[id^="mainGridTextOverlay"]');
  allTextOverlays.forEach(txt => {
    console.log('🗑️ 추가 텍스트 오버레이 제거:', txt.id);
    txt.remove();
  });
  
  // z-index 550인 div 제거 (텍스트 오버레이)
  if (container) {
    const allDivs = container.querySelectorAll('div');
    allDivs.forEach(div => {
      const zIndex = parseInt(div.style.zIndex) || 0;
      if (zIndex === 550) {
        console.log('🗑️ 텍스트 오버레이 제거 (z-index: 550)');
        div.remove();
      }
    });
  }
  
  // 네비게이션 화살표도 제거
  hideImageNavigationArrows();
  
  // Several 버튼 제거
  hideSeveralButton();
  
  // z-index 600~700 범위의 요소 제거 (화살표, 버튼 등)
  if (container) {
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
      const zIndex = parseInt(el.style.zIndex) || 0;
      if (zIndex >= 600 && zIndex <= 700) {
        console.log('🗑️ UI 요소 제거 (z-index:', zIndex, ')');
        el.remove();
      }
    });
  }
  
  // 현재 프로젝트 정보 초기화
  currentDisplayedProject = {
    iconId: null,
    mainImage: null,
    additionalImages: [],
    currentImageIndex: 0
  };
  
  console.log('✅ 메인 그리드 이미지 제거 완료');
  
  // 자동 루프 재개 (캐비넷/장독대 모드가 아닐 때만)
  if (currentGridMode === 'main') {
    resumeMainImageLoop();
  }
}

// 메인 그리드에 프로젝트 텍스트 표시
function displayProjectTextOnMainGrid(projectData) {
  console.log(`📝 프로젝트 텍스트 표시 시작`);
  
  // 기존 텍스트 제거
  const existingText = document.getElementById('mainGridTextOverlay');
  if (existingText) {
    existingText.remove();
  }
  
  // 텍스트 시작 위치 (그리드 3,1)
  const textStartGridX = 3;
  const textStartGridY = 1;
  const textStartX = GRID_START_X + (textStartGridX * GRID_X);
  const textStartY = GRID_START_Y + (textStartGridY * GRID_Y);
  
  // "건축면적"의 자연스러운 너비 측정
  const tempSpan = document.createElement('span');
  tempSpan.style.cssText = `
    position: absolute;
    visibility: hidden;
    font-size: 18px;
    font-weight: bold;
    font-family: 'WAGURI', sans-serif;
  `;
  tempSpan.textContent = '건축면적';
  document.body.appendChild(tempSpan);
  const labelWidth = tempSpan.offsetWidth;
  document.body.removeChild(tempSpan);
  
  console.log(`📏 "건축면적" 자연 너비: ${labelWidth}px`);
  
  // 텍스트 오버레이 컨테이너 (처음에는 숨김)
  const textOverlay = document.createElement('div');
  textOverlay.id = 'mainGridTextOverlay';
  textOverlay.style.cssText = `
    position: absolute;
    left: ${textStartX}px;
    top: ${textStartY}px;
    z-index: 550;
    color: white;
    font-family: 'WAGURI', sans-serif;
    pointer-events: none;
    opacity: 0;
  `;
  
  let currentY = 0;
  const lineHeight = 30;
  const contentGap = 10;   // 타이틀과 내용 사이 간격
  
  // 설계개요
  if (projectData.designOverview) {
    const designOverviewText = document.createElement('div');
    designOverviewText.textContent = '설계개요';
    designOverviewText.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: ${projectData.designOverview.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-bottom: 15px;
    `;
    textOverlay.appendChild(designOverviewText);
    currentY += 39;
  }
  
  // 사업명
  if (projectData.projectName && projectData.projectName.text) {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; margin-bottom: 10px;`;
    
    // 레이블 (양쪽정렬)
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      width: ${labelWidth}px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.projectName.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    // "사업명"을 각 글자로 분리
    const chars = '사업명'.split('');
    chars.forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      labelContainer.appendChild(span);
    });
    
    const content = document.createElement('span');
    content.textContent = projectData.projectName.text;
    content.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.projectName.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-left: ${contentGap}px;
    `;
    
    row.appendChild(labelContainer);
    row.appendChild(content);
    textOverlay.appendChild(row);
    currentY += lineHeight;
    
    // 년도가 있으면 아랫줄에 표시
    if (projectData.projectName.startYear && projectData.projectName.endYear) {
      const yearRow = document.createElement('div');
      yearRow.style.cssText = `display: flex; margin-bottom: 10px;`;
      
      // 빈 레이블 공간
      const emptyLabel = document.createElement('div');
      emptyLabel.style.cssText = `width: ${labelWidth}px;`;
      
      const yearContent = document.createElement('span');
      yearContent.textContent = `(${projectData.projectName.startYear}~${projectData.projectName.endYear})`;
      yearContent.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: ${projectData.projectName.color || '#ffffff'};
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        margin-left: ${contentGap}px;
      `;
      
      yearRow.appendChild(emptyLabel);
      yearRow.appendChild(yearContent);
      textOverlay.appendChild(yearRow);
      currentY += lineHeight;
    }
  }
  
  // 주용도
  if (projectData.usage && projectData.usage.text) {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; margin-bottom: 10px;`;
    
    // 레이블 (양쪽정렬)
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      width: ${labelWidth}px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.usage.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    // "주용도"를 각 글자로 분리
    const chars = '주용도'.split('');
    chars.forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      labelContainer.appendChild(span);
    });
    
    const content = document.createElement('span');
    content.textContent = projectData.usage.text;
    content.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.usage.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-left: ${contentGap}px;
    `;
    
    row.appendChild(labelContainer);
    row.appendChild(content);
    textOverlay.appendChild(row);
    currentY += lineHeight;
  }
  
  // 건축면적
  if (projectData.buildingArea && projectData.buildingArea.text) {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; margin-bottom: 10px;`;
    
    // 레이블 (양쪽정렬)
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      width: ${labelWidth}px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.buildingArea.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    // "건축면적"을 각 글자로 분리
    const chars = '건축면적'.split('');
    chars.forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      labelContainer.appendChild(span);
    });
    
    const content = document.createElement('span');
    content.textContent = `${projectData.buildingArea.text} m2`;
    content.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.buildingArea.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-left: ${contentGap}px;
    `;
    
    row.appendChild(labelContainer);
    row.appendChild(content);
    textOverlay.appendChild(row);
    currentY += lineHeight;
  }
  
  // 연면적
  if (projectData.totalArea && projectData.totalArea.text) {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; margin-bottom: 10px;`;
    
    // 레이블 (양쪽정렬)
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = `
      width: ${labelWidth}px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.totalArea.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    // "연면적"을 각 글자로 분리
    const chars = '연면적'.split('');
    chars.forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      labelContainer.appendChild(span);
    });
    
    const content = document.createElement('span');
    content.textContent = `${projectData.totalArea.text} m2`;
    content.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: ${projectData.totalArea.color || '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-left: ${contentGap}px;
    `;
    
    row.appendChild(labelContainer);
    row.appendChild(content);
    textOverlay.appendChild(row);
    currentY += lineHeight;
  }
  
  // 설계자 섹션
  if (projectData.designers && projectData.designers.length > 0) {
    // 빈 row 추가
    const emptyRow1 = document.createElement('div');
    emptyRow1.style.cssText = `height: ${lineHeight}px;`;
    textOverlay.appendChild(emptyRow1);
    currentY += lineHeight;
    
    // "설계자" 타이틀 (양쪽정렬)
    const designerTitleContainer = document.createElement('div');
    designerTitleContainer.style.cssText = `
      width: ${labelWidth}px;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-bottom: 10px;
    `;
    
    // "설계자"를 각 글자로 분리
    const titleChars = '설계자'.split('');
    titleChars.forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      designerTitleContainer.appendChild(span);
    });
    
    textOverlay.appendChild(designerTitleContainer);
    currentY += lineHeight;
    
    // 설계자 항목들
    projectData.designers.forEach((designer, index) => {
      if (designer.field || designer.office) {
        const row = document.createElement('div');
        row.style.cssText = `display: flex; margin-bottom: 10px;`;
        
        // 분야 레이블 (양쪽정렬)
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = `
          width: ${labelWidth}px;
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          font-weight: bold;
          color: ${designer.color || '#ffffff'};
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        `;
        
        // 분야명을 각 글자로 분리
        const fieldText = designer.field || '';
        const fieldChars = fieldText.split('');
        fieldChars.forEach(char => {
          const span = document.createElement('span');
          span.textContent = char;
          fieldContainer.appendChild(span);
        });
        
        const office = document.createElement('span');
        office.textContent = designer.office || '';
        office.style.cssText = `
          font-size: 18px;
          font-weight: bold;
          color: ${designer.color || '#ffffff'};
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          margin-left: ${contentGap}px;
        `;
        
        // 홈페이지 주소가 있으면 클릭 가능하게 설정
        if (designer.homepage) {
          office.style.cursor = 'pointer';
          office.style.textDecoration = 'underline';
          office.style.pointerEvents = 'auto';
          office.onclick = () => {
            console.log(`🌐 홈페이지 열기: ${designer.homepage}`);
            window.open(designer.homepage, '_blank');
          };
          office.onmouseover = () => {
            office.style.opacity = '0.7';
          };
          office.onmouseout = () => {
            office.style.opacity = '1';
          };
        }
        
        row.appendChild(fieldContainer);
        row.appendChild(office);
        textOverlay.appendChild(row);
        currentY += lineHeight;
      }
    });
    
    // 설계자와 담당업무 사이 빈 row 추가
    const emptyRow2 = document.createElement('div');
    emptyRow2.style.cssText = `height: ${lineHeight}px;`;
    textOverlay.appendChild(emptyRow2);
    currentY += lineHeight;
  }
  
  // 담당업무 섹션
  if (projectData.staff && projectData.staff.length > 0) {
    // 설계자가 없는 경우에만 빈 줄 추가
    if (!projectData.designers || projectData.designers.length === 0) {
      const emptyRow2 = document.createElement('div');
      emptyRow2.style.cssText = `height: ${lineHeight}px;`;
      textOverlay.appendChild(emptyRow2);
      currentY += lineHeight;
    }
    
    // "담당업무" 타이틀
    const staffTitle = document.createElement('div');
    staffTitle.textContent = '담당업무';
    staffTitle.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin-bottom: 10px;
    `;
    textOverlay.appendChild(staffTitle);
    currentY += lineHeight;
    
    // 담당업무 항목들
    projectData.staff.forEach((member, index) => {
      if (member.name || member.position || member.role) {
        const row = document.createElement('div');
        row.style.cssText = `display: flex; margin-bottom: 10px;`;
        
        // 이름 (양쪽정렬)
        const nameContainer = document.createElement('div');
        nameContainer.style.cssText = `
          width: ${labelWidth}px;
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          font-weight: bold;
          color: ${member.color || '#ffffff'};
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        `;
        
        // 이름을 각 글자로 분리
        const nameText = member.name || '';
        const nameChars = nameText.split('');
        nameChars.forEach(char => {
          const span = document.createElement('span');
          span.textContent = char;
          nameContainer.appendChild(span);
        });
        
        const position = document.createElement('span');
        position.textContent = member.position || '';
        position.style.cssText = `
          font-size: 18px;
          font-weight: bold;
          color: ${member.color || '#ffffff'};
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          margin-left: ${contentGap}px;
          min-width: 60px;
        `;
        
        const role = document.createElement('span');
        role.textContent = member.role || '';
        role.style.cssText = `
          font-size: 18px;
          font-weight: bold;
          color: ${member.color || '#ffffff'};
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          margin-left: ${contentGap}px;
        `;
        
        row.appendChild(nameContainer);
        if (position.textContent) row.appendChild(position);
        if (role.textContent) row.appendChild(role);
        textOverlay.appendChild(row);
        currentY += lineHeight;
      }
    });
  }
  
  container.appendChild(textOverlay);
  
  // 모든 내용이 추가된 후에 표시 (reflow 최소화)
  requestAnimationFrame(() => {
    textOverlay.style.opacity = '1';
  });
  
  console.log(`✅ 프로젝트 텍스트 표시 완료 (그리드 3,1에서 시작)`);
}

// 이미지 네비게이션 화살표 표시
function showImageNavigationArrows() {
  console.log(`🔼🔽 이미지 네비게이션 화살표 표시`);
  
  // 기존 화살표 제거
  hideImageNavigationArrows();
  
  // 이미지 표시 영역 계산 (그리드 6,1~17,6)
  const imageAreaStartX = GRID_START_X + (6 * GRID_X);  // 800
  const imageAreaStartY = GRID_START_Y + (1 * GRID_Y);  // 240
  const imageAreaWidth = 1440;
  const imageAreaHeight = 960;
  const imageAreaCenterX = imageAreaStartX + (imageAreaWidth / 2);  // 1520
  const imageAreaCenterY = imageAreaStartY + (imageAreaHeight / 2);  // 720
  
  // 위쪽 화살표 (icon_arrow1.png) - 먼저 임시로 로드하여 높이 확인
  const upArrow = document.createElement('img');
  upArrow.id = 'imageNavArrowUp';
  upArrow.src = 'images/icon_arrow1.png';
  upArrow.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 600;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  upArrow.onload = function() {
    // 이미지 로드 후 원본 크기 적용
    const arrowWidth = upArrow.naturalWidth;
    const arrowHeight = upArrow.naturalHeight;
    
    // 원본 크기 명시적으로 설정
    upArrow.style.width = arrowWidth + 'px';
    upArrow.style.height = arrowHeight + 'px';
    
    // x: 이미지 중심 = 이미지 영역 중심
    // y: 이미지 영역 y=0 위치에서 - 화살표 높이 - 30
    const finalX = imageAreaCenterX - (arrowWidth / 2);
    const finalY = imageAreaStartY - arrowHeight - 30;
    
    upArrow.style.left = finalX + 'px';
    upArrow.style.top = finalY + 'px';
    
    // 로드 완료 후 표시
    requestAnimationFrame(() => {
      upArrow.style.opacity = '0.8';
    });
    
    console.log(`위쪽 화살표 위치: (${finalX}, ${finalY}), 원본 크기: ${arrowWidth}x${arrowHeight}`);
  };
  
  upArrow.onmouseover = () => {
    upArrow.style.opacity = '1';
    upArrow.style.transform = 'scale(1.1)';
  };
  upArrow.onmouseout = () => {
    upArrow.style.opacity = '0.8';
    upArrow.style.transform = 'scale(1)';
  };
  upArrow.onclick = () => navigateImage(-1);
  
  // 아래쪽 화살표 (icon_arrow2.png)
  const downArrow = document.createElement('img');
  downArrow.id = 'imageNavArrowDown';
  downArrow.src = 'images/icon_arrow2.png';
  downArrow.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 600;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  downArrow.onload = function() {
    // 이미지 로드 후 원본 크기 적용
    const arrowWidth = downArrow.naturalWidth;
    const arrowHeight = downArrow.naturalHeight;
    
    // 원본 크기 명시적으로 설정
    downArrow.style.width = arrowWidth + 'px';
    downArrow.style.height = arrowHeight + 'px';
    
    // x: 이미지 중심 = 이미지 영역 중심
    // y: 이미지 영역 y=960 위치 + 30
    const finalX = imageAreaCenterX - (arrowWidth / 2);
    const finalY = imageAreaStartY + imageAreaHeight + 30;
    
    downArrow.style.left = finalX + 'px';
    downArrow.style.top = finalY + 'px';
    
    // 로드 완료 후 표시
    requestAnimationFrame(() => {
      downArrow.style.opacity = '0.8';
    });
    
    console.log(`아래쪽 화살표 위치: (${finalX}, ${finalY}), 원본 크기: ${arrowWidth}x${arrowHeight}`);
  };
  
  downArrow.onmouseover = () => {
    downArrow.style.opacity = '1';
    downArrow.style.transform = 'scale(1.1)';
  };
  downArrow.onmouseout = () => {
    downArrow.style.opacity = '0.8';
    downArrow.style.transform = 'scale(1)';
  };
  downArrow.onclick = () => navigateImage(1);
  
  // 현재 이미지 인덱스 표시
  const indexDisplay = document.createElement('div');
  indexDisplay.id = 'imageIndexDisplay';
  indexDisplay.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #fff;
    border-radius: 8px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
    z-index: 600;
    pointer-events: none;
    padding: 5px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s ease;
  `;
  
  // 초기 텍스트 설정하여 크기 계산
  updateImageIndexDisplay();
  
  // DOM에 추가 후 크기 계산
  container.appendChild(indexDisplay);
  
  // 위치 계산 (이미지 영역 오른쪽 경계에서 +10px, y축 중심 정렬)
  requestAnimationFrame(() => {
    const displayWidth = indexDisplay.offsetWidth;
    const displayHeight = indexDisplay.offsetHeight;
    
    const finalX = imageAreaStartX + imageAreaWidth + 10;
    const finalY = imageAreaCenterY - (displayHeight / 2);
    
    indexDisplay.style.left = finalX + 'px';
    indexDisplay.style.top = finalY + 'px';
    
    // 위치 설정 후 표시
    requestAnimationFrame(() => {
      indexDisplay.style.opacity = '0.8';
    });
    
    console.log(`이미지 인덱스 표시 위치: (${finalX}, ${finalY}), 크기: ${displayWidth}x${displayHeight}`);
  });
  
  container.appendChild(upArrow);
  container.appendChild(downArrow);
  
  // 마우스 휠 이벤트 등록
  document.addEventListener('wheel', handleImageWheel);
}

// 이미지 네비게이션 화살표 숨김
function hideImageNavigationArrows() {
  const upArrow = document.getElementById('imageNavArrowUp');
  const downArrow = document.getElementById('imageNavArrowDown');
  const indexDisplay = document.getElementById('imageIndexDisplay');
  
  if (upArrow) upArrow.remove();
  if (downArrow) downArrow.remove();
  if (indexDisplay) indexDisplay.remove();
  
  // 휠 이벤트 제거
  document.removeEventListener('wheel', handleImageWheel);
}

// 이미지 인덱스 표시 업데이트
function updateImageIndexDisplay() {
  const indexDisplay = document.getElementById('imageIndexDisplay');
  if (!indexDisplay) return;
  
  const totalImages = 1 + currentDisplayedProject.additionalImages.length;
  const currentIndex = currentDisplayedProject.currentImageIndex + 1;
  indexDisplay.textContent = `${currentIndex}/${totalImages}`;
}

// 이미지 네비게이션 (direction: -1=이전, 1=다음)
function navigateImage(direction) {
  const totalImages = 1 + currentDisplayedProject.additionalImages.length;
  
  // 새로운 인덱스 계산 (순환)
  let newIndex = currentDisplayedProject.currentImageIndex + direction;
  
  if (newIndex < 0) {
    newIndex = totalImages - 1;  // 마지막 이미지로
  } else if (newIndex >= totalImages) {
    newIndex = 0;  // 첫 번째 이미지로
  }
  
  currentDisplayedProject.currentImageIndex = newIndex;
  
  // 이미지 표시
  let imageData;
  if (newIndex === 0) {
    imageData = currentDisplayedProject.mainImage;
  } else {
    const additionalImage = currentDisplayedProject.additionalImages[newIndex - 1];
    // 배열 요소가 문자열인지 객체인지 확인
    imageData = typeof additionalImage === 'string' ? additionalImage : additionalImage.imageData;
  }
  
  console.log(`📷 이미지 전환: ${newIndex + 1}/${totalImages}, imageData length: ${imageData?.length || 0}`);
  
  displayImageOnMainGrid(imageData, newIndex);
  updateImageIndexDisplay();
}

// 마우스 휠 이벤트 핸들러
function handleImageWheel(e) {
  // 관리자 창이 열려있으면 이미지 네비게이션 비활성화
  if (isManagerOverlayOpen) return;
  
  // 이미지가 표시 중일 때만 작동
  if (!currentDisplayedProject.iconId) return;
  
  // 휠 방향에 따라 이미지 전환
  if (e.deltaY > 0) {
    // 아래로 스크롤 = 다음 이미지
    navigateImage(1);
  } else {
    // 위로 스크롤 = 이전 이미지
    navigateImage(-1);
  }
  
  e.preventDefault();
}

// ESC 키로 이미지 닫기 및 모드 복귀
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    console.log('⌨️ ESC 키 감지');
    console.log('   - currentDisplayedProject.iconId:', currentDisplayedProject.iconId);
    console.log('   - currentGridMode:', currentGridMode);
    console.log('   - isGrid12ViewMode:', isGrid12ViewMode);
    
    if (currentDisplayedProject.iconId) {
      console.log('🚪 ESC 키로 프로젝트 이미지 닫기');
      clearMainGridImages();
    } else if (currentGridMode !== 'main') {
      console.log('🚪 ESC 키로 메인 모드 복귀');
      returnToMainMode();
    } else {
      console.log('ℹ️ ESC 키 무시 (메인 모드이고 프로젝트 표시 안 됨)');
    }
  }
});

// ==================== 메인 이미지 자동 루프 ====================

// 메인 루프용 이미지 수집
async function collectMainLoopImages() {
  const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                       'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
  
  const loopImages = [];
  
  for (const iconId of mainIconIds) {
    const storageKey = `projectData_${iconId}`;
    const projectData = await loadProjectFromDB(storageKey);
    
    if (projectData && projectData.mainImage && projectData.useInMainLoop) {
      loopImages.push({
        iconId: iconId,
        imageData: projectData.mainImage,
        projectName: projectData.projectName?.text || iconId
      });
      console.log(`✅ 루프 이미지 추가: ${iconId} (${projectData.projectName?.text || ''})`);
    }
  }
  
  console.log(`📸 총 ${loopImages.length}개의 루프 이미지 수집됨`);
  return loopImages;
}

// 메인 루프 시작
async function startMainImageLoop() {
  console.log('🔄 메인 이미지 루프 시작...');
  
  // 루프 이미지 수집
  mainLoopImages = await collectMainLoopImages();
  
  if (mainLoopImages.length === 0) {
    console.log('⚠️ 루프할 이미지가 없습니다.');
    return;
  }
  
  // 첫 번째 이미지 표시
  currentLoopIndex = 0;
  isLoopActive = true;
  displayLoopImage(currentLoopIndex);
  
  // Several 버튼 표시
  showSeveralButton();
  
  // 5초 + 0.3초(크로스 페이드) = 5.3초마다 이미지 전환
  loopIntervalId = setInterval(() => {
    if (isLoopActive && !currentDisplayedProject.iconId && !isGrid12ViewMode) {
      // 사용자가 아이콘을 클릭하지 않았고, 12분할 뷰가 아닌 경우에만 루프
      nextLoopImage();
    }
  }, 5300);
  
  console.log('✅ 메인 루프 활성화 (5.3초 간격)');
}

// 다음 루프 이미지로 전환
function nextLoopImage() {
  // 12분할 뷰 모드이거나 프로젝트 표시 중이면 실행하지 않음
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ nextLoopImage 중지 (12분할/프로젝트 모드)');
    return;
  }
  
  currentLoopIndex = (currentLoopIndex + 1) % mainLoopImages.length;
  displayLoopImage(currentLoopIndex);
}

// 루프 이미지 표시 (크로스 페이드 방식)
function displayLoopImage(index) {
  // 12분할 뷰 모드이거나 프로젝트 표시 중이면 루프 중지
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ 루프 표시 중지 (12분할/프로젝트 모드)');
    return;
  }
  
  const loopImage = mainLoopImages[index];
  if (!loopImage) return;
  
  console.log(`🖼️ 루프 이미지 표시: ${loopImage.iconId} (${index + 1}/${mainLoopImages.length})`);
  
  // 기존 이미지 확인
  const existingImage = document.getElementById('mainLoopDisplayImage');
  
  if (existingImage) {
    // 크로스 페이드: 새 이미지를 먼저 생성하고 동시에 페이드 진행
    showNewLoopImage(loopImage, existingImage);
  } else {
    // 처음 표시
    showNewLoopImage(loopImage, null);
  }
}

// 새 루프 이미지 표시 (크로스 페이드)
function showNewLoopImage(loopImage, existingImage = null) {
  // 12분할 뷰 모드이거나 프로젝트 표시 중이면 표시하지 않음
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ 루프 이미지 표시 중지 (12분할/프로젝트 모드)');
    if (existingImage) existingImage.remove();
    return;
  }
  
  // 그리드 6,1~17,6 영역 (1440x960)
  const startGridX = 6;
  const startGridY = 1;
  const imageWidth = 1440;  // 12 그리드 * 120px (6~17 = 12칸)
  const imageHeight = 960;  // 6 그리드 * 160px (1~6 = 6칸)
  
  const pixelX = GRID_START_X + (startGridX * GRID_X);
  const pixelY = GRID_START_Y + (startGridY * GRID_Y);
  
  console.log(`🖼️ 새 루프 이미지 생성: ${loopImage.iconId}`);
  
  // 새 이미지 요소 생성
  const img = document.createElement('img');
  img.id = 'mainLoopDisplayImage';
  img.src = loopImage.imageData;
  img.dataset.iconId = loopImage.iconId;
  img.style.cssText = `
    position: absolute;
    left: ${pixelX}px;
    top: ${pixelY}px;
    width: ${imageWidth}px;
    height: ${imageHeight}px;
    z-index: 450;
    object-fit: cover;
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    pointer-events: auto;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  // 클릭 이벤트 추가
  img.onclick = () => {
    console.log(`🖱️ 루프 이미지 클릭: ${loopImage.iconId}`);
    showProjectImageOnMainGrid(loopImage.iconId);
  };
  
  // 기존 이미지가 있으면 ID를 임시로 변경하여 중복 방지
  if (existingImage) {
    existingImage.id = 'mainLoopDisplayImage_old';
    existingImage.style.zIndex = '449';  // 새 이미지보다 아래
  }
  
  container.appendChild(img);
  
  // 이미지 로드 완료 후 크로스 페이드
  img.onload = () => {
    requestAnimationFrame(() => {
      // 새 이미지 페이드인
      img.style.opacity = '1';
      
      // 기존 이미지 페이드아웃 (동시에)
      if (existingImage) {
        existingImage.style.transition = 'opacity 0.3s ease';
        existingImage.style.opacity = '0';
        
        // 300ms 후 기존 이미지 제거
  setTimeout(() => {
          if (existingImage.parentElement) {
            existingImage.remove();
          }
        }, 300);
      }
    });
  };
  
  // 5초는 interval이 처리하므로 별도 타이머 불필요
  console.log('✅ 루프 이미지 표시 완료 (5초 후 자동 전환)');
}

// 루프 중지 (사용자가 아이콘 클릭 시)
function stopMainImageLoop() {
  console.log('⏹️ 루프 중지 시작...');
  
  // 루프 이미지 제거
  const loopImage = document.getElementById('mainLoopDisplayImage');
  if (loopImage) {
    loopImage.style.transition = 'opacity 0.3s ease';
    loopImage.style.opacity = '0';
    setTimeout(() => loopImage.remove(), 300);
  }
  
  // 이전 루프 이미지도 제거 (크로스 페이드 중일 수 있음)
  const oldLoopImage = document.getElementById('mainLoopDisplayImage_old');
  if (oldLoopImage) oldLoopImage.remove();
  
  // Several 버튼도 숨김
  hideSeveralButton();
}

// 루프 재개 (ESC 키로 이미지 닫기 시)
function resumeMainImageLoop() {
  // 프로젝트가 표시 중이거나 12분할 뷰가 활성화된 경우 루프 재개하지 않음
  if (currentDisplayedProject.iconId || isGrid12ViewMode) {
    console.log('⏸️ 루프 재개 안 함 (프로젝트/12분할 뷰 활성)');
    return;
  }
  
  console.log('🔁 루프 재개 시작...');
  
  // 모든 프로젝트 이미지 즉시 제거 (ID 패턴 매칭)
  const allProjectImages = document.querySelectorAll('[id^="mainGridDisplayImage"]');
  allProjectImages.forEach(img => {
    console.log('🗑️ 프로젝트 이미지 제거:', img.id);
    img.remove();
  });
  
  // z-index 499~501 범위의 이미지 제거
  const container = document.querySelector('.container');
  if (container) {
    const allImages = container.querySelectorAll('img');
    allImages.forEach(img => {
      const zIndex = parseInt(img.style.zIndex) || 0;
      if (zIndex >= 499 && zIndex <= 501) {
        console.log('🗑️ 페이드 중인 이미지 제거 (z-index:', zIndex, ')');
        img.remove();
      }
    });
  }
  
  // 모든 텍스트 오버레이 즉시 제거
  const allTextOverlays = document.querySelectorAll('[id^="mainGridTextOverlay"]');
  allTextOverlays.forEach(txt => {
    console.log('🗑️ 텍스트 오버레이 제거:', txt.id);
    txt.remove();
  });
  
  // z-index 550인 div 제거
  if (container) {
    const allDivs = container.querySelectorAll('div');
    allDivs.forEach(div => {
      const zIndex = parseInt(div.style.zIndex) || 0;
      if (zIndex === 550) {
        console.log('🗑️ 텍스트 오버레이 제거 (z-index: 550)');
        div.remove();
      }
    });
  }
  
  // 네비게이션 화살표 제거
  hideImageNavigationArrows();
  
  // z-index 600~700 범위의 요소 제거
  if (container) {
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
      const zIndex = parseInt(el.style.zIndex) || 0;
      if (zIndex >= 600 && zIndex <= 700) {
        // Several 버튼은 제외 (루프 재개 시 다시 표시됨)
        if (el.id !== 'severalButton') {
          console.log('🗑️ UI 요소 제거 (z-index:', zIndex, ')');
          el.remove();
        }
      }
    });
  }
  
  if (isLoopActive && mainLoopImages.length > 0) {
    displayLoopImage(currentLoopIndex);
    showSeveralButton();  // several 버튼 표시
    
    // 인터벌 재시작 (중지된 경우에만)
    if (!loopIntervalId) {
      loopIntervalId = setInterval(() => {
        if (isLoopActive && !currentDisplayedProject.iconId && !isGrid12ViewMode) {
          nextLoopImage();
        }
      }, 5300);
      console.log('🔁 루프 인터벌 재시작 (5.3초 간격)');
    }
  }
  
  console.log('✅ 루프 재개 완료');
}

// ==================== Several/Piece 버튼 (12분할 전환) ====================

let isGrid12ViewMode = false;  // 12분할 모드 상태

// Several 버튼 표시 (루프 모드)
function showSeveralButton() {
  // 기존 버튼 제거
  const existingBtn = document.getElementById('severalButton');
  if (existingBtn) return;  // 이미 있으면 생략
  
  // 그리드 17,1의 우측상단 모서리 위치 계산
  const grid17RightX = GRID_START_X + (17 * GRID_X) + GRID_X;  // 그리드 17의 우측 경계
  const grid1Y = GRID_START_Y + (1 * GRID_Y);  // 그리드 1의 상단 경계
  
  console.log(`📍 그리드 17,1 우측상단: (${grid17RightX}, ${grid1Y})`);
  
  // 버튼 생성
  const btn = document.createElement('img');
  btn.id = 'severalButton';
  btn.src = 'images/icon_several.png';
  btn.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 700;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  // 이미지 로드 후 위치 설정
  btn.onload = function() {
    const btnWidth = btn.naturalWidth;
    const btnHeight = btn.naturalHeight;
    
    btn.style.width = btnWidth + 'px';
    btn.style.height = btnHeight + 'px';
    
    // x: 그리드 17 우측끝 - 이미지 너비 - 5
    // y: 그리드 1 상단 + 5
    const finalX = grid17RightX - btnWidth - 5;
    const finalY = grid1Y + 5;
    
    btn.style.left = finalX + 'px';
    btn.style.top = finalY + 'px';
    
    // 페이드인
    requestAnimationFrame(() => {
      btn.style.opacity = '0.8';
    });
    
    console.log(`📍 Several 버튼 최종 위치: (${finalX}, ${finalY}), 크기: ${btnWidth}x${btnHeight}`);
  };
  
  btn.onmouseover = () => {
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.1)';
  };
  btn.onmouseout = () => {
    btn.style.opacity = '0.8';
    btn.style.transform = 'scale(1)';
  };
  
  btn.onclick = () => {
    console.log('🔲 12분할 뷰로 전환');
    show12GridView();
  };
  
  container.appendChild(btn);
}

// Several 버튼 숨김
function hideSeveralButton() {
  const btn = document.getElementById('severalButton');
  if (btn) {
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 200);
  }
}

// Piece 버튼 표시 (12분할 모드)
function showPieceButton() {
  // 기존 버튼 제거
  const existingBtn = document.getElementById('pieceButton');
  if (existingBtn) return;
  
  // 그리드 17,1의 우측상단 모서리 위치 계산
  const grid17RightX = GRID_START_X + (17 * GRID_X) + GRID_X;  // 그리드 17의 우측 경계
  const grid1Y = GRID_START_Y + (1 * GRID_Y);  // 그리드 1의 상단 경계
  
  console.log(`📍 그리드 17,1 우측상단: (${grid17RightX}, ${grid1Y})`);
  
  // 버튼 생성
  const btn = document.createElement('img');
  btn.id = 'pieceButton';
  btn.src = 'images/icon_piece.png';
  btn.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 700;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  // 이미지 로드 후 위치 설정
  btn.onload = function() {
    const btnWidth = btn.naturalWidth;
    const btnHeight = btn.naturalHeight;
    
    btn.style.width = btnWidth + 'px';
    btn.style.height = btnHeight + 'px';
    
    // x: 그리드 17 우측끝 - 이미지 너비 - 5
    // y: 그리드 1 상단 + 5
    const finalX = grid17RightX - btnWidth - 5;
    const finalY = grid1Y + 5;
    
    btn.style.left = finalX + 'px';
    btn.style.top = finalY + 'px';
    
    // 페이드인
    requestAnimationFrame(() => {
      btn.style.opacity = '0.8';
    });
    
    console.log(`📍 Piece 버튼 최종 위치: (${finalX}, ${finalY}), 크기: ${btnWidth}x${btnHeight}`);
  };
  
  btn.onmouseover = () => {
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.1)';
  };
  btn.onmouseout = () => {
    btn.style.opacity = '0.8';
    btn.style.transform = 'scale(1)';
  };
  
  btn.onclick = () => {
    console.log('🔄 루프 모드로 복귀');
    
    // 12분할 뷰 즉시 제거
    const gridView = document.getElementById('grid12View');
    if (gridView) gridView.remove();
    hide12GridArrows();
    isGrid12ViewMode = false;
    
    // Piece 버튼도 제거
    btn.remove();
    
    // 루프 재개
    resumeMainImageLoop();
  };
  
  container.appendChild(btn);
}

// Piece 버튼 숨김
function hidePieceButton() {
  const btn = document.getElementById('pieceButton');
  if (btn) {
    btn.style.opacity = '0';
    setTimeout(() => btn.remove(), 200);
  }
}

// ==================== 12분할 그리드 뷰 ====================

let grid12ViewScrollOffset = 0;  // 스크롤 오프셋

// 12분할 뷰 표시
function show12GridView() {
  console.log('🔲 12분할 뷰 표시 시작...');
  console.log(`   - 현재 isGrid12ViewMode: ${isGrid12ViewMode}`);
  console.log(`   - 현재 loopIntervalId: ${loopIntervalId}`);
  
  // 먼저 12분할 모드 플래그 설정 (루프 중지용) - 최우선!
  isGrid12ViewMode = true;
  
  // 루프 인터벌 완전 중지 (즉시!)
  if (loopIntervalId) {
    clearInterval(loopIntervalId);
    loopIntervalId = null;
    console.log('⏹️ 루프 인터벌 중지됨');
  }
  
  // 루프 이미지 즉시 제거 (페이드아웃 없이)
  const loopImage = document.getElementById('mainLoopDisplayImage');
  if (loopImage) {
    console.log('🗑️ 루프 이미지 즉시 제거');
    loopImage.remove();
  }
  
  // 이전 루프 이미지도 제거 (크로스 페이드 중일 수 있음)
  const oldLoopImage = document.getElementById('mainLoopDisplayImage_old');
  if (oldLoopImage) {
    console.log('🗑️ 이전 루프 이미지 즉시 제거');
    oldLoopImage.remove();
  }
  
  // 프로젝트 이미지 즉시 제거 (있다면)
  const projectImage = document.getElementById('mainGridDisplayImage');
  if (projectImage) {
    console.log('🗑️ 프로젝트 이미지 즉시 제거');
    projectImage.remove();
  }
  
  // 텍스트 오버레이 즉시 제거 (있다면)
  const textOverlay = document.getElementById('mainGridTextOverlay');
  if (textOverlay) {
    console.log('🗑️ 텍스트 오버레이 즉시 제거');
    textOverlay.remove();
  }
  
  // 네비게이션 화살표 제거
  hideImageNavigationArrows();
  
  // 현재 프로젝트 정보 초기화
  currentDisplayedProject = {
    iconId: null,
    mainImage: null,
    additionalImages: [],
    currentImageIndex: 0
  };
  
  // Several 버튼 숨김
  hideSeveralButton();
  
  // 12분할 뷰 컨테이너 생성
  const gridView = document.createElement('div');
  gridView.id = 'grid12View';
  gridView.style.cssText = `
    position: absolute;
    left: ${GRID_START_X + (6 * GRID_X)}px;
    top: ${GRID_START_Y + (1 * GRID_Y)}px;
    width: 1440px;
    height: 960px;
    z-index: 450;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  // 스크롤 컨테이너
  const scrollContainer = document.createElement('div');
  scrollContainer.id = 'grid12ScrollContainer';
  scrollContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  `;
  
  // 4x3 그리드로 배치 (각 칸 360x320)
  const gridCols = 4;
  const gridRows = 3;
  const cellWidth = 1440 / gridCols;  // 360px
  const cellHeight = 960 / gridRows;  // 320px
  
  mainLoopImages.forEach((loopImage, index) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    
    const cell = document.createElement('div');
    cell.style.cssText = `
      position: absolute;
      left: ${col * cellWidth}px;
      top: ${row * cellHeight}px;
      width: ${cellWidth}px;
      height: ${cellHeight}px;
      border: 2px solid #fff;
      box-sizing: border-box;
      cursor: pointer;
      overflow: hidden;
    `;
    
    const img = document.createElement('img');
    img.src = loopImage.imageData;
    img.dataset.iconId = loopImage.iconId;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    
    // 클릭 시 해당 프로젝트 표시
    cell.onclick = () => {
      console.log(`🖱️ 12분할 셀 클릭: ${loopImage.iconId}`);
      
      // 12분할 뷰 즉시 제거
      const currentGridView = document.getElementById('grid12View');
      if (currentGridView) currentGridView.remove();
      hide12GridArrows();
      const currentPieceBtn = document.getElementById('pieceButton');
      if (currentPieceBtn) currentPieceBtn.remove();
      isGrid12ViewMode = false;
      
      // 프로젝트 표시
      showProjectImageOnMainGrid(loopImage.iconId);
    };
    
    cell.appendChild(img);
    scrollContainer.appendChild(cell);
  });
  
  gridView.appendChild(scrollContainer);
  container.appendChild(gridView);
  
  // 페이드인 효과
  requestAnimationFrame(() => {
    gridView.style.opacity = '1';
  });
  
  // 마우스 휠 이벤트 리스너 추가
  gridView.addEventListener('wheel', handle12GridWheel, { passive: false });
  
  // Piece 버튼 표시
  showPieceButton();
  
  // 12개 이상이면 화살표 표시
  if (mainLoopImages.length > 12) {
    show12GridArrows();
  }
  
  // 이미 위에서 설정했지만 명확성을 위해 유지
  // isGrid12ViewMode = true;  (이미 설정됨)
  grid12ViewScrollOffset = 0;
  grid12ScrollPosition = 0;  // 픽셀 스크롤 위치도 초기화
  
  console.log(`✅ 12분할 뷰 표시 완료 (${mainLoopImages.length}개 이미지)`);
  console.log(`🔲 12분할 모드: ${isGrid12ViewMode}`);
}

// 12분할 뷰 숨김
function hide12GridView() {
  console.log('🗑️ 12분할 뷰 제거 시작...');
  
  // 먼저 플래그 해제
  isGrid12ViewMode = false;
  
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    // 즉시 제거 (페이드아웃 없이)
    gridView.remove();
    console.log('✅ 12분할 뷰 제거 완료');
  }
  
  // 화살표 즉시 제거
  hide12GridArrows();
  
  // Piece 버튼 즉시 제거
  const pieceBtn = document.getElementById('pieceButton');
  if (pieceBtn) pieceBtn.remove();
  
  grid12ViewScrollOffset = 0;
  grid12ScrollPosition = 0;  // 픽셀 스크롤 위치도 초기화
  
  console.log('✅ 12분할 모드 완전 해제');
}

// 12분할 뷰 화살표 표시
function show12GridArrows() {
  const imageAreaStartX = GRID_START_X + (6 * GRID_X);
  const imageAreaStartY = GRID_START_Y + (1 * GRID_Y);
  const imageAreaWidth = 1440;
  const imageAreaHeight = 960;
  const imageAreaCenterX = imageAreaStartX + (imageAreaWidth / 2);
  
  // 위쪽 화살표
  const upArrow = document.createElement('img');
  upArrow.id = 'grid12UpArrow';
  upArrow.src = 'images/icon_arrow1.png';
  upArrow.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 650;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  upArrow.onload = function() {
    const arrowWidth = upArrow.naturalWidth;
    const arrowHeight = upArrow.naturalHeight;
    
    upArrow.style.width = arrowWidth + 'px';
    upArrow.style.height = arrowHeight + 'px';
    upArrow.style.left = (imageAreaCenterX - arrowWidth / 2) + 'px';
    upArrow.style.top = (imageAreaStartY - arrowHeight - 30) + 'px';
    
    requestAnimationFrame(() => {
      upArrow.style.opacity = '0.8';
    });
  };
  
  upArrow.onclick = () => scroll12GridView(-1);
  upArrow.onmouseover = () => {
    upArrow.style.opacity = '1';
    upArrow.style.transform = 'scale(1.1)';
  };
  upArrow.onmouseout = () => {
    upArrow.style.opacity = '0.8';
    upArrow.style.transform = 'scale(1)';
  };
  
  // 아래쪽 화살표
  const downArrow = document.createElement('img');
  downArrow.id = 'grid12DownArrow';
  downArrow.src = 'images/icon_arrow2.png';
  downArrow.style.cssText = `
    position: absolute;
    cursor: pointer;
    z-index: 650;
    transition: opacity 0.2s ease, transform 0.3s ease;
    opacity: 0;
  `;
  
  downArrow.onload = function() {
    const arrowWidth = downArrow.naturalWidth;
    const arrowHeight = downArrow.naturalHeight;
    
    downArrow.style.width = arrowWidth + 'px';
    downArrow.style.height = arrowHeight + 'px';
    downArrow.style.left = (imageAreaCenterX - arrowWidth / 2) + 'px';
    downArrow.style.top = (imageAreaStartY + imageAreaHeight + 30) + 'px';
    
    requestAnimationFrame(() => {
      downArrow.style.opacity = '0.8';
    });
  };
  
  downArrow.onclick = () => scroll12GridView(1);
  downArrow.onmouseover = () => {
    downArrow.style.opacity = '1';
    downArrow.style.transform = 'scale(1.1)';
  };
  downArrow.onmouseout = () => {
    downArrow.style.opacity = '0.8';
    downArrow.style.transform = 'scale(1)';
  };
  
  container.appendChild(upArrow);
  container.appendChild(downArrow);
}

// 12분할 뷰 화살표 숨김
function hide12GridArrows() {
  const upArrow = document.getElementById('grid12UpArrow');
  const downArrow = document.getElementById('grid12DownArrow');
  if (upArrow) upArrow.remove();
  if (downArrow) downArrow.remove();
}

// 12분할 뷰 스크롤 (부드러운 루프 방식)
let grid12ScrollPosition = 0;  // 픽셀 단위 스크롤 위치
let isGrid12Scrolling = false;  // 스크롤 중 플래그

function scroll12GridView(direction) {
  const scrollContainer = document.getElementById('grid12ScrollContainer');
  if (!scrollContainer) return;
  
  if (isGrid12Scrolling) return;  // 스크롤 중이면 무시
  
  const totalRows = Math.ceil(mainLoopImages.length / 4);  // 4x3 배치
  const cellHeight = 320;  // 960 / 3 = 320px
  const maxScrollPosition = (totalRows - 3) * cellHeight;  // 최대 스크롤 위치 (픽셀)
  
  isGrid12Scrolling = true;
  
  // 행 단위로 스크롤 (320px씩)
  grid12ScrollPosition += direction * cellHeight;
  
  // 루프 처리
  if (grid12ScrollPosition < 0) {
    // 맨 위에서 위로 → 맨 아래로 점프
    scrollContainer.style.transition = 'none';  // 즉시 점프
    grid12ScrollPosition = maxScrollPosition;
    scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    
    // 다음 프레임에서 transition 재활성화
    requestAnimationFrame(() => {
      scrollContainer.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
  } else if (grid12ScrollPosition > maxScrollPosition) {
    // 맨 아래에서 아래로 → 맨 위로 점프
    scrollContainer.style.transition = 'none';  // 즉시 점프
    grid12ScrollPosition = 0;
    scrollContainer.style.transform = `translateY(0px)`;
    
    // 다음 프레임에서 transition 재활성화
    requestAnimationFrame(() => {
      scrollContainer.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
  } else {
    // 일반 스크롤 (기본 transition 사용)
    scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
  }
  
  const currentRow = Math.round(grid12ScrollPosition / cellHeight);
  console.log(`📜 12분할 뷰 스크롤: 행 ${currentRow}/${totalRows - 3} (${grid12ScrollPosition}px)`);
  
  // 0.6초 후 스크롤 가능하도록 (transition과 동일)
  setTimeout(() => {
    isGrid12Scrolling = false;
  }, 600);
}

// 12분할 뷰 마우스 휠 이벤트 (부드러운 스크롤)
let wheelTimeout = null;
let wheelDelta = 0;

function handle12GridWheel(e) {
  if (!isGrid12ViewMode) return;
  
  e.preventDefault();
  
  // 휠 델타 누적
  wheelDelta += e.deltaY;
  
  // 타임아웃 클리어
  if (wheelTimeout) {
    clearTimeout(wheelTimeout);
  }
  
  // 150ms 후 스크롤 실행 (부드러운 스크롤)
  wheelTimeout = setTimeout(() => {
    if (Math.abs(wheelDelta) > 30) {
      if (wheelDelta > 0) {
        scroll12GridView(1);  // 아래로
      } else {
        scroll12GridView(-1);  // 위로
      }
    }
    wheelDelta = 0;
  }, 150);
}

// ==================== 캐비넷/장독대 그리드 아이콘 ====================

let currentGridMode = 'main';  // 'main', 'cabinet', 'trash'
let generatedGridIcons = [];  // 생성된 그리드 아이콘 배열

// 전광판 관련 변수
let marqueeText = "저희가 참여한 프로젝트의 이미지를 사용할 수 있게 허락해주신 선,후배 건축사님들께 감사의 말을 전합니다.  덕분에 홈페이지가 풍성해질 수 있었습니다 : )";
let marqueeAnimationId = null;

// 캐비넷/장독대 아이콘 클릭 이벤트 (페이지 로드 후 등록)
function initializeCabinetTrashIcons() {
  const cabinetIcon = document.querySelector('.icon-wrapper[data-id="cabinet"]');
  const trashIcon = document.querySelector('.icon-wrapper[data-id="trash"]');

  if (cabinetIcon) {
    cabinetIcon.addEventListener('click', () => {
      console.log('📁 캐비넷 아이콘 클릭');
      showGridIcons('cabinet');
    });
    console.log('✅ 캐비넷 아이콘 이벤트 등록됨');
  } else {
    console.error('❌ 캐비넷 아이콘을 찾을 수 없음');
  }

  if (trashIcon) {
    trashIcon.addEventListener('click', () => {
      console.log('🗑️ 장독대 아이콘 클릭');
      showGridIcons('trash');
    });
    console.log('✅ 장독대 아이콘 이벤트 등록됨');
  } else {
    console.error('❌ 장독대 아이콘을 찾을 수 없음');
  }
}

// 그리드 아이콘 표시 (캐비넷/장독대)
function showGridIcons(mode) {
  console.log(`🔄 ${mode} 모드로 전환 시작...`);
  console.log(`   - 현재 모드: ${currentGridMode} → ${mode}`);
  
  // 먼저 모드 플래그 변경 (루프 재개 방지)
  currentGridMode = mode;
  
  // 1. 루프 완전 중지
  if (loopIntervalId) {
    clearInterval(loopIntervalId);
    loopIntervalId = null;
    console.log('⏹️ 루프 인터벌 중지');
  }
  
  // 2. 루프 이미지 즉시 제거
  const loopImage = document.getElementById('mainLoopDisplayImage');
  if (loopImage) {
    console.log('🗑️ 루프 이미지 제거');
    loopImage.remove();
  }
  const oldLoopImage = document.getElementById('mainLoopDisplayImage_old');
  if (oldLoopImage) oldLoopImage.remove();
  
  // 3. 12분할 뷰 제거
  const gridView = document.getElementById('grid12View');
  if (gridView) gridView.remove();
  hide12GridArrows();
  const pieceBtn = document.getElementById('pieceButton');
  if (pieceBtn) pieceBtn.remove();
  isGrid12ViewMode = false;
  
  // 4. 프로젝트 이미지/텍스트 제거 (모든 인스턴스, 페이드 중인 이미지 포함)
  // ID로 찾기
  const projectImages = document.querySelectorAll('[id^="mainGridDisplayImage"]');
  projectImages.forEach(img => {
    console.log('🗑️ 프로젝트 이미지 제거:', img.id);
    img.remove();
  });
  
  // z-index가 499~501 범위의 이미지도 찾아서 제거 (크로스페이드 중인 이미지)
  const allImages = document.querySelectorAll('.container img');
  allImages.forEach(img => {
    const zIndex = parseInt(img.style.zIndex) || 0;
    if (zIndex >= 499 && zIndex <= 501) {
      console.log('🗑️ 페이드 중인 이미지 제거 (z-index:', zIndex, ')');
      img.remove();
    }
  });
  
  // 텍스트 오버레이 제거
  const textOverlays = document.querySelectorAll('[id^="mainGridTextOverlay"]');
  textOverlays.forEach(txt => {
    console.log('🗑️ 텍스트 오버레이 제거:', txt.id);
    txt.remove();
  });
  
  // z-index가 550인 div도 제거 (텍스트 오버레이)
  const allDivs = document.querySelectorAll('.container div');
  allDivs.forEach(div => {
    const zIndex = parseInt(div.style.zIndex) || 0;
    if (zIndex === 550) {
      console.log('🗑️ 텍스트 오버레이 제거 (z-index: 550)');
      div.remove();
    }
  });
  
  // z-index가 600~700 범위의 요소도 제거 (네비게이션 화살표, Several/Piece 버튼 등)
  const allElements = document.querySelectorAll('.container *');
  allElements.forEach(el => {
    const zIndex = parseInt(el.style.zIndex) || 0;
    if (zIndex >= 600 && zIndex <= 700) {
      console.log('🗑️ UI 요소 제거 (z-index:', zIndex, ')');
      el.remove();
    }
  });
  
  hideImageNavigationArrows();
  
  // 5. Several 버튼 제거
  hideSeveralButton();
  
  // 6. 현재 프로젝트 정보 초기화
  currentDisplayedProject = {
    iconId: null,
    mainImage: null,
    additionalImages: [],
    currentImageIndex: 0
  };
  
  // 7. 메인화면00~16 아이콘 숨김
  const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                       'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
  mainIconIds.forEach(iconId => {
    const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
    if (iconWrapper) {
      iconWrapper.style.opacity = '0';
      setTimeout(() => {
        iconWrapper.style.display = 'none';
      }, 300);
    }
  });
  
  // 8. 기존 그리드 아이콘 제거
  removeGeneratedGridIcons();
  
  // 9. 새 그리드 아이콘 생성 (0,0~2,7)
  generatedGridIcons = [];
  
  setTimeout(() => {
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 8; row++) {
        const iconId = `${mode.toUpperCase()}${col}${row}`;
        const gridPos = gridToPixel(col, row, 60, 60);
        
        console.log(`생성 중: ${iconId}, 그리드(${col},${row}) → 픽셀(${gridPos.x}, ${gridPos.y})`);
        
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'icon-wrapper icon generated-grid-icon';
        iconWrapper.dataset.id = iconId;
        iconWrapper.dataset.mode = mode;
        iconWrapper.style.cssText = `
          position: absolute;
          left: ${gridPos.x}px;
          top: ${gridPos.y}px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
        `;
        
        const img = document.createElement('img');
        img.src = 'images/icon.png';
        img.className = 'icon-image';
        img.style.cssText = `
          width: 60px;
          height: 60px;
          object-fit: contain;
        `;
        
        const label = document.createElement('div');
        label.className = 'icon-label';
        
        // 모드에 따라 한글 이름 설정
        const modeNameKr = mode === 'cabinet' ? '캐비넷' : mode === 'trash' ? '장독대' : mode;
        label.textContent = `${modeNameKr}${col}${row}`;
        label.style.cssText = `
          font-size: 10px;
          color: white;
          text-align: center;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        `;
        
        // 클릭 이벤트 추가 (나중에 프로젝트 표시용)
        iconWrapper.addEventListener('click', () => {
          console.log(`🖱️ ${iconId} 아이콘 클릭`);
          // 추후 프로젝트 이미지 표시 구현 예정
        });
        
        iconWrapper.appendChild(img);
        iconWrapper.appendChild(label);
        container.appendChild(iconWrapper);
        
        generatedGridIcons.push(iconWrapper);
        
        // 페이드인 효과 (순차적)
        setTimeout(() => {
          if (iconWrapper.parentElement) {
            iconWrapper.style.opacity = '1';
          }
        }, (col * 8 + row) * 30);  // 순차적으로 나타남
      }
    }
    
    console.log(`✅ ${mode} 모드: ${generatedGridIcons.length}개 아이콘 생성 완료`);
    console.log(`📋 생성된 아이콘 ID:`, generatedGridIcons.map(icon => icon.dataset.id));
    
    // 안내 메시지 표시
    showModeGuideMessage();
  }, 350);  // 메인 아이콘 페이드아웃 후 생성
}

// 모드 안내 메시지 표시
function showModeGuideMessage() {
  // 기존 메시지 제거
  const existingMsg = document.getElementById('modeGuideMessage');
  if (existingMsg) existingMsg.remove();
  
  // 안내 메시지 생성
  const guideMsg = document.createElement('div');
  guideMsg.id = 'modeGuideMessage';
  guideMsg.textContent = '홈으로 이동하려면 ESC키를 누르시오';
  guideMsg.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease;
    font-family: 'WAGURI', sans-serif;
  `;
  
  container.appendChild(guideMsg);
  
  // 페이드인
  requestAnimationFrame(() => {
    guideMsg.style.opacity = '1';
  });
  
  console.log('✅ 안내 메시지 표시');
}

// 모드 안내 메시지 제거
function hideModeGuideMessage() {
  const guideMsg = document.getElementById('modeGuideMessage');
  if (guideMsg) {
    guideMsg.style.opacity = '0';
    setTimeout(() => guideMsg.remove(), 300);
  }
}

// 생성된 그리드 아이콘 제거
function removeGeneratedGridIcons() {
  generatedGridIcons.forEach(icon => {
    if (icon.parentElement) {
      icon.remove();
    }
  });
  generatedGridIcons = [];
  console.log('🗑️ 생성된 그리드 아이콘 모두 제거');
}

// 메인 모드로 복귀
function returnToMainMode() {
  console.log('🔙 메인 모드로 복귀...');
  
  // 안내 메시지 제거
  hideModeGuideMessage();
  
  // 생성된 그리드 아이콘 페이드아웃 후 제거
  generatedGridIcons.forEach((icon, index) => {
    if (icon.parentElement) {
      icon.style.transition = 'opacity 0.3s ease';
      icon.style.opacity = '0';
      setTimeout(() => {
        icon.remove();
      }, 300);
    }
  });
  generatedGridIcons = [];
  
  // 메인화면00~16 아이콘 다시 표시 (페이드인)
  setTimeout(() => {
    const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                         'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
    mainIconIds.forEach(iconId => {
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      if (iconWrapper) {
        iconWrapper.style.display = 'flex';
        iconWrapper.style.opacity = '0';
        requestAnimationFrame(() => {
          iconWrapper.style.transition = 'opacity 0.3s ease';
          iconWrapper.style.opacity = '1';
        });
      }
    });
    
    // 모드 초기화
    currentGridMode = 'main';
    
    // 메인 아이콘 이미지 업데이트 (프로젝트 데이터 기반 표시/숨김)
    updateAllMainIconImages();
    
    // 루프 재시작
    setTimeout(() => {
      resumeMainImageLoop();
    }, 100);
    
    console.log('✅ 메인 모드로 복귀 완료');
  }, 300);
}

// ==================== 전광판 ====================

// 전광판 텍스트 불러오기
function loadMarqueeText() {
  const savedText = localStorage.getItem('marqueeText');
  if (savedText) {
    marqueeText = savedText;
  }
  console.log('📰 전광판 텍스트 불러옴:', marqueeText);
}

// 전광판 초기화
function initMarquee() {
  const container = document.querySelector('.container');
  if (!container) return;
  
  // 기존 전광판 제거
  const existingMarquee = document.getElementById('marqueeContainer');
  if (existingMarquee) existingMarquee.remove();
  
  // 전광판 영역 계산
  // 그리드 5.0 x=0부터 그리드 14.0 x=120까지
  const startX = GRID_START_X + (5 * GRID_X);  // 680
  const endX = GRID_START_X + (14 * GRID_X) + 120;  // 1880
  const width = endX - startX;  // 1200px
  const y = GRID_START_Y - 50;  // 그리드 0 라인보다 약간 위 (50px)
  const height = 40;
  
  // 전광판 컨테이너
  const marqueeContainer = document.createElement('div');
  marqueeContainer.id = 'marqueeContainer';
  marqueeContainer.style.cssText = `
    position: absolute;
    left: ${startX}px;
    top: ${y}px;
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    z-index: 100;
    pointer-events: none;
  `;
  
  // 전광판 텍스트
  const marqueeText_el = document.createElement('div');
  marqueeText_el.id = 'marqueeText';
  marqueeText_el.textContent = marqueeText;
  marqueeText_el.style.cssText = `
    position: absolute;
    white-space: nowrap;
    font-size: 25px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-family: 'WAGURI', sans-serif;
    left: ${width}px;
    top: 50%;
    transform: translateY(-50%);
  `;
  
  marqueeContainer.appendChild(marqueeText_el);
  container.appendChild(marqueeContainer);
  
  console.log('📰 전광판 생성됨:', { startX, y, width, height });
  
  // 애니메이션 시작
  startMarqueeAnimation();
}

// 전광판 애니메이션 시작
function startMarqueeAnimation() {
  if (marqueeAnimationId) {
    cancelAnimationFrame(marqueeAnimationId);
  }
  
  const marqueeContainer = document.getElementById('marqueeContainer');
  const marqueeText_el = document.getElementById('marqueeText');
  
  if (!marqueeContainer || !marqueeText_el) return;
  
  const containerWidth = marqueeContainer.offsetWidth;
  const textWidth = marqueeText_el.offsetWidth;
  
  let position = containerWidth;
  const speed = 2;  // 픽셀/프레임
  
  function animate() {
    position -= speed;
    
    // 텍스트가 완전히 왼쪽으로 사라지면 다시 오른쪽에서 시작
    if (position < -textWidth) {
      position = containerWidth;
    }
    
    marqueeText_el.style.left = `${position}px`;
    marqueeAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
  console.log('📰 전광판 애니메이션 시작');
}

// 전광판 텍스트 업데이트 (관리자 모드에서 호출)
function updateMarqueeText(newText) {
  marqueeText = newText;
  localStorage.setItem('marqueeText', newText);
  
  console.log('📰 전광판 텍스트 저장됨:', newText);
  console.log('📰 localStorage 확인:', localStorage.getItem('marqueeText'));
  
  // 전광판 제거 후 재생성
  const existingMarquee = document.getElementById('marqueeContainer');
  if (existingMarquee) {
    existingMarquee.remove();
    console.log('📰 기존 전광판 제거됨');
  }
  
  // 애니메이션 중지
  if (marqueeAnimationId) {
    cancelAnimationFrame(marqueeAnimationId);
    marqueeAnimationId = null;
    console.log('📰 애니메이션 중지됨');
  }
  
  // 전광판 재생성
  initMarquee();
  console.log('📰 전광판 재생성 완료');
}

// 콘솔 안내 메시지
console.log('%c그리드 시스템이 활성화되었습니다!', 'color: #00ff00; font-size: 14px; font-weight: bold;');
console.log('%c사용 가능한 명령어:', 'color: #ffff00; font-size: 12px;');
console.log('  toggleMainGrid() - 메인 그리드 표시/숨김');
console.log('  resetM00Position() - M00 아이콘 위치 초기화');
console.log('  resetAllPositions() - 모든 아이콘 위치 초기화');