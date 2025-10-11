// ==================== 캐비넷 관리 모듈 ====================
console.log('✅ manager-cabinet.js 로드됨');

// 캐비넷 프로젝트 데이터 저장소
let cabinetData = {
  gridPosition: { row: 0, col: 0 },
  designOverview: { color: '#ffffff' },
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

// 캐비넷 폼 표시 (window 객체에 명시적으로 등록)
window.showCabinetForm = function(action) {
  const actionText = {
    'create': '프로젝트 생성하기',
    'edit': '프로젝트 수정하기'
  }[action] || '프로젝트 관리';
  
  // 이미지 데이터 완전 초기화
  if (typeof croppedImages !== 'undefined') {
    croppedImages.main = null;
    croppedImages.additional = [];
    console.log('🔄 croppedImages 초기화:', croppedImages);
  }
  
  console.log('🗄️ 캐비넷 폼 표시:', actionText);
  
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
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #2c3e50;">📁 캐비넷 ${actionText}</h1>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">메인화면과 별개로 관리되는 프로젝트입니다</p>
  `;
  
  // 폼 컨텐츠 (메인화면과 동일하지만 ID 접두어를 cabinet으로)
  const formContent = document.createElement('div');
  formContent.innerHTML = generateCabinetFormHTML();
  
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
    console.log('캐비넷 저장 버튼 클릭됨');
    const result = await validateAndSaveCabinetForm();
    console.log('캐비넷 저장 결과:', result);
    
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
      successMsg.innerHTML = `
        <div>✅ 캐비넷 저장 완료!</div>
        <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">캐비넷 아이콘을 클릭하여 확인하세요</div>
      `;
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        successMsg.remove();
        overlay.remove();
        
        // 관리자 오버레이 닫힘 플래그 설정
        if (typeof isManagerOverlayOpen !== 'undefined') {
          isManagerOverlayOpen = false;
        }
        
        // 캐비넷 모드로 전환하여 바로 확인할 수 있도록 안내
        if (confirm('✅ 저장 완료!\n\n캐비넷 모드로 전환하여 저장된 프로젝트를 확인하시겠습니까?')) {
          if (typeof showGridIcons === 'function') {
            showGridIcons('cabinet');
          }
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
    
    if (typeof isManagerOverlayOpen !== 'undefined') {
      isManagerOverlayOpen = true;
    }
    
    if (typeof showLocationSelectUI === 'function') {
      showLocationSelectUI(action, actionText);
    }
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
  
  // DOM 렌더링 후 핸들러 초기화
  setTimeout(() => {
    console.log('📋 캐비넷 폼 핸들러 초기화 시작...');
    initializeCabinetFormHandlers();
    console.log('✅ 캐비넷 폼 핸들러 초기화 완료');
  }, 200);
}

// 캐비넷 폼 HTML 생성
function generateCabinetFormHTML() {
  return `
    <div class="cabinet-form" style="
      font-family: 'WAGURI', sans-serif;
      text-align: left;
      max-height: 60vh;
      overflow-y: auto;
      padding: 20px;
    ">
      <!-- 생성 위치 선택 -->
      <div class="form-section" style="margin-bottom: 30px; background: #e8f5e9; padding: 20px; border-radius: 12px; border: 2px solid #4caf50;">
        <label style="font-size: 20px; font-weight: bold; display: block; margin-bottom: 15px; color: #2e7d32;">
          📍 생성 위치 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="flex: 1;">
            <label style="font-size: 14px; font-weight: 600; display: block; margin-bottom: 5px; color: #424242;">행 (Y좌표: 0~7)</label>
            <input type="number" id="cabinet_gridRow" min="0" max="7" value="0" required
              placeholder="0-7"
              style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #4caf50; border-radius: 8px; font-family: 'WAGURI', sans-serif; text-align: center; font-weight: bold;">
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #4caf50; padding-top: 20px;">,</div>
          <div style="flex: 1;">
            <label style="font-size: 14px; font-weight: 600; display: block; margin-bottom: 5px; color: #424242;">열 (X좌표: 0~19)</label>
            <input type="number" id="cabinet_gridCol" min="0" max="19" value="0" required
              placeholder="0-19"
              style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #4caf50; border-radius: 8px; font-family: 'WAGURI', sans-serif; text-align: center; font-weight: bold;">
          </div>
          <button id="cabinet_loadDataBtn" type="button" style="
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
        <div id="cabinet_gridPositionPreview" style="
          margin-top: 12px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          text-align: center;
          font-weight: bold;
          color: #2e7d32;
          font-size: 16px;
        ">
          → 연동 아이콘: <span id="cabinet_targetIconLabel">캐비넷00</span>
        </div>
        <small style="display: block; margin-top: 8px; color: #666; text-align: center;">
          * 행: 0-7 (첫번째 열), 0-7 (두번째 열) / 열: 0 (왼쪽), 1 (오른쪽)
        </small>
      </div>

      <!-- 설계개요 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <div style="display: flex; gap: 10px; align-items: center;">
          <label style="font-size: 24px; font-weight: bold; display: block; color: #2c3e50; flex: 1;">
            설계개요
          </label>
          <div class="color-picker-btn" data-target="cabinet_designOverview" 
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
          <input type="text" id="cabinet_projectName" class="form-input" required
            placeholder="사업명을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="cabinet_projectName" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" id="cabinet_startYear" placeholder="설계년도"
            style="width: 150px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <span style="font-weight: bold;">~</span>
          <input type="text" id="cabinet_endYear" placeholder="준공년도"
            style="width: 150px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
        </div>
      </div>

      <!-- 주용도 -->
      <div class="form-section" style="margin-bottom: 25px; background: #f5f5f5; padding: 20px; border-radius: 12px; border: 2px solid #ddd;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          주용도 <span style="color: red;">*</span>
        </label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="cabinet_usageSelect" 
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
          <input type="text" id="cabinet_usageExtra" placeholder="추가 기재"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <input type="hidden" id="cabinet_usage" class="form-input" required>
          <div class="color-picker-btn" data-target="cabinet_usage" 
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
          <input type="text" id="cabinet_siteLocation" class="form-input" required
            placeholder="대지위치를 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="cabinet_siteLocation" 
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
          <input type="text" id="cabinet_buildingArea" class="form-input" required
            placeholder="건축면적을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="cabinet_buildingArea" 
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
          <input type="text" id="cabinet_totalArea" class="form-input" required
            placeholder="연면적을 입력하세요"
            style="flex: 1; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
          <div class="color-picker-btn" data-target="cabinet_totalArea" 
            style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: white; pointer-events: auto;">
          </div>
        </div>
      </div>

      <!-- 설계자 -->
      <div class="form-section" style="margin-bottom: 25px;">
        <label style="font-size: 18px; font-weight: bold; display: block; margin-bottom: 10px; color: #2c3e50;">
          설계자 <span style="color: red;">*</span>
        </label>
        <div id="cabinet_designersContainer">
          ${generateCabinetDesignerRow(0, true)}
        </div>
        <button type="button" id="cabinet_addDesignerBtn" style="
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
        <div id="cabinet_staffContainer">
          ${generateCabinetStaffRow(0, true)}
        </div>
        <button type="button" id="cabinet_addStaffBtn" style="
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
          <input type="text" id="cabinet_projectFolderPath" 
            placeholder="예: 2024/202403 남원어린이도서관"
            style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #ffc107; border-radius: 8px; font-family: 'WAGURI', sans-serif; background: white;">
        </div>
        
        <!-- 대표 이미지 -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 8px;">
            <label style="font-size: 16px; font-weight: 600; color: #34495e; margin: 0;">
              대표 이미지 <span style="color: red;">*</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #2c3e50; background: #e8f5e9; padding: 8px 12px; border-radius: 6px; border: 2px solid #4caf50;">
              <input type="checkbox" id="cabinet_useInMainLoop" style="width: 18px; height: 18px; cursor: pointer;">
              <span style="font-weight: 600;">메인화면 자동 루프에 사용</span>
            </label>
          </div>
          <div id="cabinet_mainImageDropzone" style="
            border: 3px dashed #4caf50;
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
          <div id="cabinet_mainImagePreview" style="margin-top: 15px;"></div>
        </div>
        
        <!-- 추가 이미지 -->
        <div>
          <label style="font-size: 16px; font-weight: 600; display: block; margin-bottom: 8px; color: #34495e;">
            추가 이미지
          </label>
          <div id="cabinet_additionalImagesDropzone" style="
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
          <div id="cabinet_additionalImagesPreview" style="margin-top: 15px;"></div>
        </div>
      </div>
    </div>
  `;
}

// 캐비넷 설계자 행 생성
function generateCabinetDesignerRow(index, required = false) {
  return `
    <div class="cabinet-designer-row" data-index="${index}" style="
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    ">
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" class="cabinet-designer-field" placeholder="분야" ${required ? 'required' : ''}
          style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
        <input type="text" class="cabinet-designer-office" placeholder="사무소명" ${required ? 'required' : ''}
          style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
        <div class="color-picker-btn" data-target="cabinet_designer${index}" 
          style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white; pointer-events: auto;">
        </div>
        ${!required ? `<button type="button" class="remove-cabinet-designer-btn" style="
          padding: 8px 12px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        ">삭제</button>` : ''}
      </div>
      <input type="url" class="cabinet-designer-homepage" placeholder="홈페이지 주소 (선택사항, 예: https://www.example.com)"
        style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
    </div>
  `;
}

// 캐비넷 담당자 행 생성
function generateCabinetStaffRow(index, required = false) {
  // "건축면적" 자연 너비 측정 (script.js와 동일)
  const tempSpan = document.createElement('span');
  tempSpan.style.cssText = 'position: absolute; visibility: hidden; font-size: 18px; font-weight: bold; font-family: "WAGURI", sans-serif;';
  tempSpan.textContent = '건축면적';
  document.body.appendChild(tempSpan);
  const labelWidth = tempSpan.offsetWidth;
  document.body.removeChild(tempSpan);
  console.log(`📏 [캐비넷] generateCabinetStaffRow(${index}): labelWidth = ${labelWidth}px`);
  
  return `
    <div class="cabinet-staff-row" data-index="${index}" style="
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    ">
      <input type="text" class="cabinet-staff-name" placeholder="이름" ${required ? 'required' : ''}
        style="width: ${labelWidth}px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="cabinet-staff-position" placeholder="직위" ${required ? 'required' : ''}
        style="width: 120px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <input type="text" class="cabinet-staff-role" placeholder="담당업무" ${required ? 'required' : ''}
        style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
      <div class="color-picker-btn" data-target="cabinet_staff${index}" 
        style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white; pointer-events: auto;">
      </div>
      ${!required ? `<button type="button" class="remove-cabinet-staff-btn" style="
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

// 캐비넷 폼 핸들러 초기화
function initializeCabinetFormHandlers() {
  console.log('🚀 initializeCabinetFormHandlers 실행 시작');
  
  // 생성 위치 입력 이벤트
  const gridRowInput = document.getElementById('cabinet_gridRow');
  const gridColInput = document.getElementById('cabinet_gridCol');
  const targetIconLabel = document.getElementById('cabinet_targetIconLabel');
  
  console.log('🔍 폼 요소 확인:');
  console.log('  - gridRowInput:', gridRowInput ? '✅' : '❌');
  console.log('  - gridColInput:', gridColInput ? '✅' : '❌');
  console.log('  - targetIconLabel:', targetIconLabel ? '✅' : '❌');
  
  function updateCabinetTargetIcon() {
    let row = parseInt(gridRowInput.value) || 0;
    let col = parseInt(gridColInput.value) || 0;
    
    // 유효성 검사
    if (row < 0 || row > 7) {
      row = 0;
      gridRowInput.value = 0;
    }
    
    if (col < 0 || col > 19) {
      col = 0;
      gridColInput.value = 0;
    }
    
    // 19,7 (관리자 이동 위치)만 제외
    if (col === 19 && row === 7) {
      targetIconLabel.textContent = `⚠️ 19,7은 관리자 아이콘이 이동한 위치입니다`;
      targetIconLabel.style.color = 'red';
      return;
    }
    
    // iconId 생성: C{열}{행}
    const iconId = `C${col}${row}`;
    targetIconLabel.textContent = `캐비넷 ${col},${row} (${iconId})`;
    targetIconLabel.style.color = '';
  }
  
  gridRowInput.addEventListener('input', updateCabinetTargetIcon);
  gridColInput.addEventListener('input', updateCabinetTargetIcon);
  gridRowInput.addEventListener('change', updateCabinetTargetIcon);
  gridColInput.addEventListener('change', updateCabinetTargetIcon);
  updateCabinetTargetIcon();
  
  // 주용도 선택 및 추가 입력 합치기
  const usageSelect = document.getElementById('cabinet_usageSelect');
  const usageExtra = document.getElementById('cabinet_usageExtra');
  const usageHidden = document.getElementById('cabinet_usage');
  
  function updateCabinetUsageValue() {
    const selectedValue = usageSelect?.value || '';
    const extraValue = usageExtra?.value?.trim() || '';
    
    if (selectedValue) {
      if (extraValue) {
        usageHidden.value = `${selectedValue} ${extraValue}`;
      } else {
        usageHidden.value = selectedValue;
      }
    } else {
      usageHidden.value = extraValue;
    }
    
    console.log('캐비넷 주용도 업데이트:', usageHidden.value);
  }
  
  if (usageSelect) {
    usageSelect.addEventListener('change', updateCabinetUsageValue);
  }
  if (usageExtra) {
    usageExtra.addEventListener('input', updateCabinetUsageValue);
  }
  
  // 불러오기 버튼 이벤트
  const loadDataBtn = document.getElementById('cabinet_loadDataBtn');
  console.log('🔍 불러오기 버튼 찾기:', loadDataBtn ? '✅ 찾음' : '❌ 못 찾음');
  
  if (loadDataBtn) {
    loadDataBtn.addEventListener('click', () => {
      const row = parseInt(gridRowInput.value) || 0;
      const col = parseInt(gridColInput.value) || 0;
      const iconId = `C${col}${row}`;
      
      console.log(`🔄 불러오기 버튼 클릭됨: 행=${row}, 열=${col}, iconId=${iconId}`);
      
      loadCabinetDataToForm(iconId);
    });
    console.log('✅ 불러오기 버튼 이벤트 등록 완료');
  } else {
    console.error('❌ 불러오기 버튼을 찾을 수 없어서 이벤트 등록 실패');
  }
  
  // 색상 선택기 초기화 (initializeColorPickers 함수 재사용)
  if (typeof initializeColorPickers === 'function') {
    initializeColorPickers();
  }
  
  // 설계자 추가 버튼
  const addDesignerBtn = document.getElementById('cabinet_addDesignerBtn');
  if (addDesignerBtn) {
    addDesignerBtn.onclick = () => {
      const container = document.getElementById('cabinet_designersContainer');
      const currentCount = container.querySelectorAll('.cabinet-designer-row').length;
      if (currentCount < 10) {
        const newRow = document.createElement('div');
        newRow.innerHTML = generateCabinetDesignerRow(currentCount, false);
        container.appendChild(newRow.firstElementChild);
        
        setTimeout(() => {
          if (typeof initializeColorPickers === 'function') {
            initializeColorPickers();
          }
          attachCabinetRemoveHandlers();
        }, 100);
      } else {
        alert('설계자는 최대 10명까지 추가할 수 있습니다.');
      }
    };
  }
  
  // 담당자 추가 버튼
  const addStaffBtn = document.getElementById('cabinet_addStaffBtn');
  if (addStaffBtn) {
    addStaffBtn.onclick = () => {
      const container = document.getElementById('cabinet_staffContainer');
      const currentCount = container.querySelectorAll('.cabinet-staff-row').length;
      if (currentCount < 5) {
        const newRow = document.createElement('div');
        newRow.innerHTML = generateCabinetStaffRow(currentCount, false);
        container.appendChild(newRow.firstElementChild);
        
        setTimeout(() => {
          if (typeof initializeColorPickers === 'function') {
            initializeColorPickers();
          }
          attachCabinetRemoveHandlers();
        }, 100);
      } else {
        alert('담당자는 최대 5명까지 추가할 수 있습니다.');
      }
    };
  }
  
  // 삭제 버튼 핸들러
  attachCabinetRemoveHandlers();
  
  // 드롭존 초기화
  initializeCabinetDropzones();
}

// 캐비넷 삭제 버튼 핸들러
function attachCabinetRemoveHandlers() {
  document.querySelectorAll('.remove-cabinet-designer-btn').forEach(btn => {
    btn.onclick = function() {
      this.closest('.cabinet-designer-row').remove();
    };
  });
  
  document.querySelectorAll('.remove-cabinet-staff-btn').forEach(btn => {
    btn.onclick = function() {
      this.closest('.cabinet-staff-row').remove();
    };
  });
}

// 캐비넷 드롭존 초기화
function initializeCabinetDropzones() {
  if (typeof Dropzone === 'undefined') {
    console.error('Dropzone이 로드되지 않았습니다.');
    return;
  }
  
  Dropzone.autoDiscover = false;
  
  // 대표 이미지 드롭존
  const mainImageZone = new Dropzone('#cabinet_mainImageDropzone', {
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
        const projectFolderPathInput = document.getElementById('cabinet_projectFolderPath');
        if (projectFolderPathInput && !projectFolderPathInput.value && typeof extractProjectPath === 'function') {
          const detectedPath = extractProjectPath(file);
          if (detectedPath) {
            projectFolderPathInput.value = detectedPath;
            console.log('✅ 캐비넷 프로젝트 폴더 경로 자동 감지:', detectedPath);
          }
        }
        
        const previewElement = file.previewElement;
        if (previewElement) {
          const successMark = previewElement.querySelector('.dz-success-mark');
          const errorMark = previewElement.querySelector('.dz-error-mark');
          if (successMark) successMark.style.display = 'none';
          if (errorMark) errorMark.style.display = 'none';
        }
        
        // 크롭 에디터 표시 (타입은 'main'으로 전달)
        if (typeof showImageCropEditor === 'function') {
          showImageCropEditor(file, 'main', this);
        }
      });
    }
  });
  
  // 추가 이미지 드롭존
  const additionalImagesZone = new Dropzone('#cabinet_additionalImagesDropzone', {
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
        const previewElement = file.previewElement;
        if (previewElement) {
          const successMark = previewElement.querySelector('.dz-success-mark');
          const errorMark = previewElement.querySelector('.dz-error-mark');
          if (successMark) successMark.style.display = 'none';
          if (errorMark) errorMark.style.display = 'none';
        }
      });
      
      this.on('addedfiles', function(files) {
        // 첫 번째 파일로 프로젝트 폴더 경로 자동 감지
        const projectFolderPathInput = document.getElementById('cabinet_projectFolderPath');
        if (projectFolderPathInput && !projectFolderPathInput.value && files.length > 0 && typeof extractProjectPath === 'function') {
          const detectedPath = extractProjectPath(files[0]);
          if (detectedPath) {
            projectFolderPathInput.value = detectedPath;
            console.log('✅ 캐비넷 프로젝트 폴더 경로 자동 감지:', detectedPath);
          }
        }
        
        files.forEach((file, index) => {
          if (typeof showImageCropEditor === 'function') {
            setTimeout(() => showImageCropEditor(file, 'additional', this, index), index * 100);
          }
        });
      });
    }
  });
}

// 캐비넷 폼 유효성 검사 및 저장
async function validateAndSaveCabinetForm() {
  // 생성 위치 확인
  const gridRow = parseInt(document.getElementById('cabinet_gridRow').value);
  const gridCol = parseInt(document.getElementById('cabinet_gridCol').value);
  
  if (isNaN(gridRow) || isNaN(gridCol)) {
    alert('❌ 생성 위치(행, 열)를 입력해주세요.');
    return false;
  }
  
  const requiredFields = {
    'cabinet_projectName': '사업명',
    'cabinet_usage': '주용도',
    'cabinet_siteLocation': '대지위치',
    'cabinet_buildingArea': '건축면적',
    'cabinet_totalArea': '연면적'
  };
  
  for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
    const input = document.getElementById(fieldId);
    if (!input || !input.value.trim()) {
      alert(`❌ 필수 항목을 입력해주세요: ${fieldName}`);
      if (input) input.focus();
      return false;
    }
  }
  
  console.log('✅ 캐비넷 필수 항목 검증 통과');
  
  // 그리드 위치로 아이콘 ID 계산 (캐비넷은 C 접두어)
  const iconId = `C${gridCol}${gridRow}`;
  console.log('🎯 캐비넷 아이콘 ID:', iconId);
  
  try {
    // 헬퍼 함수: 안전하게 색상 가져오기
    const getColor = (target) => {
      const btn = document.querySelector(`.color-picker-btn[data-target="${target}"]`);
      const color = btn?.dataset?.color || '#000000';
      return color;
    };
    
    // 기존 데이터 로드
    const existingData = await loadProjectFromDB(`projectData_${iconId}`);
    
    // 프로젝트 폴더 경로 추출
    const projectFolderPath = document.getElementById('cabinet_projectFolderPath')?.value?.trim() || '';
    
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
    
    console.log('📁 캐비넷 프로젝트 폴더 경로:', projectFolderPath || '(없음 - Base64만 저장)');
    
    // 이미지 데이터 처리 (메인화면과 동일한 로직)
    let finalMainImageBase64 = null;
    let finalMainImagePath = null;
    
    console.log('🖼️ 대표 이미지 처리 시작...');
    console.log('   croppedImages.main:', croppedImages?.main ? '있음' : '없음');
    
    if (typeof croppedImages !== 'undefined' && croppedImages.main) {
      // croppedImages에 데이터가 있으면 이것만 사용 (기존 데이터 무시)
      console.log('   → 새 이미지 데이터 사용 (기존 데이터 덮어쓰기)');
      if (typeof croppedImages.main === 'object' && croppedImages.main.data) {
        // 객체 구조 { data, filename }
        if (croppedImages.main.data.startsWith('data:')) {
          // 새로 업로드한 base64
          finalMainImageBase64 = croppedImages.main.data;
          finalMainImagePath = generateImagePath(croppedImages.main.filename);
          console.log('   새 base64:', croppedImages.main.filename);
          console.log('   생성 경로:', finalMainImagePath);
        } else if (croppedImages.main.data.startsWith('projects/') || croppedImages.main.data.startsWith('cabinet/')) {
          // 경로 (불러오기 시)
          finalMainImagePath = croppedImages.main.data;
          finalMainImageBase64 = existingData?.mainImage;
          console.log('   경로 유지:', croppedImages.main.data.substring(0, 30));
        }
      } else if (typeof croppedImages.main === 'string') {
        // 문자열 (하위 호환)
        if (croppedImages.main.startsWith('data:')) {
          finalMainImageBase64 = croppedImages.main;
          console.log('   새 base64 (문자열)');
        } else {
          finalMainImagePath = croppedImages.main;
          finalMainImageBase64 = existingData?.mainImage;
          console.log('   경로 유지 (문자열):', croppedImages.main.substring(0, 30));
        }
      }
    } else if (existingData && existingData.mainImage) {
      // croppedImages가 없고 기존 데이터가 있으면 기존 데이터 유지
      console.log('   → 기존 데이터 유지 (croppedImages 없음)');
      finalMainImageBase64 = existingData.mainImage;
      finalMainImagePath = existingData.mainImagePath;
    } else {
      // 둘 다 없으면 null
      console.log('   → 대표 이미지 없음');
    }
    
    // 추가 이미지 처리
    const finalAdditionalImagesBase64 = [];
    const finalAdditionalImagePaths = [];
    
    console.log('📸 추가 이미지 처리 시작...');
    console.log('   croppedImages.additional:', croppedImages?.additional?.length || 0, '개');
    
    if (typeof croppedImages !== 'undefined' && croppedImages.additional && croppedImages.additional.length > 0) {
      // croppedImages에 데이터가 있으면 이것만 사용 (기존 데이터 무시)
      console.log('   → 새 이미지 데이터 사용 (기존 데이터 덮어쓰기)');
      croppedImages.additional.forEach((imgObj, idx) => {
        const imgData = imgObj.data || imgObj;
        if (imgData && imgData.startsWith('data:')) {
          finalAdditionalImagesBase64.push(imgData);
          finalAdditionalImagePaths.push(generateImagePath(imgObj.filename));
          console.log(`   [${idx}] 새 base64:`, imgObj.filename);
          console.log(`   [${idx}] 생성 경로:`, generateImagePath(imgObj.filename));
        } else if (imgData && (imgData.startsWith('projects/') || imgData.startsWith('cabinet/'))) {
          finalAdditionalImagePaths.push(imgData);
          finalAdditionalImagesBase64.push(existingData?.additionalImages?.[idx] || imgData);
          console.log(`   [${idx}] 경로 유지:`, imgData.substring(0, 30));
        }
      });
    } else if (existingData && existingData.additionalImages && existingData.additionalImages.length > 0) {
      // croppedImages가 비어있고 기존 데이터가 있으면 기존 데이터 유지
      console.log('   → 기존 데이터 유지 (croppedImages 비어있음)');
      finalAdditionalImagesBase64.push(...(existingData.additionalImages || []));
      finalAdditionalImagePaths.push(...(existingData.additionalImagePaths || []));
    } else {
      // 둘 다 없으면 빈 배열
      console.log('   → 추가 이미지 없음');
    }
    
    console.log('📋 캐비넷 이미지 데이터 처리:');
    console.log('   mainImage:', finalMainImageBase64 ? 'base64 ✅' : 'null');
    console.log('   mainImagePath:', finalMainImagePath || 'null');
    console.log('   additionalImages:', finalAdditionalImagesBase64.length, '개');
    console.log('   additionalImagePaths:', finalAdditionalImagePaths.length, '개');
    
    // 캐비넷 데이터 수집 (projectFolderPath는 810줄에서 이미 선언됨)
    cabinetData = {
      gridPosition: { row: gridRow, col: gridCol },
      iconId: iconId,
      projectFolderPath: projectFolderPath || null,  // 프로젝트 폴더 경로 저장
      designOverview: {
        color: getColor('cabinet_designOverview')
      },
      projectName: {
        text: document.getElementById('cabinet_projectName').value,
        color: getColor('cabinet_projectName'),
        startYear: document.getElementById('cabinet_startYear').value,
        endYear: document.getElementById('cabinet_endYear').value
      },
      usage: {
        text: document.getElementById('cabinet_usage').value,
        color: getColor('cabinet_usage')
      },
      location: {
        text: document.getElementById('cabinet_siteLocation').value,
        color: getColor('cabinet_siteLocation')
      },
      buildingArea: {
        text: document.getElementById('cabinet_buildingArea').value,
        color: getColor('cabinet_buildingArea')
      },
      totalArea: {
        text: document.getElementById('cabinet_totalArea').value,
        color: getColor('cabinet_totalArea')
      },
      designers: collectCabinetDesigners(),
      staff: collectCabinetStaff(),
      mainImage: finalMainImageBase64,
      mainImagePath: finalMainImagePath,
      additionalImages: finalAdditionalImagesBase64,
      additionalImagePaths: finalAdditionalImagePaths,
      useInMainLoop: document.getElementById('cabinet_useInMainLoop')?.checked || false  // 메인 루프 사용 여부
    };
    
    console.log('📋 캐비넷 저장 데이터:', cabinetData);
    
    // IndexedDB에 저장
    const storageKey = `projectData_${iconId}`;
    
    if (typeof saveProjectToDB === 'function') {
      await saveProjectToDB(storageKey, cabinetData);
      console.log(`✅ ${iconId} 캐비넷 데이터 저장 완료!`);
      
      // 전체 프로젝트 목록 업데이트
      if (typeof updateProjectList === 'function') {
        updateProjectList(iconId);
      }
      
      // 아이콘 이미지 업데이트 (표시는 하지 않음 - 캐비넷 모드에서만 보임)
      if (typeof updateIconImage === 'function') {
        await updateIconImage(iconId, cabinetData);
        console.log(`✅ ${iconId} 캐비넷 아이콘 이미지 업데이트 완료 (숨김 유지)`);
        
        // 아이콘은 숨김 상태 유지 (캐비넷 모드에서만 표시됨)
        const iconWrapper = document.querySelector(`.icon-wrapper[data-id="${iconId}"]`);
        if (iconWrapper) {
          iconWrapper.style.display = 'none';
          iconWrapper.style.visibility = 'hidden';
          iconWrapper.style.opacity = '0';
        }
      } else {
        console.warn('updateIconImage 함수를 찾을 수 없습니다.');
      }
      
      return true;
    } else {
      console.error('saveProjectToDB 함수를 찾을 수 없습니다.');
      return false;
    }
  } catch (error) {
    console.error('캐비넷 데이터 저장 오류:', error);
    alert(`❌ 저장 중 오류 발생: ${error.message}`);
    return false;
  }
}

// 캐비넷 설계자 데이터 수집
function collectCabinetDesigners() {
  const designers = [];
  try {
    document.querySelectorAll('.cabinet-designer-row').forEach(row => {
      const fieldInput = row.querySelector('.cabinet-designer-field');
      const officeInput = row.querySelector('.cabinet-designer-office');
      const homepageInput = row.querySelector('.cabinet-designer-homepage');
      const colorBtn = row.querySelector('.color-picker-btn');
      
      const field = fieldInput ? fieldInput.value : '';
      const office = officeInput ? officeInput.value : '';
      const homepage = homepageInput ? homepageInput.value : '';
      const color = colorBtn?.dataset?.color || '#ffffff';
      
      if (field || office) {
        designers.push({ field, office, homepage, color });
      }
    });
    console.log('캐비넷 설계자 수집 완료:', designers.length, '명');
  } catch (error) {
    console.error('캐비넷 설계자 수집 오류:', error);
  }
  return designers;
}

// 캐비넷 담당자 데이터 수집
function collectCabinetStaff() {
  const staff = [];
  try {
    document.querySelectorAll('.cabinet-staff-row').forEach(row => {
      const nameInput = row.querySelector('.cabinet-staff-name');
      const positionInput = row.querySelector('.cabinet-staff-position');
      const roleInput = row.querySelector('.cabinet-staff-role');
      const colorBtn = row.querySelector('.color-picker-btn');
      
      const name = nameInput ? nameInput.value : '';
      const position = positionInput ? positionInput.value : '';
      const role = roleInput ? roleInput.value : '';
      const color = colorBtn?.dataset?.color || '#ffffff';
      
      if (name || position || role) {
        staff.push({ name, position, role, color });
      }
    });
    console.log('캐비넷 담당자 수집 완료:', staff.length, '명');
  } catch (error) {
    console.error('캐비넷 담당자 수집 오류:', error);
  }
  return staff;
}

// 캐비넷 추가 이미지 프리뷰 다시 로드
async function reloadCabinetAdditionalImagesPreviews() {
  const additionalPreview = document.getElementById('cabinet_additionalImagesPreview');
  if (!additionalPreview) {
    console.error('❌ cabinet_additionalImagesPreview 요소를 찾을 수 없습니다!');
    return;
  }
  
  console.log(`🔄 캐비넷 추가 이미지 프리뷰 재로드 시작: ${croppedImages.additional.length}개`);
  
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
      // 다시 렌더링 (인덱스 재정렬)
      await reloadCabinetAdditionalImagesPreviews();
    };
    
    const label = document.createElement('div');
    const filename = imgObj.filename || `이미지 ${idx + 1}`;
    label.textContent = filename;
    label.style.cssText = 'text-align: center; font-size: 11px; color: #7f8c8d; margin-top: 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.title = filename;
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    imgContainer.appendChild(label);
    additionalPreview.appendChild(imgContainer);
  }
  
  console.log(`✅ 캐비넷 추가 이미지 프리뷰 재로드 완료: ${croppedImages.additional.length}개`);
  console.log(`   additionalPreview.children.length:`, additionalPreview.children.length);
}

// 캐비넷 데이터를 폼에 불러오기
async function loadCabinetDataToForm(iconId) {
  const storageKey = `projectData_${iconId}`;
  
  console.log(`\n📂 ${iconId} 캐비넷 데이터 불러오기 시작...`);
  
  // 먼저 이미지 프리뷰 초기화
  const mainPreview = document.getElementById('cabinet_mainImagePreview');
  const additionalPreview = document.getElementById('cabinet_additionalImagesPreview');
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
    if (typeof loadProjectFromDB !== 'function') {
      alert('데이터 로드 함수를 찾을 수 없습니다.');
      return;
    }
    
    const projectData = await loadProjectFromDB(storageKey);
    
    if (!projectData) {
      alert(`❌ ${iconId}에 저장된 데이터가 없습니다.`);
      return;
    }
    
    console.log(`✅ ${iconId} 캐비넷 데이터 로드됨:`, projectData.projectName?.text);
    
    // 필드 입력
    document.getElementById('cabinet_projectName').value = projectData.projectName?.text || '';
    document.getElementById('cabinet_startYear').value = projectData.projectName?.startYear || '';
    document.getElementById('cabinet_endYear').value = projectData.projectName?.endYear || '';
    
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
    
    for (const option of usageOptions) {
      if (usageText.startsWith(option)) {
        selectedOption = option;
        extraText = usageText.substring(option.length).trim();
        break;
      }
    }
    
    if (!selectedOption) {
      extraText = usageText;
    }
    
    document.getElementById('cabinet_usageSelect').value = selectedOption;
    document.getElementById('cabinet_usageExtra').value = extraText;
    document.getElementById('cabinet_usage').value = usageText;
    
    // 프로젝트 폴더 경로 복원
    const projectFolderPathInput = document.getElementById('cabinet_projectFolderPath');
    if (projectFolderPathInput) {
      projectFolderPathInput.value = projectData.projectFolderPath || '';
      console.log('✅ 캐비넷 프로젝트 폴더 경로 복원:', projectData.projectFolderPath || '(없음)');
    }
    document.getElementById('cabinet_siteLocation').value = projectData.location?.text || '';
    document.getElementById('cabinet_buildingArea').value = projectData.buildingArea?.text || '';
    document.getElementById('cabinet_totalArea').value = projectData.totalArea?.text || '';
    
    // 색상 적용
    const colorFields = {
      'cabinet_designOverview': projectData.designOverview?.color,
      'cabinet_projectName': projectData.projectName?.color,
      'cabinet_usage': projectData.usage?.color,
      'cabinet_siteLocation': projectData.location?.color,
      'cabinet_buildingArea': projectData.buildingArea?.color,
      'cabinet_totalArea': projectData.totalArea?.color
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
      const designersContainer = document.getElementById('cabinet_designersContainer');
      designersContainer.innerHTML = '';
      
      projectData.designers.forEach((designer, index) => {
        const rowHTML = `
          <div class="cabinet-designer-row" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="text" class="cabinet-designer-field" value="${designer.field || ''}" placeholder="분야"
                style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
              <input type="text" class="cabinet-designer-office" value="${designer.office || ''}" placeholder="사무소명"
                style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 8px; font-family: 'WAGURI', sans-serif;">
              <div class="color-picker-btn" data-target="cabinet_designer${index}" data-color="${designer.color || '#ffffff'}"
                style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: ${designer.color || '#ffffff'}; pointer-events: auto;">
              </div>
              ${index > 0 ? '<button type="button" class="remove-cabinet-designer-btn" style="padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : ''}
            </div>
            <input type="url" class="cabinet-designer-homepage" value="${designer.homepage || ''}" placeholder="홈페이지 주소 (선택사항, 예: https://www.example.com)"
              style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
          </div>
        `;
        designersContainer.insertAdjacentHTML('beforeend', rowHTML);
      });
      
      console.log('설계자 데이터 불러옴:', projectData.designers.length, '명');
    }
    
    // 담당업무 데이터 불러오기
    if (projectData.staff && projectData.staff.length > 0) {
      const staffContainer = document.getElementById('cabinet_staffContainer');
      staffContainer.innerHTML = '';
      
      // "건축면적" 자연 너비 측정 (script.js와 동일)
      const tempSpan = document.createElement('span');
      tempSpan.style.cssText = 'position: absolute; visibility: hidden; font-size: 18px; font-weight: bold; font-family: "WAGURI", sans-serif;';
      tempSpan.textContent = '건축면적';
      document.body.appendChild(tempSpan);
      const labelWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      projectData.staff.forEach((member, index) => {
        const rowHTML = `
          <div class="cabinet-staff-row" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <input type="text" class="cabinet-staff-name" value="${member.name || ''}" placeholder="이름"
              style="width: ${labelWidth}px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="cabinet-staff-position" value="${member.position || ''}" placeholder="직위"
              style="width: 120px; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <input type="text" class="cabinet-staff-role" value="${member.role || ''}" placeholder="담당업무"
              style="flex: 1; padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 6px; font-family: 'WAGURI', sans-serif;">
            <div class="color-picker-btn" data-target="cabinet_staff${index}" data-color="${member.color || '#ffffff'}"
              style="width: 40px; height: 40px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: ${member.color || '#ffffff'}; pointer-events: auto;">
            </div>
            ${index > 0 ? '<button type="button" class="remove-cabinet-staff-btn" style="width: 60px; padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">삭제</button>' : '<div style="width: 60px;"></div>'}
          </div>
        `;
        staffContainer.insertAdjacentHTML('beforeend', rowHTML);
      });
      
      console.log('담당업무 데이터 불러옴:', projectData.staff.length, '명');
    }
    
    // 이미지 데이터 불러오기
    console.log('🖼️ 캐비넷 이미지 데이터 확인...');
    console.log('   mainImage:', projectData.mainImage ? 'base64 있음' : 'null');
    console.log('   mainImagePath:', projectData.mainImagePath || 'null');
    console.log('   additionalImages:', projectData.additionalImages?.length || 0, '개');
    console.log('   additionalImagePaths:', projectData.additionalImagePaths?.length || 0, '개');
    
    // croppedImages 초기화
    if (typeof croppedImages !== 'undefined') {
      croppedImages.main = null;
      croppedImages.additional = [];
    }
    
    // 대표 이미지 불러오기
    const mainImageSource = projectData.mainImagePath || projectData.mainImage;
    if (mainImageSource) {
      let filename = '메인이미지.jpg';
      if (projectData.mainImagePath) {
        const pathParts = projectData.mainImagePath.split('/');
        filename = pathParts[pathParts.length - 1];
      }
      
      if (typeof croppedImages !== 'undefined') {
        croppedImages.main = {
          data: mainImageSource,
          filename: filename
        };
      }
      
      const mainPreview = document.getElementById('cabinet_mainImagePreview');
      if (mainPreview) {
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; display: inline-block;';
        
        const img = document.createElement('img');
        
        // 경로인 경우 직접 사용 (브라우저가 자동으로 로드)
        let displaySource = mainImageSource;
        
        if (mainImageSource.startsWith('projects/') || mainImageSource.startsWith('cabinet/')) {
          console.log('대표 이미지 프리뷰: 경로 이미지 사용:', mainImageSource);
          // 경로를 그대로 사용 - 브라우저가 자동으로 처리
          displaySource = mainImageSource;
        }
        
        img.src = displaySource;
        img.style.cssText = 'max-width: 300px; border: 2px solid #4caf50; border-radius: 8px;';
        
        // 이미지 로드 실패 시 "경로만 있음" placeholder 표시
        img.onerror = function() {
          if (this.src.startsWith('data:image/svg+xml')) return; // 이미 placeholder면 무시
          console.error('❌ 대표 이미지 로드 실패!');
          console.error('   시도한 경로:', displaySource);
          console.error('   현재 URL:', window.location.href);
          console.error('   절대 경로:', new URL(displaySource, window.location.href).href);
          // Placeholder는 표시하지 않고 실제 경로를 그대로 유지하여 브라우저가 처리하도록 함
          // this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="%234caf50"/><text x="50%" y="50%" fill="white" text-anchor="middle" dy=".3em" font-size="16">경로만 있음</text></svg>';
        };
        
        // 이미지 로드 성공 시 로그
        img.onload = function() {
          if (!this.src.startsWith('data:image/svg+xml')) {
            console.log('✅ 대표 이미지 로드 성공:', displaySource.substring(0, 80));
          }
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = `
          position: absolute; top: -10px; right: -10px; background: #e74c3c; color: white; border: none;
          border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-weight: bold;
        `;
        removeBtn.onclick = function() {
          if (typeof croppedImages !== 'undefined') {
            croppedImages.main = null;
            console.log('🗑️ 대표 이미지 삭제됨');
          }
          // 프리뷰 완전히 제거
          mainPreview.innerHTML = '';
        };
        
        container.appendChild(img);
        container.appendChild(removeBtn);
        mainPreview.innerHTML = '';
        mainPreview.appendChild(container);
        
        console.log('✅ 대표 이미지 프리뷰 추가됨');
      }
    }
    
    // 추가 이미지 불러오기
    const hasAdditionalImages = (projectData.additionalImagePaths?.length > 0) || (projectData.additionalImages?.length > 0);
    
    if (hasAdditionalImages) {
      const imageCount = projectData.additionalImagePaths?.length || projectData.additionalImages?.length || 0;
      console.log(`🖼️ 추가 이미지 ${imageCount}개 불러오기...`);
      
      if (typeof croppedImages !== 'undefined') {
        croppedImages.additional = [];
        
        for (let idx = 0; idx < imageCount; idx++) {
          const imagePath = projectData.additionalImagePaths?.[idx];
          const imageData = projectData.additionalImages?.[idx];
          const imageSource = imagePath || imageData;
          
          if (imageSource) {
            let filename = `추가이미지_${String(idx + 1).padStart(3, '0')}.png`;
            if (imagePath) {
              const pathParts = imagePath.split('/');
              filename = pathParts[pathParts.length - 1];
            }
            
            croppedImages.additional.push({
              filename: filename,
              data: imageSource
            });
            
            console.log(`  ${idx + 1}. ${filename}`);
          }
        }
      }
      
      // 추가 이미지 프리뷰 표시 (함수 사용)
      await reloadCabinetAdditionalImagesPreviews();
    }
    
    // 메인 루프 체크박스 설정
    const useInMainLoopCheckbox = document.getElementById('cabinet_useInMainLoop');
    if (useInMainLoopCheckbox) {
      useInMainLoopCheckbox.checked = projectData.useInMainLoop || false;
      console.log('✅ 캐비넷 메인 루프 사용 설정:', projectData.useInMainLoop);
    }
    
    // 색상 선택기 재초기화
    setTimeout(() => {
      if (typeof initializeColorPickers === 'function') {
        initializeColorPickers();
      }
      attachCabinetRemoveHandlers();
    }, 300);
    
    alert(`✅ ${iconId} 캐비넷 데이터를 불러왔습니다!\n\n이미지: ${projectData.mainImage ? '대표 ✅' : '대표 ❌'} / 추가 ${projectData.additionalImages?.length || 0}개`);
    console.log('✅ 캐비넷 데이터 로드 완료 (설계자, 담당업무, 이미지 포함)\n');
    
  } catch (error) {
    console.error('캐비넷 데이터 로드 오류:', error);
    alert(`❌ 데이터 로드 중 오류 발생: ${error.message}`);
  }
}

console.log('%c✅ 캐비넷 관리 모듈 로드됨', 'color: #4caf50; font-weight: bold; font-size: 14px;');
console.log('🔍 showCabinetForm 함수 등록:', typeof window.showCabinetForm);

