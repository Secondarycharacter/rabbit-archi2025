// ==================== 관리자 모드 UI (Pure DOM - No Screen Transition) ====================

// 전역 변수
let currentAction = null;
let currentLocation = null;

// 공통 오버레이 생성
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'managerOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  return overlay;
}

// 공통 팝업 컨테이너 생성
function createPopupContainer(width = '600px') {
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border-radius: 15px;
    padding: 35px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    width: ${width};
    max-height: 80vh;
    overflow-y: auto;
  `;
  return container;
}

// 관리자 모드 메인 UI
function showManagerUI() {
  console.log('🎯 showManagerUI 함수 호출됨!');
  console.log('📋 관리자 모드 UI 표시 시작...');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
    console.log('✅ isManagerOverlayOpen = true');
  } else {
    console.warn('⚠️ isManagerOverlayOpen 변수가 정의되지 않음');
  }
  
  // 기존 오버레이 제거
  const existingOverlay = document.getElementById('managerOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
    console.log('🗑️ 기존 오버레이 제거됨');
  }
  
  console.log('🏗️ 새 오버레이 생성 중...');
  // 오버레이 생성
  const overlay = createOverlay();
  const container = createPopupContainer('600px');
  console.log('✅ 오버레이와 컨테이너 생성 완료');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;';
  header.innerHTML = `
    <div style="font-size: 36px; margin-bottom: 10px;">⚙️</div>
    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #2c3e50;">관리자 모드</h1>
    <p style="color: #7f8c8d; font-size: 16px; margin-top: 10px;">홈페이지의 콘텐츠를 생성, 수정, 삭제할 수 있습니다.</p>
  `;
  
  // 버튼 그리드 (3x3 레이아웃)
  const buttonGrid = document.createElement('div');
  buttonGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;';
  
  const actions = [
    { text: '생성/수정하기', action: 'create', icon: '➕', color: '#667eea', desc: '프로젝트 생성 및 수정' },
    { text: '이동하기', action: 'move', icon: '🔄', color: '#f093fb', desc: '프로젝트를 다른 위치로 이동' },
    { text: '삭제하기', action: 'delete', icon: '🗑️', color: '#fa709a', desc: '프로젝트 제거' },
    { text: '데이터 확인', action: 'view_data', icon: '🔍', color: '#26a69a', desc: '저장된 프로젝트 목록 확인' },
    { text: '전광판', action: 'marquee', icon: '📰', color: '#4ecdc4', desc: '전광판 텍스트 수정' },
    { text: '내보내기', action: 'export', icon: '📥', color: '#9b59b6', desc: 'projectsData.json 생성' }
  ];
  
  actions.forEach(actionInfo => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: linear-gradient(135deg, ${actionInfo.color} 0%, ${actionInfo.color}dd 100%);
      color: white;
      border: none;
      padding: 20px 15px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s ease;
      text-align: center;
    `;
    btn.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 8px;">${actionInfo.icon}</div>
      <div>${actionInfo.text}</div>
      <div style="font-size: 11px; opacity: 0.9; margin-top: 5px;">${actionInfo.desc}</div>
    `;
    
    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-3px)';
      btn.style.boxShadow = `0 6px 20px ${actionInfo.color}80`;
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    };
    btn.onclick = () => {
      currentAction = actionInfo.action;
      
      // 전광판, 내보내기, 데이터 확인, 이동하기는 위치 선택 불필요
      if (actionInfo.action === 'marquee') {
        overlay.remove();
        showMarqueeEditUI();
      } else if (actionInfo.action === 'export') {
        overlay.remove();
        exportProjectsDataJSON();
      } else if (actionInfo.action === 'view_data') {
        overlay.remove();
        showProjectDataViewer();
      } else if (actionInfo.action === 'move') {
        overlay.remove();
        showProjectMoveUI();
      } else {
        showLocationSelectUI(actionInfo.action, actionInfo.text);
      }
    };
    
    buttonGrid.appendChild(btn);
  });
  
  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '닫기';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 12px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  closeBtn.onmouseenter = () => closeBtn.style.background = '#7f8c8d';
  closeBtn.onmouseleave = () => closeBtn.style.background = '#95a5a6';
  closeBtn.onclick = () => {
    overlay.remove();
    
    // 관리자 오버레이 닫힘 플래그 설정
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  container.appendChild(header);
  container.appendChild(buttonGrid);
  container.appendChild(closeBtn);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

// 위치 선택 UI
function showLocationSelectUI(action, actionText) {
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  // 기존 오버레이 제거
  const existingOverlay = document.getElementById('managerOverlay');
  if (existingOverlay) existingOverlay.remove();
  
  // 오버레이 생성
  const overlay = createOverlay();
  const container = createPopupContainer('650px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;';
  
  const backBtn = document.createElement('span');
  backBtn.innerHTML = '← ';
  backBtn.style.cssText = 'color: #667eea; cursor: pointer; font-size: 24px; font-weight: bold;';
  backBtn.onclick = () => {
    overlay.remove();
    showManagerUI();
  };
  
  const title = document.createElement('h2');
  title.style.cssText = 'display: inline; margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;';
  title.appendChild(backBtn);
  title.appendChild(document.createTextNode(`${actionText} - 위치 선택`));
  
  header.appendChild(title);
  
  // 위치 버튼 그리드
  const locations = [
    { text: '메인화면', id: 'main', icon: '🏠', color: '#3498db' },
    { text: '캐비넷', id: 'cabinet', icon: '📁', color: '#9b59b6' },
    { text: '즐겨찾기', id: 'favorites', icon: '⭐', color: '#f39c12' },
    { text: '용', id: 'yong', icon: '🐉', color: '#e74c3c' },
    { text: '공원', id: 'park', icon: '🌳', color: '#27ae60' },
    { text: '꿀단지', id: 'trash', icon: '🗑️', color: '#95a5a6' }
  ];
  
  const locationGrid = document.createElement('div');
  locationGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;';
  
  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: linear-gradient(135deg, ${loc.color}15 0%, ${loc.color}05 100%);
      border: 2px solid ${loc.color}40;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    `;
    btn.innerHTML = `
      <div style="font-size: 36px; margin-bottom: 8px;">${loc.icon}</div>
      <div style="font-size: 16px; font-weight: 600; color: ${loc.color};">${loc.text}</div>
    `;
    
    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-3px)';
      btn.style.boxShadow = `0 6px 15px ${loc.color}40`;
      btn.style.borderColor = loc.color;
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
      btn.style.borderColor = `${loc.color}40`;
    };
    btn.onclick = () => {
      currentLocation = loc.id;
      if (loc.id === 'main') {
        overlay.remove();
        
        // 다음 UI로 전환되므로 플래그는 계속 true 유지
        if (action === 'delete') {
          showMainScreenDeleteUI();
        } else {
          showMainScreenForm(action);
        }
      } else if (loc.id === 'cabinet') {
        overlay.remove();
        
        // 캐비넷 폼 표시
        if (action === 'create') {
          console.log('🔍 window.showCabinetForm:', typeof window.showCabinetForm);
          
          if (typeof window.showCabinetForm === 'function') {
            window.showCabinetForm(action);
          } else {
            alert('❌ 캐비넷 모듈이 로드되지 않았습니다.\n\n다음을 시도해주세요:\n1. Ctrl + Shift + R (강력 새로고침)\n2. F12 → Network 탭 → Disable cache 체크 후 새로고침');
            console.error('❌ showCabinetForm 함수를 찾을 수 없습니다.');
            console.error('manager-cabinet.js가 로드되지 않았을 수 있습니다.');
          }
        } else if (action === 'delete') {
          if (typeof showMainScreenDeleteUI === 'function') {
            showMainScreenDeleteUI('cabinet');
          } else {
            alert('삭제 기능을 찾을 수 없습니다.');
          }
        } else {
          alert(`${loc.text} ${actionText} 기능은 준비 중입니다.`);
        }
      } else if (loc.id === 'trash') {
        overlay.remove();
        
        // 꿀단지 폼 표시
        if (action === 'create') {
          console.log('🔍 window.showTrashForm:', typeof window.showTrashForm);
          
          if (typeof window.showTrashForm === 'function') {
            window.showTrashForm(action);
          } else {
            alert('❌ 꿀단지 모듈이 로드되지 않았습니다.\n\n다음을 시도해주세요:\n1. Ctrl + Shift + R (강력 새로고침)\n2. F12 → Network 탭 → Disable cache 체크 후 새로고침');
            console.error('❌ showTrashForm 함수를 찾을 수 없습니다.');
            console.error('manager-trash.js가 로드되지 않았을 수 있습니다.');
          }
        } else if (action === 'delete') {
          if (typeof showMainScreenDeleteUI === 'function') {
            showMainScreenDeleteUI('trash');
          } else {
            alert('삭제 기능을 찾을 수 없습니다.');
          }
        } else {
          alert(`${loc.text} ${actionText} 기능은 준비 중입니다.`);
        }
      } else if (loc.id === 'favorites') {
        overlay.remove();
        
        // 즐겨찾기 폼 표시
        if (action === 'create' || action === 'edit') {
          showFavoritesForm(action);
        } else {
          alert(`${loc.text} ${actionText} 기능은 준비 중입니다.`);
        }
      } else {
        alert(`${loc.text} ${actionText} 기능은 준비 중입니다.`);
      }
    };
    
    locationGrid.appendChild(btn);
  });
  
  // 하단 버튼
  const footerBtns = document.createElement('div');
  footerBtns.style.cssText = 'display: flex; gap: 10px;';
  
  const backButton = document.createElement('button');
  backButton.textContent = '← 뒤로가기';
  backButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  backButton.onclick = () => {
    overlay.remove();
    
    // 관리자 UI로 돌아가므로 플래그는 여전히 true
    showManagerUI();
  };
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '닫기';
  closeButton.style.cssText = `
    flex: 1;
    padding: 12px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  closeButton.onclick = () => {
    overlay.remove();
    
    // 관리자 오버레이 닫힘 플래그 설정
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  footerBtns.appendChild(backButton);
  footerBtns.appendChild(closeButton);
  
  container.appendChild(header);
  container.appendChild(locationGrid);
  container.appendChild(footerBtns);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

// 프로젝트 삭제 UI
function showMainScreenDeleteUI() {
  console.log('프로젝트 삭제 UI 표시');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  // 기존 오버레이 제거
  const existingOverlay = document.getElementById('managerOverlay');
  if (existingOverlay) existingOverlay.remove();
  
  // 오버레이 생성
  const overlay = createOverlay();
  const container = createPopupContainer('550px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; text-align: center;';
  header.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">🗑️</div>
    <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">프로젝트 삭제하기</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">삭제할 프로젝트의 위치를 선택하세요</p>
  `;
  
  // 생성 위치 입력 섹션
  const positionSection = document.createElement('div');
  positionSection.style.cssText = 'margin-bottom: 25px;';
  
  const positionLabel = document.createElement('div');
  positionLabel.style.cssText = 'font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #2c3e50;';
  positionLabel.textContent = '삭제 위치';
  
  // 위치 선택 드롭다운 추가
  const locationSelect = document.createElement('div');
  locationSelect.style.cssText = 'margin-bottom: 15px;';
  locationSelect.innerHTML = `
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #555;">저장 위치</label>
    <select id="deleteLocation" style="
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-family: 'WAGURI', sans-serif;
      background: white;
      font-weight: 600;
    ">
      <option value="main">메인화면</option>
      <option value="cabinet">캐비넷</option>
      <option value="trash">꿀단지</option>
    </select>
  `;
  
  const positionInputs = document.createElement('div');
  positionInputs.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;';
  
  positionInputs.innerHTML = `
    <div>
      <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #555;">행 (0-7)</label>
      <input id="deleteGridRow" type="number" min="0" max="7" value="0"
        style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: 'WAGURI', sans-serif;
          outline: none;
          text-align: center;
          font-weight: 600;
        ">
    </div>
    <div>
      <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #555;">열 (0-2)</label>
      <input id="deleteGridCol" type="number" min="0" max="2" value="0"
        style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: 'WAGURI', sans-serif;
          outline: none;
          text-align: center;
          font-weight: 600;
        ">
    </div>
  `;
  
  // 미리보기
  const preview = document.createElement('div');
  preview.id = 'deletePositionPreview';
  preview.style.cssText = `
    padding: 15px;
    background: linear-gradient(135deg, #fa709a15 0%, #fa709a05 100%);
    border: 2px solid #fa709a40;
    border-radius: 8px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: #fa709a;
  `;
  preview.textContent = '선택된 위치: 메인화면00 (M00)';
  
  // 행/열 변경 시 미리보기 업데이트
  const updateDeletePreview = () => {
    const locationSelect = document.getElementById('deleteLocation');
    const rowInput = document.getElementById('deleteGridRow');
    const colInput = document.getElementById('deleteGridCol');
    const location = locationSelect ? locationSelect.value : 'main';
    const row = parseInt(rowInput.value) || 0;
    const col = parseInt(colInput.value) || 0;
    
    const locationNames = { main: '메인화면', cabinet: '캐비넷', trash: '꿀단지' };
    const locationPrefixes = { main: 'M', cabinet: 'C', trash: 'T' };
    
    preview.textContent = `선택된 위치: ${locationNames[location]}${col}${row} (${locationPrefixes[location]}${col}${row})`;
  };
  
  positionSection.appendChild(positionLabel);
  positionSection.appendChild(locationSelect);
  positionSection.appendChild(positionInputs);
  positionSection.appendChild(preview);
  
  // 이벤트 리스너
  setTimeout(() => {
    document.getElementById('deleteLocation').addEventListener('change', updateDeletePreview);
    document.getElementById('deleteGridRow').addEventListener('input', updateDeletePreview);
    document.getElementById('deleteGridCol').addEventListener('input', updateDeletePreview);
    updateDeletePreview(); // 초기 미리보기
  }, 100);
  
  // 버튼
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 10px; margin-top: 25px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#7f8c8d'; };
  cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#95a5a6'; };
  cancelBtn.onclick = () => {
    overlay.remove();
    
    // 관리자 오버레이는 계속 열려있음 (위치 선택 UI로 전환)
    showLocationSelectUI('delete', '삭제하기');
  };
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '삭제';
  deleteBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  deleteBtn.onmouseenter = () => { deleteBtn.style.background = '#c0392b'; };
  deleteBtn.onmouseleave = () => { deleteBtn.style.background = '#e74c3c'; };
  deleteBtn.onclick = async () => {
    const locationSelect = document.getElementById('deleteLocation');
    const rowInput = document.getElementById('deleteGridRow');
    const colInput = document.getElementById('deleteGridCol');
    const location = locationSelect.value;
    const row = parseInt(rowInput.value) || 0;
    const col = parseInt(colInput.value) || 0;
    
    // 확인 대화상자 (비동기)
    await showDeleteConfirmation(location, row, col, overlay);
  };
  
  buttonGroup.appendChild(cancelBtn);
  buttonGroup.appendChild(deleteBtn);
  
  container.appendChild(header);
  container.appendChild(positionSection);
  container.appendChild(buttonGroup);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

