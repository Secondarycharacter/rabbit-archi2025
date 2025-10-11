let container = document.getElementById("iconContainer");
const icons = document.querySelectorAll(".icon-wrapper");
const resetBtn = document.getElementById("resetBtn");
const arrowTop = document.getElementById("arrowTop");
const arrowBottom = document.getElementById("arrowBottom");

let dragging = null;
let startX, startY, origX, origY;
let initialPositions = {};
let afIndex = 0; // A~G 올라온 개수
const isResponsive = false; // 반응형 모드 여부
let isFirstLoad = true; // 최초 로드 여부
const imageSizes = {}; // 이미지 크기 저장

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
  // 캐비넷 (Cabinet: C00-C17) - 메인화면과 같은 위치
  'C00': { gridX: 0, gridY: 0 },
  'C01': { gridX: 0, gridY: 1 },
  'C02': { gridX: 0, gridY: 2 },
  'C03': { gridX: 0, gridY: 3 },
  'C04': { gridX: 0, gridY: 4 },
  'C05': { gridX: 0, gridY: 5 },
  'C06': { gridX: 0, gridY: 6 },
  'C07': { gridX: 0, gridY: 7 },
  'C10': { gridX: 1, gridY: 0 },
  'C11': { gridX: 1, gridY: 1 },
  'C12': { gridX: 1, gridY: 2 },
  'C13': { gridX: 1, gridY: 3 },
  'C14': { gridX: 1, gridY: 4 },
  'C15': { gridX: 1, gridY: 5 },
  'C16': { gridX: 1, gridY: 6 },
  'C17': { gridX: 1, gridY: 7 },
  // 캐비넷 C20-C27 (2열)
  'C20': { gridX: 2, gridY: 0 },
  'C21': { gridX: 2, gridY: 1 },
  'C22': { gridX: 2, gridY: 2 },
  'C23': { gridX: 2, gridY: 3 },
  'C24': { gridX: 2, gridY: 4 },
  'C25': { gridX: 2, gridY: 5 },
  'C26': { gridX: 2, gridY: 6 },
  'C27': { gridX: 2, gridY: 7 },
  // 꿀단지 (Trash: T00-T17) - 메인화면과 같은 위치
  'T00': { gridX: 0, gridY: 0 },
  'T01': { gridX: 0, gridY: 1 },
  'T02': { gridX: 0, gridY: 2 },
  'T03': { gridX: 0, gridY: 3 },
  'T04': { gridX: 0, gridY: 4 },
  'T05': { gridX: 0, gridY: 5 },
  'T06': { gridX: 0, gridY: 6 },
  'T07': { gridX: 0, gridY: 7 },
  'T10': { gridX: 1, gridY: 0 },
  'T11': { gridX: 1, gridY: 1 },
  'T12': { gridX: 1, gridY: 2 },
  'T13': { gridX: 1, gridY: 3 },
  'T14': { gridX: 1, gridY: 4 },
  'T15': { gridX: 1, gridY: 5 },
  'T16': { gridX: 1, gridY: 6 },
  'T17': { gridX: 1, gridY: 7 },
  // 꿀단지 T20-T27 (2열)
  'T20': { gridX: 2, gridY: 0 },
  'T21': { gridX: 2, gridY: 1 },
  'T22': { gridX: 2, gridY: 2 },
  'T23': { gridX: 2, gridY: 3 },
  'T24': { gridX: 2, gridY: 4 },
  'T25': { gridX: 2, gridY: 5 },
  'T26': { gridX: 2, gridY: 6 },
  'T27': { gridX: 2, gridY: 7 },
  // 오른쪽 특수 아이콘
  'cabinet': { gridX: 19, gridY: 0 },    // 캐비넷
  'favorites': { gridX: 19, gridY: 1 },  // 즐겨찾기 (Favorites)
  'manager': { gridX: 19, gridY: 2 },    // 관리자 (Manager)
  'yong': { gridX: 19, gridY: 5 },       // 용
  'park': { gridX: 19, gridY: 6 },       // 공원
  'trash': { gridX: 19, gridY: 7 }       // 꿀단지 (Jang)
};

// 동적으로 C30~C197, T30~T197 그리드 위치 생성 (3~19열, 0~7행)
// 단, 관리자 이동 후 위치만 제외 (19,7)
for (let x = 3; x <= 19; x++) {
  for (let y = 0; y <= 7; y++) {
    // 19,7 (관리자가 이동한 위치)만 건너뜀
    if (x === 19 && y === 7) {
      continue;
    }
    
    iconGridPositions[`C${x}${y}`] = { gridX: x, gridY: y };
    iconGridPositions[`T${x}${y}`] = { gridX: x, gridY: y };
  }
}
console.log('✅ 동적 그리드 위치 생성 완료 (C30~C197, T30~T197, 19.7만 제외)');

// 동적으로 아이콘 HTML 요소 생성 함수
function createDynamicIcons() {
  console.log('🔧 동적 아이콘 생성 시작...');
  const container = document.getElementById('iconContainer');
  if (!container) {
    console.error('❌ iconContainer를 찾을 수 없습니다');
    return;
  }
  
  let createdCount = 0;
  let cabinetCount = 0;
  let trashCount = 0;
  
  // C30~C197 (3~19열, 0~7행) 생성, 단 19.7만 제외
  for (let x = 3; x <= 19; x++) {
    for (let y = 0; y <= 7; y++) {
      // 19,7 (관리자가 이동한 위치)만 건너뜀
      if (x === 19 && y === 7) {
        continue;
      }
      
      const iconId = `C${x}${y}`;
      
      // 이미 존재하는지 확인
      if (document.querySelector(`.icon-wrapper[data-id="${iconId}"]`)) {
        continue;
      }
      
      const iconWrapper = document.createElement('div');
      // 열에 따라 클래스 결정: 짝수열=left, 홀수열=af
      const columnClass = (x % 2 === 0) ? 'icon-left' : 'icon-af';
      iconWrapper.className = `icon-wrapper icon ${columnClass} icon-cabinet`;
      iconWrapper.dataset.id = iconId;
      iconWrapper.style.display = 'none';
      
      // 위치 설정 (90px 고정 크기)
      const gridPos = iconGridPositions[iconId];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, 90, 90);
        iconWrapper.style.position = 'absolute';
        iconWrapper.style.left = pixelPos.x + 'px';
        iconWrapper.style.top = pixelPos.y + 'px';
      }
      
      const img = document.createElement('img');
      img.src = 'images/icon.png';
      img.className = 'icon-image';
      
      const label = document.createElement('div');
      label.className = 'icon-label';
      label.textContent = `캐비넷${x}${y}`;
      
      iconWrapper.appendChild(img);
      iconWrapper.appendChild(label);
      container.appendChild(iconWrapper);
      createdCount++;
      cabinetCount++;
    }
  }
  
  console.log(`  ✅ 캐비넷 아이콘 ${cabinetCount}개 생성 완료`);
  
  // T30~T197 (3~19열, 0~7행) 생성, 단 19.7만 제외
  for (let x = 3; x <= 19; x++) {
    for (let y = 0; y <= 7; y++) {
      // 19,7 (관리자가 이동한 위치)만 건너뜀
      if (x === 19 && y === 7) {
        continue;
      }
      
      const iconId = `T${x}${y}`;
      
      // 이미 존재하는지 확인
      if (document.querySelector(`.icon-wrapper[data-id="${iconId}"]`)) {
        continue;
      }
      
      const iconWrapper = document.createElement('div');
      // 열에 따라 클래스 결정: 짝수열=left, 홀수열=af
      const columnClass = (x % 2 === 0) ? 'icon-left' : 'icon-af';
      iconWrapper.className = `icon-wrapper icon ${columnClass} icon-trash`;
      iconWrapper.dataset.id = iconId;
      iconWrapper.style.display = 'none';
      
      // 위치 설정 (90px 고정 크기)
      const gridPos = iconGridPositions[iconId];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, 90, 90);
        iconWrapper.style.position = 'absolute';
        iconWrapper.style.left = pixelPos.x + 'px';
        iconWrapper.style.top = pixelPos.y + 'px';
      }
      
      const img = document.createElement('img');
      img.src = 'images/icon.png';
      img.className = 'icon-image';
      
      const label = document.createElement('div');
      label.className = 'icon-label';
      label.textContent = `꿀단지${x}${y}`;
      
      iconWrapper.appendChild(img);
      iconWrapper.appendChild(label);
      container.appendChild(iconWrapper);
      createdCount++;
      trashCount++;
    }
  }
  
  console.log(`  ✅ 꿀단지 아이콘 ${trashCount}개 생성 완료`);
  console.log(`✅ 동적 아이콘 HTML 생성 완료: 총 ${createdCount}개 (캐비넷: ${cabinetCount}, 꿀단지: ${trashCount})`);
}

// 페이지 로드 시 동적 아이콘 생성
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDynamicIcons);
} else {
  createDynamicIcons();
}

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
  
  // 캐비넷(C)과 꿀단지(T) 아이콘은 초기에 완전히 숨김
  if (id && (id.startsWith('C') || id.startsWith('T'))) {
    element.style.opacity = '0';
    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.pointerEvents = 'none';
    console.log(`${id} 아이콘 위치 설정 (완전 숨김): (${pixelPos.x}, ${pixelPos.y})`);
  } else {
    // 메인화면과 오른쪽 아이콘은 표시
    element.style.opacity = '1';
    element.style.display = 'flex';
    console.log(`${id} 아이콘 위치 설정: (${pixelPos.x}, ${pixelPos.y}), 크기: ${finalWidth}x${finalHeight}`);
  }
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

