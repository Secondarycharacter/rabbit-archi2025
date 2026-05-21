// 1. 파이어베이스 초기화 세팅
const firebaseConfig = {
  apiKey: "AIzaSyBMQkGSc2RwKjAe7h5EcvWWdoJbS5_JjWs",
  authDomain: "rabbit-archi2025-c40a6.firebaseapp.com",
  projectId: "rabbit-archi2025-c40a6",
  storageBucket: "rabbit-archi2025-c40a6.firebasestorage.app",
  messagingSenderId: "577448559589",
  appId: "1:577448559589:web:5b984b45bff89303dd650c",
  databaseURL: "https://rabbit-archi2025-c40a6-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 전역 관리 변수들
let projects = [];
let currentPeriodIndex = 0;
let uniquePeriods = [];
let selectedProjectIndex = null;

// 초기 기본 데이터 (DB가 완전히 비어있을 때 백업용)
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

// HTML의 select id인 'project-select'에 맞춤
const projectSelect = document.getElementById('project-select'); 
const periodInput = document.getElementById('project-period');
const typeInput = document.getElementById('project-type');
const dateInput = document.getElementById('project-date');
const descInput = document.getElementById('project-desc');
const rankInput = document.getElementById('project-rank');

const addBtn = document.getElementById('add-project-btn');
const updateBtn = document.getElementById('update-project-btn');
const deleteBtn = document.getElementById('delete-project-btn');

// ── 데이터 연동 및 정렬 로직 ──

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

function parseDescValue(val) {
  if (!val) return [];
  return val.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

function initPeriods() {
  const allPeriods = projects.map(p => p.period);
  const uniqueSet = new Set(allPeriods);
  
  ['2025 H1', '2025 H2', '2026 H1', '2026 H2', '2027 H1', '2027 H2'].forEach(p => uniqueSet.add(p));
  uniquePeriods = Array.from(uniqueSet).sort();
}

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
    alert("권한이 없거나 비밀번호 인증에 실패했습니다.");
  });
}

// 📡 [실시간] 파이어베이스 구독 리스너
db.ref('roadmap_data/projects').on('value', (snapshot) => {
  const firebaseData = snapshot.val();
  
  if (!firebaseData || firebaseData.length === 0) {
    projects = [...defaultProjects];
    updateFirebaseDatabase(projects);
    return;
  }
  
  projects = firebaseData;
  sortProjects();
  initPeriods();

  if (uniquePeriods.includes('2026 H1') && currentPeriodIndex === 0) {
    currentPeriodIndex = uniquePeriods.indexOf('2026 H1');
  }

  refreshProjectList();
  renderTimeline();
});

// ── 🎨 UI 렌더링 영역 (기존 CSS 서식 마크업 구조 완벽 결합) ──