// 삭제 확인 대화상자
async function showDeleteConfirmation(location, row, col, parentOverlay) {
  const locationPrefixes = { main: 'M', cabinet: 'C', trash: 'T' };
  const locationNames = { main: '메인화면', cabinet: '캐비넷', trash: '꿀단지' };
  const prefix = locationPrefixes[location];
  const locationName = locationNames[location];
  
  const iconId = `${prefix}${col}${row}`;
  const storageKey = `projectData_${iconId}`;
  
  console.log(`🗑️ 삭제 시도: location=${location}, row=${row}, col=${col}, iconId=${iconId}, key=${storageKey}`);
  
  // IndexedDB에서 프로젝트 데이터 확인
  const projectData = await loadProjectFromDB(storageKey);
  
  console.log(`📦 프로젝트 데이터 확인:`, projectData ? '있음' : '없음');
  
  if (!projectData) {
    alert(`${locationName}${col}${row} (${iconId})에 저장된 프로젝트가 없습니다.`);
    return;
  }
  
  // 확인 오버레이
  const confirmOverlay = document.createElement('div');
  confirmOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  const confirmBox = document.createElement('div');
  confirmBox.style.cssText = `
    background: white;
    border-radius: 15px;
    padding: 35px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    width: 400px;
    text-align: center;
  `;
  
  confirmBox.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 15px;">⚠️</div>
    <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: #2c3e50;">정말로 삭제할까요?</h2>
    <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 25px;">
      <strong style="color: #e74c3c;">${locationName}${col}${row}</strong>의 프로젝트 데이터가<br>
      영구적으로 삭제됩니다.
    </p>
  `;
  
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 10px;';
  
  const noBtn = document.createElement('button');
  noBtn.textContent = '아니오';
  noBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  noBtn.onmouseenter = () => { noBtn.style.background = '#7f8c8d'; };
  noBtn.onmouseleave = () => { noBtn.style.background = '#95a5a6'; };
  noBtn.onclick = () => {
    confirmOverlay.remove();
  };
  
  const yesBtn = document.createElement('button');
  yesBtn.textContent = '예';
  yesBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  yesBtn.onmouseenter = () => { yesBtn.style.background = '#c0392b'; };
  yesBtn.onmouseleave = () => { yesBtn.style.background = '#e74c3c'; };
  yesBtn.onclick = async () => {
    // 실제 삭제 수행 (IndexedDB)
    await deleteProjectFromDB(storageKey);
    
    // 프로젝트 리스트에서도 제거
    let projectList = JSON.parse(localStorage.getItem('projectList') || '[]');
    projectList = projectList.filter(id => id !== iconId);
    localStorage.setItem('projectList', JSON.stringify(projectList));
    
    console.log(`프로젝트 삭제 완료: ${iconId}`);
    
    // 성공 메시지
    confirmOverlay.remove();
    parentOverlay.remove();
    
    // 관리자 오버레이는 계속 열려있음 (성공 메시지 표시)
    
    // 성공 알림
    const successOverlay = createOverlay();
    const successBox = document.createElement('div');
    successBox.style.cssText = `
      background: white;
      border-radius: 15px;
      padding: 35px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      width: 400px;
      text-align: center;
    `;
    successBox.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 15px;">✅</div>
      <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: #27ae60;">삭제 완료</h2>
      <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 25px;">
        <strong style="color: #27ae60;">${locationName}${col}${row}</strong>의 프로젝트가<br>
        성공적으로 삭제되었습니다.
      </p>
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '확인';
    confirmBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
    `;
    confirmBtn.onclick = () => {
      successOverlay.remove();
      
      // 삭제된 아이콘 숨김 처리
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      if (iconWrapper) {
        const iconImg = iconWrapper.querySelector('.icon-image');
        const iconLabel = iconWrapper.querySelector('.icon-label');
        
        // 기본 이미지로 복원
        if (iconImg) {
          iconImg.src = 'images/icon.png';
          console.log(`✅ ${iconId} 아이콘 이미지 초기화됨`);
        }
        
        // 레이블 초기화
        if (iconLabel) {
          iconLabel.textContent = `${locationName}${iconId.substring(1)}`;
          console.log(`✅ ${iconId} 레이블 초기화됨`);
        }
        
        // 아이콘 숨김
        iconWrapper.style.display = 'none';
        iconWrapper.style.visibility = 'hidden';
        console.log(`🚫 ${iconId} 아이콘 숨김 처리됨`);
      }
      
      // 관리자 UI로 돌아가므로 플래그는 여전히 true
      showManagerUI();
    };
    
    successBox.appendChild(confirmBtn);
    successOverlay.appendChild(successBox);
    document.body.appendChild(successOverlay);
  };
  
  btnGroup.appendChild(noBtn);
  btnGroup.appendChild(yesBtn);
  confirmBox.appendChild(btnGroup);
  confirmOverlay.appendChild(confirmBox);
  document.body.appendChild(confirmOverlay);
}