// projectsData.json 자동 로드 (GitHub 클론 시)
async function autoLoadProjectsDataJSON() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 projectsData.json 자동 가져오기 시작...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // projectsData.json 파일 로드 시도
    const response = await fetch('projectsData.json');
    
    if (!response.ok) {
      console.log('ℹ️ projectsData.json 파일 없음 (정상 - IndexedDB 사용)');
      return;
    }
    
    const projectsData = await response.json();
    const totalProjects = Object.keys(projectsData).length;
    console.log(`✅ projectsData.json 로드 성공: ${totalProjects}개 프로젝트`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 메인, 캐비넷, 꿀단지 프로젝트 분류
    let mainCount = 0, cabinetCount = 0, trashCount = 0, loadedCount = 0;
    
    for (const [iconId, projectData] of Object.entries(projectsData)) {
      const storageKey = `projectData_${iconId}`;
      
      // 프로젝트 타입 카운트
      if (iconId.startsWith('M')) mainCount++;
      else if (iconId.startsWith('C')) cabinetCount++;
      else if (iconId.startsWith('T')) trashCount++;
      
      // 기존 데이터 확인
      const existingData = await loadProjectFromDB(storageKey);
      
      if (!existingData) {
        // IndexedDB에 저장
        await saveProjectToDB(storageKey, projectData);
        
        const type = iconId.startsWith('M') ? '메인' : iconId.startsWith('C') ? '캐비넷' : '꿀단지';
        console.log(`✅ ${iconId} (${type}) 로드됨: ${projectData.projectName?.text || iconId}`);
        console.log(`   - Base64: ${projectData.mainImage ? '✅' : '❌'}`);
        console.log(`   - 경로: ${projectData.mainImagePath || '(없음)'}`);
        loadedCount++;
      } else {
        console.log(`⏭️ ${iconId} 건너뜀 (이미 IndexedDB에 있음)`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 가져오기 요약:');
    console.log(`   전체: ${totalProjects}개 (메인: ${mainCount}, 캐비넷: ${cabinetCount}, 꿀단지: ${trashCount})`);
    console.log(`   새로 로드됨: ${loadedCount}개`);
    console.log(`   건너뜀: ${totalProjects - loadedCount}개 (중복)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (loadedCount > 0) {
      console.log('🔄 아이콘 이미지 업데이트 중...');
      
      // 아이콘 이미지 업데이트
      if (typeof updateAllIcons === 'function') {
        await updateAllIcons();
      }
      
      console.log('✅ 모든 아이콘 업데이트 완료!');
    }
    
  } catch (error) {
    console.log('ℹ️ projectsData.json 로드 실패 (정상 - 파일 없음):', error.message);
  }
}

// 모든 아이콘(메인, 캐비넷, 꿀단지)에 프로젝트 이미지 적용
async function updateAllMainIconImages() {
  // 메인화면 아이콘만 업데이트 (캐비넷/꿀단지는 모드 전환 시에만)
  const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                       'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
  
  console.log('🔄 메인 아이콘 업데이트 시작...');
  
  // 먼저 메인 아이콘만 숨김
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
        console.log(`📦 메인화면 ${iconId} 프로젝트 데이터 발견:`, {
          mainImagePath: projectData.mainImagePath,
          mainImage: projectData.mainImage ? `base64 (${projectData.mainImage.substring(0, 30)}...)` : null,
          projectName: projectData.projectName?.text
        });
        
        await updateIconImage(iconId, projectData);
        
        if (iconWrapper) {
          iconWrapper.style.display = 'flex';
          iconWrapper.style.visibility = 'visible';
          iconWrapper.style.opacity = '1';
          console.log(`✅ 메인화면 ${iconId} 아이콘 표시됨 (프로젝트 있음)`);
        }
      } else {
        // 프로젝트 데이터가 없으면 아이콘 숨김 유지
        // console.log(`❌ ${iconId} 아이콘 숨김 (프로젝트 없음)`);
      }
    } catch (e) {
      console.error(`${iconId} 프로젝트 데이터 로드 실패:`, e);
    }
  }
  
  console.log('✅ 메인 아이콘 업데이트 완료');
}

// 아이콘에 프로젝트 이미지 및 레이블 적용
async function updateIconImage(iconId, projectData) {
  // 로그 제거 (너무 많이 호출됨)
  
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
  
  // 메인 이미지가 있으면 아이콘 이미지로 설정 (base64 우선, 경로는 fetch로 로드)
  if (projectData.mainImage || projectData.mainImagePath) {
    let imageSource = projectData.mainImage;  // base64 우선
    
    // base64가 없고 경로만 있으면 fetch로 로드
    if (!imageSource && projectData.mainImagePath) {
      console.log(`📥 ${iconId} 경로에서 이미지 로드 중:`, projectData.mainImagePath);
      imageSource = await loadImageFromPath(projectData.mainImagePath);
      
      if (imageSource) {
        // 로드 성공 시 IndexedDB에 base64 저장 (다음번엔 빠르게)
        projectData.mainImage = imageSource;
        await saveProjectToDB(`projectData_${iconId}`, projectData);
        console.log(`✅ ${iconId} base64 캐싱 완료`);
      }
    }
    
    if (imageSource) {
      iconImg.src = imageSource;
      console.log(`✅ ${iconId} 아이콘 이미지 업데이트됨: ${projectData.mainImage ? 'base64' : '경로→base64'}`);
    }
  }
  
  // 사업명이 있으면 레이블 변경
  if (projectData.projectName && projectData.projectName.text) {
    iconLabel.textContent = projectData.projectName.text;
    console.log(`✅ ${iconId} 레이블 업데이트됨: ${projectData.projectName.text}`);
  }
}

// 경로에서 이미지를 base64로 로드
async function loadImageFromPath(imagePath) {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) {
      console.warn(`⚠️ 이미지 로드 실패: ${imagePath}`);
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`❌ 이미지 로드 오류: ${imagePath}`, error);
    return null;
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
// 로딩 프로그레스 바 생성
function createLoadingProgressBar() {
  const overlay = document.createElement('div');
  overlay.id = 'jsonLoadingOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: Arial, sans-serif;
  `;
  
  const container = document.createElement('div');
  container.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    padding: 30px 40px;
    border-radius: 10px;
    text-align: center;
    backdrop-filter: blur(10px);
  `;
  
  const title = document.createElement('div');
  title.textContent = '📂 프로젝트 데이터 로딩중...';
  title.style.cssText = `
    font-size: 20px;
    margin-bottom: 20px;
    font-weight: bold;
  `;
  
  const progressBarBg = document.createElement('div');
  progressBarBg.style.cssText = `
    width: 400px;
    height: 30px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 15px;
    overflow: hidden;
    margin-bottom: 15px;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.id = 'jsonLoadingProgress';
  progressBar.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
    border-radius: 15px;
  `;
  
  const progressText = document.createElement('div');
  progressText.id = 'jsonLoadingText';
  progressText.textContent = '0 / 0 (0%)';
  progressText.style.cssText = `
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
  `;
  
  progressBarBg.appendChild(progressBar);
  container.appendChild(title);
  container.appendChild(progressBarBg);
  container.appendChild(progressText);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  return {
    overlay,
    progressBar,
    progressText,
    update: (current, total) => {
      const percent = Math.round((current / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${current} / ${total} (${percent}%)`;
    },
    remove: () => {
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
      }, 500);
    }
  };
}

