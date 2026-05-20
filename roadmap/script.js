// 각 프로젝트 타입별로 매핑되는 로드맵 전용 이미지 경로 정의 (roadmap/images 기준)
const imageMapping = {
  'type1': 'images/00 Journey.jpg',
  'type2': 'images/01 Investigate.jpg',
  'type3': 'images/02 Comprehend.jpg',
  'type4': 'images/03 Link.jpg',
  'type5': 'images/04 Broaden.jpg'
};

const defaultProjects = [
  { type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { type: 'type2', date: '2026.01', period: '2026 H1', desc: ['진주시 글로벌', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { type: 'type3', date: '2026.02', period: '2026 H1', desc: ['가평OO수녀원', '북원도 작성'], rank: '' },
  { type: 'type4', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다부리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { type: 'type5', date: '2026.05', period: '2026 H1', desc: ['앵기발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
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
  sortProjects();
  
  const currentPeriod = periods[currentIndex];
  const filtered = projects.filter(p => p.period === currentPeriod);
  
  if (filtered.length === 0) return;

  const totalWidth = 1300; 
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
    // 공통 및 고유 클래스 지정
    fruitDiv.className = `fruit ${proj.type}`;
    fruitDiv.style.left = `${leftPosition}px`; 

    const descHtml = getDescHtml(proj.desc);
    
    // 매핑 폴더 이미지 경로 추출 (없을 경우 기본 대체 이미지 설정 가능)
    const imgPath = imageMapping[proj.type] || 'images/00 Journey.jpg';

    // 모든 카드 형태에 줄바꿈 유지 및 단계별 원본 로드맵 디자인 텍스트 배치
    fruitDiv.innerHTML = `
      <div class="hook"></div>
      <div class="stem"></div>
      <div class="card-body">
        <div class="image-wrapper">
          <img src="${imgPath}" alt="${proj.type}" onerror="this.src='https://placehold.co/120x80?text=Roadmap+Image'">
        </div>
        <div class="text-content">
          <div class="date">${proj.date}</div>
          <div class="desc">${descHtml}</div>
          ${proj.rank ? `<div class="rank">${proj.rank}</div>` : ''}
        </div>
      </div>
    `;

    container.appendChild(fruitDiv);
    bindSwingAnimation(fruitDiv, idx);
  });
}

function bindSwingAnimation(fruit, index) {
  let angle = (Math.random() * 4) - 2;
  let velocity = 0;
  let rafId = null;
  const stiffness = 0.006;
  const damping = 0.97;

  setTimeout(() => { animate(); }, index * 120);

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
    angle = 3;
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
  sortProjects();

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

// 추가
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
  sortProjects();
  Storage.set(projects);

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

// 수정
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

  sortProjects();
  Storage.set(projects);

  refreshProjectList();
  renderTimeline();
  clearForm();
  alert('수정되었습니다.');
});

// 삭제
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