// ==================== 즐겨찾기 폼 ====================

function showFavoritesForm(action) {
  const actionText = {
    'create': '즐겨찾기 생성하기',
    'edit': '즐겨찾기 수정하기'
  }[action] || '즐겨찾기 관리';
  
  console.log(`📋 즐겨찾기 폼 표시: ${actionText}`);
  
  const overlay = createOverlay();
  const container = createPopupContainer('800px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;';
  const title = document.createElement('h2');
  title.textContent = actionText;
  title.style.cssText = 'margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;';
  header.appendChild(title);
  container.appendChild(header);
  
  // 폼 생성
  const form = document.createElement('form');
  form.style.cssText = 'display: flex; flex-direction: column; gap: 25px;';
  
  // 3개 섹션: 건축사사무소, 건축계획 참고사이트, 기타 참고사이트
  const sections = [
    { id: 'architects', title: '건축사사무소', color: '#3498db' },
    { id: 'planning', title: '건축계획 참고사이트', color: '#9b59b6' },
    { id: 'others', title: '기타 참고사이트', color: '#e67e22' }
  ];
  
  sections.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.style.cssText = 'border: 2px solid #ddd; border-radius: 12px; padding: 20px; background: #f8f9fa;';
    
    // 섹션 타이틀
    const sectionTitle = document.createElement('div');
    sectionTitle.textContent = section.title;
    sectionTitle.style.cssText = `
      font-size: 20px;
      font-weight: bold;
      color: ${section.color};
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${section.color};
    `;
    sectionDiv.appendChild(sectionTitle);
    
    // 항목 컨테이너
    const itemsContainer = document.createElement('div');
    itemsContainer.id = `${section.id}Container`;
    itemsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    sectionDiv.appendChild(itemsContainer);
    
    // 항목 추가 버튼
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = `+ ${section.title} 추가`;
    addBtn.style.cssText = `
      margin-top: 10px;
      padding: 10px 16px;
      background: ${section.color};
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    `;
    addBtn.onmouseenter = () => addBtn.style.opacity = '0.8';
    addBtn.onmouseleave = () => addBtn.style.opacity = '1';
    addBtn.onclick = () => addFavoriteItem(section.id, section.title);
    sectionDiv.appendChild(addBtn);
    
    form.appendChild(sectionDiv);
    
    // 첫 번째 항목 자동 추가
    addFavoriteItem(section.id, section.title, true);
  });
  
  // 하단 버튼
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '❌ 취소';
  cancelBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  cancelBtn.onclick = () => {
    overlay.remove();
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '💾 저장';
  saveBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  
  form.onsubmit = (e) => {
    e.preventDefault();
    saveFavoritesData();
  };
  
  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(saveBtn);
  
  container.appendChild(form);
  container.appendChild(btnGroup);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // 수정 모드일 때 기존 데이터 로드
  if (action === 'edit') {
    setTimeout(() => {
      loadFavoritesData();
    }, 200);
  }
}