// JSON 파일 자동 로드 함수 (대용량 데이터 최적화)
async function autoLoadProjectsDataJSON() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📂 projectsData.json 자동 로드 시작...');
  
  let progressUI = null;
  
  try {
    const response = await fetch('projectsData.json');
    
    if (!response.ok) {
      console.log('⚠️ projectsData.json 파일이 없습니다. (첫 방문자 또는 아직 내보내기 안 함)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }
    
    // 파일 크기 확인
    const contentLength = response.headers.get('content-length');
    const fileSize = contentLength ? parseInt(contentLength) : 0;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 파일 크기: ${fileSizeMB} MB`);
    
    const projectsData = await response.json();
    const totalProjects = Object.keys(projectsData).length;
    console.log('✅ JSON 파일 로드 성공');
    console.log(`   발견된 프로젝트: ${totalProjects}개`);
    
    // 대용량 데이터인 경우 Progress UI 표시 (100개 이상)
    if (totalProjects > 100) {
      progressUI = createLoadingProgressBar();
    }
    
    let savedCount = 0;
    let mainCount = 0, cabinetCount = 0, trashCount = 0;
    const CHUNK_SIZE = 10; // 10개씩 청크 단위로 처리
    const entries = Object.entries(projectsData);
    
    // 청크 단위로 처리하여 UI 블로킹 방지
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, Math.min(i + CHUNK_SIZE, entries.length));
      
      // 청크 내 데이터 처리
      for (const [iconId, projectData] of chunk) {
        const storageKey = `projectData_${iconId}`;
        
        if (typeof saveProjectToDB === 'function') {
          try {
            await saveProjectToDB(storageKey, projectData);
            savedCount++;
            
            if (iconId.startsWith('M')) mainCount++;
            else if (iconId.startsWith('C')) cabinetCount++;
            else if (iconId.startsWith('T')) trashCount++;
            
            // Progress UI 업데이트
            if (progressUI) {
              progressUI.update(savedCount, totalProjects);
            }
            
            // 콘솔 로그 (100개 이상일 때는 10개마다만 출력)
            if (totalProjects < 100 || savedCount % 10 === 0 || savedCount === totalProjects) {
              const type = iconId.startsWith('M') ? '메인' : iconId.startsWith('C') ? '캐비넷' : '꿀단지';
              console.log(`  ✅ ${iconId} (${type}): ${projectData.projectName?.text || iconId} → IndexedDB 저장`);
            }
          } catch (error) {
            console.error(`❌ ${iconId} 저장 실패:`, error);
          }
        }
      }
      
      // UI 업데이트를 위한 짧은 대기 (브라우저가 숨 쉴 시간)
      if (i + CHUNK_SIZE < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    console.log('\n✅ 자동 로드 완료!');
    console.log(`   메인: ${mainCount}개 / 캐비넷: ${cabinetCount}개 / 꿀단지: ${trashCount}개`);
    console.log(`   총 ${savedCount}개 프로젝트가 IndexedDB에 저장되었습니다.`);
    console.log(`   처리 시간: 대용량 데이터 최적화 적용`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Progress UI 제거
    if (progressUI) {
      progressUI.remove();
    }
    
  } catch (error) {
    console.error('❌ JSON 자동 로드 실패:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Progress UI 제거
    if (progressUI) {
      progressUI.remove();
    }
    
    // 사용자에게 알림
    if (error.name === 'QuotaExceededError') {
      alert('❌ 저장 공간이 부족합니다.\n브라우저 캐시를 정리하고 다시 시도해주세요.');
    } else {
      alert('❌ 프로젝트 데이터 로드 실패\n콘솔을 확인해주세요.');
    }
  }
}

window.addEventListener('load', () => {
  setTimeout(async () => {
    loadInitialPositions();
    calculateImagePositions();
    saveInitialPositions();
    updateContainerScale();
    visualizeMainGrid(); // 메인 그리드 시각화
    
    // 캐비넷/꿀단지 아이콘 이벤트 등록
    initializeCabinetTrashIcons();
    
    // 전광판 초기화
    loadMarqueeText();
    initMarquee();
    
    // projectsData.json 자동 로드 (GitHub 클론 시)
    await autoLoadProjectsDataJSON();
    
    // 첫 화면을 20분할 화면으로 표시
    console.log('🔲 첫 화면: 20분할 화면 표시');
    show12GridView();
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
  for (const icon of document.querySelectorAll('.icon-wrapper')) {
    if (icon === excludeIcon) continue;
    
    // 숨겨진 아이콘은 충돌 감지에서 제외
    const computedStyle = window.getComputedStyle(icon);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || icon.style.opacity === '0') {
      continue;
    }
    
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
      
      for (const dir of directions) {
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
    
    // 캐비넷/꿀단지 아이콘은 드래그 비활성화
    const iconId = icon.dataset.id;
    if (iconId && (iconId.startsWith('C') || iconId.startsWith('T'))) {
      // console.log(`🚫 ${iconId} 드래그 비활성화 (캐비넷/꿀단지)`);
      return;
    }
    
    // 오른쪽 아이콘들은 드래그 비활성화 (더블클릭 기능을 위해)
    if (icon.classList.contains('icon-right')) {
      console.log('🚫 오른쪽 아이콘은 드래그 비활성화:', iconId);
      return;
    }
    
    // data-no-drag 속성이 있으면 드래그 비활성화
    if (icon.hasAttribute('data-no-drag')) {
      return;
    }
    
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

  // 클릭 이벤트 추가 (캐비넷/꿀단지/오른쪽 아이콘은 제외)
  const iconId = icon.dataset.id;
  
  // 캐비넷(C), 꿀단지(T), 오른쪽 아이콘들은 초기 클릭 이벤트 등록 안 함
  if (iconId && !iconId.startsWith('C') && !iconId.startsWith('T') && !icon.classList.contains('icon-right')) {
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
  } else {
    console.log(`ℹ️ ${iconId} - 클릭 이벤트 등록 안 함 (더블클릭 전용)`);
  }

  // 더블클릭 이벤트 추가
  icon.addEventListener("dblclick", (e) => {
    console.log('🖱️ 더블클릭 이벤트 발생:', icon.dataset.id);
    e.preventDefault();
    e.stopPropagation();
    
    if (icon.classList.contains('icon-right')) {
      const iconId = icon.dataset.id;
      console.log('✅ 오른쪽 아이콘 더블클릭:', iconId);
      
      if (iconId === 'manager') {
        console.log('🔧 관리자 아이콘 더블클릭 감지!');
        // 관리자 모드 UI 표시 (manager.js)
        if (typeof showManagerUI === 'function') {
          console.log('✅ showManagerUI 함수 호출 중...');
          showManagerUI();
        } else {
          console.error('❌ showManagerUI 함수를 찾을 수 없습니다. manager.js가 로드되었는지 확인하세요.');
          console.log('현재 전역 함수들:', Object.keys(window).filter(k => k.includes('Manager') || k.includes('show')));
        }
      }
      // 다른 오른쪽 아이콘들은 더블클릭 기능 제거 (스크린 없음)
    } else {
      console.log('ℹ️ 오른쪽 아이콘이 아님:', icon.dataset.id);
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
  
  // 캐비넷/꿀단지 모드였다면 메인 모드로 복귀
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
  
  // 1번 아이콘이 { gridX: 0, gridY: 0 } 위치에 있지 않으면 arrowTop 표시
  const isAtGrid00 = (firstIconGrid.gridX === 0 && firstIconGrid.gridY === 0);
  
  if (!isAtGrid00) {
    arrowTop.classList.add("show");
  } else {
    arrowTop.classList.remove("show");
  }
}

// 이벤트 리스너 등록
window.addEventListener("resize", () => {
  updateContainerScale();
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
  
  // 캐비넷/꿀단지 모드에서 반대쪽 열 아이콘 숨기기
  if (iconId && (iconId.startsWith('C') || iconId.startsWith('T')) && currentGridMode) {
    const match = iconId.match(/^[CT](\d+)\d$/);
    if (match) {
      const columnNum = parseInt(match[1], 10);
      const prefix = iconId.charAt(0); // 'C' 또는 'T'
      
      if (columnNum >= 0 && columnNum <= 9) {
        // 0~9열 클릭 → 10~19열 아이콘 숨기기
        console.log(`🙈 0~9열 클릭: 10~19열 아이콘 숨김`);
        for (let x = 10; x <= 19; x++) {
          for (let y = 0; y <= 7; y++) {
            const hideIconId = `${prefix}${x}${y}`;
            const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${hideIconId}"]`);
            if (iconWrapper && iconWrapper.style.display !== 'none') {
              iconWrapper.style.opacity = '0';
              setTimeout(() => { iconWrapper.style.display = 'none'; }, 300);
            }
          }
        }
      } else if (columnNum >= 10 && columnNum <= 19) {
        // 10~19열 클릭 → 0~9열 아이콘 숨기기
        console.log(`🙈 10~19열 클릭: 0~9열 아이콘 숨김`);
        for (let x = 0; x <= 9; x++) {
          for (let y = 0; y <= 7; y++) {
            const hideIconId = `${prefix}${x}${y}`;
            const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${hideIconId}"]`);
            if (iconWrapper && iconWrapper.style.display !== 'none') {
              iconWrapper.style.opacity = '0';
              setTimeout(() => { iconWrapper.style.display = 'none'; }, 300);
            }
          }
        }
      }
    }
  }
  
  // 1. 20분할 뷰 즉시 완전 제거
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    console.log('🗑️ 20분할 뷰 즉시 제거');
    gridView.remove();
  }
  hide12GridArrows();
  isGrid12ViewMode = false;
  
  // 캐비넷/꿀단지 모드에서 "홈으로 이동하려면 ESC키를 누르시오" 메시지 숨기기
  if (currentGridMode) {
    const modeGuideMsg = document.getElementById('modeGuideMessage');
    if (modeGuideMsg) {
      console.log('🙈 모드 안내 메시지 숨김');
      modeGuideMsg.style.opacity = '0';
      setTimeout(() => { modeGuideMsg.style.display = 'none'; }, 300);
    }
  }
  
  // 프로젝트 데이터 로드
  const storageKey = `projectData_${iconId}`;
  const projectData = await loadProjectFromDB(storageKey);
  
  if (!projectData) {
    console.log(`❌ ${iconId}에 저장된 프로젝트 데이터 없음`);
    alert(`${iconId}에 등록된 프로젝트가 없습니다.`);
    return;
  }
  
  // 메인 이미지 체크 제거 - 경로에서 로드할 수 있으므로
  // 로그 제거 (너무 많이 호출됨)
  
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
  
  // 현재 프로젝트 정보 저장 (base64 우선, 경로는 fetch로 로드)
  // 추가 이미지 처리: base64가 있으면 base64, 없으면 경로에서 로드
  const additionalImagePaths = projectData.additionalImagePaths || [];
  const additionalImagesBase64 = projectData.additionalImages || [];
  const maxLength = Math.max(additionalImagePaths.length, additionalImagesBase64.length);
  
  // 추가 이미지 처리 로그 제거 (너무 많이 호출됨)
  console.log('   처리할 이미지:', maxLength, '개');
  
  const processedAdditionalImages = [];
  for (let i = 0; i < maxLength; i++) {
    // base64 우선, 없으면 경로에서 로드
    let imageSource = additionalImagesBase64[i];
    
    if (!imageSource && additionalImagePaths[i]) {
      // base64가 없고 경로만 있으면 fetch로 로드
      console.log(`   [${i}] 📥 경로에서 로드 중:`, additionalImagePaths[i]);
      imageSource = await loadImageFromPath(additionalImagePaths[i]);
      
      if (imageSource) {
        // 로드 성공 시 projectData에 저장 (다음번 빠른 로드)
        if (!projectData.additionalImages) projectData.additionalImages = [];
        projectData.additionalImages[i] = imageSource;
        console.log(`   [${i}] ✅ base64 변환 완료`);
      }
    }
    
    if (imageSource) {
      processedAdditionalImages.push(imageSource);
      console.log(`   [${i}] ${imageSource.startsWith('data:') ? 'base64' : '경로'}: ${imageSource.substring(0, 50)}...`);
    } else {
      console.warn(`   [${i}] ⚠️ 이미지 소스 없음`);
    }
  }
  
  // 추가 이미지를 로드했으면 IndexedDB에 캐싱
  if (processedAdditionalImages.length > 0 && processedAdditionalImages.some((img, idx) => !additionalImagesBase64[idx])) {
    await saveProjectToDB(`projectData_${iconId}`, projectData);
    console.log(`✅ ${iconId} 추가 이미지 base64 캐싱 완료`);
  }
  
  // 메인 이미지도 base64 우선, 없으면 경로에서 로드
  let mainImageSource = projectData.mainImage;
  if (!mainImageSource && projectData.mainImagePath) {
    console.log(`📥 메인 이미지 경로에서 로드 중:`, projectData.mainImagePath);
    mainImageSource = await loadImageFromPath(projectData.mainImagePath);
    
    if (mainImageSource) {
      projectData.mainImage = mainImageSource;
      await saveProjectToDB(`projectData_${iconId}`, projectData);
      console.log(`✅ 메인 이미지 base64 캐싱 완료`);
    }
  }
  
  currentDisplayedProject = {
    iconId: iconId,
    mainImage: mainImageSource || projectData.mainImagePath,
    additionalImages: processedAdditionalImages,
    currentImageIndex: 0
  };
  
  console.log(`\n✅ currentDisplayedProject 설정 완료:`, iconId);
  console.log('   메인 이미지:', currentDisplayedProject.mainImage ? currentDisplayedProject.mainImage.substring(0, 50) + '...' : 'null');
  console.log('   추가 이미지 개수:', currentDisplayedProject.additionalImages.length);
  if (currentDisplayedProject.additionalImages.length > 0) {
    console.log('   첫 번째 추가 이미지:', currentDisplayedProject.additionalImages[0].substring(0, 50) + '...');
    console.log('   마지막 추가 이미지:', currentDisplayedProject.additionalImages[currentDisplayedProject.additionalImages.length - 1].substring(0, 50) + '...');
  }
  
  // 이미지 표시 (그리드 6,1부터 17,6까지 = 1440x960) - base64 사용 (이미 로드됨)
  console.log(`🖼️ 메인 이미지 표시 시작:`, mainImageSource ? mainImageSource.substring(0, 50) + '...' : 'null');
  displayImageOnMainGrid(mainImageSource, 0, iconId);
  
  // 텍스트 오버레이 표시 (그리드 3,1에서 시작)
  displayProjectTextOnMainGrid(projectData, iconId);
  
  // 추가 이미지가 있으면 네비게이션 화살표 표시
  console.log(`🔼🔽 네비게이션 화살표 조건: 추가 이미지 ${currentDisplayedProject.additionalImages.length}개`);
  if (currentDisplayedProject.additionalImages.length > 0) {
    console.log(`✅ 네비게이션 화살표 표시 (추가 이미지 있음)`);
    showImageNavigationArrows();
  } else {
    console.log(`❌ 네비게이션 화살표 없음 (추가 이미지 없음)`);
  }
  
  // 캐비넷/꿀단지 모드에서는 Several 버튼 표시 안 함
  if (currentGridMode === 'main') {
    // Several 버튼 표시 (20분할 화면으로 복귀하기 위해)
    console.log('🔲 Several 버튼 표시 (20분할 화면 복귀용)');
    showSeveralButton();
  } else {
    console.log('🚫 캐비넷/꿀단지 모드: Several 버튼 숨김');
    hideSeveralButton();
  }
  
  // 캐비넷/꿀단지 모드에서는 안내 메시지 숨김
  if (currentGridMode !== 'main') {
    console.log('🚫 캐비넷/꿀단지 모드: 안내 메시지 숨김');
    hideModeGuideMessage();
  }
  
  // 구버전 열 숨김 로직 제거됨 (상단의 새 로직으로 대체)
}

