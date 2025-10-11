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
const colorPickers = [];

// 메인화면 데이터 입력 폼 표시
function showMainScreenForm(action) {
  const actionText = {
    'create': '프로젝트 생성하기',
    'edit': '프로젝트 수정하기',
    'delete': '프로젝트 삭제하기'
  }[action] || '프로젝트 관리';
  
  // 이미지 데이터 초기화 (생성/수정 모두)
  // 수정 모드에서도 "불러오기" 버튼을 클릭할 때까지 초기화 상태 유지
  croppedImages.main = null;
  croppedImages.additional = [];
  console.log('🔄 이미지 데이터 초기화 (', action === 'create' ? '생성' : '수정', '모드)');
  
  // 관리자 오버레이 열림 플래그 설정
  if (typeof isManagerOverlayOpen !== 'undefined') {
    isManagerOverlayOpen = true;
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
  saveBtn.onclick = async () => {
    console.log('저장 버튼 클릭됨');
    const result = await validateAndSaveForm();
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
      
      setTimeout(async () => {
        successMsg.remove();
        overlay.remove();
        
        // 관리자 오버레이 닫힘 플래그 설정
        if (typeof isManagerOverlayOpen !== 'undefined') {
          isManagerOverlayOpen = false;
        }
        
        // 저장 후 약간의 지연 후 모든 메인 아이콘 이미지 업데이트
        // IndexedDB 트랜잭션이 완전히 완료될 시간 확보
        setTimeout(async () => {
          if (typeof updateAllMainIconImages === 'function') {
            await updateAllMainIconImages();
          }
        }, 100);
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
    
    // 관리자 오버레이는 계속 열려있음 (위치 선택 UI로 전환)
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = true;
    }
    
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
  closeBtn.onclick = () => {
    overlay.remove();
    
    // 관리자 오버레이 닫힘 플래그 설정
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = false;
    }
  };
  
  footerBtns.appendChild(saveBtn);
  footerBtns.appendChild(backBtn);
  footerBtns.appendChild(closeBtn);
  
  container.appendChild(header);
  container.appendChild(formContent);
  container.appendChild(footerBtns);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // DOM 렌더링 후 핸들러 초기화 (약간의 지연)
  setTimeout(() => {
    console.log('📋 폼 핸들러 초기화 시작...');
    console.log('   - Pickr 로드 확인:', typeof Pickr !== 'undefined' ? '✅' : '❌');
    console.log('   - 색상 버튼 수:', document.querySelectorAll('.color-picker-btn').length);
    
    initializeFormHandlers();
    console.log('✅ 폼 핸들러 초기화 완료');
  }, 200);
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
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
          <select id="usageSelect" 
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif; background: white; cursor: pointer;">
            <option value="">선택하세요</option>
            <option value="단독주택">단독주택</option>
            <option value="공동주택">공동주택</option>
            <option value="제1종 근린생활시설">제1종 근린생활시설</option>
            <option value="제2종 근린생활시설">제2종 근린생활시설</option>
            <option value="문화 및 집회시설">문화 및 집회시설</option>
            <option value="종교시설">종교시설</option>
            <option value="판매시설">판매시설</option>
            <option value="운수시설">운수시설</option>
            <option value="의료시설">의료시설</option>
            <option value="교육연구시설">교육연구시설</option>
            <option value="노유자시설">노유자시설</option>
            <option value="수련시설">수련시설</option>
            <option value="운동시설">운동시설</option>
            <option value="업무시설">업무시설</option>
            <option value="숙박시설">숙박시설</option>
            <option value="위락시설">위락시설</option>
            <option value="공장">공장</option>
            <option value="창고시설">창고시설</option>
            <option value="위험물 저장 및 처리시설">위험물 저장 및 처리시설</option>
            <option value="동물 및 식물 관련 시설">동물 및 식물 관련 시설</option>
            <option value="자원순환 관련 시설">자원순환 관련 시설</option>
            <option value="교정시설">교정시설</option>
            <option value="국방·군사시설">국방·군사시설</option>
            <option value="방송통신시설">방송통신시설</option>
            <option value="발전시설">발전시설</option>
            <option value="묘지 관련 시설">묘지 관련 시설</option>
            <option value="관광휴게시설">관광휴게시설</option>
            <option value="그 밖">그 밖</option>
          </select>
          <input type="text" id="usageExtra" placeholder="추가 기재"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <input type="hidden" id="usage" class="form-input" required>
          <div class="color-picker-btn" data-target="usage" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
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
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50; width: fit-content;" id="staffLabelRef">
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
        
        <!-- 프로젝트 폴더 경로 -->
        <div style="margin-bottom: 20px; background: #fff3cd; padding: 15px; border-radius: 8px; border: 2px solid #ffc107;">
          <label style="font-size: 14px; font-weight: 600; display: block; margin-bottom: 8px; color: #856404;">
            📁 프로젝트 폴더 경로
          </label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="projectFolderPath" 
              placeholder="예: 2024/202403 남원어린이도서관"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ffc107; border-radius: 8px; font-family: 'WAGURI', sans-serif; background: white;">
            <button type="button" id="selectFolderBtn" style="
              padding: 10px 20px;
              background: #ffc107;
              color: #856404;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.2s;
            ">📂 폴더 선택</button>
          </div>
          <input type="file" id="folderInput" webkitdirectory directory multiple style="display: none;">
        </div>
        
        <!-- 대표 이미지 -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 8px;">
            <label style="font-size: 16px; font-weight: 600; color: #34495e; margin: 0;">
              대표 이미지 <span style="color: red;">*</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #2c3e50; background: #e8f5e9; padding: 8px 12px; border-radius: 6px; border: 2px solid #4caf50;">
              <input type="checkbox" id="useInMainLoop" style="width: 18px; height: 18px; cursor: pointer;">
              <span style="font-weight: 600;">메인화면 자동 루프에 사용</span>
            </label>
          </div>
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
          <!-- 크롭 후 미리보기 -->
          <div id="mainImagePreview" style="margin-top: 15px; text-align: center;"></div>
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
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    ">
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" class="designer-field" placeholder="분야" ${required ? 'required' : ''}
          style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
        <input type="text" class="designer-office" placeholder="사무소명" ${required ? 'required' : ''}
          style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
        <div class="color-picker-btn" data-target="designer${index}" 
          style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white; pointer-events: auto;">
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
      <input type="url" class="designer-homepage" placeholder="홈페이지 주소 (선택사항, 예: https://www.example.com)"
        style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
    </div>
  `;
}

// 담당자 행 생성
function generateStaffRow(index, required = false) {
  const req = required ? '<span style="color: red;">*</span>' : '';
  
  // "건축면적"의 자연 너비를 측정 (script.js의 displayProjectTextOnMainGrid와 동일)
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
  console.log(`📏 [메인] generateStaffRow(${index}): labelWidth = ${labelWidth}px`);
  
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
        style="width: ${labelWidth}px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="staff-position" placeholder="직위" ${required ? 'required' : ''}
        style="width: 120px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="staff-role" placeholder="담당업무" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <div class="color-picker-btn" data-target="staff${index}" 
        style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white; pointer-events: auto;">
      </div>
      ${!required ? `<button type="button" class="remove-staff-btn" style="
        width: 60px;
        padding: 8px 12px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">삭제</button>` : `<div style="width: 60px;"></div>`}
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
  
  // 주용도 선택 및 추가 입력 합치기
  const usageSelect = document.getElementById('usageSelect');
  const usageExtra = document.getElementById('usageExtra');
  const usageHidden = document.getElementById('usage');
  
  function updateUsageValue() {
    const selectedValue = usageSelect.value;
    const extraValue = usageExtra.value.trim();
    
    if (selectedValue) {
      // 선택된 값이 있으면
      if (extraValue) {
        // 추가 입력도 있으면 "선택값 추가입력" 형식
        usageHidden.value = `${selectedValue} ${extraValue}`;
      } else {
        // 선택값만
        usageHidden.value = selectedValue;
      }
    } else {
      // 선택 안 됐으면 추가 입력만
      usageHidden.value = extraValue;
    }
    
    console.log('주용도 업데이트:', usageHidden.value);
  }
  
  if (usageSelect) {
    usageSelect.addEventListener('change', updateUsageValue);
  }
  if (usageExtra) {
    usageExtra.addEventListener('input', updateUsageValue);
  }
  
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
  
  // 폴더 선택 버튼
  const selectFolderBtn = document.getElementById('selectFolderBtn');
  const folderInput = document.getElementById('folderInput');
  
  if (selectFolderBtn && folderInput) {
    selectFolderBtn.onclick = () => {
      folderInput.click();
    };
    
    folderInput.onchange = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        const firstFile = files[0];
        const detectedPath = extractProjectPath(firstFile);
        
        const projectFolderPathInput = document.getElementById('projectFolderPath');
        if (detectedPath && projectFolderPathInput) {
          projectFolderPathInput.value = detectedPath;
          console.log('✅ 폴더 선택 - 프로젝트 경로 자동 입력:', detectedPath);
          
          // 시각적 피드백
          projectFolderPathInput.style.background = '#d4edda';
          setTimeout(() => {
            projectFolderPathInput.style.background = 'white';
          }, 1000);
        }
      }
    };
  }
  
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

// 색상 선택기 초기화 (HTML5 Color Input 사용)
function initializeColorPickers() {
  console.log('🎨 색상 선택기 초기화 시작...');
  
  try {
    const buttons = document.querySelectorAll('.color-picker-btn');
    console.log(`📍 발견된 색상 선택기 버튼: ${buttons.length}개`);
    
    buttons.forEach((btn, index) => {
      const target = btn.dataset.target;
      const color = btn.dataset.color || '#ffffff';
      
      console.log(`  [${index}] target="${target}", color="${color}"`);
      
      // 기존 color input 제거
      const existingInput = btn.querySelector('input[type="color"]');
      if (existingInput) {
        existingInput.remove();
      }
      
      // HTML5 color input 생성
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = color;
      colorInput.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        cursor: pointer;
        background: transparent;
      `;
      
      // 색상 변경 이벤트
      colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        btn.style.background = newColor;
        btn.dataset.color = newColor;
        console.log(`✅ 색상 변경 [${target}]: ${newColor}`);
      });
      
      colorInput.addEventListener('change', (e) => {
        const newColor = e.target.value;
        btn.style.background = newColor;
        btn.dataset.color = newColor;
        console.log(`✅ 색상 저장 [${target}]: ${newColor}`);
      });
      
      btn.appendChild(colorInput);
      btn.style.background = color;
      btn.style.padding = '0';
      btn.style.overflow = 'hidden';
      
      console.log(`  ✓ 색상 선택기 생성 성공: ${target}`);
    });
    
    console.log(`✅ 색상 선택기 초기화 완료: ${buttons.length}개`);
  } catch (error) {
    console.error('❌ 색상 선택기 초기화 오류:', error);
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
  
  // V, X 아이콘 숨기기 위한 CSS 추가
  const style = document.createElement('style');
  style.textContent = `
    .dz-success-mark,
    .dz-error-mark {
      display: none !important;
    }
    .dropzone .dz-preview .dz-image img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
    }
    .dropzone .dz-preview {
      margin: 10px !important;
    }
  `;
  if (!document.getElementById('dropzone-custom-style')) {
    style.id = 'dropzone-custom-style';
    document.head.appendChild(style);
  }
  
  const mainImageZone = new Dropzone('#mainImageDropzone', {
    url: '#',
    autoProcessQueue: false,
    maxFiles: 1,
    acceptedFiles: 'image/*',
    addRemoveLinks: false,
    dictDefaultMessage: '대표 이미지를 드래그하거나 클릭하여 업로드',
    dictRemoveFile: '삭제',
    thumbnailWidth: 300,
    thumbnailHeight: 200,
    init: function() {
      this.on('addedfile', function(file) {
        if (this.files.length > 1) {
          this.removeFile(this.files[0]);
        }
        
        // 파일 경로 자동 감지 및 프로젝트 폴더 경로 필드에 자동 입력
        const projectFolderPathInput = document.getElementById('projectFolderPath');
        if (projectFolderPathInput && !projectFolderPathInput.value) {
          const detectedPath = extractProjectPath(file);
          if (detectedPath) {
            projectFolderPathInput.value = detectedPath;
            console.log('✅ 프로젝트 폴더 경로 자동 감지:', detectedPath);
          }
        }
        
        // Dropzone 기본 미리보기 숨기기 (크롭 후 미리보기만 사용)
        const previewElement = file.previewElement;
        if (previewElement) {
          previewElement.style.display = 'none';
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
    thumbnailWidth: 150,
    thumbnailHeight: 100,
    init: function() {
      this.on('addedfile', function(file) {
        // V, X 아이콘 숨기기
        const previewElement = file.previewElement;
        if (previewElement) {
          const successMark = previewElement.querySelector('.dz-success-mark');
          const errorMark = previewElement.querySelector('.dz-error-mark');
          if (successMark) successMark.style.display = 'none';
          if (errorMark) errorMark.style.display = 'none';
          
          // 이미지 크기 조정 (드롭박스 경계 내)
          const thumbnail = previewElement.querySelector('img');
          if (thumbnail) {
            thumbnail.style.maxWidth = '100%';
            thumbnail.style.maxHeight = '150px';
            thumbnail.style.objectFit = 'contain';
          }
        }
      });
      
      this.on('addedfiles', function(files) {
        // 첫 번째 파일로 프로젝트 폴더 경로 자동 감지
        const projectFolderPathInput = document.getElementById('projectFolderPath');
        if (projectFolderPathInput && !projectFolderPathInput.value && files.length > 0) {
          const detectedPath = extractProjectPath(files[0]);
          if (detectedPath) {
            projectFolderPathInput.value = detectedPath;
            console.log('✅ 프로젝트 폴더 경로 자동 감지:', detectedPath);
          }
        }
        
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

// 폼 유효성 검사 및 저장 (비동기)
async function validateAndSaveForm() {
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
  
  for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
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
  console.log('🎯 아이콘 ID 계산:');
  console.log('   입력 - 행(row):', gridRow, ', 열(col):', gridCol);
  console.log('   생성 - iconId:', iconId);
  console.log('   예상 - M00은 행:0,열:0 / M01은 행:1,열:0 / M10은 행:0,열:1');
  
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
    
    // 프로젝트 정보 추출
    const projectNameText = document.getElementById('projectName').value;
    const startYear = document.getElementById('startYear').value;
    const projectFolderPath = document.getElementById('projectFolderPath').value.trim();
    
    // 상대경로 생성 함수
    const generateImagePath = (filename) => {
      if (!filename) return null;
      
      // 사용자가 프로젝트 폴더 경로를 입력한 경우
      if (projectFolderPath) {
        return `projects/${projectFolderPath}/${filename}`;
      }
      
      // 프로젝트 폴더 경로가 없으면 경로도 null (Base64만 저장)
      return null;
    };
    
    console.log('📁 프로젝트 폴더 경로:', projectFolderPath || '(없음 - Base64만 저장)');
    
    // 저장 시작 전 croppedImages 상태 로깅
    console.log('\n💾 저장 시작 - croppedImages 상태:');
    console.log('   croppedImages.main:', croppedImages.main);
    console.log('   croppedImages.additional:', croppedImages.additional.length, '개');
    
    // 메인 이미지 처리
    const mainImageData = collectMainImage();
    console.log('   collectMainImage() 결과:', mainImageData ? '✅ 있음' : '❌ 없음');
    if (mainImageData) {
      console.log('      filename:', mainImageData.filename);
      console.log('      data:', mainImageData.data ? mainImageData.data.substring(0, 30) + '...' : 'null');
      console.log('      data 타입:', mainImageData.data?.startsWith('data:') ? 'base64' : mainImageData.data?.startsWith('projects/') ? '경로' : '알 수 없음');
    }
    
    // 메인 이미지 데이터와 경로 분리
    let finalMainImageBase64 = null;
    let finalMainImagePath = null;
    
    // 먼저 기존 데이터 확인 (불러오기 시)
    const existingData = await loadProjectFromDB(`projectData_${iconId}`);
    console.log('   기존 데이터 확인:', existingData ? '✅ 있음' : '❌ 없음');
    
    if (mainImageData && mainImageData.data) {
      if (mainImageData.data.startsWith('data:')) {
        // data가 base64인 경우 (새로 업로드)
        finalMainImageBase64 = mainImageData.data;
        finalMainImagePath = mainImageData.filename ? generateImagePath(mainImageData.filename) : null;
        console.log('   ✅ 새 base64 + 생성 경로:', finalMainImagePath);
      } else if (mainImageData.data.startsWith('projects/')) {
        // data가 경로인 경우 (불러오기 시)
        finalMainImagePath = mainImageData.data;
        // 기존 base64 데이터 보존
        if (existingData?.mainImage && existingData.mainImage.startsWith('data:')) {
          finalMainImageBase64 = existingData.mainImage;
          console.log('   ✅ 불러오기: 기존 base64 보존 + 경로 유지');
        } else {
          console.warn('   ⚠️ 불러오기: 경로만 있고 base64 없음');
        }
      } else {
        // 알 수 없는 형식
        console.error('   ❌ 알 수 없는 이미지 데이터 형식:', mainImageData.data?.substring(0, 50));
      }
    } else {
      // mainImageData가 null이거나 data가 없는 경우 - 기존 데이터 100% 유지
      console.warn('   ⚠️ mainImageData가 없음 - 기존 데이터 100% 보존');
      if (existingData) {
        finalMainImageBase64 = existingData.mainImage;
        finalMainImagePath = existingData.mainImagePath;
        console.log('   → 기존 base64:', finalMainImageBase64 ? '✅ 보존' : '❌ 없음');
        console.log('   → 기존 경로:', finalMainImagePath ? '✅ 보존' : '❌ 없음');
      } else {
        console.error('   ❌ 기존 데이터도 없음 - 완전히 비어있음!');
      }
    }
    
    // 추가 이미지 처리
    const additionalImagesData = collectAdditionalImages();
    console.log('   collectAdditionalImages() 결과:', additionalImagesData.length, '개');
    
    // 추가 이미지도 base64와 경로 분리
    const finalAdditionalImagesBase64 = [];
    const finalAdditionalImagePaths = [];
    
    // 기존 추가 이미지 base64 데이터 확인 (existingData는 이미 위에서 로드됨)
    const existingAdditionalBase64 = existingData?.additionalImages || [];
    const existingAdditionalPaths = existingData?.additionalImagePaths || [];
    console.log('   기존 추가 이미지 base64:', existingAdditionalBase64.length, '개');
    console.log('   기존 추가 이미지 경로:', existingAdditionalPaths.length, '개');
    
    if (croppedImages.additional.length > 0) {
      // 새 이미지가 있으면 처리
      croppedImages.additional.forEach((imgObj, idx) => {
      if (imgObj.data?.startsWith('data:')) {
        // base64 데이터 (새로 업로드)
        finalAdditionalImagesBase64.push(imgObj.data);
        finalAdditionalImagePaths.push(generateImagePath(imgObj.filename));
        console.log(`   [${idx}] ✅ 새 base64 + 생성 경로:`, imgObj.filename);
      } else if (imgObj.data?.startsWith('projects/')) {
        // 경로 데이터 (불러오기 시)
        const base64Data = existingAdditionalBase64[idx];
        if (base64Data && base64Data.startsWith('data:')) {
          finalAdditionalImagesBase64.push(base64Data);
          finalAdditionalImagePaths.push(imgObj.data);
          console.log(`   [${idx}] ✅ 불러오기: 기존 base64 보존 + 경로 유지`);
        } else {
          // base64가 없으면 경로만 저장 (나중에 fetch로 로드)
          finalAdditionalImagesBase64.push(imgObj.data);
          finalAdditionalImagePaths.push(imgObj.data);
          console.warn(`   [${idx}] ⚠️ 경로만 저장 (base64 없음)`);
        }
      } else {
        console.error(`   [${idx}] ❌ 알 수 없는 데이터:`, imgObj.data?.substring(0, 30));
      }
    });
    } else if (existingData && (existingAdditionalBase64.length > 0 || existingAdditionalPaths.length > 0)) {
      // croppedImages.additional가 비어있지만 기존 데이터가 있으면 100% 유지
      console.warn('   ⚠️ croppedImages.additional 비어있음 - 기존 데이터 100% 보존');
      finalAdditionalImagesBase64.push(...existingAdditionalBase64);
      finalAdditionalImagePaths.push(...existingAdditionalPaths);
      console.log(`   → 기존 추가 이미지: base64 ${existingAdditionalBase64.length}개 + 경로 ${existingAdditionalPaths.length}개 보존됨`);
    } else {
      console.warn('   ⚠️ 추가 이미지 데이터 없음 (신규 프로젝트 또는 이미지 미등록)');
    }
    
    console.log('\n📋 최종 저장 데이터 검증:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🖼️ 대표 이미지:');
    console.log('   mainImage (base64):', finalMainImageBase64 ? 
      (finalMainImageBase64.startsWith('data:') ? '✅ Base64 (' + (finalMainImageBase64.length / 1024).toFixed(1) + 'KB)' : '❌ 경로 데이터 (오류!)') : 
      '❌ 없음');
    console.log('   mainImagePath:', finalMainImagePath || '(없음)');
    
    console.log('📸 추가 이미지:');
    console.log('   additionalImages:', finalAdditionalImagesBase64.length, '개');
    finalAdditionalImagesBase64.forEach((img, idx) => {
      console.log(`      [${idx}] ${img.startsWith('data:') ? '✅ Base64' : '❌ 경로 (오류!)'}`);
    });
    console.log('   additionalImagePaths:', finalAdditionalImagePaths.length, '개');
    finalAdditionalImagePaths.forEach((path, idx) => {
      console.log(`      [${idx}] ${path || '(없음)'}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    mainScreenData = {
      gridPosition: { row: gridRow, col: gridCol },
      iconId: iconId,
      projectFolderPath: projectFolderPath || null,  // 프로젝트 폴더 경로 저장
      designOverview: {
        color: getColor('designOverview')
      },
      projectName: {
        text: projectNameText,
        color: getColor('projectName'),
        startYear: startYear,
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
      mainImage: finalMainImageBase64,  // base64 데이터만 저장 (null이면 null)
      mainImagePath: finalMainImagePath,  // 상대경로만 저장 (null이면 null)
      additionalImages: finalAdditionalImagesBase64,  // base64 배열만 저장 (빈 배열이면 빈 배열)
      additionalImagePaths: finalAdditionalImagePaths,  // 경로 배열만 저장 (빈 배열이면 빈 배열)
      useInMainLoop: document.getElementById('useInMainLoop')?.checked || false
    };
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 최종 저장 데이터 검증:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 iconId:', mainScreenData.iconId);
    console.log('📛 프로젝트명:', mainScreenData.projectName?.text);
    console.log('');
    console.log('🖼️ 메인 이미지:');
    console.log('   mainImage:', mainScreenData.mainImage ? (mainScreenData.mainImage.startsWith('data:') ? '✅ base64 있음' : '❌ base64 아님?!') : '❌ null');
    console.log('   mainImagePath:', mainScreenData.mainImagePath || '❌ null');
    console.log('');
    console.log('🖼️ 추가 이미지:');
    console.log('   additionalImages:', mainScreenData.additionalImages.length, '개');
    if (mainScreenData.additionalImages.length > 0) {
      const allBase64 = mainScreenData.additionalImages.every(img => img && img.startsWith('data:'));
      console.log('   타입 검증:', allBase64 ? '✅ 모두 base64' : '⚠️ 일부 경로 또는 null');
      if (!allBase64) {
        mainScreenData.additionalImages.forEach((img, idx) => {
          if (!img) {
            console.warn(`      [${idx}] ❌ null/undefined`);
          } else if (!img.startsWith('data:')) {
            console.warn(`      [${idx}] ⚠️ 경로: ${img.substring(0, 50)}...`);
          }
        });
      }
    }
    console.log('   additionalImagePaths:', mainScreenData.additionalImagePaths.length, '개');
    console.log('');
    console.log('🔄 메인 루프:', mainScreenData.useInMainLoop ? '✅ 사용' : '❌ 미사용');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // IndexedDB에 저장 (비동기) - await로 완료 대기
    const storageKey = `projectData_${iconId}`;
    
    try {
      await saveProjectToDB(storageKey, mainScreenData);
      console.log(`✅ ${iconId} 프로젝트 데이터 저장 완료!`);
      console.log('   저장 키:', storageKey);
      console.log('   프로젝트명:', mainScreenData.projectName?.text);
      console.log('   메인 이미지 경로:', mainScreenData.mainImagePath);
      console.log('   메인 이미지 데이터:', mainScreenData.mainImage ? mainScreenData.mainImage.substring(0, 50) + '...' : 'null');
      console.log('   추가 이미지 경로:', mainScreenData.additionalImagePaths?.length || 0, '개');
      console.log('   추가 이미지 데이터:', mainScreenData.additionalImages?.length || 0, '개');
      
      // 저장 검증: 다시 읽어서 확인
      console.log('🔍 저장 검증 중...');
      const verifyData = await loadProjectFromDB(storageKey);
      if (verifyData) {
        console.log('✅ 저장 검증 성공 - 데이터 다시 읽기 완료');
        console.log('   검증 - 프로젝트명:', verifyData.projectName?.text);
        console.log('   검증 - 메인 이미지:', verifyData.mainImagePath || (verifyData.mainImage ? 'base64' : 'null'));
      } else {
        console.error('❌ 저장 검증 실패 - 저장된 데이터를 읽을 수 없습니다!');
      }
    } catch (error) {
      console.error('❌ 저장 오류:', error);
      alert(`❌ 저장 중 오류 발생: ${error.message}`);
      return false;
    }
    
    // 전체 프로젝트 목록 업데이트
    updateProjectList(iconId);
    
    // 아이콘 이미지 및 레이블 즉시 업데이트
    if (typeof updateIconImage === 'function') {
      await updateIconImage(iconId, mainScreenData);
      
      // 아이콘 표시 처리 (숨김 상태였다면 표시)
      const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
      if (iconWrapper) {
        iconWrapper.style.display = 'flex';
        iconWrapper.style.visibility = 'visible';
        iconWrapper.style.opacity = '1';
        console.log(`✅ ${iconId} 아이콘 표시 처리됨`);
      }
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
  const projectList = JSON.parse(localStorage.getItem('projectList') || '[]');
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
      const homepageInput = row.querySelector('.designer-homepage');
      const colorBtn = row.querySelector('.color-picker-btn');
      
      const field = fieldInput ? fieldInput.value : '';
      const office = officeInput ? officeInput.value : '';
      const homepage = homepageInput ? homepageInput.value : '';
      const color = colorBtn?.dataset?.color || '#ffffff';
      
      if (field || office) {
        designers.push({ field, office, homepage, color });
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
        pointer-events: auto;
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
        
        console.log('✅ 이미지 설명 저장 완료:', { text, color });
      };
      
      // 취소 버튼 이벤트 (DOM 생성 즉시 연결)
      cancelBtn.onclick = () => {
        console.log('취소 버튼 클릭됨');
        popup.remove();
      };
      
      buttonSection.appendChild(confirmBtn);
      buttonSection.appendChild(cancelBtn);
      
      popupContent.appendChild(textInput);
      popupContent.appendChild(colorSection);
      popupContent.appendChild(buttonSection);
      popup.appendChild(popupContent);
      
      document.body.appendChild(popup);
      
      // HTML5 color input으로 색상 선택기 추가
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = currentColor;
      colorInput.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        cursor: pointer;
        background: transparent;
      `;
      
      colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        colorPickerDiv.style.background = newColor;
        colorPickerDiv.dataset.color = newColor;
        textInput.style.color = newColor;
        console.log(`✅ 색상 변경: ${newColor}`);
      });
      
      colorInput.addEventListener('change', (e) => {
        const newColor = e.target.value;
        colorPickerDiv.style.background = newColor;
        colorPickerDiv.dataset.color = newColor;
        textInput.style.color = newColor;
        console.log(`✅ 색상 저장: ${newColor}`);
      });
      
      colorPickerDiv.appendChild(colorInput);
      colorPickerDiv.style.padding = '0';
      colorPickerDiv.style.overflow = 'hidden';
      
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
      console.log('   croppedImages.main 타입:', typeof croppedImages.main);
      console.log('   croppedImages.main 구조:', croppedImages.main);
      
      // 객체 구조인 경우와 문자열인 경우 모두 처리
      if (typeof croppedImages.main === 'object' && croppedImages.main.data) {
        return croppedImages.main;  // { data, filename } 구조
      } else if (typeof croppedImages.main === 'string') {
        // 문자열인 경우 (하위 호환성)
        return { data: croppedImages.main, filename: '메인이미지.jpg' };
      } else {
        return croppedImages.main;
      }
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
    console.log('📸 추가 이미지 수집 시작...');
    console.log('croppedImages.additional 배열 길이:', croppedImages.additional.length);
    
    // croppedImages.additional 배열에서 data만 추출
    const images = croppedImages.additional.map((imgObj, index) => {
      const imageData = imgObj.data || imgObj;  // 객체 또는 문자열 지원
      const filename = imgObj.filename || `image_${index + 1}`;
      console.log(`이미지 ${index + 1}: ${filename}, length=${imageData?.length || 0}`);
      return imageData;
    });
    
    console.log('✅ 추가 이미지 수집 완료:', images.length, '개');
    console.log('📋 순서:', croppedImages.additional.map(img => img.filename || '(파일명 없음)'));
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

// 추가 이미지 프리뷰 다시 로드
async function reloadAdditionalImagesPreviews() {
  const additionalPreview = document.getElementById('additionalImagesPreview');
  if (!additionalPreview) {
    console.error('❌ additionalImagesPreview 요소를 찾을 수 없습니다!');
    return;
  }
  
  console.log(`🔄 추가 이미지 프리뷰 재로드 시작: ${croppedImages.additional.length}개`);
  
  additionalPreview.innerHTML = '';
  
  for (let idx = 0; idx < croppedImages.additional.length; idx++) {
    const imgObj = croppedImages.additional[idx];
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
    imgContainer.dataset.imageIndex = idx;
    
    const img = document.createElement('img');
    
    // 경로인 경우 직접 사용, base64인 경우 직접 사용
    const imageSource = imgObj.data || imgObj;
    
    console.log(`   [${idx}] 이미지 소스:`, imageSource ? imageSource.substring(0, 80) : 'null');
    
    img.src = imageSource;
    img.style.cssText = 'max-width: 150px; max-height: 150px; border: 2px solid #9b59b6; border-radius: 8px;';
    
    // 이미지 로드 성공 시
    img.onload = function() {
      console.log(`   [${idx}] ✅ 추가 이미지 로드 성공`);
    };
    
    // 이미지 로드 실패 시
    img.onerror = function() {
      if (this.src.startsWith('data:image/svg+xml')) return;
      console.error(`   [${idx}] ❌ 추가 이미지 로드 실패!`);
      console.error(`   시도한 경로:`, imageSource ? imageSource.substring(0, 100) : 'null');
      // Placeholder 표시
      this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f8d7da" stroke="%23e74c3c" stroke-width="2" rx="8"/><text x="50%" y="50%" fill="%23721c24" text-anchor="middle" font-size="12">로드 실패</text></svg>';
      this.style.border = '2px solid #e74c3c';
    };
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.style.cssText = `
      position: absolute; top: -10px; right: -10px; background: #e74c3c; color: white; border: none; 
      border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-weight: bold; font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.2s;
    `;
    removeBtn.onmouseover = () => removeBtn.style.transform = 'scale(1.1)';
    removeBtn.onmouseout = () => removeBtn.style.transform = 'scale(1)';
    removeBtn.onclick = async function() {
      const containerIndex = parseInt(this.parentElement.dataset.imageIndex);
      croppedImages.additional.splice(containerIndex, 1);
      console.log(`🗑️ 추가 이미지 [${containerIndex}] 삭제됨`);
      // 다시 렌더링
      await reloadAdditionalImagesPreviews();
    };
    
    const label = document.createElement('div');
    const filename = imgObj.filename || `이미지 ${idx + 1}`;
    label.textContent = filename;
    label.style.cssText = 'text-align: center; font-size: 11px; color: #7f8c8d; margin-top: 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.title = filename;  // 전체 파일명 툴팁
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    imgContainer.appendChild(label);
    additionalPreview.appendChild(imgContainer);
  }
  
  console.log(`✅ 추가 이미지 프리뷰 재로드 완료: ${croppedImages.additional.length}개`);
  console.log(`   additionalPreview.children.length:`, additionalPreview.children.length);
}

// 프로젝트 데이터를 폼에 불러오기
async function loadProjectDataToForm(iconId) {
  const storageKey = `projectData_${iconId}`;
  
  console.log(`\n📂 ${iconId} 데이터 불러오기 시작...`);
  
  // 먼저 이미지 프리뷰 초기화
  const mainPreview = document.getElementById('mainImagePreview');
  const additionalPreview = document.getElementById('additionalImagesPreview');
  if (mainPreview) {
    mainPreview.innerHTML = '';
    console.log('🧹 대표 이미지 프리뷰 초기화');
  }
  if (additionalPreview) {
    additionalPreview.innerHTML = '';
    console.log('🧹 추가 이미지 프리뷰 초기화');
  }
  
  try {
    // IndexedDB에서 로드
    const projectData = await loadProjectFromDB(storageKey);
    
    if (!projectData) {
      alert(`❌ ${iconId}에 저장된 데이터가 없습니다.`);
      return;
    }
    
    console.log(`✅ ${iconId} 프로젝트 데이터 로드됨:`, projectData.projectName?.text);
    
    console.log('불러온 데이터:', projectData);
    
    // 필드 입력
    document.getElementById('projectName').value = projectData.projectName?.text || '';
    document.getElementById('startYear').value = projectData.projectName?.startYear || '';
    document.getElementById('endYear').value = projectData.projectName?.endYear || '';
    
    // 주용도 값 분리 (select + extra)
    const usageText = projectData.usage?.text || '';
    const usageOptions = ['단독주택', '공동주택', '제1종 근린생활시설', '제2종 근린생활시설', 
                          '문화 및 집회시설', '종교시설', '판매시설', '운수시설', '의료시설', 
                          '교육연구시설', '노유자시설', '수련시설', '운동시설', '업무시설', 
                          '숙박시설', '위락시설', '공장', '창고시설', '위험물 저장 및 처리시설', 
                          '동물 및 식물 관련 시설', '자원순환 관련 시설', '교정시설', 
                          '국방·군사시설', '방송통신시설', '발전시설', '묘지 관련 시설', 
                          '관광휴게시설', '그 밖'];
    
    let selectedOption = '';
    let extraText = '';
    
    // 옵션에서 매칭되는 것 찾기
    for (const option of usageOptions) {
      if (usageText.startsWith(option)) {
        selectedOption = option;
        extraText = usageText.substring(option.length).trim();
        break;
      }
    }
    
    // 매칭 안 되면 전체를 추가 입력으로
    if (!selectedOption) {
      extraText = usageText;
    }
    
    document.getElementById('usageSelect').value = selectedOption;
    document.getElementById('usageExtra').value = extraText;
    document.getElementById('usage').value = usageText;
    
    // 프로젝트 폴더 경로 복원
    const projectFolderPathInput = document.getElementById('projectFolderPath');
    if (projectFolderPathInput) {
      projectFolderPathInput.value = projectData.projectFolderPath || '';
      console.log('✅ 프로젝트 폴더 경로 복원:', projectData.projectFolderPath || '(없음)');
    }
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
          <div class="designer-row" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="text" class="designer-field" value="${designer.field || ''}" placeholder="분야"
                style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
              <input type="text" class="designer-office" value="${designer.office || ''}" placeholder="사무소명"
                style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
              <div class="color-picker-btn" data-target="designer${index}" data-color="${designer.color || '#ffffff'}"
                style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: ${designer.color || '#ffffff'}; pointer-events: auto;">
              </div>
              ${index > 0 ? '<button type="button" class="remove-designer-btn" style="padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : ''}
            </div>
            <input type="url" class="designer-homepage" value="${designer.homepage || ''}" placeholder="홈페이지 주소 (선택사항, 예: https://www.example.com)"
              style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
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
      
      // "건축면적" 자연 너비 측정 (script.js와 동일)
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = 'position: absolute; visibility: hidden; font-size: 18px; font-weight: bold; font-family: "WAGURI", sans-serif;';
      tempSpan.textContent = '건축면적';
      document.body.appendChild(tempSpan);
      const labelWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      projectData.staff.forEach((member, index) => {
        const rowHTML = `
          <div class="staff-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <input type="text" class="staff-name" value="${member.name || ''}" placeholder="이름"
              style="width: ${labelWidth}px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="staff-position" value="${member.position || ''}" placeholder="직위"
              style="width: 120px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="staff-role" value="${member.role || ''}" placeholder="담당업무"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <div class="color-picker-btn" data-target="staff${index}" data-color="${member.color || '#ffffff'}"
              style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: ${member.color || '#ffffff'}; pointer-events: auto;">
            </div>
            ${index > 0 ? '<button type="button" class="remove-staff-btn" style="width: 60px; padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : '<div style="width: 60px;"></div>'}
          </div>
        `;
        staffContainer.insertAdjacentHTML('beforeend', rowHTML);
      });
      
      console.log('담당업무 데이터 불러옴:', projectData.staff.length, '명');
    }
    
    // 이미지 데이터 불러오기 (대표 이미지)
    const mainImageSource = projectData.mainImage || projectData.mainImagePath;
    if (mainImageSource) {
      console.log('🖼️ 대표 이미지 불러오기...');
      console.log('   mainImage (base64):', projectData.mainImage ? projectData.mainImage.substring(0, 50) + '...' : 'null');
      console.log('   mainImagePath:', projectData.mainImagePath || 'null');
      console.log('   mainImageSource:', mainImageSource.substring(0, 50) + '...');
      console.log('   타입:', mainImageSource.startsWith('data:') ? 'base64' : mainImageSource.startsWith('projects/') ? '경로' : '알 수 없음');
      
      // 파일명 추출 (경로에서 또는 기본값)
      let filename = '메인이미지.jpg';
      if (projectData.mainImagePath) {
        const pathParts = projectData.mainImagePath.split('/');
        filename = pathParts[pathParts.length - 1];
      }
      
      // croppedImages.main을 새로운 구조로 저장
      croppedImages.main = {
        data: mainImageSource,
        filename: filename
      };
      
      // 불러오기 시에도 미리보기 표시
      console.log('🎨 대표 이미지 미리보기 호출...');
      showMainImagePreview(mainImageSource, filename);
    } else {
      console.log('⚠️ 대표 이미지 없음');
    }
    
    // 이미지 데이터 불러오기 (추가 이미지) - 대표 이미지와 동일한 방식
    const hasAdditionalImages = (projectData.additionalImages?.length > 0) || (projectData.additionalImagePaths?.length > 0);
    
    if (hasAdditionalImages) {
      const imageCount = projectData.additionalImages?.length || projectData.additionalImagePaths?.length || 0;
      console.log(`🖼️ 추가 이미지 ${imageCount}개 불러오기...`);
      
      // Base64 우선, 경로 대체 방식 (대표 이미지와 동일)
      croppedImages.additional = [];
      
      for (let idx = 0; idx < imageCount; idx++) {
        const imageData = projectData.additionalImages?.[idx];  // Base64 우선
        const imagePath = projectData.additionalImagePaths?.[idx];
        const imageSource = imageData || imagePath;  // Base64 우선, 없으면 경로
        
        if (imageSource) {
          // 파일명 추출
          let filename = `추가이미지_${String(idx + 1).padStart(3, '0')}.png`;
          if (imagePath) {
            const pathParts = imagePath.split('/');
            filename = pathParts[pathParts.length - 1];
          }
          
          croppedImages.additional.push({
            filename: filename,
            data: imageSource
          });
          
          const dataType = imageSource.startsWith('data:') ? 'Base64' : '경로';
          console.log(`  ${idx + 1}. ${filename} - ${dataType}`);
        }
      }
      
      console.log(`✅ 추가 이미지 ${croppedImages.additional.length}개 복원 완료`);
      console.log('   croppedImages.additional 상태:');
      croppedImages.additional.forEach((img, idx) => {
        console.log(`      [${idx}]`, {
          filename: img.filename,
          dataType: img.data ? (img.data.startsWith('data:') ? 'base64 ✅' : img.data.startsWith('projects/') ? '경로 ⚠️' : '알 수 없음') : 'null',
          dataLength: img.data?.length || 0
        });
      });
      
      // 프리뷰 로드 (대표 이미지와 동일하게 호출)
      console.log('🎨 추가 이미지 프리뷰 호출...');
      await reloadAdditionalImagesPreviews();
    } else {
      console.log('⚠️ 추가 이미지 없음');
    }
    
    // 메인 루프 체크박스 설정
    const useInMainLoopCheckbox = document.getElementById('useInMainLoop');
    if (useInMainLoopCheckbox) {
      useInMainLoopCheckbox.checked = projectData.useInMainLoop || false;
      console.log('✅ 메인 루프 사용 설정:', projectData.useInMainLoop);
    }
    
    // 색상 선택기 재초기화 (새로 추가된 설계자/담당업무 포함)
    setTimeout(() => {
      console.log('🔧 색상 선택기 재초기화 시작...');
      
      // 색상 선택기 재초기화
      initializeColorPickers();
      attachRemoveHandlers();
      
      console.log('✅ 색상 선택기 완전 재초기화 완료');
    }, 300);
    
    const imageCount = projectData.additionalImagePaths?.length || projectData.additionalImages?.length || 0;
    
    // croppedImages 상태 확인 로그
    console.log('\n📸 불러오기 완료 - croppedImages 상태:');
    console.log('   croppedImages.main:', croppedImages.main ? '✅ 있음' : '❌ 없음');
    if (croppedImages.main) {
      console.log('      filename:', croppedImages.main.filename);
      console.log('      data:', croppedImages.main.data ? croppedImages.main.data.substring(0, 50) + '...' : 'null');
    }
    console.log('   croppedImages.additional:', croppedImages.additional.length, '개');
    croppedImages.additional.forEach((img, idx) => {
      console.log(`      [${idx}]`, img.filename, '-', img.data ? img.data.substring(0, 30) + '...' : 'null');
    });
    
    alert(`✅ ${iconId} 데이터를 불러왔습니다! (추가 이미지 ${imageCount}개 포함)`);
    console.log('✅ 데이터 로드 완료 (설계자, 담당업무, 이미지 포함)\n');
    
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    alert(`❌ 데이터 로드 중 오류 발생: ${error.message}`);
  }
}

// ==================== 이미지 크롭 에디터 ====================

// 크롭된 이미지 데이터 저장소
let croppedImages = {
  main: null,
  additional: []
};

// 대표 이미지 미리보기 표시 함수
function showMainImagePreview(imageData, filename) {
  const mainPreview = document.getElementById('mainImagePreview');
  if (!mainPreview) {
    console.error('❌ mainImagePreview 요소를 찾을 수 없습니다!');
    return;
  }
  
  console.log('🎨 대표 이미지 미리보기 생성 중...');
  console.log('   imageData:', imageData ? imageData.substring(0, 80) + '...' : 'null');
  console.log('   filename:', filename);
  
  mainPreview.innerHTML = '';
  
  const container = document.createElement('div');
  container.style.cssText = 'position: relative; display: inline-block; margin-top: 10px;';
  
  const img = document.createElement('img');
  img.style.cssText = 'max-width: 400px; max-height: 300px; border: 3px solid #3498db; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);';
  
  const label = document.createElement('div');
  label.textContent = filename;
  label.style.cssText = 'margin-top: 8px; font-size: 14px; color: #2c3e50; font-weight: 600; text-align: center;';
  
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.style.cssText = `
    position: absolute; top: -10px; right: -10px; background: #e74c3c; color: white; border: none;
    border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-weight: bold; font-size: 18px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.2s;
  `;
  removeBtn.onmouseover = () => removeBtn.style.transform = 'scale(1.1)';
  removeBtn.onmouseout = () => removeBtn.style.transform = 'scale(1)';
  removeBtn.onclick = function() {
    if (typeof croppedImages !== 'undefined') {
      croppedImages.main = null;
      console.log('🗑️ 대표 이미지 삭제됨');
    }
    mainPreview.innerHTML = '';
  };
  
  // 이미지 로드 성공 시 처리
  img.onload = function() {
    console.log('✅ 대표 이미지 미리보기 로드 성공:', filename);
  };
  
  // 이미지 로드 실패 시 처리
  img.onerror = function() {
    console.error('❌ 대표 이미지 미리보기 로드 실패!');
    console.error('   파일명:', filename);
    console.error('   경로:', imageData ? imageData.substring(0, 100) : 'null');
    
    // 로드 실패 시 "이미지 없음" placeholder 표시
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23f8d7da" stroke="%23e74c3c" stroke-width="3" rx="12"/><text x="50%" y="40%" fill="%23721c24" text-anchor="middle" font-size="18" font-weight="bold">이미지 로드 실패</text><text x="50%" y="55%" fill="%23721c24" text-anchor="middle" font-size="14">' + filename + '</text><text x="50%" y="70%" fill="%23856404" text-anchor="middle" font-size="12">경로를 확인해주세요</text></svg>';
    this.style.border = '3px solid #e74c3c';
  };
  
  // 이미지 소스 설정 (마지막에 설정)
  if (imageData) {
    img.src = imageData;
  }
  
  container.appendChild(img);
  container.appendChild(removeBtn);
  container.appendChild(label);
  mainPreview.appendChild(container);
  
  console.log('✅ 대표 이미지 미리보기 DOM 추가 완료');
  console.log('   mainPreview.children.length:', mainPreview.children.length);
}

// 파일에서 프로젝트 폴더 경로 추출 함수
function extractProjectPath(file) {
  try {
    // 1. webkitRelativePath 시도 (폴더 선택 시)
    let relativePath = file.webkitRelativePath || '';
    
    // 2. fullPath 시도 (일부 브라우저)
    if (!relativePath && file.fullPath) {
      relativePath = file.fullPath;
    }
    
    // 3. path 속성 시도 (일부 환경)
    if (!relativePath && file.path) {
      relativePath = file.path;
    }
    
    console.log('📁 경로 추출 시도:', {
      name: file.name,
      webkitRelativePath: file.webkitRelativePath || '(없음)',
      fullPath: file.fullPath || '(없음)',
      path: file.path || '(없음)',
      relativePath: relativePath || '(없음)'
    });
    
    if (!relativePath || relativePath === file.name) {
      console.warn('⚠️ 경로 정보 없음 - 단일 파일 선택으로 보임');
      return null;
    }
    
    // 파일명 제거하여 폴더 경로만 추출
    const pathParts = relativePath.split(/[/\\]/); // Windows \ 와 Unix / 모두 처리
    pathParts.pop(); // 마지막 요소(파일명) 제거
    
    console.log('📂 경로 파트:', pathParts);
    
    // "projects" 폴더 찾기
    const projectsIndex = pathParts.findIndex(part => part.toLowerCase() === 'projects');
    
    if (projectsIndex !== -1) {
      // projects/ 이후의 경로만 추출
      const projectPath = pathParts.slice(projectsIndex + 1).join('/');
      console.log('✅ projects/ 이후 경로 추출:', projectPath);
      return projectPath;
    } else {
      // projects 폴더가 경로에 없으면 전체 경로 사용
      const projectPath = pathParts.join('/');
      console.log('⚠️ projects 폴더 없음 - 전체 경로 사용:', projectPath);
      return projectPath;
    }
  } catch (error) {
    console.error('❌ 경로 추출 오류:', error);
    return null;
  }
}

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
    
    // 크롭 영역 컨테이너 (1440x960 비율 유지)
    const containerWidth = Math.min(900, window.innerWidth - 100);  // 최대 900px
    const containerHeight = containerWidth * (960 / 1440);  // 비율 유지
    
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
    
    // 붉은색 점선 박스 (1440:960 비율)
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
      const containerAspect = 1440 / 960;
      
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
    confirmBtn.onclick = async () => {
      // 크롭 영역의 이미지 캡처
      const croppedData = cropImage(img, cropContainer, containerWidth, containerHeight);
      
      if (type === 'main') {
        // 파일명과 경로 정보 함께 저장
        const detectedPath = file._detectedPath || file.webkitRelativePath || file.name;
        croppedImages.main = {
          data: croppedData,
          filename: file.name,
          detectedPath: detectedPath
        };
        console.log('✅ 대표 이미지 크롭 완료:', file.name);
        console.log('   감지된 경로:', detectedPath);
        
        // 크롭 후 즉시 미리보기 표시
        showMainImagePreview(croppedData, file.name);
      } else {
        // 추가 이미지는 파일명과 경로 정보 함께 저장
        const detectedPath = file._detectedPath || file.webkitRelativePath || file.name;
        croppedImages.additional.push({
          filename: file.name,
          data: croppedData,
          detectedPath: detectedPath
        });
        
        // 파일명 기준으로 정렬 (오름차순)
        croppedImages.additional.sort((a, b) => {
          return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        console.log(`✅ 추가 이미지 크롭 완료: ${file.name} (총 ${croppedImages.additional.length}개)`);
        console.log(`   감지된 경로: ${detectedPath}`);
        console.log(`📋 정렬된 파일 순서:`, croppedImages.additional.map(img => img.filename));
        
        // 프리뷰 다시 로드
        await reloadAdditionalImagesPreviews();
      }
      
      editorOverlay.remove();
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
  canvas.width = 1440;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  
  // 현재 이미지의 위치와 크기
  const imgLeft = parseInt(img.style.left) || 0;
  const imgTop = parseInt(img.style.top) || 0;
  const imgWidth = img.offsetWidth;
  const imgHeight = img.offsetHeight;
  
  // 스케일 비율 계산
  const scaleX = img.naturalWidth / imgWidth;
  const scaleY = img.naturalHeight / imgHeight;
  
  // 크롭 영역 (컨테이너 전체 = 1440x960 비율)
  const cropX = -imgLeft * scaleX;
  const cropY = -imgTop * scaleY;
  const cropWidth = containerWidth * scaleX;
  const cropHeight = containerHeight * scaleY;
  
  // 캔버스에 그리기
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,  // 소스 영역
    0, 0, 1440, 960  // 대상 영역 (1440x960으로 고정)
  );
  
  return canvas.toDataURL('image/jpeg', 0.95);
}

// 디버깅 함수: 색상 선택기 상태 확인
window.checkColorPickers = function() {
  console.log('🔍 색상 선택기 상태 확인:');
  console.log('   - 색상 버튼 개수:', document.querySelectorAll('.color-picker-btn').length);
  console.log('   - color input 개수:', document.querySelectorAll('.color-picker-btn input[type="color"]').length);
  
  document.querySelectorAll('.color-picker-btn').forEach((btn, i) => {
    const hasInput = btn.querySelector('input[type="color"]') !== null;
    console.log(`   [${i}] ${btn.dataset.target}: ${hasInput ? '✅' : '❌'} (color: ${btn.dataset.color})`);
  });
};

console.log('%c✅ 메인화면 폼 모듈 로드됨', 'color: #3498db; font-weight: bold; font-size: 14px;');
console.log('%c💡 색상 선택기 문제 시 콘솔에서 checkColorPickers() 실행', 'color: #f39c12; font-size: 12px;');

