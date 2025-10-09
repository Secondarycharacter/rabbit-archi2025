// ==================== 메인화면 데이터 입력 폼 ====================

// ==================== IndexedDB 헬퍼 ====================
const DB_NAME = 'HomepageProjectDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

// IndexedDB 초기화
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// 프로젝트 데이터 저장 (IndexedDB)
async function saveProjectToDB(projectId, projectData) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      id: projectId,
      data: projectData,
      timestamp: Date.now()
    };
    
    store.put(data);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ IndexedDB에 저장 완료: ${projectId}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('IndexedDB 저장 오류:', error);
    throw error;
  }
}

// 프로젝트 데이터 로드 (IndexedDB)
async function loadProjectFromDB(projectId) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(projectId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          console.log(`✅ IndexedDB에서 로드 완료: ${projectId}`);
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB 로드 오류:', error);
    return null;
  }
}

// 프로젝트 데이터 삭제 (IndexedDB)
async function deleteProjectFromDB(projectId) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.delete(projectId);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`✅ IndexedDB에서 삭제 완료: ${projectId}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('IndexedDB 삭제 오류:', error);
    throw error;
  }
}

// 메인화면 프로젝트 데이터 저장소
let mainScreenData = {
  gridPosition: { row: 0, col: 0 }, // 생성 위치
  designOverview: { color: '#ffffff' },  // 설계개요 색상만 저장
  projectName: { text: '', color: '#000000', startYear: '', endYear: '' },
  usage: { text: '', color: '#000000' },
  location: { text: '', color: '#000000' },
  buildingArea: { text: '', color: '#000000' },
  totalArea: { text: '', color: '#000000' },
  designers: [],
  staff: [],
  mainImage: null,
  additionalImages: []
};

// 색상 선택기 인스턴스 저장
let colorPickers = [];

// 메인화면 데이터 입력 폼 표시
function showMainScreenForm(action) {
  const actionText = {
    'create': '프로젝트 생성하기',
    'edit': '프로젝트 수정하기',
    'delete': '프로젝트 삭제하기'
  }[action] || '프로젝트 관리';
  
  // 기존 데이터 로드 (수정 모드인 경우)
  if (action === 'edit') {
    loadMainScreenData();
  }
  
  // 오버레이 생성
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
  
  // 컨테이너
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border-radius: 15px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    width: 900px;
    max-height: 85vh;
    overflow-y: auto;
  `;
  
  // 헤더
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; text-align: center;';
  header.innerHTML = `
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">🏠 메인화면 ${actionText}</h1>
  `;
  
  // 폼 컨텐츠
  const formContent = document.createElement('div');
  formContent.innerHTML = generateMainScreenFormHTML();
  
  // 하단 버튼
  const footerBtns = document.createElement('div');
  footerBtns.style.cssText = 'display: flex; gap: 10px; margin-top: 25px; padding-top: 20px; border-top: 2px solid #e0e0e0;';
  
  const saveBtn = document.createElement('button');
  saveBtn.innerHTML = '💾 저장';
  saveBtn.style.cssText = `
    flex: 2;
    padding: 14px;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.2s ease;
  `;
  saveBtn.onmouseenter = () => saveBtn.style.background = '#229954';
  saveBtn.onmouseleave = () => saveBtn.style.background = '#27ae60';
  saveBtn.onclick = () => {
    console.log('저장 버튼 클릭됨');
    const result = validateAndSaveForm();
    console.log('저장 결과:', result);
    
    if (result) {
      // 저장 성공 메시지
      const successMsg = document.createElement('div');
      successMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 11000;
        background: #27ae60;
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      `;
      successMsg.textContent = '✅ 저장 완료!';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        successMsg.remove();
        overlay.remove();
        
        // 저장 후 모든 메인 아이콘 이미지 업데이트
        if (typeof updateAllMainIconImages === 'function') {
          updateAllMainIconImages();
        }
      }, 1500);
    }
  };
  
  const backBtn = document.createElement('button');
  backBtn.textContent = '← 뒤로';
  backBtn.style.cssText = `
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
  backBtn.onclick = () => {
    overlay.remove();
    showLocationSelectUI(action, actionText);
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ 닫기';
  closeBtn.style.cssText = `
    flex: 1;
    padding: 14px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
  `;
  closeBtn.onclick = () => overlay.remove();
  
  footerBtns.appendChild(saveBtn);
  footerBtns.appendChild(backBtn);
  footerBtns.appendChild(closeBtn);
  
  container.appendChild(header);
  container.appendChild(formContent);
  container.appendChild(footerBtns);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // 핸들러 초기화
  initializeFormHandlers();
}

// 폼 HTML 생성
function generateMainScreenFormHTML() {
  return `
    <div class="mainscreen-form" style="
      font-family: 'WAGURI', sans-serif;
      text-align: left;
      max-height: 60vh;
      overflow-y: auto;
      padding: 20px;
    ">
      <!-- 생성 위치 선택 -->
      <div class="form-section" style="margin-bottom: 30px; background: #e3f2fd; padding: 20px; border-radius: 12px; border: 2px solid #2196f3;">
        <label style="font-size: 20px; font-weight: bold; display: block; margin-bottom: 15px; color: #1976d2;">
          📍 생성 위치 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="flex: 1;">
            <label style="font-size: 14px; font-weight: 600; display: block; margin-bottom: 5px; color: #424242;">행 (Row)</label>
            <input type="number" id="gridRow" min="0" max="17" value="0" required
              placeholder="0-17"
              style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #2196f3; border-radius: 8px; font-family: 'WAGURI', sans-serif; text-align: center; font-weight: bold;">
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #2196f3; padding-top: 20px;">,</div>
          <div style="flex: 1;">
            <label style="font-size: 14px; font-weight: 600; display: block; margin-bottom: 5px; color: #424242;">열 (Column)</label>
            <input type="number" id="gridCol" min="0" max="1" value="0" required
              placeholder="0-1"
              style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #2196f3; border-radius: 8px; font-family: 'WAGURI', sans-serif; text-align: center; font-weight: bold;">
          </div>
          <button id="loadDataBtn" type="button" style="
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
            margin-left: 15px;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
            📂 불러오기
          </button>
        </div>
        <div id="gridPositionPreview" style="
          margin-top: 12px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          text-align: center;
          font-weight: bold;
          color: #1976d2;
          font-size: 16px;
        ">
          → 연동 아이콘: <span id="targetIconLabel">메인화면00</span>
        </div>
        <small style="display: block; margin-top: 8px; color: #666; text-align: center;">
          * 행: 0-7 (첫번째 열), 10-17 (두번째 열) / 열: 0 (왼쪽), 1 (오른쪽)
        </small>
      </div>

      <!-- 설계개요 (고정 텍스트, 색상 선택 가능) -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <div style="display: flex; gap: 10px; align-items: center;">
          <label style="font-size: 24px; font-weight: bold; display: block; color: #2c3e50; flex: 1;">
            설계개요
          </label>
          <div class="color-picker-btn" data-target="designOverview" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
      </div>

      <!-- 사업명 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          사업명 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
          <input type="text" id="projectName" class="form-input" required
            placeholder="사업명을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="projectName" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="startYear" placeholder="설계년도"
            style="width: 150px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <span style="font-weight: bold;">~</span>
          <input type="text" id="endYear" placeholder="준공년도"
            style="width: 150px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
        </div>
      </div>

      <!-- 주용도 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          주용도 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="usage" class="form-input" required
            placeholder="주용도를 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="usage" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
      </div>

      <!-- 대지위치 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          대지위치 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="siteLocation" class="form-input" required
            placeholder="대지위치를 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="siteLocation" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
      </div>

      <!-- 건축면적 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          건축면적 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="buildingArea" class="form-input" required
            placeholder="건축면적을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="buildingArea" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
      </div>

      <!-- 연면적 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          연면적 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="totalArea" class="form-input" required
            placeholder="연면적을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="totalArea" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white;">
          </div>
        </div>
      </div>

      <!-- 설계자 -->
      <div class="form-section" style="margin-bottom: 25px;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          설계자 <span style="color: red;">*</span>
        </label>
        <div id="designersContainer">
          ${generateDesignerRow(0, true)}
        </div>
        <button type="button" id="addDesignerBtn" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        ">+ 설계자 추가 (최대 10명)</button>
      </div>

      <!-- 담당업무 -->
      <div class="form-section" style="margin-bottom: 25px;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          담당업무 <span style="color: red;">*</span>
        </label>
        <div id="staffContainer">
          ${generateStaffRow(0, true)}
        </div>
        <button type="button" id="addStaffBtn" style="
          margin-top: 10px;
          padding: 8px 16px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        ">+ 담당자 추가 (최대 5명)</button>
      </div>

      <!-- 이미지 업로드 -->
      <div class="form-section" style="margin-bottom: 25px;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 15px; color: #2c3e50;">
          이미지 업로드
        </label>
        
        <!-- 대표 이미지 -->
        <div style="margin-bottom: 20px;">
          <label style="font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; color: #34495e;">
            대표 이미지 <span style="color: red;">*</span>
          </label>
          <div id="mainImageDropzone" style="
            border: 3px dashed #3498db;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            background: #f8f9fa;
            transition: all 0.3s ease;
          ">
            <div style="color: #7f8c8d; font-size: 16px;">
              대표 이미지를 드래그하거나 클릭하여 업로드
              <br><small>(1개만 업로드 가능)</small>
            </div>
          </div>
          <div id="mainImagePreview" style="margin-top: 15px;"></div>
        </div>
        
        <!-- 추가 이미지 -->
        <div>
          <label style="font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; color: #34495e;">
            추가 이미지
          </label>
          <div id="additionalImagesDropzone" style="
            border: 3px dashed #9b59b6;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            background: #f8f9fa;
            transition: all 0.3s ease;
          ">
            <div style="color: #7f8c8d; font-size: 16px;">
              추가 이미지를 드래그하거나 클릭하여 업로드
              <br><small>(여러 개 업로드 가능, 파일명 순서로 정렬)</small>
            </div>
          </div>
          <div id="additionalImagesPreview" style="margin-top: 15px;"></div>
        </div>
      </div>
    </div>
  `;
}

// 설계자 행 생성
function generateDesignerRow(index, required = false) {
  const req = required ? '<span style="color: red;">*</span>' : '';
  return `
    <div class="designer-row" data-index="${index}" style="
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    ">
      <input type="text" class="designer-field" placeholder="분야" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="designer-office" placeholder="사무소명" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <div class="color-picker-btn" data-target="designer${index}" 
        style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white;">
      </div>
      ${!required ? `<button type="button" class="remove-designer-btn" style="
        padding: 8px 12px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">삭제</button>` : ''}
    </div>
  `;
}

// 담당자 행 생성
function generateStaffRow(index, required = false) {
  const req = required ? '<span style="color: red;">*</span>' : '';
  return `
    <div class="staff-row" data-index="${index}" style="
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    ">
      <input type="text" class="staff-name" placeholder="이름" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="staff-position" placeholder="직위" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="staff-role" placeholder="담당업무" ${required ? 'required' : ''}
        style="flex: 2; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <div class="color-picker-btn" data-target="staff${index}" 
        style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white;">
      </div>
      ${!required ? `<button type="button" class="remove-staff-btn" style="
        padding: 8px 12px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">삭제</button>` : ''}
    </div>
  `;
}

// 폼 핸들러 초기화
function initializeFormHandlers() {
  // 생성 위치 입력 이벤트
  const gridRowInput = document.getElementById('gridRow');
  const gridColInput = document.getElementById('gridCol');
  const targetIconLabel = document.getElementById('targetIconLabel');
  
  function updateTargetIcon() {
    const row = parseInt(gridRowInput.value) || 0;
    const col = parseInt(gridColInput.value) || 0;
    
    // 유효성 검사
    if (col === 0) {
      // 첫 번째 열: 0-7만 가능
      if (row < 0 || row > 7) {
        gridRowInput.value = 0;
      }
      targetIconLabel.textContent = `메인화면0${row}`;
    } else if (col === 1) {
      // 두 번째 열: 0-7만 가능 (표시는 10-17)
      if (row < 0 || row > 7) {
        gridRowInput.value = 0;
      }
      targetIconLabel.textContent = `메인화면1${row}`;
    } else {
      gridColInput.value = 0;
      targetIconLabel.textContent = `메인화면0${row}`;
    }
  }
  
  gridRowInput.addEventListener('input', updateTargetIcon);
  gridColInput.addEventListener('input', updateTargetIcon);
  gridRowInput.addEventListener('change', updateTargetIcon);
  gridColInput.addEventListener('change', updateTargetIcon);
  updateTargetIcon();
  
  // 불러오기 버튼 이벤트
  const loadDataBtn = document.getElementById('loadDataBtn');
  if (loadDataBtn) {
    loadDataBtn.addEventListener('click', () => {
      const row = parseInt(gridRowInput.value) || 0;
      const col = parseInt(gridColInput.value) || 0;
      const iconId = `M${col}${row}`;
      
      loadProjectDataToForm(iconId);
    });
  }
  
  // 색상 선택기 초기화
  initializeColorPickers();
  
  // 설계자 추가 버튼
  document.getElementById('addDesignerBtn').onclick = () => {
    const container = document.getElementById('designersContainer');
    const currentCount = container.querySelectorAll('.designer-row').length;
    if (currentCount < 10) {
      const newRow = document.createElement('div');
      newRow.innerHTML = generateDesignerRow(currentCount, false);
      container.appendChild(newRow.firstElementChild);
      
      // 약간의 지연 후 색상 선택기 초기화 (DOM 준비 대기)
      setTimeout(() => {
        initializeColorPickers();
        attachRemoveHandlers();
      }, 100);
    } else {
      alert('설계자는 최대 10명까지 추가할 수 있습니다.');
    }
  };
  
  // 담당자 추가 버튼
  document.getElementById('addStaffBtn').onclick = () => {
    const container = document.getElementById('staffContainer');
    const currentCount = container.querySelectorAll('.staff-row').length;
    if (currentCount < 5) {
      const newRow = document.createElement('div');
      newRow.innerHTML = generateStaffRow(currentCount, false);
      container.appendChild(newRow.firstElementChild);
      
      // 약간의 지연 후 색상 선택기 초기화 (DOM 준비 대기)
      setTimeout(() => {
        initializeColorPickers();
        attachRemoveHandlers();
      }, 100);
    } else {
      alert('담당자는 최대 5명까지 추가할 수 있습니다.');
    }
  };
  
  // 삭제 버튼 핸들러
  attachRemoveHandlers();
  
  // 드롭존 초기화
  initializeDropzones();
}

// 색상 선택기 초기화
function initializeColorPickers() {
  try {
    // 기존 색상 선택기 제거 (destroy만 사용, Remove 사용 안 함)
    colorPickers.forEach(picker => {
      try {
        if (picker && typeof picker.destroy === 'function') {
          picker.destroy();
        }
      } catch (e) {
        console.log('Pickr 제거 중 오류 (무시):', e);
      }
    });
    colorPickers = [];
    
    // 모든 Pickr 패널 제거
    document.querySelectorAll('.pcr-app').forEach(app => app.remove());
    
    const buttons = document.querySelectorAll('.color-picker-btn');
    console.log('색상 선택기 버튼 개수:', buttons.length);
    
    buttons.forEach((btn, index) => {
      // 이미 Pickr가 있으면 스킵
      if (btn.classList.contains('pickr-initialized')) {
        console.log(`버튼 ${index} 이미 초기화됨, 스킵`);
        return;
      }
      
      try {
        const pickr = Pickr.create({
          el: btn,
          theme: 'nano',
          default: btn.dataset.color || '#ffffff',  // 기존 색상 또는 흰색
          swatches: [
            '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
          ],
          components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
              hex: true,
              rgba: false,
              hsla: false,
              hsva: false,
              cmyk: false,
              input: true,
              save: true
            }
          }
        });
        
        // 초기 색상 설정
        if (!btn.dataset.color) {
          btn.style.background = '#ffffff';  // 기본값 흰색
          btn.dataset.color = '#ffffff';
        } else {
          btn.style.background = btn.dataset.color;
        }
        btn.classList.add('pickr-initialized');
        
        pickr.on('save', (color, instance) => {
          const hexColor = color.toHEXA().toString();
          btn.style.background = hexColor;
          btn.dataset.color = hexColor;
          pickr.hide();
          
          const target = btn.dataset.target;
          console.log(`✅ 색상 저장 완료 [${target}]:`, hexColor);
          console.log('   - 버튼 배경:', btn.style.background);
          console.log('   - dataset.color:', btn.dataset.color);
        });
        
        colorPickers.push(pickr);
      } catch (error) {
        console.error(`Pickr 생성 오류 (버튼 ${index}):`, error);
      }
    });
    
    console.log('색상 선택기 초기화 완료:', colorPickers.length, '개');
  } catch (error) {
    console.error('색상 선택기 초기화 전체 오류:', error);
  }
}

// 삭제 버튼 핸들러
function attachRemoveHandlers() {
  document.querySelectorAll('.remove-designer-btn').forEach(btn => {
    btn.onclick = function() {
      this.closest('.designer-row').remove();
    };
  });
  
  document.querySelectorAll('.remove-staff-btn').forEach(btn => {
    btn.onclick = function() {
      this.closest('.staff-row').remove();
    };
  });
}

// 드롭존 초기화
function initializeDropzones() {
  // 대표 이미지 드롭존
  Dropzone.autoDiscover = false;
  
  const mainImageZone = new Dropzone('#mainImageDropzone', {
    url: '#',
    autoProcessQueue: false,
    maxFiles: 1,
    acceptedFiles: 'image/*',
    addRemoveLinks: false,
    dictDefaultMessage: '대표 이미지를 드래그하거나 클릭하여 업로드',
    dictRemoveFile: '삭제',
    thumbnailWidth: null,
    thumbnailHeight: null,
    init: function() {
      this.on('addedfile', function(file) {
        if (this.files.length > 1) {
          this.removeFile(this.files[0]);
        }
        
        // 크롭 에디터 표시
        showImageCropEditor(file, 'main', this);
      });
    }
  });
  
  // 추가 이미지 드롭존
  const additionalImagesZone = new Dropzone('#additionalImagesDropzone', {
    url: '#',
    autoProcessQueue: false,
    maxFiles: 20,
    acceptedFiles: 'image/*',
    addRemoveLinks: false,
    dictDefaultMessage: '추가 이미지를 드래그하거나 클릭하여 업로드 (여러 개 가능)',
    dictRemoveFile: '삭제',
    thumbnailWidth: null,
    thumbnailHeight: null,
    init: function() {
      this.on('addedfiles', function(files) {
        files.forEach((file, index) => {
          // 크롭 에디터 표시
          setTimeout(() => showImageCropEditor(file, 'additional', this, index), index * 100);
        });
      });
    }
  });
}

// 추가 이미지 리스트에 추가
function addImageToAdditionalList(filename, index) {
  const imageListContainer = document.getElementById('additionalImagesPreview');
  if (!imageListContainer) return;
  
  const row = document.createElement('div');
  row.className = 'additional-image-row';
  row.dataset.index = index;
  row.dataset.filename = filename;
  row.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 8px;
    margin-bottom: 10px;
  `;
  
  row.innerHTML = `
    <div style="flex: 1; color: #2c3e50; font-size: 14px; font-weight: 500;">${filename}</div>
    <div class="image-description" style="flex: 1; color: #7f8c8d; font-size: 12px; font-style: italic;">설명 없음</div>
    <button type="button" class="desc-image-btn" data-index="${index}" style="
      padding: 8px 14px;
      background: #f39c12;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    ">설명</button>
    <button type="button" class="delete-image-btn" data-index="${index}" style="
      padding: 8px 14px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    ">삭제</button>
  `;
  
  imageListContainer.appendChild(row);
  
  // 버튼 이벤트 핸들러 추가
  attachImageButtonHandlers();
}

// 폼 유효성 검사 및 저장
function validateAndSaveForm() {
  // 생성 위치 확인
  const gridRow = parseInt(document.getElementById('gridRow').value);
  const gridCol = parseInt(document.getElementById('gridCol').value);
  
  if (isNaN(gridRow) || isNaN(gridCol)) {
    alert('❌ 생성 위치(행, 열)를 입력해주세요.');
    return false;
  }
  
  const requiredFields = {
    'projectName': '사업명',
    'usage': '주용도',
    'siteLocation': '대지위치',
    'buildingArea': '건축면적',
    'totalArea': '연면적'
  };
  
  for (let [fieldId, fieldName] of Object.entries(requiredFields)) {
    const input = document.getElementById(fieldId);
    if (!input || !input.value.trim()) {
      alert(`❌ 필수 항목을 입력해주세요: ${fieldName}`);
      if (input) input.focus();
      return false;
    }
  }
  
  console.log('✅ 필수 항목 검증 통과');
  
  // 그리드 위치로 아이콘 ID 계산
  const iconId = `M${gridCol}${gridRow}`;
  console.log('아이콘 ID:', iconId);
  
  // 데이터 수집 시작
  console.log('데이터 수집 시작...');
  
  try {
    // 헬퍼 함수: 안전하게 색상 가져오기
    const getColor = (target) => {
      const btn = document.querySelector(`.color-picker-btn[data-target="${target}"]`);
      const color = btn?.dataset?.color || '#000000';
      console.log(`색상 수집 [${target}]:`, color, 'btn:', btn);
      return color;
    };
    
    mainScreenData = {
      gridPosition: { row: gridRow, col: gridCol },
      iconId: iconId,
      designOverview: {
        color: getColor('designOverview')
      },
      projectName: {
        text: document.getElementById('projectName').value,
        color: getColor('projectName'),
        startYear: document.getElementById('startYear').value,
        endYear: document.getElementById('endYear').value
      },
      usage: {
        text: document.getElementById('usage').value,
        color: getColor('usage')
      },
      location: {
        text: document.getElementById('siteLocation').value,
        color: getColor('siteLocation')
      },
      buildingArea: {
        text: document.getElementById('buildingArea').value,
        color: getColor('buildingArea')
      },
      totalArea: {
        text: document.getElementById('totalArea').value,
        color: getColor('totalArea')
      },
      designers: collectDesigners(),
      staff: collectStaff(),
      mainImage: collectMainImage(),
      additionalImages: collectAdditionalImages()
    };
    
    console.log('수집된 데이터:', mainScreenData);
    
    // IndexedDB에 저장 (비동기)
    const storageKey = `projectData_${iconId}`;
    
    // 비동기 저장 - await 사용
    saveProjectToDB(storageKey, mainScreenData)
      .then(() => {
        console.log(`✅ ${iconId} 프로젝트 데이터 저장 완료!`);
        console.log('저장 키:', storageKey);
        console.log('저장된 데이터:', mainScreenData);
      })
      .catch((error) => {
        console.error('저장 오류:', error);
        alert(`❌ 저장 중 오류 발생: ${error.message}`);
      });
    
    // 전체 프로젝트 목록 업데이트
    updateProjectList(iconId);
    
    // 아이콘 이미지 및 레이블 즉시 업데이트
    if (typeof updateIconImage === 'function') {
      updateIconImage(iconId, mainScreenData);
    } else {
      console.warn('updateIconImage 함수를 찾을 수 없습니다.');
    }
    
    return true;
  } catch (error) {
    console.error('데이터 저장 오류:', error);
    alert(`❌ 저장 중 오류 발생: ${error.message}`);
    return false;
  }
}

// 프로젝트 목록 업데이트
function updateProjectList(iconId) {
  let projectList = JSON.parse(localStorage.getItem('projectList') || '[]');
  if (!projectList.includes(iconId)) {
    projectList.push(iconId);
    localStorage.setItem('projectList', JSON.stringify(projectList));
    console.log('프로젝트 목록 업데이트됨:', projectList);
  }
}

// 설계자 데이터 수집
function collectDesigners() {
  const designers = [];
  try {
    document.querySelectorAll('.designer-row').forEach(row => {
      const fieldInput = row.querySelector('.designer-field');
      const officeInput = row.querySelector('.designer-office');
      const colorBtn = row.querySelector('.color-picker-btn');
      
      const field = fieldInput ? fieldInput.value : '';
      const office = officeInput ? officeInput.value : '';
      const color = colorBtn?.dataset?.color || '#ffffff';
      
      if (field || office) {
        designers.push({ field, office, color });
      }
    });
    console.log('설계자 수집 완료:', designers.length, '명');
  } catch (error) {
    console.error('설계자 수집 오류:', error);
  }
  return designers;
}

// 담당자 데이터 수집
function collectStaff() {
  const staff = [];
  try {
    document.querySelectorAll('.staff-row').forEach(row => {
      const nameInput = row.querySelector('.staff-name');
      const positionInput = row.querySelector('.staff-position');
      const roleInput = row.querySelector('.staff-role');
      const colorBtn = row.querySelector('.color-picker-btn');
      
      const name = nameInput ? nameInput.value : '';
      const position = positionInput ? positionInput.value : '';
      const role = roleInput ? roleInput.value : '';
      const color = colorBtn?.dataset?.color || '#ffffff';
      
      if (name || position || role) {
        staff.push({ name, position, role, color });
      }
    });
    console.log('담당자 수집 완료:', staff.length, '명');
  } catch (error) {
    console.error('담당자 수집 오류:', error);
  }
  return staff;
}

// 이미지 버튼 핸들러
function attachImageButtonHandlers() {
  // 수정 버튼
  document.querySelectorAll('.edit-image-btn').forEach(btn => {
    btn.onclick = async function() {
      const index = this.dataset.index;
      const row = document.querySelector(`.additional-image-row[data-index="${index}"]`);
      
      // 파일 선택 다이얼로그
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(event) {
            row.dataset.imageData = event.target.result;
            row.dataset.filename = file.name;
            row.querySelector('div').textContent = file.name;
            
            Swal.fire({
              icon: 'success',
              title: '이미지 변경됨',
              text: file.name,
              timer: 1500,
              showConfirmButton: false,
              showClass: { popup: '' },
              hideClass: { popup: '' }
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };
  });
  
  // 설명 버튼
  document.querySelectorAll('.desc-image-btn').forEach(btn => {
    btn.onclick = function() {
      const index = this.dataset.index;
      console.log('=== 설명 버튼 클릭 시작, index:', index);
      
      const row = document.querySelector(`.additional-image-row[data-index="${index}"]`);
      if (!row) {
        console.error('❌ Row not found for index:', index);
        return;
      }
      console.log('✅ Row 찾음:', row);
      
      const descDiv = row.querySelector('.image-description');
      if (!descDiv) {
        console.error('❌ descDiv not found');
        return;
      }
      console.log('✅ descDiv 찾음:', descDiv);
      
      const currentDesc = descDiv.textContent === '설명 없음' ? '' : descDiv.textContent;
      const currentColor = row.dataset.descColor || '#000000';
      
      console.log('현재 설명 데이터:', { index, currentDesc, currentColor });
      
      // 기존 팝업 및 Pickr 제거
      const existingPopup = document.getElementById('imageDescPopup');
      if (existingPopup) {
        existingPopup.remove();
      }
      const existingPickr = document.querySelector('.pcr-app');
      if (existingPickr) {
        existingPickr.remove();
      }
      
      // 심플 팝업 생성
      const popup = document.createElement('div');
      popup.id = 'imageDescPopup';
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        width: 400px;
      `;
      
      // 팝업 내용을 DOM으로 생성
      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 12px;';
      
      // 입력창
      const textInput = document.createElement('input');
      textInput.id = 'imageDescInput';
      textInput.type = 'text';
      textInput.placeholder = '이미지 설명 입력';
      textInput.value = currentDesc;
      textInput.style.cssText = `
        width: 100%;
        padding: 12px 15px;
        font-size: 16px;
        border: 2px solid #f39c12;
        border-radius: 8px;
        font-family: 'WAGURI', sans-serif;
        outline: none;
        text-align: center;
        color: ${currentColor};
      `;
      
      // 색상 선택 섹션
      const colorSection = document.createElement('div');
      colorSection.style.cssText = 'display: flex; align-items: center; gap: 10px;';
      
      const colorLabel = document.createElement('span');
      colorLabel.style.cssText = 'font-size: 14px; font-weight: 600; color: #666;';
      colorLabel.textContent = '색상:';
      
      const colorPickerDiv = document.createElement('div');
      colorPickerDiv.id = 'popupColorPicker';
      colorPickerDiv.dataset.color = currentColor;
      colorPickerDiv.style.cssText = `
        width: 40px;
        height: 40px;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        background: ${currentColor};
      `;
      
      colorSection.appendChild(colorLabel);
      colorSection.appendChild(colorPickerDiv);
      
      // 버튼 섹션
      const buttonSection = document.createElement('div');
      buttonSection.style.cssText = 'display: flex; gap: 10px; margin-top: 2px; margin-bottom: 2px;';
      
      const confirmBtn = document.createElement('button');
      confirmBtn.id = 'confirmDescBtn';
      confirmBtn.textContent = '✓';
      confirmBtn.style.cssText = `
        padding: 10px 24px;
        background: #f39c12;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
      `;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelDescBtn';
      cancelBtn.textContent = '✕';
      cancelBtn.style.cssText = `
        padding: 10px 24px;
        background: #95a5a6;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
      `;
      
      // Pickr 인스턴스 변수 (버튼 이벤트보다 먼저 선언)
      let pickrInstance = null;
      
      // 클로저 문제 방지: row와 descDiv를 명시적으로 캡처
      const targetRow = row;
      const targetDescDiv = descDiv;
      const targetIndex = index;
      
      // 확인 버튼 이벤트 (DOM 생성 즉시 연결)
      confirmBtn.onclick = () => {
        console.log('=== 확인 버튼 클릭됨, index:', targetIndex);
        
        if (!textInput || !colorPickerDiv) {
          console.error('❌ 입력 요소를 찾을 수 없음');
          return;
        }
        
        const text = textInput.value.trim();
        const color = colorPickerDiv.dataset.color || '#000000';
        
        console.log('📝 저장할 데이터:', { index: targetIndex, text, color });
        console.log('📍 targetRow:', targetRow);
        console.log('📍 targetDescDiv:', targetDescDiv);
        
        if (!targetDescDiv || !targetRow) {
          console.error('❌ targetDescDiv 또는 targetRow가 없음');
          return;
        }
        
        // descDiv 업데이트
        targetDescDiv.textContent = text || '설명 없음';
        targetDescDiv.style.color = text ? color : '#7f8c8d';
        targetDescDiv.style.fontStyle = text ? 'normal' : 'italic';
        targetDescDiv.style.fontWeight = text ? '600' : 'normal';
        console.log('✅ descDiv 업데이트:', targetDescDiv.textContent);
        
        // row dataset 업데이트
        targetRow.dataset.descText = text;
        targetRow.dataset.descColor = color;
        console.log('✅ row dataset 업데이트:', { descText: targetRow.dataset.descText, descColor: targetRow.dataset.descColor });
        
        // 팝업 제거
        popup.remove();
        
        // Pickr 정리
        if (pickrInstance) {
          try {
            pickrInstance.destroyAndRemove();
          } catch (e) {
            console.log('Pickr 제거 중 오류 (무시 가능):', e);
          }
        }
        
        // Pickr 패널 강제 제거
        const pickrApp = document.querySelector('.pcr-app');
        if (pickrApp) pickrApp.remove();
        
        console.log('✅✅✅ 이미지 설명 저장 완료:', { text, color });
      };
      
      // 취소 버튼 이벤트 (DOM 생성 즉시 연결)
      cancelBtn.onclick = () => {
        console.log('취소 버튼 클릭됨');
        popup.remove();
        
        if (pickrInstance) {
          try {
            pickrInstance.destroyAndRemove();
          } catch (e) {
            console.log('Pickr 제거 중 오류 (무시 가능):', e);
          }
        }
        
        // Pickr 패널 강제 제거
        const pickrApp = document.querySelector('.pcr-app');
        if (pickrApp) pickrApp.remove();
      };
      
      buttonSection.appendChild(confirmBtn);
      buttonSection.appendChild(cancelBtn);
      
      popupContent.appendChild(textInput);
      popupContent.appendChild(colorSection);
      popupContent.appendChild(buttonSection);
      popup.appendChild(popupContent);
      
      document.body.appendChild(popup);
      
      try {
        // 색상 선택기 초기화
        pickrInstance = Pickr.create({
          el: '#popupColorPicker',
          theme: 'nano',
          default: currentColor,
          swatches: [
            '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
          ],
          components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
              hex: true,
              input: true,
              save: true
            }
          }
        });
        
        console.log('Pickr 초기화 완료');
        
        pickrInstance.on('save', (color) => {
          console.log('색상 저장됨:', color);
          const hexColor = color.toHEXA().toString();
          const colorPickerDiv = document.getElementById('popupColorPicker');
          const textInput = document.getElementById('imageDescInput');
          
          if (colorPickerDiv && textInput) {
            // 색상 업데이트
            colorPickerDiv.style.background = hexColor;
            colorPickerDiv.dataset.color = hexColor;
            
            // 입력창 텍스트 색상도 변경
            textInput.style.color = hexColor;
            
            console.log('텍스트 색상 변경됨:', hexColor);
          }
          
          // 색상 선택기 닫기
          pickrInstance.hide();
          
          // Pickr 패널도 완전히 닫기
          setTimeout(() => {
            const pickrApp = document.querySelector('.pcr-app');
            if (pickrApp) pickrApp.remove();
          }, 100);
        });
      } catch (error) {
        console.error('Pickr 초기화 오류:', error);
      }
      
      // Enter 키로 확인
      textInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        }
      };
      
      // 입력창 자동 포커스
      setTimeout(() => {
        textInput.focus();
      }, 100);
    };
  });
  
  // 삭제 버튼
  document.querySelectorAll('.delete-image-btn').forEach(btn => {
    btn.onclick = function() {
      const index = this.dataset.index;
      const row = document.querySelector(`.additional-image-row[data-index="${index}"]`);
      
      if (confirm('이미지를 삭제하시겠습니까?')) {
        row.remove();
        console.log(`이미지 ${index} 삭제됨`);
      }
    };
  });
}

// 대표 이미지 수집
function collectMainImage() {
  try {
    // 크롭된 이미지 데이터 사용
    if (croppedImages.main) {
      console.log('대표 이미지 수집됨 (크롭됨)');
      return croppedImages.main;
    }
    console.log('대표 이미지 없음');
    return null;
  } catch (error) {
    console.error('대표 이미지 수집 오류:', error);
    return null;
  }
}

// 추가 이미지 수집
function collectAdditionalImages() {
  try {
    const images = [];
    const rows = document.querySelectorAll('.additional-image-row');
    console.log('추가 이미지 row 개수:', rows.length);
    
    rows.forEach((row, index) => {
      // 크롭된 이미지 데이터 사용
      const imageData = croppedImages.additional[index];
      const filename = row.dataset.filename;
      const descText = row.dataset.descText || '';
      const descColor = row.dataset.descColor || '#000000';
      
      console.log(`이미지 ${index}: filename=${filename}, hasData=${!!imageData}, desc=${descText}`);
      
      if (imageData) {
        images.push({
          imageData: imageData,
          filename: filename,
          description: {
            text: descText,
            color: descColor
          },
          index: index
        });
      }
    });
    
    console.log('추가 이미지 수집 완료 (크롭됨):', images.length, '개');
    return images;
  } catch (error) {
    console.error('추가 이미지 수집 오류:', error);
    return [];
  }
}

// 데이터 불러오기
function loadMainScreenData() {
  const saved = localStorage.getItem('mainScreenData');
  if (saved) {
    mainScreenData = JSON.parse(saved);
    console.log('메인화면 데이터 로드됨:', mainScreenData);
  }
}

// 프로젝트 데이터를 폼에 불러오기
async function loadProjectDataToForm(iconId) {
  const storageKey = `projectData_${iconId}`;
  
  try {
    // IndexedDB에서 로드
    const projectData = await loadProjectFromDB(storageKey);
    
    if (!projectData) {
      alert(`❌ ${iconId}에 저장된 데이터가 없습니다.`);
      return;
    }
    
    console.log('불러온 데이터:', projectData);
    
    // 필드 입력
    document.getElementById('projectName').value = projectData.projectName?.text || '';
    document.getElementById('startYear').value = projectData.projectName?.startYear || '';
    document.getElementById('endYear').value = projectData.projectName?.endYear || '';
    document.getElementById('usage').value = projectData.usage?.text || '';
    document.getElementById('siteLocation').value = projectData.location?.text || '';
    document.getElementById('buildingArea').value = projectData.buildingArea?.text || '';
    document.getElementById('totalArea').value = projectData.totalArea?.text || '';
    
    // 색상 적용
    const colorFields = {
      'designOverview': projectData.designOverview?.color,
      'projectName': projectData.projectName?.color,
      'usage': projectData.usage?.color,
      'siteLocation': projectData.location?.color,
      'buildingArea': projectData.buildingArea?.color,
      'totalArea': projectData.totalArea?.color
    };
    
    Object.entries(colorFields).forEach(([target, color]) => {
      if (color) {
        const btn = document.querySelector(`.color-picker-btn[data-target="${target}"]`);
        if (btn) {
          btn.dataset.color = color;
          btn.style.background = color;
        }
      }
    });
    
    // 설계자 데이터 불러오기
    if (projectData.designers && projectData.designers.length > 0) {
      const designersContainer = document.getElementById('designersContainer');
      designersContainer.innerHTML = '';  // 기존 내용 삭제
      
      projectData.designers.forEach((designer, index) => {
        const rowHTML = `
          <div class="designer-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="text" class="designer-field" value="${designer.field || ''}" placeholder="분야"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="designer-office" value="${designer.office || ''}" placeholder="사무소명"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
            <div class="color-picker-btn" data-target="designer${index}" data-color="${designer.color || '#ffffff'}"
              style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: ${designer.color || '#ffffff'};">
            </div>
            ${index > 0 ? '<button type="button" class="remove-designer-btn" style="padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : ''}
          </div>
        `;
        designersContainer.insertAdjacentHTML('beforeend', rowHTML);
      });
      
      console.log('설계자 데이터 불러옴:', projectData.designers.length, '명');
    }
    
    // 담당업무 데이터 불러오기
    if (projectData.staff && projectData.staff.length > 0) {
      const staffContainer = document.getElementById('staffContainer');
      staffContainer.innerHTML = '';  // 기존 내용 삭제
      
      projectData.staff.forEach((member, index) => {
        const rowHTML = `
          <div class="staff-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="text" class="staff-name" value="${member.name || ''}" placeholder="이름"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="staff-position" value="${member.position || ''}" placeholder="직위"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="staff-role" value="${member.role || ''}" placeholder="담당업무"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
            <div class="color-picker-btn" data-target="staff${index}" data-color="${member.color || '#ffffff'}"
              style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: ${member.color || '#ffffff'};">
            </div>
            ${index > 0 ? '<button type="button" class="remove-staff-btn" style="padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : ''}
          </div>
        `;
        staffContainer.insertAdjacentHTML('beforeend', rowHTML);
      });
      
      console.log('담당업무 데이터 불러옴:', projectData.staff.length, '명');
    }
    
    // 색상 선택기 재초기화 (새로 추가된 설계자/담당업무 포함)
    setTimeout(() => {
      // 기존 Pickr 인스턴스 완전히 제거
      colorPickers.forEach(picker => {
        try {
          if (picker && typeof picker.destroy === 'function') {
            picker.destroy();
          }
        } catch (e) {
          console.log('Pickr 제거 중 오류 (무시):', e);
        }
      });
      colorPickers = [];
      
      // 모든 Pickr 패널 제거
      document.querySelectorAll('.pcr-app').forEach(app => app.remove());
      
      // pickr-initialized 클래스 모두 제거
      document.querySelectorAll('.color-picker-btn').forEach(btn => {
        btn.classList.remove('pickr-initialized');
      });
      
      // 색상 선택기 재초기화
      initializeColorPickers();
      attachRemoveHandlers();
      
      console.log('✅ 색상 선택기 완전 재초기화 완료');
      console.log('   - 활성 Pickr 인스턴스:', colorPickers.length, '개');
    }, 300);  // 200ms → 300ms로 증가 (안정성 향상)
    
    alert(`✅ ${iconId} 데이터를 불러왔습니다!`);
    console.log('데이터 로드 완료 (설계자, 담당업무 포함)');
    
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    alert(`❌ 데이터 로드 중 오류 발생: ${error.message}`);
  }
}

// ==================== 이미지 크롭 에디터 ====================

// 크롭된 이미지 데이터 저장소
const croppedImages = {
  main: null,
  additional: []
};

// 이미지 크롭 에디터 표시
function showImageCropEditor(file, type, dropzoneInstance, index = 0) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imageData = e.target.result;
    
    // 크롭 에디터 오버레이 생성
    const editorOverlay = document.createElement('div');
    editorOverlay.id = `cropEditor_${type}_${index}`;
    editorOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    
    // 타이틀
    const title = document.createElement('div');
    title.style.cssText = `
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    `;
    title.textContent = type === 'main' ? '대표 이미지 편집' : `추가 이미지 편집 (${index + 1})`;
    editorOverlay.appendChild(title);
    
    // 크롭 영역 컨테이너 (1800x1235 비율 유지)
    const containerWidth = Math.min(900, window.innerWidth - 100);  // 최대 900px
    const containerHeight = containerWidth * (1235 / 1800);  // 비율 유지
    
    const cropContainer = document.createElement('div');
    cropContainer.style.cssText = `
      position: relative;
      width: ${containerWidth}px;
      height: ${containerHeight}px;
      background: #222;
      overflow: hidden;
      border: 3px solid #fff;
      margin-bottom: 20px;
    `;
    
    // 붉은색 점선 박스 (1800:1235 비율)
    const cropBox = document.createElement('div');
    cropBox.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 3px dashed #ff0000;
      pointer-events: none;
      z-index: 1000;
      box-sizing: border-box;
    `;
    cropContainer.appendChild(cropBox);
    
    // 이미지 엘리먼트 (드래그 가능)
    const img = document.createElement('img');
    img.src = imageData;
    img.style.cssText = `
      position: absolute;
      cursor: move;
      user-select: none;
    `;
    
    // 이미지 로드 후 초기 위치 설정
    img.onload = function() {
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = 1800 / 1235;
      
      let imgWidth, imgHeight;
      
      // 컨테이너를 꽉 채우도록 크기 조정
      if (imgAspect > containerAspect) {
        // 이미지가 더 넓음 - 높이 기준
        imgHeight = containerHeight;
        imgWidth = imgHeight * imgAspect;
      } else {
        // 이미지가 더 높음 - 너비 기준
        imgWidth = containerWidth;
        imgHeight = imgWidth / imgAspect;
      }
      
      img.style.width = imgWidth + 'px';
      img.style.height = imgHeight + 'px';
      img.style.left = (containerWidth - imgWidth) / 2 + 'px';
      img.style.top = (containerHeight - imgHeight) / 2 + 'px';
      
      // 드래그 기능
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;
      
      img.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(img.style.left) || 0;
        initialTop = parseInt(img.style.top) || 0;
        img.style.cursor = 'grabbing';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        img.style.left = (initialLeft + dx) + 'px';
        img.style.top = (initialTop + dy) + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          img.style.cursor = 'move';
        }
      });
      
      // 리사이즈 핸들 추가
      addResizeHandles(img, cropContainer, containerWidth, containerHeight);
    };
    
    cropContainer.appendChild(img);
    editorOverlay.appendChild(cropContainer);
    
    // 버튼 영역
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
    `;
    
    // 완료 버튼
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '✅ 완료';
    confirmBtn.style.cssText = `
      padding: 12px 30px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    confirmBtn.onmouseover = () => confirmBtn.style.background = '#229954';
    confirmBtn.onmouseout = () => confirmBtn.style.background = '#27ae60';
    confirmBtn.onclick = () => {
      // 크롭 영역의 이미지 캡처
      const croppedData = cropImage(img, cropContainer, containerWidth, containerHeight);
      
      if (type === 'main') {
        croppedImages.main = croppedData;
      } else {
        croppedImages.additional[index] = croppedData;
      }
      
      editorOverlay.remove();
      console.log(`${type} 이미지 크롭 완료`);
      
      // 추가 이미지인 경우 리스트에 추가
      if (type === 'additional') {
        addImageToAdditionalList(file.name, index);
      }
    };
    
    // 취소 버튼
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌ 취소';
    cancelBtn.style.cssText = `
      padding: 12px 30px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#c0392b';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#e74c3c';
    cancelBtn.onclick = () => {
      dropzoneInstance.removeFile(file);
      editorOverlay.remove();
    };
    
    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    editorOverlay.appendChild(buttonContainer);
    
    document.body.appendChild(editorOverlay);
  };
  
  reader.readAsDataURL(file);
}

// 리사이즈 핸들 추가
function addResizeHandles(img, container, containerWidth, containerHeight) {
  const handles = ['nw', 'ne', 'sw', 'se'];
  
  handles.forEach(position => {
    const handle = document.createElement('div');
    handle.className = `resize-handle-${position}`;
    handle.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: #fff;
      border: 2px solid #000;
      border-radius: 50%;
      cursor: ${position.includes('n') ? (position.includes('w') ? 'nw-resize' : 'ne-resize') : (position.includes('w') ? 'sw-resize' : 'se-resize')};
      z-index: 1001;
    `;
    
    // 핸들 위치 설정
    updateHandlePosition(handle, img, position);
    
    // 리사이즈 드래그
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = img.offsetWidth;
      startHeight = img.offsetHeight;
      startLeft = parseInt(img.style.left) || 0;
      startTop = parseInt(img.style.top) || 0;
      e.stopPropagation();
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const imgAspect = img.naturalWidth / img.naturalHeight;
      
      if (position === 'se') {
        const newWidth = startWidth + dx;
        const newHeight = newWidth / imgAspect;
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
      } else if (position === 'sw') {
        const newWidth = startWidth - dx;
        const newHeight = newWidth / imgAspect;
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
        img.style.left = (startLeft + dx) + 'px';
      } else if (position === 'ne') {
        const newWidth = startWidth + dx;
        const newHeight = newWidth / imgAspect;
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
        img.style.top = (startTop - (newHeight - startHeight)) + 'px';
      } else if (position === 'nw') {
        const newWidth = startWidth - dx;
        const newHeight = newWidth / imgAspect;
        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
        img.style.left = (startLeft + dx) + 'px';
        img.style.top = (startTop - (newHeight - startHeight)) + 'px';
      }
      
      updateAllHandles();
    });
    
    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
    
    // 핸들 위치 업데이트 함수
    const updateAllHandles = () => {
      document.querySelectorAll(`[class^="resize-handle-"]`).forEach(h => {
        const pos = h.className.split('-')[2];
        updateHandlePosition(h, img, pos);
      });
    };
    
    container.appendChild(handle);
  });
}

// 핸들 위치 업데이트
function updateHandlePosition(handle, img, position) {
  const imgRect = img.getBoundingClientRect();
  const containerRect = img.parentElement.getBoundingClientRect();
  
  const relLeft = imgRect.left - containerRect.left;
  const relTop = imgRect.top - containerRect.top;
  const width = img.offsetWidth;
  const height = img.offsetHeight;
  
  if (position === 'nw') {
    handle.style.left = (relLeft - 10) + 'px';
    handle.style.top = (relTop - 10) + 'px';
  } else if (position === 'ne') {
    handle.style.left = (relLeft + width - 10) + 'px';
    handle.style.top = (relTop - 10) + 'px';
  } else if (position === 'sw') {
    handle.style.left = (relLeft - 10) + 'px';
    handle.style.top = (relTop + height - 10) + 'px';
  } else if (position === 'se') {
    handle.style.left = (relLeft + width - 10) + 'px';
    handle.style.top = (relTop + height - 10) + 'px';
  }
}

// 이미지 크롭 (캔버스로 캡처)
function cropImage(img, container, containerWidth, containerHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 1235;
  const ctx = canvas.getContext('2d');
  
  // 현재 이미지의 위치와 크기
  const imgLeft = parseInt(img.style.left) || 0;
  const imgTop = parseInt(img.style.top) || 0;
  const imgWidth = img.offsetWidth;
  const imgHeight = img.offsetHeight;
  
  // 스케일 비율 계산
  const scaleX = img.naturalWidth / imgWidth;
  const scaleY = img.naturalHeight / imgHeight;
  
  // 크롭 영역 (컨테이너 전체 = 1800x1235 비율)
  const cropX = -imgLeft * scaleX;
  const cropY = -imgTop * scaleY;
  const cropWidth = containerWidth * scaleX;
  const cropHeight = containerHeight * scaleY;
  
  // 캔버스에 그리기
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,  // 소스 영역
    0, 0, 1800, 1235  // 대상 영역 (1800x1235로 고정)
  );
  
  return canvas.toDataURL('image/jpeg', 0.95);
}

console.log('%c✅ 메인화면 폼 모듈 로드됨', 'color: #3498db; font-weight: bold; font-size: 14px;');