function renderTimeline() {
  if (uniquePeriods.length === 0) return;
  const currentPeriod = uniquePeriods[currentPeriodIndex];
  periodLabel.textContent = currentPeriod;

  const currentProjects = projects.filter(p => p.period === currentPeriod);
  fruitContainer.innerHTML = '';

  if (currentProjects.length === 0) return;

  const containerWidth = 1400;
  const padding = 120;
  const availableWidth = containerWidth - (padding * 2);
  const count = currentProjects.length;

  currentProjects.forEach((proj, idx) => {
    // 1. 가로축 위치 계산
    let leftPos = padding + (availableWidth / 2);
    if (count > 1) {
      leftPos = padding + (availableWidth / (count - 1)) * idx;
    }

    // 2. CSS 규격에 부합하는 .fruit 컨테이너 생성
    const item = document.createElement('div');
    item.className = `fruit ${proj.type || 'type1'}`;
    item.style.left = `${leftPos}px`;

    // 3. 상하 지그재그 높낮이 및 줄 길이(short) 분기 설정
    let stemClass = 'stem';
    let hookClass = 'hook';
    
    if (idx % 2 === 1) {
      // 홀수 번째 아이템은 위로 매달기 (CSS top 정렬 규칙에 매칭)
      item.style.top = '150px'; 
      stemClass = 'stem short'; // 위쪽 줄은 짧게 처리
      hookClass = 'hook small';
    } else {
      // 짝수 번째 아이템은 아래로 매달기
      item.style.top = '300px';
    }

    // 4. 타입별 텍스트 박스 클래스 구분 세팅 (.text / .small-text)
    const textGroupClass = (proj.type === 'type2') ? 'small-text' : 'text';

    // 5. Description 가공 처리 (배열 내부 문자열을 각각 div로 래핑)
    const descLines = Array.isArray(proj.desc) ? proj.desc : [proj.desc];
    const descHtml = descLines.map(line => `<div>${line}</div>`).join('');
    
    // 6. Rank 렌더링 세팅
    const rankHtml = proj.rank ? `<div class="rank">${proj.rank}</div>` : '';

    // 7. roadmap.css 스타일링 구조 완벽 덮어쓰기 복원 (.hook -> .stem -> .text/.small-text)
    item.innerHTML = `
      <div class="${hookClass}"></div>
      <div class="${stemClass}"></div>
      <div class="${textGroupClass}">
        <div class="date">${proj.date || ''}</div>
        <div class="desc">${descHtml}</div>
        ${rankHtml}
      </div>
    `;

    fruitContainer.appendChild(item);
  });
}

// ── 어드민 제어 이벤트 관리 ──

function refreshProjectList() {
  if (!projectSelect) return;
  projectSelect.innerHTML = '';
  projects.forEach((p, idx) => {
    const descText = Array.isArray(p.desc) ? p.desc.join(' ') : p.desc;
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `[${p.period} / ${p.date || '날짜없음'}] ${descText.substring(0, 20)}...`;
    projectSelect.appendChild(opt);
  });
}

function clearForm() {
  projectSelect.value = '';
  selectedProjectIndex = null;
  periodInput.value = '';
  typeInput.value = '';
  dateInput.value = '';
  descInput.value = '';
  rankInput.value = '';
}

adminTrigger.addEventListener('click', () => {
  const pw = prompt('관리자 비밀번호를 입력하세요:');
  if (pw === '1031!@') {
    adminModal.classList.add('active'); // CSS에 정의된 .admin-modal.active 규칙 준수
    clearForm();
    refreshProjectList();
  } else if (pw !== null) {
    alert('비밀번호가 올바르지 않습니다.');
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.classList.remove('active');
});

projectSelect.addEventListener('change', () => {
  selectedProjectIndex = Number(projectSelect.value);
  const p = projects[selectedProjectIndex];
  if (!p) return;

  periodInput.value = p.period || '';
  typeInput.value = p.type || 'type1';
  dateInput.value = p.date || '';
  descInput.value = Array.isArray(p.desc) ? p.desc.join('\n') : p.desc;
  rankInput.value = p.rank || '';
});

addBtn.addEventListener('click', () => {
  if (!periodInput.value || !typeInput.value || !dateInput.value || !descInput.value) {
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

updateBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null || projectSelect.value === '') {
    alert('수정할 프로젝트를 아래 리스트에서 먼저 선택해주세요.');
    return;
  }

  const updatedArray = [...projects];
  updatedArray[selectedProjectIndex] = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: parseDescValue(descInput.value),
    rank: rankInput.value
  };

  updateFirebaseDatabase(updatedArray, '프로젝트가 실시간으로 수정되었습니다!');
  clearForm();
});

deleteBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null || projectSelect.value === '') {
    alert('삭제할 프로젝트를 아래 리스트에서 먼저 선택해주세요.');
    return;
  }
  if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) return;

  const updatedArray = projects.filter((_, idx) => idx !== selectedProjectIndex);
  updateFirebaseDatabase(updatedArray, '프로젝트가 실시간으로 삭제되었습니다.');
  clearForm();
});

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

window.addEventListener('DOMContentLoaded', () => {
  console.log("실시간 파이어베이스 타임라인 디자인 가동");
});
