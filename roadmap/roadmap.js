// 초기 기본 고정 데이터
const defaultProjects = [
  { type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { type: 'type1', date: '2026.01', period: '2026 H1', desc: ['진주시 글로벌', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { type: 'type2', date: '2026.02', period: '2026 H1', desc: ['가평OO수녀원', '북원도 작성'], rank: '' },
  { type: 'type1', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다부리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { type: 'type1', date: '2026.05', period: '2026 H1', desc: ['앵기발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
  { type: 'type2', date: '2026.05', period: '2026 H1', desc: ['가평OO수녀원', '기본 및 실시설계', '진행중...'], rank: '' }
];

const Storage = {
  get() {
    const data = localStorage.getItem('timeline_projects_v3');
    if (!data) {
      localStorage.setItem('timeline_projects_v3', JSON.stringify(defaultProjects));
      return defaultProjects;
    }
    return JSON.parse(data);
  },
  set(array) {
    localStorage.setItem('timeline_projects_v3', JSON.stringify(array));
  }
};

let projects = Storage.get();

const periods = ['2025 H2', '2026 H1', '2026 H2', '2027 H1', '2027 H2'];
let currentIndex = 1; 

const label = document.getElementById('period-label');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const container = document.getElementById('fruit-container');

// 날짜 기준 오름차순 정렬 함수 (YYYY.MM 문자열에서 점을 지우고 숫자로 비교)
function sortProjects() {
  projects.sort((a, b) => {
    const aNum = Number(a.date.replace('.', ''));
    const bNum = Number(b.date.replace('.', ''));
    return aNum - bNum;
  });
}

function getDescHtml(descArray) {
  if (!Array.isArray(descArray)) return '';
  return descArray.map(d => `<div>${d}</div>`).join('');
}

function renderTimeline() {
  container.innerHTML = '';
  projects = Storage.get(); 
  sortProjects(); // 렌더링 전 상시 오름차순 정렬 보장
  
  const currentPeriod = periods[currentIndex];
  const filtered = projects.filter(p => p.period === currentPeriod);
  
  if (filtered.length === 0) return;

  const totalWidth = 1400; 
  const margin = 150; 
  const startX = margin; 
  const endX = totalWidth - margin; 
  const availableWidth = endX - startX; 

  filtered.forEach((proj, idx) => {
    let leftPosition = startX; 
    if (filtered.length > 1) {
      leftPosition = startX + (availableWidth / (filtered.length - 1)) * idx;
    } else {
      leftPosition = startX + (availableWidth / 2);
    }

    const fruitDiv = document.createElement('div');
    fruitDiv.className = `fruit ${proj.type}`;
    fruitDiv.style.left = `${leftPosition}px`; 

    const descHtml = getDescHtml(proj.desc);

    if (proj.type === 'type1') {
      fruitDiv.innerHTML = `
        <div class="hook"></div>
        <div class="stem"></div>
        <div class="text">
          <div class="date">${proj.date}</div>
          <div class="desc">${descHtml}</div>
          ${proj.rank ? `<div class="rank">${proj.rank}</div>` : ''}
        </div>
      `;
    } else if (proj.type === 'type2') {
      fruitDiv.innerHTML = `
        <div class="hook small"></div>
        <div class="stem short"></div>
        <div class="small-text">
          <div class="date">${proj.date}</div>
          ${descHtml}
        </div>
      `;
    }

    container.appendChild(fruitDiv);
    bindSwingAnimation(fruitDiv, idx);
  });
}

function bindSwingAnimation(fruit, index) {
  let angle = (Math.random() * 6) - 3;
  let velocity = 0;
  let rafId = null;
  const stiffness = 0.008;
  const damping = 0.96;

  setTimeout(() => { animate(); }, index * 150);

  function animate() {
    velocity += (-angle) * stiffness;
    velocity *= damping;
    angle += velocity;
    fruit.style.transform = `rotate(${angle}deg)`;

    if (Math.abs(angle) > 0.005 || Math.abs(velocity) > 0.005) {
      rafId = requestAnimationFrame(animate);
    } else {
      fruit.style.transform = 'rotate(0deg)';
      rafId = null;
    }
  }

  fruit.addEventListener('mouseenter', () => {
    if (rafId) cancelAnimationFrame(rafId);
    angle = 4;
    velocity = 0;
    animate();
  });
}

function changePeriod(newIndex) {
  if (newIndex < 0 || newIndex >= periods.length) return;
  label.classList.add('fade-out');
  setTimeout(() => {
    currentIndex = newIndex;
    label.textContent = periods[currentIndex];
    label.classList.remove('fade-out');
    renderTimeline();
  }, 300);
}

btnPrev.addEventListener('click', () => changePeriod(currentIndex - 1));
btnNext.addEventListener('click', () => changePeriod(currentIndex + 1));


/* ── 🔒 암호화 잠금 및 모달 이벤트 컨트롤 ── */
const adminTrigger = document.getElementById('admin-trigger');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');

adminTrigger.addEventListener('click', () => {
  const password = prompt('관리자 암호를 입력하세요:');
  if (password === '1031!@') {
    adminModal.classList.add('active');
    refreshProjectList();
  } else if (password !== null) {
    alert('암호가 올바르지 않습니다.');
  }
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.classList.remove('active');
  clearForm();
});

window.addEventListener('click', (e) => {
  if (e.target === adminModal) {
    adminModal.classList.remove('active');
    clearForm();
  }
});


/* ── 프로젝트 데이터 CRUD 핸들러 ── */
const periodInput = document.getElementById('project-period');
const typeInput = document.getElementById('project-type');
const dateInput = document.getElementById('project-date');
const descInput = document.getElementById('project-desc'); 
const rankInput = document.getElementById('project-rank');

const addBtn = document.getElementById('add-project-btn');
const updateBtn = document.getElementById('update-project-btn');
const deleteBtn = document.getElementById('delete-project-btn');
const projectSelect = document.getElementById('project-select');

let selectedProjectIndex = null;

function refreshProjectList() {
  projectSelect.innerHTML = '';
  projects = Storage.get();
  sortProjects(); // 관리자 목록에서도 항상 오름차순 정렬된 리스트를 보여줌

  projects.forEach((p, index) => {
    const option = document.createElement('option');
    option.value = index;
    const listDisplayDesc = Array.isArray(p.desc) ? p.desc.join(' ') : p.desc;
    option.textContent = `[${p.period}] ${p.date} / ${p.type} / ${listDisplayDesc} ${p.rank ? `(${p.rank})` : ''}`;
    projectSelect.appendChild(option);
  });
}

function isValidDateFormat(dateStr) {
  return /^\d{4}\.\d{2}$/.test(dateStr);
}

function clearForm() {
  periodInput.value = '';
  typeInput.value = '';
  dateInput.value = '';
  descInput.value = '';
  rankInput.value = '';
  selectedProjectIndex = null;
}

function parseDescValue(text) {
  return text.split('\n').map(line => line.trim()).filter(line => line !== '');
}

// 프로젝트 추가 버튼 이벤트
addBtn.addEventListener('click', () => {
  if (!periodInput.value || !typeInput.value || !dateInput.value || !descInput.value.trim()) {
    alert('필수항목을 모두 입력해주세요.');
    return;
  }
  if (!isValidDateFormat(dateInput.value)) {
    alert('날짜는 YYYY.MM 형식으로 입력해주세요.');
    return;
  }

  const descLines = parseDescValue(descInput.value);

  const newProject = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descLines,
    rank: rankInput.value
  };

  projects.push(newProject);
  sortProjects(); // 추가 직후 date 기준 오름차순 자동 정렬 실행
  Storage.set(projects); // 정렬된 배열을 로컬스토리지에 저장

  refreshProjectList();
  renderTimeline();
  clearForm();
});

// 목록 선택
projectSelect.addEventListener('change', () => {
  selectedProjectIndex = Number(projectSelect.value);
  const p = projects[selectedProjectIndex];
  if (!p) return;

  periodInput.value = p.period;
  typeInput.value = p.type;
  dateInput.value = p.date;
  descInput.value = Array.isArray(p.desc) ? p.desc.join('\n') : p.desc;
  rankInput.value = p.rank || '';
});

// 수정 버튼 이벤트
updateBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null) {
    alert('수정할 프로젝트를 선택해주세요.');
    return;
  }

  const descLines = parseDescValue(descInput.value);

  projects[selectedProjectIndex] = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descLines,
    rank: rankInput.value
  };

  sortProjects(); // 수정 직후에도 date 기준 오름차순 자동 정렬 재정렬 실행
  Storage.set(projects);

  refreshProjectList();
  renderTimeline();
  clearForm();
  alert('수정되었습니다.');
});

// 삭제 버튼 이벤트
deleteBtn.addEventListener('click', () => {
  if (selectedProjectIndex === null) {
    alert('삭제할 프로젝트를 선택해주세요.');
    return;
  }
  if (!confirm('정말 삭제하시겠습니까?')) return;

  projects.splice(selectedProjectIndex, 1);
  sortProjects();
  Storage.set(projects);

  refreshProjectList();
  renderTimeline();
  clearForm();
});

// 초기 실행
renderTimeline();