// 즐겨찾기 데이터 로드
function loadFavoritesData() {
  console.log('📂 즐겨찾기 데이터 로드 시작...');
  
  const storageKey = 'favoritesData';
  const savedData = localStorage.getItem(storageKey);
  
  if (!savedData) {
    console.log('저장된 즐겨찾기 데이터 없음');
    return;
  }
  
  const favoritesData = JSON.parse(savedData);
  console.log('불러온 즐겨찾기 데이터:', favoritesData);
  
  // 각 섹션별로 데이터 복원
  const sections = ['architects', 'planning', 'others'];
  const sectionTitles = {
    'architects': '건축사사무소',
    'planning': '건축계획 참고사이트',
    'others': '기타 참고사이트'
  };
  
  sections.forEach(sectionId => {
    const items = favoritesData[sectionId] || [];
    const container = document.getElementById(`${sectionId}Container`);
    
    if (container && items.length > 0) {
      container.innerHTML = ''; // 기존 항목 제거
      
      items.forEach((itemData, index) => {
        addFavoriteItem(sectionId, sectionTitles[sectionId], index === 0);
        
        // 데이터 복원
        const itemElements = container.querySelectorAll('.favorite-item');
        const currentItem = itemElements[itemElements.length - 1];
        
        if (currentItem) {
          const imagePreview = currentItem.querySelector('.favorite-image-preview');
          const nameInput = currentItem.querySelector('.favorite-name');
          const urlInput = currentItem.querySelector('.favorite-url');
          const descInput = currentItem.querySelector('.favorite-description');
          
          // 이미지 복원
          if (itemData.imageData && imagePreview) {
            imagePreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = itemData.imageData;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            imagePreview.appendChild(img);
            imagePreview.dataset.imageData = itemData.imageData;
            if (itemData.imagePath) {
              imagePreview.dataset.imagePath = itemData.imagePath;
            }
          }
          
          // 이름 복원
          if (nameInput && itemData.name) {
            nameInput.value = itemData.name;
          }
          
          // URL 복원
          if (urlInput && itemData.url) {
            urlInput.value = itemData.url;
          }
          
          // 설명 복원
          if (descInput && itemData.description) {
            descInput.value = itemData.description;
          }
        }
      });
      
      console.log(`✅ ${sectionId} 데이터 복원 완료: ${items.length}개`);
    }
  });
  
  console.log('✅ 즐겨찾기 데이터 로드 완료');
}

