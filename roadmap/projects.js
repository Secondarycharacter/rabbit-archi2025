// 초기 기본 데이터 정의
const initialProjects = [
  { id: 1, type: 'type1', date: '2025.11', period: '2025 H2', desc: ['서충주 종합사회복지관', '건립사업 설계공모'], rank: '4위' },
  { id: 2, type: 'type1', date: '2026.01', period: '2026 H1', desc: ['진주시 글로벌', '어울림센터 조성사업', '설계공모'], rank: '5위' },
  { id: 3, type: 'type2', date: '2026.02', period: '2026 H1', desc: ['가평OO수녀원', '북원도 작성'], rank: '' },
  { id: 4, type: 'type1', date: '2026.03', period: '2026 H1', desc: ['거창군 지역활력타운', '다부리복합문화센터', '건립사업 설계공모'], rank: '10위' },
  { id: 5, type: 'type1', date: '2026.05', period: '2026 H1', desc: ['앵기발골 시니어형', '소규모체육관 건립사업', '설계공모'], rank: '4위' },
  { id: 6, type: 'type2', date: '2026.05', period: '2026 H1', desc: ['가평OO수녀원', '기본 및 실시설계', '진행중...'], rank: '' }
];

// 로컬스토리지 연동 함수 패키지
const Storage = {
  get() {
    const data = localStorage.getItem('timeline_projects');
    if (!data) {
      this.set(initialProjects);
      return initialProjects;
    }
    return JSON.parse(data);
  },
  set(projectsArray) {
    localStorage.setItem('timeline_projects', JSON.stringify(projectsArray));
  }
};

// 전역 데이터 로드 및 정렬 유틸리티
let projects = Storage.get();

function sortProjects() {
  projects.sort((a, b) => {
    const aDate = a.date.replace('.', '');
    const bDate = b.date.replace('.', '');
    return Number(aDate) - Number(bDate);
  });
}
sortProjects();