// 메인 그리드에 이미지 표시 (실제 렌더링)
function displayImageOnMainGrid(imageData, imageIndex, iconId) {
  console.log(`🖼️ 이미지 표시 중... (인덱스: ${imageIndex}, iconId: ${iconId})`);
  console.log(`   imageData: ${imageData ? imageData.substring(0, 100) : 'NULL/UNDEFINED'}`);
  console.log(`   imageData 타입: ${typeof imageData}`);
  
  // imageData 검증
  if (!imageData) {
    console.error('❌ imageData가 null/undefined입니다!');
    alert('❌ 이미지 데이터가 없습니다. 프로젝트를 다시 등록해주세요.');
    return;
  }
  
  // 20분할 뷰 즉시 제거 (있다면)
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    console.log('🗑️ displayImageOnMainGrid: 20분할 뷰 즉시 제거');
    gridView.remove();
    hide12GridArrows();
    isGrid12ViewMode = false;
  }
  
  // 기존 이미지 페이드아웃 후 제거
  const existingImage = document.getElementById('mainGridDisplayImage');
  
  // 위치 및 크기 계산 (iconId에 따라 다름)
  let startGridX, startGridY, endGridX, endGridY;
  
  if (iconId && (iconId.startsWith('C') || iconId.startsWith('T')) && currentGridMode) {
    // 캐비넷/꿀단지 모드: 열 번호 추출
    const match = iconId.match(/^[CT](\d+)\d$/);
    if (match) {
      const columnNum = parseInt(match[1], 10);
      console.log(`📍 캐비넷/꿀단지 모드: iconId=${iconId}, 열=${columnNum}`);
      
      if (columnNum >= 0 && columnNum <= 9) {
        // 0~9열 → 12.2~19.5 영역 (오른쪽)
        startGridX = 12;
        startGridY = 2;
        endGridX = 19;
        endGridY = 5;
        console.log(`   📍 0~9열 → 우측 영역 (12.2~19.5)`);
      } else if (columnNum >= 10 && columnNum <= 19) {
        // 10~19열 → 2.2~9.5 영역 (왼쪽)
        startGridX = 2;
        startGridY = 2;
        endGridX = 9;
        endGridY = 5;
        console.log(`   📍 10~19열 → 좌측 영역 (2.2~9.5)`);
      }
    }
  } else {
    // 메인 모드 (기본) → 6.1~17.6 영역
    startGridX = 6;
    startGridY = 1;
    endGridX = 17;
    endGridY = 6;
    console.log(`📍 메인 모드 → 6.1~17.6 영역`);
  }
  
  const imageWidth = (endGridX - startGridX + 1) * GRID_X;
  const imageHeight = (endGridY - startGridY + 1) * GRID_Y;
  
  // 픽셀 좌표 계산
  const pixelX = GRID_START_X + (startGridX * GRID_X);
  const pixelY = GRID_START_Y + (startGridY * GRID_Y);
  
  console.log(`📍 이미지 위치: (${pixelX}, ${pixelY}), 크기: ${imageWidth}x${imageHeight}`);
  
  // 새 이미지 생성 함수
  const createNewImage = () => {
    // 20분할 뷰 다시 한 번 확인 (혹시 모를 경우)
    const checkGridView = document.getElementById('grid12View');
    if (checkGridView) {
      console.log('⚠️ createNewImage: 20분할 뷰 발견! 즉시 제거');
      checkGridView.remove();
      hide12GridArrows();
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
      console.log(`✅ 이미지 로드 성공: ${imageData.substring(0, 50)}...`);
      requestAnimationFrame(() => {
        img.style.opacity = '1';
      });
    };
    
    // 이미지 로드 실패 시 처리
    img.onerror = () => {
      console.error(`❌ 이미지 로드 실패: ${imageData.substring(0, 100)}`);
      console.log('이미지 타입:', imageData.startsWith('data:') ? 'base64' : imageData.startsWith('projects/') ? '경로' : '알 수 없음');
      
      // 경로인 경우 base64로 대체 시도
      if (imageData.startsWith('projects/') && currentDisplayedProject.iconId) {
        // 로그 제거 (무한 루프 방지)
        loadProjectFromDB(`projectData_${currentDisplayedProject.iconId}`).then(data => {
          if (data && data.mainImage && currentDisplayedProject.currentImageIndex === 0) {
            // base64로 재시도
            img.src = data.mainImage;
            img.onerror = null; // 무한 루프 방지
          }
        });
      }
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
  
  // 20분할 뷰 제거 (있다면)
  if (isGrid12ViewMode) {
    const gridView = document.getElementById('grid12View');
    if (gridView) gridView.remove();
    hide12GridArrows();
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
  
  // 캐비넷/꿀단지 모드에서 숨겨진 아이콘들 다시 표시
  if (currentGridMode === 'cabinet' || currentGridMode === 'trash') {
    console.log('👁️ 캐비넷/꿀단지 모드: 숨겨진 아이콘 다시 표시');
    const prefix = currentGridMode === 'cabinet' ? 'C' : 'T';
    
    // 모든 캐비넷/꿀단지 아이콘 다시 표시
    for (let x = 0; x <= 19; x++) {
      for (let y = 0; y <= 7; y++) {
        // 19,7 (관리자)는 제외
        if (x === 19 && y === 7) continue;
        
        const iconId = `${prefix}${x}${y}`;
        const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
        
        if (iconWrapper) {
          // 프로젝트가 등록된 아이콘만 다시 표시 (원래 보이던 것들)
          loadProjectFromDB(`projectData_${iconId}`).then(projectData => {
            if (projectData && iconWrapper.style.display === 'none') {
              iconWrapper.style.display = 'flex';
              iconWrapper.style.opacity = '1';
              iconWrapper.style.pointerEvents = 'auto';
              console.log(`✅ ${iconId} 아이콘 다시 표시`);
            }
          });
        }
      }
    }
    
    // "홈으로 이동하려면 ESC키를 누르시오" 메시지 다시 표시
    const modeGuideMsg = document.getElementById('modeGuideMessage');
    if (modeGuideMsg) {
      modeGuideMsg.style.display = 'block';
      modeGuideMsg.style.opacity = '1';
      console.log('👁️ 모드 안내 메시지 다시 표시');
    }
  }
  
  // 현재 프로젝트 정보 초기화
  currentDisplayedProject = {
    iconId: null,
    mainImage: null,
    additionalImages: [],
    currentImageIndex: 0
  };
  
  console.log('✅ 메인 그리드 이미지 제거 완료');
  
  // 20분할 화면으로 복귀 (메인 모드일 때만)
  if (currentGridMode === 'main') {
    console.log('🔲 20분할 화면으로 복귀');
    show12GridView();
  }
}

// 메인 그리드에 프로젝트 텍스트 표시
function displayProjectTextOnMainGrid(projectData, iconId) {
  console.log(`📝 프로젝트 텍스트 표시 시작 (iconId: ${iconId})`);
  
  // 기존 텍스트 제거
  const existingText = document.getElementById('mainGridTextOverlay');
  if (existingText) {
    existingText.remove();
  }
  
  // 텍스트 시작 위치 (iconId에 따라 다름)
  let textStartGridX, textStartGridY;
  
  if (iconId && (iconId.startsWith('C') || iconId.startsWith('T')) && currentGridMode) {
    // 캐비넷/꿀단지 모드: 열 번호 추출
    const match = iconId.match(/^[CT](\d+)\d$/);
    if (match) {
      const columnNum = parseInt(match[1], 10);
      console.log(`📍 캐비넷/꿀단지 텍스트: iconId=${iconId}, 열=${columnNum}`);
      
      if (columnNum >= 0 && columnNum <= 9) {
        // 0~9열 → 설계개요는 10.2
        textStartGridX = 10;
        textStartGridY = 2;
        console.log(`   📍 0~9열 → 10.2에 텍스트`);
      } else if (columnNum >= 10 && columnNum <= 19) {
        // 10~19열 → 설계개요는 0.2
        textStartGridX = 0;
        textStartGridY = 2;
        console.log(`   📍 10~19열 → 0.2에 텍스트`);
      }
    }
  } else {
    // 메인 모드 (기본) → 3.1
    textStartGridX = 3;
    textStartGridY = 1;
    console.log(`📍 메인 모드 → 3.1에 텍스트`);
  }
  
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
  
  // 이미지 표시 영역 계산 (현재 표시 중인 iconId 기준)
  let startGridX, startGridY, endGridX, endGridY;
  const iconId = currentDisplayedProject.iconId;
  
  if (iconId && (iconId.startsWith('C') || iconId.startsWith('T')) && currentGridMode) {
    // 캐비넷/꿀단지 모드: 열 번호 추출
    const match = iconId.match(/^[CT](\d+)\d$/);
    if (match) {
      const columnNum = parseInt(match[1], 10);
      
      if (columnNum >= 0 && columnNum <= 9) {
        // 0~9열 → 12.2~19.5 영역 (오른쪽)
        startGridX = 12;
        startGridY = 2;
        endGridX = 19;
        endGridY = 5;
      } else if (columnNum >= 10 && columnNum <= 19) {
        // 10~19열 → 2.2~9.5 영역 (왼쪽)
        startGridX = 2;
        startGridY = 2;
        endGridX = 9;
        endGridY = 5;
      }
    }
  } else {
    // 메인 모드 (기본) → 6.1~17.6 영역
    startGridX = 6;
    startGridY = 1;
    endGridX = 17;
    endGridY = 6;
  }
  
  const imageAreaStartX = GRID_START_X + (startGridX * GRID_X);
  const imageAreaStartY = GRID_START_Y + (startGridY * GRID_Y);
  const imageAreaWidth = (endGridX - startGridX + 1) * GRID_X;
  const imageAreaHeight = (endGridY - startGridY + 1) * GRID_Y;
  const imageAreaCenterX = imageAreaStartX + (imageAreaWidth / 2);
  const imageAreaCenterY = imageAreaStartY + (imageAreaHeight / 2);
  
  console.log(`📍 화살표 영역: (${startGridX},${startGridY})~(${endGridX},${endGridY}), 크기: ${imageAreaWidth}x${imageAreaHeight}`);
  
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
    console.log(`📷 메인 이미지 선택: ${imageData ? imageData.substring(0, 50) + '...' : 'null'}`);
  } else {
    const additionalImage = currentDisplayedProject.additionalImages[newIndex - 1];
    // 배열 요소가 문자열인지 객체인지 확인
    imageData = typeof additionalImage === 'string' ? additionalImage : additionalImage?.imageData;
    console.log(`📷 추가 이미지 선택 [${newIndex - 1}]: ${imageData ? imageData.substring(0, 50) + '...' : 'null'}`);
  }
  
  if (!imageData) {
    console.error(`❌ 이미지 데이터가 없습니다! index=${newIndex}`);
    return;
  }
  
  console.log(`📷 이미지 전환: ${newIndex + 1}/${totalImages}`);
  console.log(`   imageData 타입: ${imageData.startsWith('data:') ? 'base64' : imageData.startsWith('projects/') ? '경로' : '알 수 없음'}`);
  
  displayImageOnMainGrid(imageData, newIndex, currentDisplayedProject.iconId);
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

// 메인 루프용 이미지 수집 (메인, 캐비넷, 꿀단지 포함)
async function collectMainLoopImages() {
  const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                       'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
  const cabinetIconIds = ['C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07',
                          'C10', 'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17',
                          'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27'];
  const trashIconIds = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07',
                        'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17',
                        'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T26', 'T27'];
  
  const allIconIds = [...mainIconIds, ...cabinetIconIds, ...trashIconIds];
  
  const loopImages = [];
  let mainLoopCount = 0, cabinetLoopCount = 0, trashLoopCount = 0;
  
  console.log('📸 메인 루프 이미지 수집 중 (메인 + 캐비넷 + 꿀단지)...');
  
  for (const iconId of allIconIds) {
    const storageKey = `projectData_${iconId}`;
    const projectData = await loadProjectFromDB(storageKey);
    
    // base64 우선, 없으면 경로에서 로드
    let mainImageSource = projectData?.mainImage;
    
    if (!mainImageSource && projectData?.mainImagePath) {
      // base64가 없고 경로만 있으면 fetch로 로드
      console.log(`📥 ${iconId} 루프용 이미지 로드 중:`, projectData.mainImagePath);
      mainImageSource = await loadImageFromPath(projectData.mainImagePath);
      
      if (mainImageSource) {
        // 로드 성공 시 IndexedDB에 캐싱
        projectData.mainImage = mainImageSource;
        await saveProjectToDB(storageKey, projectData);
        console.log(`✅ ${iconId} base64 캐싱 완료`);
      }
    }
    
    if (projectData && mainImageSource && projectData.useInMainLoop) {
      const type = iconId.startsWith('M') ? '메인' : iconId.startsWith('C') ? '캐비넷' : '꿀단지';
      
      loopImages.push({
        iconId: iconId,
        imageData: mainImageSource,
        projectName: projectData.projectName?.text || iconId,
        year: projectData.year?.text || projectData.projectName?.startYear || '',
        type: type  // 프로젝트 타입 추가
      });
      
      // 타입별 카운트
      if (iconId.startsWith('M')) mainLoopCount++;
      else if (iconId.startsWith('C')) cabinetLoopCount++;
      else if (iconId.startsWith('T')) trashLoopCount++;
      
      console.log(`   ✅ ${iconId} (${type}): ${projectData.projectName?.text || iconId} 추가`);
    }
  }
  
  const totalRows = Math.ceil(loopImages.length / 5);
  const lastRowCount = loopImages.length % 5 || 5;
  const emptySlots = lastRowCount === 5 ? 0 : 5 - lastRowCount;
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📸 루프 이미지 수집 완료:`);
  console.log(`   메인화면: ${mainLoopCount}개`);
  console.log(`   캐비넷: ${cabinetLoopCount}개`);
  console.log(`   꿀단지: ${trashLoopCount}개`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   ✅ 총 이미지: ${loopImages.length}개`);
  console.log(`   📐 총 행(ROW): ${totalRows}행 (1행당 5개)`);
  console.log(`   📦 마지막 행: ${lastRowCount}개 이미지${emptySlots > 0 ? ` + 빈칸 ${emptySlots}개` : ' (꽉 참)'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  return loopImages;
}

// 메인 루프 시작
async function startMainImageLoop() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 메인 이미지 루프 시작...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 루프 이미지 수집 (메인 + 캐비넷 + 꿀단지)
  mainLoopImages = await collectMainLoopImages();
  
  if (mainLoopImages.length === 0) {
    console.log('⚠️ 루프할 이미지가 없습니다. (useInMainLoop 체크된 프로젝트 없음)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 첫 번째 이미지 표시
  currentLoopIndex = 0;
  isLoopActive = true;
  displayLoopImage(currentLoopIndex);
  
  // 5초 + 0.3초(크로스 페이드) = 5.3초마다 이미지 전환
  loopIntervalId = setInterval(() => {
    if (isLoopActive && !currentDisplayedProject.iconId && !isGrid12ViewMode) {
      // 사용자가 아이콘을 클릭하지 않았고, 20분할 뷰가 아닌 경우에만 루프
      nextLoopImage();
    }
  }, 5300);
  
  console.log('✅ 메인 루프 활성화 (5.3초 간격)');
}

// 다음 루프 이미지로 전환
function nextLoopImage() {
  // 20분할 뷰 모드이거나 프로젝트 표시 중이면 실행하지 않음
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ nextLoopImage 중지 (20분할/프로젝트 모드)');
    return;
  }
  
  currentLoopIndex = (currentLoopIndex + 1) % mainLoopImages.length;
  displayLoopImage(currentLoopIndex);
}

// 루프 이미지 표시 (크로스 페이드 방식)
function displayLoopImage(index) {
  // 20분할 뷰 모드이거나 프로젝트 표시 중이면 루프 중지
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ 루프 표시 중지 (20분할/프로젝트 모드)');
    return;
  }
  
  const loopImage = mainLoopImages[index];
  if (!loopImage) return;
  
  const type = loopImage.type || '메인';
  console.log(`🖼️ 루프 이미지 표시: ${loopImage.iconId} (${type}) - ${loopImage.projectName} (${index + 1}/${mainLoopImages.length})`);
  
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
  // 20분할 뷰 모드이거나 프로젝트 표시 중이면 표시하지 않음
  if (isGrid12ViewMode || currentDisplayedProject.iconId) {
    console.log('⏸️ 루프 이미지 표시 중지 (20분할/프로젝트 모드)');
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
    console.log(`✅ 루프 이미지 로드 성공: ${loopImage.iconId}`);
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
  
  // 이미지 로드 실패 시 처리
  img.onerror = () => {
    console.error(`❌ 루프 이미지 로드 실패: ${loopImage.iconId}`);
    console.log('이미지 데이터:', loopImage.imageData.substring(0, 100));
    
    // 경로인 경우 base64로 대체 시도
    if (loopImage.imageData.startsWith('projects/')) {
      // 로그 제거 (무한 루프 방지)
      loadProjectFromDB(`projectData_${loopImage.iconId}`).then(data => {
        if (data && data.mainImage) {
          // base64로 재시도
          img.src = data.mainImage;
          img.onerror = null; // 무한 루프 방지
        }
      });
    }
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
  // 프로젝트가 표시 중이거나 20분할 뷰가 활성화된 경우 루프 재개하지 않음
  if (currentDisplayedProject.iconId || isGrid12ViewMode) {
    console.log('⏸️ 루프 재개 안 함 (프로젝트/20분할 뷰 활성)');
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

// ==================== Several 버튼 (20분할 전환) ====================

let isGrid12ViewMode = false;  // 20분할 모드 상태

// Several 버튼 표시 (20분할 화면 복귀용)
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
    console.log('🔲 Several 버튼 클릭: 프로젝트 이미지 제거 후 20분할 뷰로 전환');
    clearMainGridImages();
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

// Piece 버튼 표시 (20분할 모드) - 사용 안 함
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
    
    // 20분할 뷰 즉시 제거
    const gridView = document.getElementById('grid12View');
    if (gridView) gridView.remove();
    hide12GridArrows();
    isGrid12ViewMode = false;
    
    // Piece 버튼도 제거
    btn.remove();
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

// ==================== 20분할 그리드 뷰 ====================

let grid12ViewScrollOffset = 0;  // 스크롤 오프셋

// 20분할 뷰 표시
async function show12GridView() {
  console.log('🔲 20분할 뷰 표시 시작...');
  console.log(`   - 현재 isGrid12ViewMode: ${isGrid12ViewMode}`);
  console.log(`   - 현재 loopIntervalId: ${loopIntervalId}`);
  
  // 먼저 20분할 모드 플래그 설정 (루프 중지용) - 최우선!
  isGrid12ViewMode = true;
  
  // mainLoopImages가 비어있으면 이미지 수집
  if (mainLoopImages.length === 0) {
    console.log('📥 이미지 수집 중...');
    mainLoopImages = await collectMainLoopImages();
    console.log(`✅ 이미지 수집 완료: ${mainLoopImages.length}개`);
  }
  
  // 이미지가 없으면 경고 후 종료
  if (mainLoopImages.length === 0) {
    console.warn('⚠️ 표시할 이미지가 없습니다. 관리자 모드에서 프로젝트를 등록해주세요.');
    alert('표시할 프로젝트가 없습니다.\n관리자 모드(더블클릭)에서 프로젝트를 먼저 등록해주세요.');
    isGrid12ViewMode = false;
    return;
  }
  
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
  
  // 20분할 뷰 컨테이너 생성
  const gridView = document.createElement('div');
  gridView.id = 'grid12View';
  gridView.style.cssText = `
    position: absolute;
    left: ${GRID_START_X + (3 * GRID_X)}px;
    top: ${GRID_START_Y + (1 * GRID_Y)}px;
    width: 1800px;
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
    transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  `;
  
  // 5x4 그리드로 배치 (각 칸 360x240)
  const gridCols = 5;
  const gridRows = 4;
  const cellWidth = 1800 / gridCols;  // 360px
  const cellHeight = 960 / gridRows;  // 240px
  
  // 무한 스크롤: 원본을 여러 번 반복해서 충분히 긴 스크롤 가능 영역 생성
  const imagesToRender = [];
  
  const totalRows = Math.ceil(mainLoopImages.length / 5);
  const lastRowCount = mainLoopImages.length % 5 || 5;
  const emptySlots = 5 - lastRowCount;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📺 20분할 뷰 구성:`);
  console.log(`   총 이미지: ${mainLoopImages.length}개`);
  console.log(`   총 행(ROW): ${totalRows}행 (1행당 5개)`);
  console.log(`   마지막 행: ${lastRowCount}개 이미지${emptySlots > 0 ? ` + 빈칸 ${emptySlots}개` : ' (꽉 참)'}`);
  
  // 무한 스크롤을 위해 원본을 10번 반복 (1 2 3 4 5 1 2 3 4 5 ...)
  const repeatCount = 10;
  for (let i = 0; i < repeatCount; i++) {
    imagesToRender.push(...mainLoopImages);
  }
  
  console.log(`   🔄 무한 스크롤: 원본 ${repeatCount}번 반복 (총 ${imagesToRender.length}개 이미지)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  imagesToRender.forEach((loopImage, index) => {
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
      transition: opacity 0.3s ease;
    `;
    
    // 텍스트 오버레이 (기본 숨김)
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    // 사업명
    const projectNameDiv = document.createElement('div');
    projectNameDiv.textContent = loopImage.projectName || '';
    projectNameDiv.style.cssText = `
      color: white;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      line-height: 1.3;
    `;
    
    // 연도
    const yearDiv = document.createElement('div');
    yearDiv.textContent = loopImage.year || '';
    yearDiv.style.cssText = `
      color: white;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    
    overlay.appendChild(projectNameDiv);
    overlay.appendChild(yearDiv);
    
    // Hover 효과
    cell.onmouseenter = () => {
      img.style.opacity = '0.5';
      overlay.style.opacity = '1';
    };
    
    cell.onmouseleave = () => {
      img.style.opacity = '1';
      overlay.style.opacity = '0';
    };
    
    // 클릭 시 해당 프로젝트 표시
    cell.onclick = () => {
      console.log(`🖱️ 20분할 셀 클릭: ${loopImage.iconId}`);
      
      // 20분할 뷰 즉시 제거
      const currentGridView = document.getElementById('grid12View');
      if (currentGridView) currentGridView.remove();
      hide12GridArrows();
      isGrid12ViewMode = false;
      
      // 프로젝트 표시
      showProjectImageOnMainGrid(loopImage.iconId);
    };
    
    cell.appendChild(img);
    cell.appendChild(overlay);
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
  
  // 20개 이상이면 화살표 표시
  if (mainLoopImages.length > 20) {
    show12GridArrows();
  }
  
  // 초기 스크롤 위치 설정 (중간 반복에서 시작 = 5번째 반복)
  grid12ViewScrollOffset = 0;
  const singleCycleHeight = totalRows * cellHeight;  // 1사이클의 높이
  grid12ScrollPosition = singleCycleHeight * 5;  // 5번째 반복에서 시작 (0부터 시작하면 4)
  
  // 초기 위치로 즉시 이동 (transition 없이)
  scrollContainer.style.transition = 'none';
  scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
  
  // 다음 프레임에 transition 복원
  requestAnimationFrame(() => {
    scrollContainer.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
  });
  
  console.log(`✅ 20분할 뷰 표시 완료 (${mainLoopImages.length}개 이미지)`);
  console.log(`🔲 20분할 모드: ${isGrid12ViewMode}`);
  console.log(`📍 초기 스크롤 위치: ${grid12ScrollPosition}px (5번째 사이클, 1사이클=${singleCycleHeight}px)`);
}

// 20분할 뷰 숨김
function hide12GridView() {
  console.log('🗑️ 20분할 뷰 제거 시작...');
  
  // 먼저 플래그 해제
  isGrid12ViewMode = false;
  
  const gridView = document.getElementById('grid12View');
  if (gridView) {
    // 즉시 제거 (페이드아웃 없이)
    gridView.remove();
    console.log('✅ 20분할 뷰 제거 완료');
  }
  
  // 화살표 즉시 제거
  hide12GridArrows();
  
  grid12ViewScrollOffset = 0;
  grid12ScrollPosition = 0;  // 픽셀 스크롤 위치도 초기화
  
  console.log('✅ 20분할 모드 완전 해제');
}

// 20분할 뷰 화살표 표시
function show12GridArrows() {
  const imageAreaStartX = GRID_START_X + (3 * GRID_X);
  const imageAreaStartY = GRID_START_Y + (1 * GRID_Y);
  const imageAreaWidth = 1800;
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
  
  upArrow.onclick = () => {
    scrollByRows(-1);  // 정확히 1 ROW 위로
  };
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
  
  downArrow.onclick = () => {
    scrollByRows(1);  // 정확히 1 ROW 아래로
  };
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

// 20분할 뷰 화살표 숨김
function hide12GridArrows() {
  const upArrow = document.getElementById('grid12UpArrow');
  const downArrow = document.getElementById('grid12DownArrow');
  if (upArrow) upArrow.remove();
  if (downArrow) downArrow.remove();
}

// 20분할 뷰 스크롤 (부드러운 무한 루프)
let grid12ScrollPosition = 0;  // 픽셀 단위 스크롤 위치
const isGrid12Scrolling = false;  // 스크롤 중 플래그
const scrollMomentum = 0;  // 스크롤 관성

function scroll12GridView(direction, skipSnap = false) {
  const scrollContainer = document.getElementById('grid12ScrollContainer');
  if (!scrollContainer) return;
  
  const totalRows = Math.ceil(mainLoopImages.length / 5);  // 원본 이미지 기준
  const cellHeight = 240;  // 960 / 4 = 240px
  const scrollStep = 60;  // 픽셀 단위 부드러운 스크롤
  const maxScrollPosition = (totalRows - 4) * cellHeight;  // 원본의 최대 스크롤 위치
  
  // 부드러운 픽셀 단위 스크롤
  grid12ScrollPosition += direction * scrollStep;
  
  // 애니메이션 적용 (빠른 전환)
  scrollContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  
  // 무한 루프 처리
  if (grid12ScrollPosition > maxScrollPosition) {
    // 마지막을 넘어감 → 복제 영역으로 이동
    scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    
    // 1행 이상 진입 시 원본으로 리셋
    if (grid12ScrollPosition >= maxScrollPosition + cellHeight) {
      setTimeout(() => {
        scrollContainer.style.transition = 'none';
        grid12ScrollPosition = grid12ScrollPosition - maxScrollPosition;
        scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
        
        requestAnimationFrame(() => {
          scrollContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
      }, 150);
    }
    
  } else if (grid12ScrollPosition < 0) {
    // 맨 위에서 위로 → 마지막으로 점프
    scrollContainer.style.transition = 'none';
    grid12ScrollPosition = maxScrollPosition + grid12ScrollPosition;
    scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    
    requestAnimationFrame(() => {
      scrollContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
    
  } else {
    // 일반 스크롤
    scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
  }
  
  // 스크롤 로그 제거 (무한 루프 방지)
}

// ROW 기준 스냅 (부드럽게 정렬)
function snapToNearestRow() {
  const scrollContainer = document.getElementById('grid12ScrollContainer');
  if (!scrollContainer) return;
  
  const cellHeight = 240;
  const totalRows = Math.ceil(mainLoopImages.length / 5);
  const originalContentHeight = totalRows * cellHeight;
  
  const currentRow = grid12ScrollPosition / cellHeight;
  const nearestRow = Math.round(currentRow);
  let targetPosition = nearestRow * cellHeight;
  
  // 이미 정렬되어 있으면 스킵
  if (Math.abs(grid12ScrollPosition - targetPosition) < 1) return;
  
  // 부드러운 스냅 애니메이션
  scrollContainer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
  grid12ScrollPosition = targetPosition;
  scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
  
  // 스냅 후 경계를 벗어났는지 확인하고 조정
  setTimeout(() => {
    const singleCycleHeight = originalContentHeight;
    const minPosition = singleCycleHeight * 2;
    const maxPosition = singleCycleHeight * 8;
    
    if (grid12ScrollPosition < minPosition) {
      scrollContainer.style.transition = 'none';
      grid12ScrollPosition = grid12ScrollPosition + (singleCycleHeight * 3);
      scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    } else if (grid12ScrollPosition > maxPosition) {
      scrollContainer.style.transition = 'none';
      grid12ScrollPosition = grid12ScrollPosition - (singleCycleHeight * 3);
      scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    }
  }, 420);  // transition 시간(400ms) 이후
}

// 화살표 버튼: 정확히 N ROW 단위로 이동 (무한 루프 지원)
function scrollByRows(rowCount) {
  const scrollContainer = document.getElementById('grid12ScrollContainer');
  if (!scrollContainer) return;
  
  const cellHeight = 240;
  const totalRows = Math.ceil(mainLoopImages.length / 5);
  const originalContentHeight = totalRows * cellHeight;
  
  // 현재 위치에서 목표 만큼 이동
  let targetPosition = grid12ScrollPosition + (rowCount * cellHeight);
  
  // 살짝 지나갔다가 돌아오는 효과 (elastic)
  scrollContainer.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  grid12ScrollPosition = targetPosition;
  scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
  
  // 애니메이션 후 경계 체크 및 순간 이동
  setTimeout(() => {
    const singleCycleHeight = originalContentHeight;
    const minPosition = singleCycleHeight * 2;
    const maxPosition = singleCycleHeight * 8;
    
    if (grid12ScrollPosition < minPosition) {
      scrollContainer.style.transition = 'none';
      grid12ScrollPosition = grid12ScrollPosition + (singleCycleHeight * 3);
      scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    } else if (grid12ScrollPosition > maxPosition) {
      scrollContainer.style.transition = 'none';
      grid12ScrollPosition = grid12ScrollPosition - (singleCycleHeight * 3);
      scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
    }
  }, 620);  // elastic transition 시간(600ms) 이후
}

// 20분할 뷰 마우스 휠 이벤트 (관성 스크롤)
let scrollVelocity = 0;  // 현재 스크롤 속도
let lastWheelTime = 0;   // 마지막 wheel 이벤트 시간
let momentumAnimation = null;  // 관성 애니메이션 ID

function handle12GridWheel(e) {
  if (!isGrid12ViewMode) return;
  
  e.preventDefault();
  
  const scrollContainer = document.getElementById('grid12ScrollContainer');
  if (!scrollContainer) return;
  
  // 스크롤 감도 (값이 클수록 빠르게 스크롤됨)
  const scrollSensitivity = 0.2;
  
  // deltaY를 사용하여 속도 누적
  const scrollDelta = e.deltaY * scrollSensitivity;
  scrollVelocity += scrollDelta;
  
  // 속도 제한 (너무 빠르게 스크롤되지 않도록)
  const maxVelocity = 10;
  scrollVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, scrollVelocity));
  
  lastWheelTime = Date.now();
  
  // 기존 관성 애니메이션 취소
  if (momentumAnimation) {
    cancelAnimationFrame(momentumAnimation);
  }
  
  // 즉시 스크롤 적용
  applyScrollPosition(scrollContainer);
  
  // 관성 스크롤 시작
  startMomentumScroll(scrollContainer);
}

// 스크롤 위치 적용 및 경계 처리
function applyScrollPosition(scrollContainer) {
  const totalRows = Math.ceil(mainLoopImages.length / 5);
  const cellHeight = 240;
  const originalContentHeight = totalRows * cellHeight;
  const singleCycleHeight = originalContentHeight;
  const minPosition = singleCycleHeight * 2;
  const maxPosition = singleCycleHeight * 8;
  
  // 스크롤 위치 업데이트
  grid12ScrollPosition += scrollVelocity;
  
  // 무한 루프 경계 처리 (즉시 순간 이동)
  if (grid12ScrollPosition < minPosition) {
    grid12ScrollPosition += singleCycleHeight * 3;
  } else if (grid12ScrollPosition > maxPosition) {
    grid12ScrollPosition -= singleCycleHeight * 3;
  }
  
  // 부드럽게 적용 (transition 없이 직접 적용)
  scrollContainer.style.transition = 'none';
  scrollContainer.style.transform = `translateY(-${grid12ScrollPosition}px)`;
}

// 관성 스크롤 (점점 감속)
function startMomentumScroll(scrollContainer) {
  const friction = 0.95;  // 마찰 계수 (0.9 ~ 0.95, 낮을수록 빨리 멈춤)
  const minVelocity = 0.5;  // 최소 속도 (이하면 멈춤)
  
  function animate() {
    const now = Date.now();
    const timeSinceLastWheel = now - lastWheelTime;
    
    // 마지막 wheel 이벤트 후 50ms 이상 지나면 감속 시작
    if (timeSinceLastWheel > 50) {
      // 속도 감소 (마찰 적용)
      scrollVelocity *= friction;
      
      // 속도가 너무 작으면 멈춤
      if (Math.abs(scrollVelocity) < minVelocity) {
        scrollVelocity = 0;
        cancelAnimationFrame(momentumAnimation);
        momentumAnimation = null;
        return;
      }
    }
    
    // 스크롤 위치 업데이트
    applyScrollPosition(scrollContainer);
    
    // 다음 프레임 예약
    momentumAnimation = requestAnimationFrame(animate);
  }
  
  momentumAnimation = requestAnimationFrame(animate);
}

// ==================== 캐비넷/꿀단지 그리드 아이콘 ====================

let currentGridMode = 'main';  // 'main', 'cabinet', 'trash'
let generatedGridIcons = [];  // 생성된 그리드 아이콘 배열

// 전광판 관련 변수
let marqueeText = "저희가 참여한 프로젝트의 이미지를 사용할 수 있게 허락해주신 선,후배 건축사님들께 감사의 말을 전합니다.  덕분에 홈페이지가 풍성해질 수 있었습니다 : )";
let marqueeAnimationId = null;

// 캐비넷/꿀단지 아이콘 클릭 이벤트 (페이지 로드 후 등록)
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
      console.log('🗑️ 꿀단지 아이콘 클릭');
      showGridIcons('trash');
    });
    console.log('✅ 꿀단지 아이콘 이벤트 등록됨');
  } else {
    console.error('❌ 꿀단지 아이콘을 찾을 수 없음');
  }
}

// 그리드 아이콘 표시 (캐비넷/꿀단지)
async function showGridIcons(mode) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 ${mode === 'cabinet' ? '캐비넷' : '꿀단지'} 모드로 전환`);
  
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
  
  // 3. 20분할 뷰 제거
  const gridView = document.getElementById('grid12View');
  if (gridView) gridView.remove();
  hide12GridArrows();
  isGrid12ViewMode = false;
  
  // 4. 프로젝트 이미지/텍스트 제거
  const projectImages = document.querySelectorAll('[id^="mainGridDisplayImage"]');
  projectImages.forEach(img => img.remove());
  
  const allImages = document.querySelectorAll('.container img');
  allImages.forEach(img => {
    const zIndex = parseInt(img.style.zIndex) || 0;
    if (zIndex >= 499 && zIndex <= 501) {
      img.remove();
    }
  });
  
  const textOverlays = document.querySelectorAll('[id^="mainGridTextOverlay"]');
  textOverlays.forEach(txt => txt.remove());
  
  const allDivs = document.querySelectorAll('.container div');
  allDivs.forEach(div => {
    const zIndex = parseInt(div.style.zIndex) || 0;
    if (zIndex === 550) {
      div.remove();
    }
  });
  
  const allElements = document.querySelectorAll('.container *');
  allElements.forEach(el => {
    const zIndex = parseInt(el.style.zIndex) || 0;
    if (zIndex >= 600 && zIndex <= 700) {
      el.remove();
    }
  });
  
  hideImageNavigationArrows();
  hideSeveralButton();
  
  // 5. 현재 프로젝트 정보 초기화
  currentDisplayedProject = {
    iconId: null,
    mainImage: null,
    additionalImages: [],
    currentImageIndex: 0
  };
  
  // 6. 메인화면 아이콘 숨김
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
  
  // 7. 오른쪽 아이콘들 숨김 (관리자는 제외)
  const rightIconIds = ['cabinet', 'favorites', 'park', 'yong', 'trash'];
  rightIconIds.forEach(iconId => {
    const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
    if (iconWrapper) {
      iconWrapper.style.opacity = '0';
      setTimeout(() => {
        iconWrapper.style.display = 'none';
      }, 300);
    }
  });
  
  // 관리자 아이콘은 계속 표시하고 19.7 위치로 이동
  const managerIcon = document.querySelector(`.icon-wrapper[data-id="manager"]`);
  if (managerIcon) {
    // 19.7 위치로 이동 (꿀단지 위치)
    const managerPixelPos = gridToPixel(19, 7, 90, 90);
    managerIcon.style.left = managerPixelPos.x + 'px';
    managerIcon.style.top = managerPixelPos.y + 'px';
    managerIcon.style.display = 'flex';
    managerIcon.style.opacity = '1';
    console.log('✅ 관리자 아이콘 19.7 위치로 이동');
  }
  
  // 전광판 숨기기
  const marqueeContainer = document.getElementById('marqueeContainer');
  if (marqueeContainer) {
    marqueeContainer.style.opacity = '0';
    setTimeout(() => {
      marqueeContainer.style.display = 'none';
    }, 300);
    console.log('📰 전광판 숨김');
  }
  
  // 8. 캐비넷/꿀단지 프로젝트 아이콘 준비
  const prefix = mode === 'cabinet' ? 'C' : 'T';
  
  // 배경 아이콘 생성 제거 - 등록된 프로젝트만 표시하도록 변경
  console.log('🎨 배경 아이콘 생성 건너뜀 (등록된 프로젝트만 표시)');
  
  // 9. 프로젝트 아이콘 표시 - 동적 생성 (0~19열, 0~7행, 단 19.7만 제외)
  const iconIds = [];
  for (let x = 0; x <= 19; x++) {
    for (let y = 0; y <= 7; y++) {
      // 19,7 (관리자가 이동한 위치)만 건너뜀
      if (x === 19 && y === 7) {
        continue;
      }
      iconIds.push(`${prefix}${x}${y}`);
    }
  }
  console.log(`✅ ${mode} 아이콘 ID 생성 완료: ${iconIds.length}개`);
  
  setTimeout(async () => {
    console.log(`📁 ${mode} 아이콘 표시 및 프로젝트 로드 시작...`);
    
    let foundCount = 0;
    let projectCount = 0;
    let hiddenCount = 0;
    
    for (const iconId of iconIds) {
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      
      if (iconWrapper) {
        foundCount++;
        // 프로젝트 데이터 확인
        const projectKey = `projectData_${iconId}`;
        const projectData = await loadProjectFromDB(projectKey);
        
        if (projectData) {
          projectCount++;
          // 프로젝트가 있으면 이미지 업데이트 및 표시
          await updateIconImage(iconId, projectData);
          
          // 노드 복제로 모든 기존 이벤트 제거 (메인 아이콘 이벤트 제거)
          const cleanWrapper = iconWrapper.cloneNode(true);
          iconWrapper.parentNode.replaceChild(cleanWrapper, iconWrapper);
          
          // 인라인 스타일로 강제 표시
          cleanWrapper.style.setProperty('display', 'flex', 'important');
          cleanWrapper.style.setProperty('visibility', 'visible', 'important');
          cleanWrapper.style.setProperty('opacity', '0', 'important');
          cleanWrapper.style.setProperty('pointer-events', 'auto', 'important');
          cleanWrapper.style.cursor = 'pointer';
          
          // 드래그 비활성화
          cleanWrapper.style.userSelect = 'none';
          cleanWrapper.setAttribute('data-no-drag', 'true');
          
          setTimeout(() => {
            cleanWrapper.style.setProperty('opacity', '1', 'important');
          }, 50);
          
          // 새 클릭 이벤트 추가 (복제된 노드에 추가)
          cleanWrapper.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🖱️ ${iconId} 프로젝트 클릭 (${mode} 모드)`);
            
            // 프로젝트 데이터 다시 로드
            const clickedProjectData = await loadProjectFromDB(projectKey);
            if (clickedProjectData) {
              // 메인화면과 동일한 방식으로 프로젝트 표시
              if (typeof displayMainGridProject === 'function') {
                displayMainGridProject(iconId, clickedProjectData);
              } else if (typeof showProjectImageOnMainGrid === 'function') {
                showProjectImageOnMainGrid(iconId);
              }
            }
          });
          
          console.log(`✅ ${iconId} 프로젝트 표시 (클릭 이벤트 등록):`, projectData.projectName?.text);
        } else {
          hiddenCount++;
          // 프로젝트가 없으면 숨김 유지
          const cleanWrapper = iconWrapper.cloneNode(true);
          iconWrapper.parentNode.replaceChild(cleanWrapper, iconWrapper);
          cleanWrapper.style.display = 'none';
        }
      }
    }
    
    console.log(`✅ ${mode} 모드 전환 완료`);
    console.log(`  📊 통계: 아이콘 ${foundCount}개 찾음 / 프로젝트 ${projectCount}개 표시 / ${hiddenCount}개 숨김`);
    
    // 안내 메시지 표시
    showModeGuideMessage();
  }, 350);
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
  
  // 1. 캐비넷/꿀단지 아이콘 숨김 및 초기화 (0~19열, 0~7행 전체)
  const allCabinetTrashIcons = [];
  for (let x = 0; x <= 19; x++) {
    for (let y = 0; y <= 7; y++) {
      // 19,7 (관리자)는 제외
      if (x === 19 && y === 7) continue;
      allCabinetTrashIcons.push(`C${x}${y}`);
      allCabinetTrashIcons.push(`T${x}${y}`);
    }
  }
  console.log(`🧹 캐비넷/꿀단지 아이콘 ${allCabinetTrashIcons.length}개 숨김 처리`);
  
  allCabinetTrashIcons.forEach(iconId => {
    const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
    if (iconWrapper) {
      // 인라인 스타일 완전 제거 (CSS 기본값으로 복원)
      iconWrapper.style.removeProperty('display');
      iconWrapper.style.removeProperty('visibility');
      iconWrapper.style.removeProperty('opacity');
      iconWrapper.style.removeProperty('pointer-events');
      
      // 원래 그리드 위치로 복원
      const gridPos = iconGridPositions[iconId];
      if (gridPos) {
        const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, 90, 90);
        iconWrapper.style.left = pixelPos.x + 'px';
        iconWrapper.style.top = pixelPos.y + 'px';
        // 위치 복원 로그 제거
      }
      
      // 다시 숨김 처리 (CSS 덮어쓰기)
      iconWrapper.style.display = 'none';
      iconWrapper.style.visibility = 'hidden';
      iconWrapper.style.opacity = '0';
      iconWrapper.style.pointerEvents = 'none';
      
      // data-no-drag 속성 제거
      iconWrapper.removeAttribute('data-no-drag');
      
      // 클릭 이벤트 제거 (복제로 모든 이벤트 제거)
      const newWrapper = iconWrapper.cloneNode(true);
      if (iconWrapper.parentNode) {
        iconWrapper.parentNode.replaceChild(newWrapper, iconWrapper);
      }
    }
  });
  
  // 2. 배경 아이콘 제거
  const backgroundIcons = document.querySelectorAll('.icon-background');
  backgroundIcons.forEach(icon => {
    icon.remove();
  });
  console.log(`✅ 배경 아이콘 ${backgroundIcons.length}개 제거`);
  
  // 3. 생성된 그리드 아이콘 제거 (이전 방식)
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
  
  // 3. 메인화면 및 오른쪽 아이콘 다시 표시
  setTimeout(() => {
    // 메인화면 아이콘
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
    
    // 오른쪽 아이콘들 다시 표시
    const rightIconIds = ['cabinet', 'favorites', 'manager', 'park', 'yong', 'trash'];
    rightIconIds.forEach(iconId => {
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      if (iconWrapper) {
        // 관리자 아이콘은 원래 위치(19.2)로 복원
        if (iconId === 'manager') {
          const gridPos = iconGridPositions['manager'];
          if (gridPos) {
            const pixelPos = gridToPixel(gridPos.gridX, gridPos.gridY, 90, 90);
            iconWrapper.style.left = pixelPos.x + 'px';
            iconWrapper.style.top = pixelPos.y + 'px';
            console.log('✅ 관리자 아이콘 원래 위치(19.2)로 복원');
          }
        }
        
        iconWrapper.style.display = 'flex';
        iconWrapper.style.opacity = '0';
        requestAnimationFrame(() => {
          iconWrapper.style.transition = 'opacity 0.3s ease';
          iconWrapper.style.opacity = '1';
        });
      }
    });
    
    // 전광판 다시 표시
    const marqueeContainer = document.getElementById('marqueeContainer');
    if (marqueeContainer) {
      marqueeContainer.style.display = 'block';
      marqueeContainer.style.opacity = '0';
      requestAnimationFrame(() => {
        marqueeContainer.style.transition = 'opacity 0.3s ease';
        marqueeContainer.style.opacity = '1';
      });
      console.log('📰 전광판 다시 표시');
    }
    
    // 모드 초기화
    currentGridMode = 'main';
    
    // 메인 아이콘 이미지 업데이트 (프로젝트 데이터 기반 표시/숨김)
    updateAllMainIconImages();
    
    // 20분할 화면 표시
    setTimeout(() => {
      console.log('🔲 메인 모드 복귀: 20분할 화면 표시');
      show12GridView();
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

// 디버깅 도구: M00 아이콘 강제 표시
window.showM00Icon = async function() {
  console.log('🔍 M00 아이콘 디버깅 시작...');
  
  const iconWrapper = document.querySelector('.icon-wrapper[data-id="M00"]');
  if (!iconWrapper) {
    console.error('❌ M00 아이콘을 찾을 수 없습니다!');
    return;
  }
  
  console.log('✅ M00 아이콘 요소 발견:', iconWrapper);
  console.log('   현재 display:', iconWrapper.style.display);
  console.log('   현재 visibility:', iconWrapper.style.visibility);
  console.log('   현재 opacity:', iconWrapper.style.opacity);
  
  // IndexedDB에서 데이터 확인
  const projectData = await loadProjectFromDB('projectData_M00');
  console.log('📦 M00 프로젝트 데이터:', projectData);
  
  if (projectData) {
    console.log('   메인 이미지 경로:', projectData.mainImagePath);
    console.log('   메인 이미지 base64:', projectData.mainImage ? `있음 (${projectData.mainImage.substring(0, 50)}...)` : '없음');
    
    // 아이콘 강제 표시
    iconWrapper.style.display = 'flex';
    iconWrapper.style.visibility = 'visible';
    iconWrapper.style.opacity = '1';
    
    // 이미지 업데이트
    updateIconImage('M00', projectData);
    
    console.log('✅ M00 아이콘 강제 표시 완료!');
  } else {
    console.error('❌ M00 프로젝트 데이터가 없습니다!');
  }
};

// 디버깅 도구: M00 전체 테스트
window.testM00 = async function() {
  console.log('🧪 M00 전체 테스트 시작...\n');
  
  // 1. 아이콘 요소 확인
  const iconWrapper = document.querySelector('.icon-wrapper[data-id="M00"]');
  console.log('1️⃣ M00 아이콘 요소:', iconWrapper ? '✅ 발견' : '❌ 없음');
  if (iconWrapper) {
    console.log('   display:', iconWrapper.style.display);
    console.log('   visibility:', iconWrapper.style.visibility);
    console.log('   opacity:', iconWrapper.style.opacity);
  }
  
  // 2. IndexedDB 데이터 확인
  const projectData = await loadProjectFromDB('projectData_M00');
  console.log('\n2️⃣ IndexedDB 데이터:', projectData ? '✅ 있음' : '❌ 없음');
  if (projectData) {
    console.log('   프로젝트명:', projectData.projectName?.text);
    console.log('   mainImagePath:', projectData.mainImagePath);
    console.log('   mainImage:', projectData.mainImage ? `base64 (${projectData.mainImage.substring(0, 30)}...)` : 'null');
    console.log('   additionalImagePaths:', projectData.additionalImagePaths?.length || 0, '개');
    console.log('   additionalImages:', projectData.additionalImages?.length || 0, '개');
  }
  
  // 3. 클릭 시뮬레이션
  console.log('\n3️⃣ M00 아이콘 클릭 시뮬레이션...');
  if (iconWrapper) {
    await showProjectImageOnMainGrid('M00');
  }
  
  // 4. 표시된 이미지 확인
  setTimeout(() => {
    const displayedImage = document.getElementById('mainGridDisplayImage');
    console.log('\n4️⃣ 표시된 이미지:', displayedImage ? '✅ 발견' : '❌ 없음');
    if (displayedImage) {
      console.log('   src:', displayedImage.src.substring(0, 100));
      console.log('   left:', displayedImage.style.left);
      console.log('   top:', displayedImage.style.top);
      console.log('   width:', displayedImage.style.width);
      console.log('   height:', displayedImage.style.height);
      console.log('   opacity:', displayedImage.style.opacity);
      console.log('   z-index:', displayedImage.style.zIndex);
    }
  }, 1000);
};

// 디버깅 도구: 이미지 영역 표시
window.showImageArea = function() {
  const existingArea = document.getElementById('imageAreaDebug');
  if (existingArea) {
    existingArea.remove();
    console.log('이미지 영역 표시 해제');
    return;
  }
  
  // 이미지 표시 영역 (그리드 6,1~17,6)
  const startX = GRID_START_X + (6 * GRID_X);  // 80 + 720 = 800
  const startY = GRID_START_Y + (1 * GRID_Y);  // 80 + 160 = 240
  const width = 12 * GRID_X;  // 1440
  const height = 6 * GRID_Y;  // 960
  
  const area = document.createElement('div');
  area.id = 'imageAreaDebug';
  area.style.cssText = `
    position: absolute;
    left: ${startX}px;
    top: ${startY}px;
    width: ${width}px;
    height: ${height}px;
    border: 3px solid red;
    z-index: 9999;
    pointer-events: none;
    box-sizing: border-box;
  `;
  
  const label = document.createElement('div');
  label.textContent = `이미지 영역: ${startX},${startY} ~ ${startX+width},${startY+height} (${width}x${height})`;
  label.style.cssText = 'position: absolute; top: -25px; left: 0; color: red; font-weight: bold; font-size: 14px; background: white; padding: 2px 5px;';
  area.appendChild(label);
  
  container.appendChild(area);
  console.log('이미지 영역 표시됨:', { startX, startY, width, height });
  console.log('  그리드 6,1 시작:', startX, startY);
  console.log('  그리드 17,6 끝:', startX + width, startY + height);
};

// IndexedDB 완전 초기화 함수 (긴급 복구용)
window.clearAllProjectData = function() {
  if (!confirm('⚠️ 모든 프로젝트 데이터가 삭제됩니다. 정말 초기화하시겠습니까?\n\n(내보내기로 백업을 먼저 하는 것을 권장합니다)')) {
    return;
  }
  
  indexedDB.deleteDatabase('HomepageProjectDB');
  localStorage.removeItem('projectList');
  console.log('✅ IndexedDB 완전 초기화 완료. 페이지를 새로고침하세요.');
  alert('✅ 모든 프로젝트 데이터가 삭제되었습니다.\n페이지를 새로고침합니다.');
  location.reload();
};

// 콘솔 안내 메시지
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
console.log('%c🎨 그리드 시스템 활성화 완료!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
console.log('');
console.log('%c📋 일반 명령어:', 'color: #ffff00; font-size: 14px; font-weight: bold;');
console.log('  toggleMainGrid() - 메인 그리드 표시/숨김');
console.log('  showImageArea() - 이미지 영역 표시/숨김 (빨간 테두리)');
console.log('  resetAllPositions() - 모든 아이콘 위치 초기화');
console.log('');
console.log('%c🔧 M00 문제 해결:', 'color: #e74c3c; font-size: 14px; font-weight: bold;');
console.log('  testM00() - M00 전체 진단 (데이터 확인 + 클릭 시뮬레이션)');
console.log('  showM00Icon() - M00 아이콘 강제 표시');
console.log('');
console.log('%c⚠️ 긴급 복구:', 'color: #ff0000; font-size: 14px; font-weight: bold;');
console.log('  clearAllProjectData() - IndexedDB 완전 초기화 (모든 데이터 삭제!)');
console.log('');
console.log('%c💡 GitHub 워크플로우:', 'color: #3498db; font-size: 14px; font-weight: bold;');
console.log('  1. 로컬에서 프로젝트 등록');
console.log('  2. 관리자 → 내보내기 → projectsData.json 다운로드');
console.log('  3. projects 폴더 + projectsData.json을 GitHub에 업로드');
console.log('  4. 다른 사용자가 클론하면 자동으로 이미지 로드! ✨');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');