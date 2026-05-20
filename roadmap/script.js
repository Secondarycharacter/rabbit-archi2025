const periods = ['2025 H2', '2026 H1', '2026 H2', '2027 H1', '2027 H2'];
let currentIndex = 1; 

const label = document.getElementById('period-label');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const container = document.getElementById('fruit-container');

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
    fruitDiv.className = `fruit ${proj.type}`;
    fruitDiv.style.left = `${leftPosition}px`; 

    if (proj.type === 'type1') {
      let descHtml = proj.desc.map(d => `<div class="desc">${d}</div>`).join('');
      fruitDiv.innerHTML = `
        <div class="hook"></div>
        <div class="stem"></div>
        <div class="text">
          <div class="date">${proj.date}</div>
          ${descHtml}
          \${proj.rank ? `<div class="rank">\${proj.rank}</div>` : ''}
        </div>
      `;
    } else if (proj.type === 'type2') {
      let descHtml = proj.desc.map(d => `<div>${d}</div>`).join('');
      fruitDiv.innerHTML = `
        <div class="hook small"></div>
        <div class="stem short"></div>
        <div class="small-text">
          <div>${proj.date}</div>
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
    fruit.style.transform = `rotate(\${angle}deg)`;

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

renderTimeline();