// 즐겨찾기 항목 추가
function addFavoriteItem(sectionId, sectionTitle, isFirst = false) {
  const itemsContainer = document.getElementById(`${sectionId}Container`);
  if (!itemsContainer) return;
  
  const currentCount = itemsContainer.querySelectorAll('.favorite-item').length;
  if (currentCount >= 20) {
    alert('각 섹션당 최대 20개까지 추가할 수 있습니다.');
    return;
  }
  
  const itemDiv = document.createElement('div');
  itemDiv.className = 'favorite-item';
  itemDiv.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 8px;
  `;
  
  // 이미지 업로드 영역 (90x90, 크롭 지원)
  const imageArea = document.createElement('div');
  imageArea.style.cssText = 'flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;';
  
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.className = 'favorite-image-input';
  imageInput.style.display = 'none';
  
  const imagePreview = document.createElement('div');
  imagePreview.className = 'favorite-image-preview';
  imagePreview.style.cssText = `
    width: 90px;
    height: 90px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    color: #999;
    text-align: center;
    overflow: hidden;
    position: relative;
  `;
  imagePreview.textContent = '이미지';
  imagePreview.onclick = () => imageInput.click();
  
  // 드래그앤드랍 지원
  imagePreview.ondragover = (e) => {
    e.preventDefault();
    imagePreview.style.borderColor = '#4CAF50';
    imagePreview.style.background = '#e8f5e9';
  };
  
  imagePreview.ondragleave = (e) => {
    e.preventDefault();
    imagePreview.style.borderColor = '#ccc';
    imagePreview.style.background = '#f0f0f0';
  };
  
  imagePreview.ondrop = (e) => {
    e.preventDefault();
    imagePreview.style.borderColor = '#ccc';
    imagePreview.style.background = '#f0f0f0';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFavoriteImageUpload(file, imagePreview, sectionId);
    }
  };
  
  imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFavoriteImageUpload(file, imagePreview, sectionId);
    }
  };
  
  // 이름 입력 필드
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'favorite-name';
  nameInput.placeholder = '이름';
  nameInput.style.cssText = `
    width: 90px;
    padding: 6px;
    font-size: 12px;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-family: 'WAGURI', sans-serif;
    text-align: center;
  `;
  
  imageArea.appendChild(imageInput);
  imageArea.appendChild(imagePreview);
  imageArea.appendChild(nameInput);
  
  // 입력 필드 영역
  const inputsArea = document.createElement('div');
  inputsArea.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 8px;';
  
  // 사이트 주소
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.className = 'favorite-url';
  urlInput.placeholder = '사이트 주소 (https://www.example.com)';
  urlInput.style.cssText = `
    padding: 10px;
    font-size: 14px;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-family: 'WAGURI', sans-serif;
  `;
  
  // 사이트 설명
  const descInput = document.createElement('textarea');
  descInput.className = 'favorite-description';
  descInput.placeholder = '사이트 설명글';
  descInput.rows = 2;
  descInput.style.cssText = `
    padding: 10px;
    font-size: 14px;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-family: 'WAGURI', sans-serif;
    resize: none;
  `;
  
  inputsArea.appendChild(urlInput);
  inputsArea.appendChild(descInput);
  
  // 삭제 버튼 (첫 번째 항목이 아닌 경우만)
  if (!isFirst) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.className = 'remove-favorite-btn';
    removeBtn.style.cssText = `
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    `;
    removeBtn.onclick = () => itemDiv.remove();
    itemDiv.appendChild(imageArea);
    itemDiv.appendChild(inputsArea);
    itemDiv.appendChild(removeBtn);
  } else {
    itemDiv.appendChild(imageArea);
    itemDiv.appendChild(inputsArea);
  }
  
  itemsContainer.appendChild(itemDiv);
  console.log(`✅ ${sectionTitle} 항목 추가됨`);
}

// 즐겨찾기 데이터 저장
function saveFavoritesData() {
  console.log('💾 즐겨찾기 데이터 저장 시작...');
  
  const favoritesData = {
    architects: collectFavoriteItems('architects'),
    planning: collectFavoriteItems('planning'),
    others: collectFavoriteItems('others')
  };
  
  console.log('수집된 즐겨찾기 데이터:', favoritesData);
  
  // IndexedDB에 저장
  const storageKey = 'favoritesData';
  localStorage.setItem(storageKey, JSON.stringify(favoritesData));
  
  alert('✅ 즐겨찾기 데이터가 저장되었습니다!');
  
  // 오버레이 닫기
  const overlay = document.getElementById('managerOverlay');
  if (overlay) overlay.remove();
  
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = false;
  }
}

// 즐겨찾기 이미지 업로드 핸들러
function handleFavoriteImageUpload(file, imagePreview, sectionId) {
  console.log('📷 즐겨찾기 이미지 업로드:', file.name);
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const imageData = event.target.result;
    
    // 크롭 에디터 표시
    if (typeof showImageCropEditor === 'function') {
      showImageCropEditor(imageData, file.name, (croppedData) => {
        // 크롭된 이미지 미리보기에 표시
        imagePreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = croppedData;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        imagePreview.appendChild(img);
        imagePreview.dataset.imageData = croppedData;
        imagePreview.dataset.imagePath = `favorites/${file.name}`;
        
        console.log('✅ 즐겨찾기 이미지 크롭 완료');
      }, 90, 90); // 90x90 크기
    } else {
      // 크롭 에디터 없으면 그냥 표시
      imagePreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = imageData;
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      imagePreview.appendChild(img);
      imagePreview.dataset.imageData = imageData;
      imagePreview.dataset.imagePath = `favorites/${file.name}`;
    }
  };
  reader.readAsDataURL(file);
}

// 즐겨찾기 항목 수집
function collectFavoriteItems(sectionId) {
  const items = [];
  const container = document.getElementById(`${sectionId}Container`);
  if (!container) return items;
  
  container.querySelectorAll('.favorite-item').forEach(item => {
    const imagePreview = item.querySelector('.favorite-image-preview');
    const nameInput = item.querySelector('.favorite-name');
    const urlInput = item.querySelector('.favorite-url');
    const descInput = item.querySelector('.favorite-description');
    
    const imageData = imagePreview?.dataset?.imageData || null;
    const imagePath = imagePreview?.dataset?.imagePath || null;
    const name = nameInput?.value || '';
    const url = urlInput?.value || '';
    const description = descInput?.value || '';
    
    if (url || description || imageData || name) {
      items.push({ 
        imageData, 
        imagePath, 
        name, 
        url, 
        description 
      });
    }
  });
  
  console.log(`${sectionId} 항목 수집:`, items.length, '개');
  return items;
}

// ==================== 데이터 내보내기 ====================

// IndexedDB 데이터를 projectsData.json으로 내보내기
async function exportProjectsDataJSON() {
  console.log('📥 projectsData.json 내보내기 시작...');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  try {
    // 메인, 캐비넷, 꿀단지 모든 아이콘 포함
    const mainIconIds = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07',
                         'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
    const cabinetIconIds = ['C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07',
                            'C10', 'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17',
                            'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27'];
    const trashIconIds = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07',
                          'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17',
                          'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T26', 'T27'];
    
    const allIconIds = [...mainIconIds, ...cabinetIconIds, ...trashIconIds];
    
    const projectsDataJSON = {};
    let exportCount = 0;
    let mainCount = 0, cabinetCount = 0, trashCount = 0;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 모든 프로젝트 데이터 수집
    for (const iconId of allIconIds) {
      const storageKey = `projectData_${iconId}`;
      
      if (typeof loadProjectFromDB === 'function') {
        const projectData = await loadProjectFromDB(storageKey);
        
        if (projectData) {
          projectsDataJSON[iconId] = projectData;
          exportCount++;
          
          // 타입별 카운트
          if (iconId.startsWith('M')) mainCount++;
          else if (iconId.startsWith('C')) cabinetCount++;
          else if (iconId.startsWith('T')) trashCount++;
          
          const type = iconId.startsWith('M') ? '메인' : iconId.startsWith('C') ? '캐비넷' : '꿀단지';
          console.log(`✅ ${iconId} (${type}): ${projectData.projectName?.text || iconId} 추출됨`);
          console.log(`   - Base64: ${projectData.mainImage ? '✅' : '❌'} / 경로: ${projectData.mainImagePath || '(없음)'}`);
          console.log(`   - 추가 이미지: ${projectData.additionalImages?.length || 0}개`);
        }
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (exportCount === 0) {
      alert('❌ 내보낼 프로젝트 데이터가 없습니다.');
      if (typeof isManagerOverlayOpen !== 'undefined') {
        isManagerOverlayOpen = false;
      }
      return;
    }
    
    // JSON 파일 생성 및 다운로드
    const jsonString = JSON.stringify(projectsDataJSON, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projectsData.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ projectsData.json 내보내기 완료: 총 ${exportCount}개 프로젝트`);
    console.log(`   메인: ${mainCount}개, 캐비넷: ${cabinetCount}개, 꿀단지: ${trashCount}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    alert(`✅ projectsData.json 파일 다운로드 완료!\n\n총 ${exportCount}개 프로젝트가 포함되었습니다.\n- 메인: ${mainCount}개\n- 캐비넷: ${cabinetCount}개\n- 꿀단지: ${trashCount}개\n\n📌 이 파일을 프로젝트 루트 폴더에 저장하고\nGitHub에 업로드하세요!`);
    
  } catch (error) {
    console.error('❌ 내보내기 오류:', error);
    alert('❌ 데이터 내보내기 중 오류가 발생했습니다.');
  }
  
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = false;
  }
}

// ==================== 프로젝트 폴더 자동 연동 UI ====================

// ==================== 폴더연동 기능 제거됨 ====================
// 사용자 요청으로 폴더연동 기능이 제거되었습니다.
// 내보내기 기능으로 대체되었습니다.

// ==================== 전광판 수정 UI ====================

function showMarqueeEditUI() {
  console.log('📰 전광판 수정 UI 표시');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  const overlay = createOverlay();
  const container = createPopupContainer('700px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;';
  const title = document.createElement('h2');
  title.textContent = '📰 전광판 텍스트 수정';
  title.style.cssText = 'margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;';
  header.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = '워크패드 상단에 흐르는 전광판 텍스트를 수정할 수 있습니다.';
  description.style.cssText = 'margin: 10px 0 0 0; color: #7f8c8d; font-size: 14px;';
  header.appendChild(description);
  
  container.appendChild(header);
  
  // 현재 텍스트 불러오기
  const currentText = localStorage.getItem('marqueeText') || "저희가 참여한 프로젝트의 이미지를 사용할 수 있게 허락해주신 선,후배 건축사님들께 감사의 말을 전합니다.  덕분에 홈페이지가 풍성해질 수 있었습니다 : )";
  
  // 폼
  const form = document.createElement('form');
  form.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';
  
  // 텍스트 입력 영역
  const inputGroup = document.createElement('div');
  inputGroup.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
  
  const label = document.createElement('label');
  label.textContent = '전광판 텍스트';
  label.style.cssText = 'font-size: 16px; font-weight: bold; color: #2c3e50;';
  
  const textarea = document.createElement('textarea');
  textarea.id = 'marqueeTextInput';
  textarea.value = currentText;
  textarea.rows = 4;
  textarea.style.cssText = `
    padding: 15px;
    font-size: 16px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-family: 'WAGURI', sans-serif;
    resize: vertical;
  `;
  textarea.placeholder = '전광판에 표시할 텍스트를 입력하세요...';
  
  const charCount = document.createElement('div');
  charCount.id = 'charCount';
  charCount.textContent = `${currentText.length} 글자`;
  charCount.style.cssText = 'text-align: right; color: #7f8c8d; font-size: 14px;';
  
  textarea.oninput = () => {
    charCount.textContent = `${textarea.value.length} 글자`;
  };
  
  inputGroup.appendChild(label);
  inputGroup.appendChild(textarea);
  inputGroup.appendChild(charCount);
  
  form.appendChild(inputGroup);
  
  // 미리보기
  const previewGroup = document.createElement('div');
  previewGroup.style.cssText = `
    padding: 15px;
    background: #2c3e50;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    height: 60px;
  `;
  
  const previewLabel = document.createElement('div');
  previewLabel.textContent = '미리보기';
  previewLabel.style.cssText = `
    position: absolute;
    top: 5px;
    left: 10px;
    font-size: 12px;
    color: #95a5a6;
  `;
  
  const previewText = document.createElement('div');
  previewText.id = 'marqueePreview';
  previewText.textContent = currentText;
  previewText.style.cssText = `
    position: absolute;
    white-space: nowrap;
    font-size: 20px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-family: 'WAGURI', sans-serif;
    top: 50%;
    transform: translateY(-50%);
    animation: marqueePreviewScroll 15s linear infinite;
  `;
  
  // CSS 애니메이션 추가
  if (!document.getElementById('marqueePreviewStyle')) {
    const style = document.createElement('style');
    style.id = 'marqueePreviewStyle';
    style.textContent = `
      @keyframes marqueePreviewScroll {
        0% { left: 100%; }
        100% { left: -100%; }
      }
    `;
    document.head.appendChild(style);
  }
  
  textarea.oninput = () => {
    charCount.textContent = `${textarea.value.length} 글자`;
    previewText.textContent = textarea.value;
  };
  
  previewGroup.appendChild(previewLabel);
  previewGroup.appendChild(previewText);
  form.appendChild(previewGroup);
  
  // 버튼 그룹
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '❌ 취소';
  cancelBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  cancelBtn.onmouseenter = () => cancelBtn.style.background = '#7f8c8d';
  cancelBtn.onmouseleave = () => cancelBtn.style.background = '#95a5a6';
  cancelBtn.onclick = () => {
    console.log('❌ 전광판 수정 취소');
    overlay.remove();
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = '💾 저장';
  saveBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  saveBtn.onmouseenter = () => saveBtn.style.opacity = '0.9';
  saveBtn.onmouseleave = () => saveBtn.style.opacity = '1';
  
  // 저장 함수
  const handleSave = () => {
    const newText = textarea.value.trim();
    
    console.log('📰 전광판 저장 시도:', newText);
    console.log('📰 버튼 클릭 감지됨');
    
    if (!newText) {
      alert('⚠️ 전광판 텍스트를 입력해주세요.');
      return false;
    }
    
    // script.js의 updateMarqueeText 함수 호출
    if (typeof updateMarqueeText === 'function') {
      console.log('📰 updateMarqueeText 함수 호출');
      updateMarqueeText(newText);
      alert('✅ 전광판 텍스트가 저장되었습니다!');
    } else {
      console.error('❌ updateMarqueeText 함수를 찾을 수 없습니다!');
      alert('❌ 오류: 전광판 업데이트 함수를 찾을 수 없습니다.');
      return false;
    }
    
    overlay.remove();
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
    return true;
  };
  
  // 폼 제출 이벤트
  form.onsubmit = (e) => {
    e.preventDefault();
    console.log('📰 폼 제출 이벤트 발생');
    handleSave();
  };
  
  // 저장 버튼 직접 클릭 이벤트 (추가 보험)
  saveBtn.onclick = (e) => {
    e.preventDefault();
    console.log('📰 저장 버튼 클릭 이벤트 발생');
    handleSave();
  };
  
  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(saveBtn);
  
  // 버튼 그룹을 폼 안에 추가
  form.appendChild(btnGroup);
  
  container.appendChild(form);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // 입력창 포커스
  setTimeout(() => textarea.focus(), 100);
}

// ==================== 프로젝트 이동하기 UI ====================

function showProjectMoveUI() {
  console.log('🔄 프로젝트 이동하기 UI 표시');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  const overlay = createOverlay();
  const container = createPopupContainer('700px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; text-align: center;';
  header.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
    <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">프로젝트 이동하기</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">프로젝트를 다른 위치로 이동합니다 (원본은 삭제됨)</p>
  `;
  
  // 폼
  const form = document.createElement('form');
  form.style.cssText = 'display: flex; flex-direction: column; gap: 25px;';
  
  // 출발지 섹션
  const sourceSection = document.createElement('div');
  sourceSection.style.cssText = 'padding: 20px; background: #e3f2fd; border-radius: 12px; border: 2px solid #2196f3;';
  sourceSection.innerHTML = `
    <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #1976d2;">
      📤 출발지 (이동할 프로젝트)
    </div>
    <div style="display: flex; gap: 15px; align-items: flex-end;">
      <div style="flex: 1;">
        <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #424242;">위치 선택</label>
        <select id="sourceLocation" style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #2196f3;
          border-radius: 8px;
          font-family: 'WAGURI', sans-serif;
          background: white;
          font-weight: 600;
        ">
          <option value="main">메인화면</option>
          <option value="cabinet">캐비넷</option>
          <option value="trash">꿀단지</option>
          <option value="favorites">즐겨찾기</option>
          <option value="park">공원</option>
          <option value="yong">용</option>
        </select>
      </div>
      <div style="flex: 1;">
        <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #424242;">그리드 번호</label>
        <input type="text" id="sourceGrid" placeholder="예: 00, 01, 10, 14" style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #2196f3;
          border-radius: 8px;
          font-family: 'WAGURI', sans-serif;
          text-align: center;
          font-weight: 600;
        ">
      </div>
    </div>
    <div id="sourcePreview" style="
      margin-top: 12px;
      padding: 10px;
      background: white;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      color: #1976d2;
      font-size: 14px;
    ">
      선택된 출발지: 메인화면00
    </div>
  `;
  
  // 화살표
  const arrowSection = document.createElement('div');
  arrowSection.style.cssText = 'text-align: center; font-size: 36px; color: #f093fb;';
  arrowSection.textContent = '⬇️';
  
  // 도착지 섹션
  const destSection = document.createElement('div');
  destSection.style.cssText = 'padding: 20px; background: #f3e5f5; border-radius: 12px; border: 2px solid #9c27b0;';
  destSection.innerHTML = `
    <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #7b1fa2;">
      📥 도착지 (이동될 위치)
    </div>
    <div style="display: flex; gap: 15px; align-items: flex-end;">
      <div style="flex: 1;">
        <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #424242;">위치 선택</label>
        <select id="destLocation" style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #9c27b0;
          border-radius: 8px;
          font-family: 'WAGURI', sans-serif;
          background: white;
          font-weight: 600;
        ">
          <option value="main">메인화면</option>
          <option value="cabinet">캐비넷</option>
          <option value="trash">꿀단지</option>
          <option value="favorites">즐겨찾기</option>
          <option value="park">공원</option>
          <option value="yong">용</option>
        </select>
      </div>
    </div>
    <div id="destPreview" style="
      margin-top: 12px;
      padding: 10px;
      background: white;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      color: #7b1fa2;
      font-size: 14px;
    ">
      선택된 도착지: 메인화면 (빈 자리 자동 배정)
    </div>
  `;
  
  // 버튼 그룹
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '❌ 취소';
  cancelBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  cancelBtn.onclick = () => {
    overlay.remove();
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  const moveBtn = document.createElement('button');
  moveBtn.type = 'submit';
  moveBtn.textContent = '🔄 이동';
  moveBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    await handleProjectMove();
  };
  
  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(moveBtn);
  
  form.appendChild(sourceSection);
  form.appendChild(arrowSection);
  form.appendChild(destSection);
  form.appendChild(btnGroup);
  
  container.appendChild(header);
  container.appendChild(form);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // 이벤트 리스너
  setTimeout(() => {
    const sourceLocationSelect = document.getElementById('sourceLocation');
    const sourceGridInput = document.getElementById('sourceGrid');
    const destLocationSelect = document.getElementById('destLocation');
    const sourcePreview = document.getElementById('sourcePreview');
    const destPreview = document.getElementById('destPreview');
    
    const updateSourcePreview = () => {
      const location = sourceLocationSelect.value;
      const grid = sourceGridInput.value || '00';
      const locationNames = { main: '메인화면', cabinet: '캐비넷', trash: '꿀단지', favorites: '즐겨찾기', park: '공원', yong: '용' };
      sourcePreview.textContent = `선택된 출발지: ${locationNames[location]}${grid}`;
    };
    
    const updateDestPreview = () => {
      const location = destLocationSelect.value;
      const locationNames = { main: '메인화면', cabinet: '캐비넷', trash: '꿀단지', favorites: '즐겨찾기', park: '공원', yong: '용' };
      destPreview.textContent = `선택된 도착지: ${locationNames[location]} (빈 자리 자동 배정)`;
    };
    
    sourceLocationSelect.addEventListener('change', updateSourcePreview);
    sourceGridInput.addEventListener('input', updateSourcePreview);
    destLocationSelect.addEventListener('change', updateDestPreview);
    
    sourceGridInput.focus();
  }, 100);
  
  // 이동 처리 함수
  async function handleProjectMove() {
    const sourceLocation = document.getElementById('sourceLocation').value;
    const sourceGrid = document.getElementById('sourceGrid').value.trim();
    const destLocation = document.getElementById('destLocation').value;
    
    if (!sourceGrid) {
      alert('❌ 출발지 그리드 번호를 입력해주세요.');
      return;
    }
    
    if (sourceLocation === destLocation) {
      alert('❌ 출발지와 도착지가 같을 수 없습니다.');
      return;
    }
    
    console.log('🔄 프로젝트 이동 시작:', { sourceLocation, sourceGrid, destLocation });
    
    // 출발지 아이콘 ID 생성
    const locationPrefixes = { main: 'M', cabinet: 'C', trash: 'T' };
    const sourcePrefix = locationPrefixes[sourceLocation];
    const sourceIconId = `${sourcePrefix}${sourceGrid}`;
    
    // 출발지 데이터 로드
    const sourceKey = `projectData_${sourceIconId}`;
    let sourceData = null;
    
    if (typeof loadProjectFromDB === 'function') {
      sourceData = await loadProjectFromDB(sourceKey);
    }
    
    if (!sourceData) {
      alert(`❌ ${sourceIconId}에 프로젝트가 없습니다.`);
      return;
    }
    
    console.log(`✅ ${sourceIconId} 데이터 로드 완료:`, sourceData.projectName?.text);
    
    // 도착지에서 빈 자리 찾기
    const destPrefix = locationPrefixes[destLocation];
    const destIconId = await findEmptySlot(destPrefix);
    
    if (!destIconId) {
      alert(`❌ ${destLocation}에 빈 자리가 없습니다.`);
      return;
    }
    
    console.log(`📍 도착지 빈 자리 발견: ${destIconId}`);
    
    // 도착지로 데이터 복사
    const destKey = `projectData_${destIconId}`;
    const destData = {
      ...sourceData,
      iconId: destIconId,
      gridPosition: {
        row: parseInt(destIconId.substring(2)),
        col: parseInt(destIconId.substring(1, 2))
      }
    };
    
    if (typeof saveProjectToDB === 'function') {
      await saveProjectToDB(destKey, destData);
      console.log(`✅ ${destIconId}로 데이터 저장 완료`);
      
      // 저장 검증
      const verifyData = await loadProjectFromDB(destKey);
      if (verifyData) {
        console.log(`✅ 저장 검증 성공: ${destIconId}`, verifyData.projectName?.text);
        
        // 도착지 아이콘 이미지 업데이트만 (표시는 모드 전환 시에만)
        if (typeof updateIconImage === 'function') {
          await updateIconImage(destIconId, destData);
          console.log(`✅ ${destIconId} 도착지 아이콘 이미지 업데이트 완료`);
          
          // 도착지가 메인화면이면 표시, 캐비넷/꿀단지면 숨김 유지
          const destIcon = document.querySelector(`.icon-wrapper[data-id="${destIconId}"]`);
          if (destIcon && destIconId.startsWith('M')) {
            destIcon.style.display = 'flex';
            destIcon.style.visibility = 'visible';
            destIcon.style.opacity = '1';
            console.log(`✅ ${destIconId} 메인 아이콘 표시`);
          } else if (destIcon) {
            destIcon.style.display = 'none';
            destIcon.style.visibility = 'hidden';
            destIcon.style.opacity = '0';
            console.log(`✅ ${destIconId} 캐비넷/꿀단지 아이콘 숨김 유지`);
          }
        }
      } else {
        console.error(`❌ 저장 검증 실패: ${destIconId}`);
        alert(`❌ 저장에 실패했습니다. 다시 시도해주세요.`);
        return;
      }
    }
    
    // 출발지 데이터 삭제
    if (typeof deleteProjectFromDB === 'function') {
      await deleteProjectFromDB(sourceKey);
      console.log(`🗑️ ${sourceIconId} 데이터 삭제 완료`);
    }
    
    // 프로젝트 목록 업데이트
    if (typeof updateProjectList === 'function') {
      updateProjectList(destIconId);
    }
    let projectList = JSON.parse(localStorage.getItem('projectList') || '[]');
    projectList = projectList.filter(id => id !== sourceIconId);
    localStorage.setItem('projectList', JSON.stringify(projectList));
    
    // 출발지 아이콘 초기화
    const sourceIcon = document.querySelector(`.icon-wrapper[data-id="${sourceIconId}"]`);
    if (sourceIcon) {
      const iconImg = sourceIcon.querySelector('.icon-image');
      const iconLabel = sourceIcon.querySelector('.icon-label');
      if (iconImg) iconImg.src = 'images/icon.png';
      if (iconLabel) {
        const locationNames = { M: '메인화면', C: '캐비넷', T: '꿀단지' };
        iconLabel.textContent = `${locationNames[sourcePrefix]}${sourceGrid}`;
      }
      sourceIcon.style.display = 'none';
    }
    
    // 성공 메시지
    overlay.remove();
    
    const locationNames = { M: '메인화면', C: '캐비넷', T: '꿀단지' };
    const destLocationName = locationNames[destPrefix];
    
    alert(`✅ 프로젝트 이동 완료!\n\n${sourceIconId} → ${destIconId}\n\n💡 ${destLocationName}에 저장되었습니다.\n관리자 → 생성/수정하기 → ${destLocationName}에서 확인할 수 있습니다.`);
    
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
    
    // 페이지 새로고침
    setTimeout(() => location.reload(), 1000);
  }
  
  // 빈 자리 찾기 함수
  async function findEmptySlot(prefix) {
    // 0,0 ~ 0,7, 1,0 ~ 1,7 순서로 검색
    const slots = [];
    for (let col = 0; col <= 1; col++) {
      for (let row = 0; row <= 7; row++) {
        slots.push(`${prefix}${col}${row}`);
      }
    }
    
    for (const slotId of slots) {
      const key = `projectData_${slotId}`;
      let data = null;
      
      if (typeof loadProjectFromDB === 'function') {
        data = await loadProjectFromDB(key);
      }
      
      if (!data) {
        return slotId; // 빈 자리 발견
      }
    }
    
    return null; // 빈 자리 없음
  }
}

