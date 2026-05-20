const periodInput = document.getElementById('project-period');
const typeInput = document.getElementById('project-type');
const dateInput = document.getElementById('project-date');
const descInput = document.getElementById('project-desc');
const rankInput = document.getElementById('project-rank');

const addBtn = document.getElementById('add-project-btn');
const updateBtn = document.getElementById('update-project-btn');
const deleteBtn = document.getElementById('delete-project-btn');
const projectSelect = document.getElementById('project-select');

let selectedProjectId = null; 

function refreshProjectList() {
  projectSelect.innerHTML = '';
  projects = Storage.get();
  sortProjects();

  projects.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id; 
    option.textContent = `[${p.period}] ${p.date} / ${p.type} / ${p.desc.join(' ')} ${p.rank ? `(${p.rank})` : ''}`;
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
  selectedProjectId = null;
}

addBtn.addEventListener('click', () => {
  if (!periodInput.value || !typeInput.value || !dateInput.value || !descInput.value) {
    alert('필수항목을 모두 입력해주세요.');
    return;
  }
  if (!isValidDateFormat(dateInput.value)) {
    alert('날짜는 YYYY.MM 형식으로 입력해주세요.');
    return;
  }

  const newProject = {
    id: Date.now(), 
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descInput.value.split(' ').filter(d => d !== ''), 
    rank: rankInput.value
  };

  projects.push(newProject);
  Storage.set(projects);
  refreshProjectList();
  clearForm();
});

projectSelect.addEventListener('change', () => {
  selectedProjectId = Number(projectSelect.value);
  const p = projects.find(proj => proj.id === selectedProjectId);
  if (!p) return;

  periodInput.value = p.period;
  typeInput.value = p.type;
  dateInput.value = p.date;
  descInput.value = p.desc.join(' ');
  rankInput.value = p.rank || '';
});

updateBtn.addEventListener('click', () => {
  if (selectedProjectId === null) {
    alert('수정할 프로젝트를 선택해주세요.');
    return;
  }

  const targetIndex = projects.findIndex(proj => proj.id === selectedProjectId);
  if (targetIndex === -1) return;

  projects[targetIndex] = {
    id: selectedProjectId,
    period: periodInput.value,
    type: typeInput.value,
    date: dateInput.value,
    desc: descInput.value.split(' ').filter(d => d !== ''),
    rank: rankInput.value
  };

  Storage.set(projects);
  refreshProjectList();
  clearForm();
  alert('수정되었습니다.');
});

deleteBtn.addEventListener('click', () => {
  if (selectedProjectId === null) {
    alert('삭제할 프로젝트를 선택해주세요.');
    return;
  }

  if (!confirm('정말 삭제하시겠습니까?')) return;

  projects = projects.filter(proj => proj.id !== selectedProjectId);
  Storage.set(projects);
  refreshProjectList();
  clearForm();
});

refreshProjectList();
