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
  console.log('관리자 모드 UI 표시');
  
  // 기존 스크린 내부 콘텐츠 제거
  if (typeof clearAllScreenIcons === 'function') {
    clearAllScreenIcons();
  }
  
  // 기존 오버레이 제거
  const existingOverlay = document.getElementById('managerOverlay');
  if (existingOverlay) existingOverlay.remove();
  
  // 오버레이 생성
  const overlay = createOverlay();
  const container = createPopupContainer('600px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;';
  header.innerHTML = `
    <div style="font-size: 36px; margin-bottom: 10px;">⚙️</div>
    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #2c3e50;">관리자 모드</h1>
    <p style="color: #7f8c8d; font-size: 16px; margin-top: 10px;">홈페이지의 콘텐츠를 생성, 수정, 삭제할 수 있습니다.</p>
  `;
  
  // 버튼 그리드
  const buttonGrid = document.createElement('div');
  buttonGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;';
  
  const actions = [
    { text: '생성하기', action: 'create', icon: '➕', color: '#667eea', desc: '새 프로젝트 추가' },
    { text: '수정하기', action: 'edit', icon: '✏️', color: '#f093fb', desc: '프로젝트 편집' },
    { text: '삭제하기', action: 'delete', icon: '🗑️', color: '#fa709a', desc: '프로젝트 제거' }
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
      showLocationSelectUI(actionInfo.action, actionInfo.text);
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
  closeBtn.onclick = () => overlay.remove();
  
  container.appendChild(header);
  container.appendChild(buttonGrid);
  container.appendChild(closeBtn);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

// 위치 선택 UI
function showLocationSelectUI(action, actionText) {
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
    { text: '장독대', id: 'trash', icon: '🗑️', color: '#95a5a6' }
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
        if (action === 'delete') {
          showMainScreenDeleteUI();
        } else {
          showMainScreenForm(action);
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
  closeButton.onclick = () => overlay.remove();
  
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
  
  // 기존 오버레이 제거
  const existingOverlay = document.getElementById('managerOverlay');
  if (existingOverlay) existingOverlay.remove();
  
  // 오버레이 생성
  const overlay = createOverlay();
  const container = createPopupContainer('500px');
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; text-align: center;';
  header.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 10px;">🗑️</div>
    <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">프로젝트 삭제하기</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">삭제할 프로젝트의 생성 위치를 선택하세요</p>
  `;
  
  // 생성 위치 입력 섹션
  const positionSection = document.createElement('div');
  positionSection.style.cssText = 'margin-bottom: 25px;';
  
  const positionLabel = document.createElement('div');
  positionLabel.style.cssText = 'font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #2c3e50;';
  positionLabel.textContent = '생성 위치';
  
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
      <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #555;">열 (0-1)</label>
      <input id="deleteGridCol" type="number" min="0" max="1" value="0"
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
  preview.textContent = '선택된 위치: 메인화면0,0';
  
  // 행/열 변경 시 미리보기 업데이트
  const updateDeletePreview = () => {
    const rowInput = document.getElementById('deleteGridRow');
    const colInput = document.getElementById('deleteGridCol');
    const row = parseInt(rowInput.value) || 0;
    const col = parseInt(colInput.value) || 0;
    preview.textContent = `선택된 위치: 메인화면${col},${row}`;
  };
  
  positionSection.appendChild(positionLabel);
  positionSection.appendChild(positionInputs);
  positionSection.appendChild(preview);
  
  // 이벤트 리스너
  setTimeout(() => {
    document.getElementById('deleteGridRow').addEventListener('input', updateDeletePreview);
    document.getElementById('deleteGridCol').addEventListener('input', updateDeletePreview);
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
  deleteBtn.onclick = () => {
    const rowInput = document.getElementById('deleteGridRow');
    const colInput = document.getElementById('deleteGridCol');
    const row = parseInt(rowInput.value) || 0;
    const col = parseInt(colInput.value) || 0;
    
    // 확인 대화상자
    showDeleteConfirmation(row, col, overlay);
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
function showDeleteConfirmation(row, col, parentOverlay) {
  const iconId = `M${col}${row}`;
  const storageKey = `projectData_${iconId}`;
  
  // 프로젝트 데이터 확인
  const projectData = localStorage.getItem(storageKey);
  
  if (!projectData) {
    alert(`메인화면${col},${row}에 저장된 프로젝트가 없습니다.`);
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
      <strong style="color: #e74c3c;">메인화면${col},${row}</strong>의 프로젝트 데이터가<br>
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
        <strong style="color: #27ae60;">메인화면${col},${row}</strong>의 프로젝트가<br>
        성공적으로 삭제되었습니다.
      </p>
      <button onclick="this.parentElement.parentElement.parentElement.remove(); showManagerUI();"
        style="
          width: 100%;
          padding: 14px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
        ">확인</button>
    `;
    
    successOverlay.appendChild(successBox);
    document.body.appendChild(successOverlay);
  };
  
  btnGroup.appendChild(noBtn);
  btnGroup.appendChild(yesBtn);
  confirmBox.appendChild(btnGroup);
  confirmOverlay.appendChild(confirmBox);
  document.body.appendChild(confirmOverlay);
}

console.log('%c✅ 관리자 UI 모듈 로드됨 (Pure DOM)', 'color: #667eea; font-weight: bold; font-size: 14px;');
