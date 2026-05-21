// ── Firebase SDK (CDN 방식) ──
// roadmap.html의 <script type="module\"> 안에서 실행됩니다

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMQkGSc2RwKjAe7h5EcvWWdoJbS5_JjWs",
  authDomain: "rabbit-archi2025-c40a6.firebaseapp.com",
  projectId: "rabbit-archi2025-c40a6",
  storageBucket: "rabbit-archi2025-c40a6.firebasestorage.app",
  messagingSenderId: "577448559589",
  appId: "1:577448559589:web:5b984b45bff89303dd650c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION = 'projects';

// 초기 기본 고정 데이터 (Firestore가 비어있을 때 1회 업로드)
const defaultProjects = [
  { type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { type: 'type1', date: '2026.01', period: '2026 H1', desc: ['진주시 글로벌', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { type: 'type2', date: '2026.02', period: '2026 H1', desc: ['가평OO수녀원', '북원도 작성'], rank: '' },
  { type: 'type1', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다부리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { type: 'type1', date: '2026.05', period: '2026 H1', desc: ['앵기발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
  { type: 'type2', date: '2026.05', period: '2026 H1', desc: ['가평OO수녀원', '기본 및 실시설계', '진행중...'], rank: '' }
];

// ── Firestore CRUD ──
async function loadProjectsFromFirestore() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  if (snapshot.empty) {
    for (const p of defaultProjects) {
      await addDoc(collection(db, COLLECTION), p);
    }
    return defaultProjects.map((p, i) => ({ ...p, _id: null }));
  }
  return snapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
}

async function addProjectToFirestore(project) {
  const docRef = await addDoc(collection(db, COLLECTION), project);
  return docRef.id;
}

async function updateProjectInFirestore(id, project) {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, project);
}

async function deleteProjectFromFirestore(id) {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

// ── 앱 상태 ──
let projects = [];

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

// 🎨 타임라인 렌더링 함수 수정 (CSS 디자인 규격과 완벽 동기화)
function renderTimeline() {
  container.innerHTML = '';
  sortProjects();

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
    // CSS에 정의된 .fruit 클래스를 부여하여 공통 속성 유지
    fruitDiv.className = `fruit ${proj.type || 'type1'}`;
    fruitDiv.style.left = `${leftPosition}px`;

    // 💡 핵심: 홀수와 짝수 인덱스 정렬을 지그재그 분기하여 겹침 방지 및 대롱대롱 효과 극대화
    let hookClass = 'hook';
    let stemClass = 'stem';

    if (idx % 2 === 1) {
      // 홀수 번째 과일은 위쪽 라인에 배치 (줄과 고리를 짧고 작게 변경)
      fruitDiv.style.top = '150px';
      hookClass = 'hook small';
      stemClass = 'stem short';
    } else {
      // 짝수 번째 과일은 아래쪽 라인에 배치
      fruitDiv.style.top = '300px';
    }

    const descHtml = getDescHtml(proj.desc);
    const textGroupClass = (proj.type === 'type2') ? 'small-text' : 'text';

    // 클래스 구조를 통일하여 흔들림 중심축(transform-origin)이 뒤틀리지 않도록 래핑
    fruitDiv.innerHTML = `
      <div class="${hookClass}"></div>
      <div class="${stemClass}"></div>
      <div class="${textGroupClass}">
        <div class="date">${proj.date}</div>
        <div class="desc">${descHtml}</div>
        ${proj.rank ? `<div class="rank">${proj.rank}</div>` : ''}
      </div>
    `;

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


/* ── 관리자 모달 ── */
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


/* ── CRUD 핸들러 ── */
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

// Firestore 실시간 구독 (onSnapshot)
function subscribeToFirestore() {
  const q = query(collection(db, COLLECTION));
  onSnapshot(q, (snapshot) => {
    projects = snapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    sortProjects();
    renderTimeline();
    if (adminModal.classList.contains('active')) {
      refreshProjectList();
    }
  });
}

// 추가
addBtn.addEventListener('click', async () => {
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

  addBtn.disabled = true;
  addBtn.textContent = '저장 중...';
  try {
    await addProjectToFirestore(newProject);
    clearForm();
  } catch (e) {
    alert('저장 중 오류가 발생했습니다: ' + e.message);
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '프로젝트 추가';
  }
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
updateBtn.addEventListener('click', async () => {
  if (selectedProjectIndex === null) {
    alert('수정할 프로젝트를 선택해주세요.');
    return;
  }
  const p = projects[selectedProjectIndex];
  if (!p || !p._id) {
    alert('선택된 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }

  const descLines = parseDescValue(descInput.value);
  const updated = {
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descLines,
    rank: rankInput.value
  };

  updateBtn.disabled = true;
  updateBtn.textContent = '수정 중...';
  try {
    await updateProjectInFirestore(p._id, updated);
    clearForm();
    alert('수정되었습니다.');
  } catch (e) {
    alert('수정 중 오류가 발생했습니다: ' + e.message);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = '프로젝트 수정';
  }
});

// 삭제
deleteBtn.addEventListener('click', async () => {
  if (selectedProjectIndex === null) {
    alert('삭제할 프로젝트를 선택해주세요.');
    return;
  }
  const p = projects[selectedProjectIndex];
  if (!p || !p._id) {
    alert('선택된 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }
  if (!confirm('정말 삭제하시겠습니까?')) return;

  deleteBtn.disabled = true;
  deleteBtn.textContent = '삭제 중...';
  try {
    await deleteProjectFromFirestore(p._id);
    clearForm();
  } catch (e) {
    alert('삭제 중 오류가 발생했습니다: ' + e.message);
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = '프로젝트 삭제';
  }
});

// ── 초기 실행 ──
async function initApp() {
  // 앱이 켜질 때 파이어스토어가 비어있다면 defaultProjects를 먼저 업로드합니다.
  await loadProjectsFromFirestore(); 
  // 그 후 실시간 데이터 감시를 시작합니다.
  subscribeToFirestore();
}

initApp();