// ==================== 데이터 확인 UI ====================

async function showProjectDataViewer() {
  console.log('🔍 데이터 확인 UI 표시');
  
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
  }
  
  const overlay = createOverlay();
  const container = createPopupContainer('900px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; text-align: center;';
  header.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
    <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">저장된 프로젝트 데이터 확인</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">메인화면, 캐비넷, 꿀단지에 저장된 프로젝트 목록</p>
  `;
  
  // 로딩 메시지
  const loadingMsg = document.createElement('div');
  loadingMsg.style.cssText = 'text-align: center; padding: 40px; font-size: 18px; color: #7f8c8d;';
  loadingMsg.textContent = '데이터를 불러오는 중...';
  
  container.appendChild(header);
  container.appendChild(loadingMsg);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // 데이터 로드
  const locations = [
    { name: '메인화면', prefix: 'M', color: '#3498db' },
    { name: '캐비넷', prefix: 'C', color: '#9b59b6' },
    { name: '꿀단지', prefix: 'T', color: '#95a5a6' }
  ];
  
  const allData = {};
  
  for (const location of locations) {
    allData[location.name] = [];
    
    for (let col = 0; col <= 2; col++) {
      for (let row = 0; row <= 7; row++) {
        const iconId = `${location.prefix}${col}${row}`;
        const key = `projectData_${iconId}`;
        
        if (typeof loadProjectFromDB === 'function') {
          const data = await loadProjectFromDB(key);
          if (data) {
            allData[location.name].push({
              iconId,
              projectName: data.projectName?.text || '(이름 없음)',
              startYear: data.projectName?.startYear || '',
              usage: data.usage?.text || ''
            });
          }
        }
      }
    }
  }
  
  // 결과 표시
  loadingMsg.remove();
  
  const resultContainer = document.createElement('div');
  resultContainer.style.cssText = 'max-height: 60vh; overflow-y: auto; padding: 20px;';
  
  locations.forEach(location => {
    const locationSection = document.createElement('div');
    locationSection.style.cssText = `margin-bottom: 30px; padding: 20px; background: ${location.color}15; border-radius: 12px; border: 2px solid ${location.color}40;`;
    
    const locationTitle = document.createElement('div');
    locationTitle.style.cssText = `font-size: 20px; font-weight: bold; color: ${location.color}; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid ${location.color};`;
    locationTitle.textContent = `${location.name} (${allData[location.name].length}개 프로젝트)`;
    
    locationSection.appendChild(locationTitle);
    
    if (allData[location.name].length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #7f8c8d; font-style: italic;';
      emptyMsg.textContent = '저장된 프로젝트가 없습니다.';
      locationSection.appendChild(emptyMsg);
    } else {
      const projectList = document.createElement('div');
      projectList.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;';
      
      allData[location.name].forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.style.cssText = `
          padding: 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid ${location.color}40;
        `;
        projectCard.innerHTML = `
          <div style="font-weight: bold; color: ${location.color}; margin-bottom: 5px;">${project.iconId}</div>
          <div style="font-size: 14px; color: #2c3e50; margin-bottom: 3px;">${project.projectName}</div>
          <div style="font-size: 12px; color: #7f8c8d;">${project.startYear ? `📅 ${project.startYear}` : ''} ${project.usage ? `🏢 ${project.usage}` : ''}</div>
        `;
        projectList.appendChild(projectCard);
      });
      
      locationSection.appendChild(projectList);
    }
    
    resultContainer.appendChild(locationSection);
  });
  
  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '닫기';
  closeBtn.style.cssText = `
    width: 100%;
    padding: 14px;
    background: #95a5a6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    margin-top: 20px;
  `;
  closeBtn.onclick = () => {
    overlay.remove();
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  container.appendChild(resultContainer);
  container.appendChild(closeBtn);
}

console.log('%c✅ 관리자 UI 모듈 로드됨 (Pure DOM)', 'color: #667eea; font-weight: bold; font-size: 14px;');
