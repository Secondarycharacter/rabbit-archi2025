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

const defaultProjects = [
  { type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { type: 'type1', date: '2026.01', period: '2026 H1', desc: ['진주시 글로컬', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { type: 'type2', date: '2026.02', period: '2026 H1', desc: ['가평OO 수녀원', '복원도 작성'], rank: '' },
  { type: 'type1', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다누리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { type: 'type1', date: '2026.05', period: '2026 H1', desc: ['앵지발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
  { type: 'type2', date: '2026.05', period: '2026 H1', desc: ['가평OO 수녀원', '기본 및 실시설계', '진행중...'], rank: '' }
];

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

// ── 타임라인 렌더링 ──
function renderTimeline() {
  container.innerHTML = '';
  sortProjects();

  const currentPeriod = periods[currentIndex];
  const filtered = projects.filter(p => p.period === currentPeriod);

  // 💡 [수정 및 추가된 부분] 해당 period에 프로젝트가 0개일 때 안내 문구 출력
  if (filtered.length === 0) {
    const emptyMsgDiv = document.createElement('div');
    emptyMsgDiv.className = 'empty-period-message';
    emptyMsgDiv.innerHTML = `
      <div>다양한 현상설계에 지속적으로 참여</div>
      <div>새로운 주제와 프로그램에 대한 탐구</div>
      <div>지역과 사람을 연결하는 공간 제안</div>
      <div>실무 역량과 팀워크의 성장</div>
    `;
    container.appendChild(emptyMsgDiv);
    return; // 프로젝트가 없으므로 문구만 렌더링하고 여기서 함수를 종료(리턴)합니다.
  }

  // 조건 1 & 2: 총 길이 1800px로 변경 및 좌우 마진 200px로 확대 적용
  const totalWidth = 1800;
  const margin = 200;
  const startX = margin;
  const endX = totalWidth - margin;
  const availableWidth = endX - startX;

  filtered.forEach((proj, idx) => {
    let centerX;
    if (filtered.length === 1) {
      centerX = startX + availableWidth / 2;
    } else {
      centerX = startX + (availableWidth / (filtered.length - 1)) * idx;
    }

    const fruitDiv = document.createElement('div');
    const currentType = proj.type || 'type1';
    fruitDiv.className = `fruit ${currentType}`;

    fruitDiv.style.left = `${centerX}px`;
    fruitDiv.style.transform = 'translateX(-50%)';
    fruitDiv.style.transformOrigin = 'top center';

    // 메인라인 디자인 축에 맞춰 top 위치 지정
    fruitDiv.style.top = '96px';

    const descHtml = getDescHtml(proj.desc);

    fruitDiv.innerHTML = `
      <div class="hook"></div>
      <div class="stem"></div>
      <div class="fruit-body">
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
    fruit.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    if (Math.abs(angle) > 0.005 || Math.abs(velocity) > 0.005) {
      rafId = requestAnimationFrame(animate);
    } else {
      fruit.style.transform = 'translateX(-50%) rotate(0deg)';
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

/* ── 관리자 모달 및 CRUD 핸들러 (기존 기능 유지) ── */
const adminTrigger = document.getElementById('admin-trigger');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');

// 💡 화살표 함수 대신 'async function ()' 형태로 안전하게 선언합니다.
adminTrigger.addEventListener('click', async function (event) {
  const password = prompt("관리자 비밀번호를 입력하세요:");
  if (!password) return; 

  try {
    // 1. 암호화 진행
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 2. 미리 준비한 내 비밀번호의 해시값과 비교
  const adminHash = "d5f4667cf6475357097dacbc04f2aa0372df86183fb922b6c77babcae9f50cc4"; 
  
if (hashedInput === adminHash) {
  console.log("🔒 인증 성공! 관리자 도구를 실행합니다.");
  
  // 1. 관리자 패널 엘리먼트를 직관적으로 다시 선언해서 확실하게 붙잡습니다.
  // (만약 관리자창 ID가 'admin-panel'이 아니라 다른 것이라면 그 이름으로 바꾸어 주세요)
  const adminPanel = document.getElementById('admin-panel') || document.querySelector('.admin-modal');
  
  if (adminPanel) {
    // 2. 비동기 환경에서도 화면 렌더링이 즉시 반영되도록 처리
    setTimeout(async () => {
      // 💡 기존에 비밀번호가 맞았을 때 실행되던 관리자 오픈 코드를 여기에 넣어줍니다.
      // 예시 1: 스타일을 직접 바꿨던 경우
      adminPanel.style.display = 'block'; 
      adminPanel.classList.add('show');
      
      // 예시 2: 기존에 실행되던 오픈 함수가 따로 있었다면 앞에 await를 붙여 호출합니다.
      // if (typeof openAdminModal === 'function') {
      //   await openAdminModal();
      // }
      
      console.log("🖥️ 관리자 패널 표시 완료");
    }, 50);
  } else {
    console.error("❌ 에러: 화면에서 관리자 패널 HTML 요소를 찾을 수 없습니다. ID나 클래스명을 확인하세요.");
  }

} else {
  alert("비밀번호가 일치하지 않습니다.");
}
  } catch (error) {
    console.error("암호화 처리 중 오류 발생:", error);
    alert("보안 기능 실행 중 오류가 발생했습니다. 개발자 도구(F12)를 확인하세요.");
  }
});

closeAdminBtn.addEventListener('click', () => { adminModal.classList.remove('active'); clearForm(); });
window.addEventListener('click', (e) => { if (e.target === adminModal) { adminModal.classList.remove('active'); clearForm(); } });

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

function isValidDateFormat(dateStr) { return /^\d{4}\.\d{2}$/.test(dateStr); }
function clearForm() { periodInput.value = ''; typeInput.value = ''; dateInput.value = ''; descInput.value = ''; rankInput.value = ''; selectedProjectIndex = null; }
function parseDescValue(text) { return text.split('\n').map(line => line.trim()).filter(line => line !== ''); }

function subscribeToFirestore() {
  const q = query(collection(db, COLLECTION));
  onSnapshot(q, (snapshot) => {
    projects = snapshot.docs.map(d => ({ ...d.data(), _id: d.id }));
    sortProjects();
    renderTimeline();
    if (adminModal.classList.contains('active')) { refreshProjectList(); }
  });
}

addBtn.addEventListener('click', async () => {
  if (!periodInput.value || !typeInput.value || !dateInput.value || !descInput.value.trim()) { alert('필수항목을 모두 입력해주세요.'); return; }
  if (!isValidDateFormat(dateInput.value)) { alert('날짜는 YYYY.MM 형식으로 입력해주세요.'); return; }
  const descLines = parseDescValue(descInput.value);
  const newProject = { period: periodInput.value, type: typeInput.value, date: dateInput.value, desc: descLines, rank: rankInput.value };
  addBtn.disabled = true; try { await addProjectToFirestore(newProject); clearForm(); } catch (e) { alert('오류: ' + e.message); } finally { addBtn.disabled = false; }
});

projectSelect.addEventListener('change', () => {
  selectedProjectIndex = Number(projectSelect.value);
  const p = projects[selectedProjectIndex];
  if (!p) return;
  periodInput.value = p.period; typeInput.value = p.type; dateInput.value = p.date;
  descInput.value = Array.isArray(p.desc) ? p.desc.join('\n') : p.desc; rankInput.value = p.rank || '';
});

updateBtn.addEventListener('click', async () => {
  if (selectedProjectIndex === null) return;
  const p = projects[selectedProjectIndex];
  if (!p || !p._id) return;
  const descLines = parseDescValue(descInput.value);
  const updated = { period: periodInput.value, type: typeInput.value, date: dateInput.value, desc: descLines, rank: rankInput.value };
  updateBtn.disabled = true; try { await updateProjectInFirestore(p._id, updated); clearForm(); } catch (e) { alert('오류: ' + e.message); } finally { updateBtn.disabled = false; }
});

deleteBtn.addEventListener('click', async () => {
  if (selectedProjectIndex === null) return;
  const p = projects[selectedProjectIndex];
  if (!p || !p._id) return;
  if (!confirm('정말 삭제하시겠습니까?')) return;
  deleteBtn.disabled = true; try { await deleteProjectFromFirestore(p._id); clearForm(); } catch (e) { alert('오류: ' + e.message); } finally { deleteBtn.disabled = false; }
});

async function initApp() { await loadProjectsFromFirestore(); subscribeToFirestore(); }
initApp();
