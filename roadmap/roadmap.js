// 1. 파이어베이스 초기화 세팅 (제공해주신 프로젝트 정보 적용)
const firebaseConfig = {
  apiKey: "AIzaSyBMQkGSc2RwKjAe7h5EcvWWdoJbS5_JjWs",
  authDomain: "rabbit-archi2025-c40a6.firebaseapp.com",
  projectId: "rabbit-archi2025-c40a6",
  storageBucket: "rabbit-archi2025-c40a6.firebasestorage.app",
  messagingSenderId: "577448559589",
  appId: "1:577448559589:web:5b984b45bff89303dd650c",
  databaseURL: "https://rabbit-archi2025-c40a6-default-rtdb.asia-southeast1.firebasedatabase.app" // 싱가포르 서버 주소 자동 완성
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 전역 관리 변수들
let projects = [];
let currentPeriodIndex = 0;
let uniquePeriods = [];
let selectedProjectIndex = null;

// 초기 기본 데이터 (DB가 완전히 비어있을 때 백업용으로만 작동)
const defaultProjects = [
  { type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { type: 'type1', date: '2026.01', period: '2026 H1', desc: ['진주시 글로벌', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { type: 'type2', date: '2026.02', period: '2026 H1', desc: ['가평OO수녀원', '북원도 작성'], rank: '' },
  { type: 'type1', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다부리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { type: 'type1', date: '2026.05', period: '2026 H1', desc: ['앵기발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
  { type: 'type2', date: '2026.05', period: '2026 H1', desc: ['가평OO수녀원', '기본 및 실시설계', '진행중...'], rank: '' }
];

// DOM 요소 탐색
const periodLabel = document.getElementById('period-label');
const fruitContainer = document.getElementById('fruit-container');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

const adminTrigger = document.getElementById('admin-trigger');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');

const projectSelect = document.getElementById('admin-project-select');
const periodInput = document.getElementById('project-period');
const typeInput = document.getElementById('project-type');
const dateInput = document.getElementById('project-date');
const descInput = document.getElementById('project-desc');
const rankInput = document.getElementById('project-rank');

const addBtn = document.getElementById('add-project-btn');
const updateBtn = document.getElementById('update-project-btn');
const deleteBtn = document.getElementById('delete-project-btn');

// ── 데이터 연동 및 정렬 로직 ──

// 날짜 포맷팅 및 정렬 (2026.01 오름차순)
function sortProjects() {
  projects.sort((a, b) => {
    const parseDate = (dStr) => {
      if (!dStr) return 0;
      const parts = dStr.split('.');
      const y = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return y * 100 + m;
    };
    return parseDate(a.date) - parseDate(b.date);
  });
}

// 텍스트 여러줄 입력 파싱
function parseDescValue(val) {
  if (!val) return [];
  return val.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

// 고유 반기 목록 추출 및 기본값 설정
function initPeriods() {
  const allPeriods = projects.map(p => p.period);
  const uniqueSet = new Set(allPeriods);
  
  // 기본 표시를 위한 고정 주기 확보용
  ['2025 H1', '2025 H2', '2026 H1', '2026 H2', '2027 H1', '2027 H2'].forEach(p => uniqueSet.add(p));
  
  uniquePeriods = Array.from(uniqueSet).sort();
  
  // 현재 날짜 기준 자동 포커싱 기본화 로직
  if (currentPeriodIndex === 0 && uniquePeriods.includes('2026 H1')) {
    currentPeriodIndex = uniquePeriods.indexOf('2026 H1');
  }
}

// 🌐 [중요] 파이어베이스 데이터 원격 일괄 업데이트 함수
// 어드민 보안 규칙(Rules) 통과를 위해 암호를 데이터 부모 패널에 실어 보냅니다.
function updateFirebaseDatabase(targetArray, successMessage) {
  db.ref('roadmap_data').set({
    admin_password: "1031!@",
    projects: targetArray
  })
  .then(() => {
    if(successMessage) alert(successMessage);
  })
  .catch((error) => {
    console.error("데이터 저장 실패:", error);
    alert("권한이 없거나 비밀번호 인증에 실패했습니다.\n파이어베이스 Rules 설정을 다시 확인해 주세요.");
  });
}

// 📡 [실시간] 파이어베이스 데이터 구독 및 동기화 리스너
// 이 함수 덕분에 다른 컴퓨터가 데이터를 바꿔도 내 화면이 실시간으로 새로고침 없이 바뀝니다!
// 📡 [실시간] 파이어베이스 데이터 구독 및 동기화 리스너
db.ref('roadmap_data/projects').on('value', (snapshot) => {
  const firebaseData = snapshot.val();
  
  if (!firebaseData || firebaseData.length === 0) {
    // DB가 완전히 비어 있다면 초기 데이터를 심어 줍니다.
    projects = [...defaultProjects];
    updateFirebaseDatabase(projects);
    return;
  }
  
  // 1. 실시간 데이터를 먼저 로컬 배열에 담고 정렬합니다.
  projects = firebaseData;
  sortProjects();
  
  // 2. 전체 데이터 기준 고유 반기 목록(uniquePeriods)을 갱신합니다.
  initPeriods();
  
  // 3. [핵심] 방금 갱신된 uniquePeriods 목록 안에서 현재 표시해야 할 반기('2026 H1')의 정확한 위치(인덱스)를 다시 추적합니다.
  if (uniquePeriods.includes('2026 H1')) {
    currentPeriodIndex = uniquePeriods.indexOf('2026 H1');
  } else if (uniquePeriods.length > 0 && currentPeriodIndex >= uniquePeriods.length) {
    currentPeriodIndex = 0;
  }

  // 4. 어드민 프로젝트 목록과 타임라인 화면을 실시간 렌더링합니다.
  refreshProjectList();
  renderTimeline();
});

// ── UI 렌더링 영역 ──

function renderTimeline() {
  if (uniquePeriods.length === 0) return;
  const currentPeriod = uniquePeriods[currentPeriodIndex];
  periodLabel.textContent = currentPeriod;

  // 현재 반기에 속하는 프로젝트 필터링
  const currentProjects = projects.filter(p => p.period === currentPeriod);

  // 과일 열매 청소 후 재배치
  fruitContainer.innerHTML = '';

  if (currentProjects.length === 0) return;

  const containerWidth = 1400;
  const padding = 120;
  const availableWidth = containerWidth - (padding * 2);
  const count = currentProjects.length;

  currentProjects.forEach((proj, idx) => {
    // 가로 분배 배치 연산
    let leftPos = padding + (availableWidth / 2);
    if (count > 1) {
      leftPos = padding + (availableWidth / (count - 1)) * idx;
    }

    const item = document.createElement('div');
    item.className = `fruit-item ${proj.type || 'type1'}`;
    item.style.left = `${leftPos}px`;

    // 상하 지그재그 높낮이 배치 연산
    if (idx % 2 === 0) {
      item.classList.add('top-fruit');
    } else {
      item.classList.add('bottom-fruit');
    }

    // 줄바꿈 매핑 구성
    const descLines = Array.isArray(proj.desc) ? proj.desc : [proj.desc];
    const descHtml = descLines.map(line => `<span>${line}</span>`).join('');
    const rankHtml = proj.rank ? `<div class="rank-badge">${proj.rank}</div>` : '';

    item.innerHTML = `
      <div class="rope"></div>
      <div class="fruit-node">
        <div class="fruit-click-area"></div>
        <div class="fruit-content">
          <div class="project-date">${proj.date || ''}</div>
          <div class="project-desc">${descHtml}</div>
          ${rankHtml}
        </div>
      </div>
    `;

    fruitContainer.appendChild(item);
  });
}

// ── 어드민 패널 모달 제어 및 이벤트 관리 ──

function refreshProjectList() {
  projectSelect.innerHTML = '<option value="">-- 새로 추가하기 --</option>';
  projects.forEach((p, idx) => {
    const descText = Array.isArray(p.desc) ? p.desc.join(' ') : p.desc;
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `[${p.date || '날짜없음'}] ${descText.substring(0, 16)}...`;
    projectSelect.appendChild(opt);
  });
}

function clearForm() {
  projectSelect.value = '';
  selectedProjectIndex = null;
  typeInput.value = '';
  dateInput.value = '';
  descInput.value = '';
  rankInput.value = '';
  
  addBtn.style.display = 'block';
  document.querySelector('.edit-buttons').style.display = 'none';
}

// 어드민 비밀번호 인증 진입
adminTrigger.addEventListener('click', () => {
  const pw = prompt('관리자 비밀번호를 입력하세요:');
  if (pw === '1031!@') { // 기존 지정된 토끼굴 패스워드 검증
    adminModal.classList.add('show');
    clearForm();
    refreshProjectList();
  } else if (pw !== null) {
    alert('비밀번호가 올바르지 않습니다.');
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.classList.remove('show');
});

// 목록 선택 이벤트 체인지
projectSelect.addEventListener('change', () => {
  const val = projectSelect.value;
  if (val === '') {
    clearForm();
  } else {
    selectedProjectIndex = Number(val);
    const p = projects[selectedProjectIndex];
    if (!p) return;

    periodInput.value = p.period;
    typeInput.value = p.type || 'type1';
    dateInput.value = p.date || '';
    descInput.value = Array.isArray(p.desc) ? p.desc.join('\n') : p.desc;
    rankInput.value = p.rank || '';

    addBtn.style.display = 'none';
    document.querySelector('.edit-buttons').style.display = 'flex';
  }
});

// 프로젝트 추가 실행
addBtn.addEventListener('click', () => {
  if (!typeInput.value || !dateInput.value || !descInput.value) {
    alert('필수 항목(*)들을 모두 입력해 주세요.');
    return;
  }

  const newProject = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: parseDescValue(descInput.value),
    rank: rankInput.value
  };

  const updatedArray = [...projects, newProject];
  updateFirebaseDatabase(updatedArray, '새로운 프로젝트가 실시간으로 추가되었습니다!');
  clearForm();
});

// 프로젝트 수정 실행
updateBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null) return;

  const descLines = parseDescValue(descInput.value);
  const updatedArray = [...projects];

  updatedArray[selectedProjectIndex] = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descLines,
    rank: rankInput.value
  };

  updateFirebaseDatabase(updatedArray, '프로젝트가 실시간으로 수정되었습니다!');
  clearForm();
});

// 프로젝트 삭제 실행
deleteBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null) return;
  if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) return;

  const updatedArray = projects.filter((_, idx) => idx !== selectedProjectIndex);
  updateFirebaseDatabase(updatedArray, '프로젝트가 실시간으로 삭제되었습니다.');
  clearForm();
});

// 좌우 반기 이동 내비게이션
btnPrev.addEventListener('click', () => {
  if (currentPeriodIndex > 0) {
    currentPeriodIndex--;
    renderTimeline();
  }
});

btnNext.addEventListener('click', () => {
  if (currentPeriodIndex < uniquePeriods.length - 1) {
    currentPeriodIndex++;
    renderTimeline();
  }
});

// 최초 실행 초기화 안내
window.addEventListener('DOMContentLoaded', () => {
  console.log("실시간 파이어베이스 타임라인 엔진 가동 시작");
});
