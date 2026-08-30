import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
  collection,
  getDocs,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const searchParams = new URLSearchParams(window.location.search);
const forceProductionPreview =
  searchParams.get('preview') === 'production' || searchParams.get('debug') === '0';

export const DEBUG_MODE =
  !forceProductionPreview &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    searchParams.get('debug') === '1');

const firebaseConfig = {
  apiKey: 'AIzaSyBMQkGSc2RwKjAe7h5EcvWWdoJbS5_JjWs',
  authDomain: 'rabbit-archi2025-c40a6.firebaseapp.com',
  projectId: 'rabbit-archi2025-c40a6',
  storageBucket: 'rabbit-archi2025-c40a6.firebasestorage.app',
  messagingSenderId: '577448559589',
  appId: '1:577448559589:web:5b984b45bff89303dd650c'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const VISIT_STATS_COLLECTION = 'siteStats';
const VISIT_STATS_DOC = 'visits';
const TOTAL_VISIT_COUNTED_KEY = 'rabbitTotalVisitCounted';
const DAILY_VISIT_COUNTED_PREFIX = 'rabbitDailyVisitCounted:';

const H1_ITEM_HEIGHT = 52;
const H1_ITEM_GAP = 10;
const H1_PERIOD_HEIGHT = 40;
const H1_PERIOD_GAP = 14;
const H1_VISIBLE_ABOVE = 5;
const H1_VISIBLE_BELOW = 5;

const WELCOME_TEXT =
  '토끼건축사사무소는 공간의 울림과 사람의 이야기에 귀 기울이고,<br>공간의 본질을 탐구하며, 새로운 도약을 꿈꾸는 건축사사무소입니다.';

const animationFrames = Array.from({ length: 15 }, (_, idx) => `images/UC/ps${idx + 1}.png`);
const tailFrames = animationFrames.slice(13);
const frameDuration = 100;
const tailLoopDuration = 5000;
const videoContentBoundsCache = new WeakMap();
const VIDEO_CONTENT_LUMA_THRESHOLD = 12;
const METAVERSE_SWITCH_MS = 240;
const METAVERSE_OVERVIEW_REFERENCE_PROJECT_ID = 'chungju';
let metaversePreviewSwitchToken = 0;
let metaverseOverviewReferenceContentSize = null;
const videoPixelSampleCanvas = document.createElement('canvas');
videoPixelSampleCanvas.width = 1;
videoPixelSampleCanvas.height = 1;
const videoPixelSampleContext = videoPixelSampleCanvas.getContext('2d', { willReadFrequently: true });

const shellLayout = document.getElementById('shellLayout');
const h1ListViewport = document.getElementById('h1ListViewport');
const h1ListTrack = document.getElementById('h1ListTrack');
const h1Scrollbar = document.getElementById('h1Scrollbar');
const h1ScrollbarThumb = document.getElementById('h1ScrollbarThumb');
const totalVisitorCount = document.getElementById('totalVisitorCount');
const todayVisitorCount = document.getElementById('todayVisitorCount');
const h2Menu = document.getElementById('h2Menu');
const h2AdminTrigger = document.getElementById('h2AdminTrigger');
const h0Stage = document.getElementById('h0Stage');
const ucAnimationImage = document.getElementById('ucAnimationImage');
const ucAnimationContainer = document.getElementById('ucAnimation');
const maintenanceMessage = document.getElementById('maintenanceMessage');

const views = {
  home: document.getElementById('h0ViewHome'),
  history: document.getElementById('h0ViewHistory'),
  historyLink: document.getElementById('h0ViewHistoryLink'),
  metaversePreview: document.getElementById('h0ViewMetaversePreview'),
  metaverseLoading: document.getElementById('h0ViewMetaverseLoading'),
  metaverse: document.getElementById('h0ViewMetaverse'),
  extra: document.getElementById('h0ViewExtra')
};

const historyFrame = document.getElementById('historyFrame');
const historyLinkFrame = document.getElementById('historyLinkFrame');
const metaversePreviewMedia = document.getElementById('metaversePreviewMedia');
const metaversePreviewHint = document.getElementById('metaversePreviewHint');
const metaverseOverview = document.getElementById('metaverseOverview');
const metaverseChat = document.getElementById('metaverseChat');
const metaverseFrame = document.getElementById('metaverseFrame');
const metaverseFullscreenButton = document.getElementById('metaverseFullscreenButton');
const extraLayout = document.getElementById('extraLayout');
const extraOverview = document.getElementById('extraOverview');
const extraChat = document.getElementById('extraChat');
const extraPreviewMedia = document.getElementById('extraPreviewMedia');
const extraDownloadHint = document.getElementById('extraDownloadHint');
const extraDownloadLink = document.getElementById('extraDownloadLink');

const state = {
  category: 'home',
  projects: { history: [], metaverse: [], extra: [] },
  h1Projects: [],
  h1ListEntries: [],
  h1ScrollOffset: 0,
  h1Velocity: 0,
  h1Raf: null,
  selectedProjectId: null,
  selectedMetaverseProject: null,
  descriptionCache: new Map(),
  projectOverviews: null
};

if (DEBUG_MODE) {
  shellLayout.classList.add('debug');
}

function getProjectSortKey(project) {
  const raw = String(project.date || '').trim();
  const match = raw.match(/(\d{4})[.\-](\d{2})/);
  if (match) {
    return Number(`${match[1]}${match[2]}`);
  }

  const normalized = raw.replace(/[^\d]/g, '');
  return Number(normalized.slice(0, 6)) || 0;
}

function sortProjectsForH1(projects) {
  return [...projects].sort((a, b) => {
    const dateDiff = getProjectSortKey(a) - getProjectSortKey(b);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const regDiff = (a.registeredAt ?? a.orderIndex ?? 0) - (b.registeredAt ?? b.orderIndex ?? 0);
    if (regDiff !== 0) {
      return regDiff;
    }

    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

function formatProjectDate(date) {
  const value = String(date || '').trim();
  if (!value) {
    return '';
  }
  if (value.includes('.')) {
    return value;
  }
  return value.replace(/-/g, '.');
}

function formatPeriodLabel(period) {
  const value = String(period || '').trim();
  if (!value) {
    return '';
  }

  const match = value.match(/(\d{4})\s*[.\s]\s*(H[12])/i);
  if (match) {
    return `${match[1]}.${match[2].toUpperCase()}`;
  }

  return value.replace(/\s+/g, '.');
}

function inferPeriodFromDate(date) {
  const value = String(date || '').trim();
  const match = value.match(/(\d{4})[.\-](\d{2})/);
  if (!match) {
    return '';
  }

  const year = match[1];
  const month = Number(match[2]);
  const half = month <= 6 ? 'H1' : 'H2';
  return `${year}.${half}`;
}

function getProjectPeriodLabel(project) {
  const registered = formatPeriodLabel(project.period);
  if (registered) {
    return registered;
  }

  return inferPeriodFromDate(project.date);
}

function buildH1ListEntries(projects) {
  const entries = [];
  const showPeriods = state.category !== 'extra';
  let lastPeriod = null;

  projects.forEach((project) => {
    const period = showPeriods ? getProjectPeriodLabel(project) : '';
    if (period && period !== lastPeriod) {
      entries.push({ type: 'period', id: `period-${period}`, label: period });
      lastPeriod = period;
    }
    entries.push({ type: 'project', project });
  });

  return entries;
}

function getH1EntryHeight(entry) {
  if (entry.type === 'period') {
    return H1_PERIOD_HEIGHT + H1_PERIOD_GAP;
  }

  return H1_ITEM_HEIGHT + H1_ITEM_GAP;
}

function getH1LayoutMetrics() {
  const entries = state.h1ListEntries.length ? state.h1ListEntries : buildH1ListEntries(state.h1Projects);
  const heights = entries.map(getH1EntryHeight);
  const offsets = [];
  let totalHeight = 0;

  heights.forEach((height) => {
    offsets.push(totalHeight);
    totalHeight += height;
  });

  return { entries, heights, offsets, totalHeight };
}

function getH1ViewportHeight() {
  return h1ListViewport.clientHeight || H1_ITEM_HEIGHT * (H1_VISIBLE_ABOVE + 1 + H1_VISIBLE_BELOW);
}

function getH1CenterY() {
  return getH1ViewportHeight() / 2 - H1_ITEM_HEIGHT / 2;
}

function getH1ScrollOffsetForEntry(entryIndex) {
  const { entries, offsets, heights } = getH1LayoutMetrics();
  const entry = entries[entryIndex];
  if (!entry) {
    return 0;
  }

  const centerY = getH1CenterY();
  return H1_ITEM_HEIGHT / 2 - offsets[entryIndex] - heights[entryIndex] / 2;
}

function getH1ScrollRange() {
  const { entries } = getH1LayoutMetrics();
  if (!entries.length) {
    return { minOffset: 0, maxOffset: 0, maxScroll: 0 };
  }

  const maxOffset = 0;
  const minOffset = getH1ScrollOffsetForEntry(entries.length - 1);
  const maxScroll = Math.max(0, maxOffset - minOffset);
  return { minOffset, maxOffset, maxScroll };
}

function getH1CenteredProjectId() {
  const { entries, offsets, heights } = getH1LayoutMetrics();
  const viewportCenter = getH1ViewportHeight() / 2;
  const trackTop = getH1CenterY() + state.h1ScrollOffset;
  let closestId = null;
  let closestDistance = Infinity;

  entries.forEach((entry, index) => {
    if (entry.type !== 'project') {
      return;
    }

    const entryCenter = trackTop + offsets[index] + heights[index] / 2;
    const distance = Math.abs(entryCenter - viewportCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestId = entry.project.id;
    }
  });

  return closestId;
}

function getHistoryProjectTitle(data) {
  if (Array.isArray(data.desc) && data.desc.length) {
    return data.desc.join(' ');
  }
  return '프로젝트';
}

function mapHistorySnapshot(snapshot) {
  const projects = snapshot.docs.map((docSnap, snapshotIndex) => {
    const data = docSnap.data();
    const url = typeof data.url === 'string' ? data.url.trim() : '';
    return {
      id: `history-${docSnap.id}`,
      category: 'history',
      title: getHistoryProjectTitle(data),
      date: formatProjectDate(data.date),
      period: typeof data.period === 'string' ? data.period.trim() : '',
      link: url || null,
      registeredAt: docSnap.createTime?.toMillis?.() ?? snapshotIndex,
      orderIndex: snapshotIndex
    };
  });

  return sortProjectsForH1(projects);
}

async function loadHistoryProjectsFromFirestore() {
  const snapshot = await getDocs(collection(db, 'projects'));
  return mapHistorySnapshot(snapshot);
}

function subscribeHistoryProjects() {
  onSnapshot(collection(db, 'projects'), (snapshot) => {
    state.projects.history = mapHistorySnapshot(snapshot);

    if (state.category === 'history') {
      const previousId = state.selectedProjectId;
      const previousScroll = state.h1ScrollOffset;
      state.h1Projects = [...state.projects.history];
      state.h1ScrollOffset = previousScroll;
      clampH1Scroll();
      renderH1Projects();
      refreshH1ListLayout();
      state.selectedProjectId = previousId;
    }
  });
}

function centerH1OnLatest() {
  const { entries } = getH1LayoutMetrics();
  if (!entries.length) {
    state.h1ScrollOffset = 0;
    state.h1Velocity = 0;
    return;
  }

  state.h1ScrollOffset = getH1ScrollOffsetForEntry(entries.length - 1);
  state.h1Velocity = 0;
}

function refreshH1ListLayout() {
  if (!state.h1Projects.length) {
    updateH1TrackPosition();
    return;
  }

  centerH1OnLatest();
  updateH1TrackPosition();

  requestAnimationFrame(() => {
    centerH1OnLatest();
    updateH1TrackPosition();
  });
}

function getDisplayTitle(project) {
  if (project.category === 'metaverse') {
    return project.designOverviewTitle || project.title;
  }
  return project.title;
}

function projectHasLink(project) {
  if (project.category === 'history') {
    return Boolean(project.link);
  }
  if (project.category === 'metaverse') {
    return Boolean(project.metaverseUrl);
  }
  if (project.category === 'extra') {
    return true;
  }
  return false;
}

function isClickableInH1(project) {
  if (project.category === 'history') {
    return Boolean(project.link);
  }
  if (project.category === 'metaverse' || project.category === 'extra') {
    return true;
  }
  return false;
}

function setActiveView(name) {
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle('is-active', key === name);
  });
}

function setCategory(category) {
  state.category = category;
  state.selectedProjectId = null;
  state.selectedMetaverseProject = null;
  state.h1Velocity = 0;

  h2Menu.querySelectorAll('.h2-menu-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.category === category);
  });

  if (category === 'home') {
    h2AdminTrigger.hidden = true;
    state.h1Projects = [];
    renderH1Projects();
    setActiveView('home');
    return;
  }

  if (category === 'history') {
    h2AdminTrigger.hidden = false;
    state.h1Projects = [...state.projects.history];
    renderH1Projects();
    refreshH1ListLayout();
    historyFrame.src = 'history/history.html?embed=1';
    setActiveView('history');
    return;
  }

  if (category === 'metaverse') {
    h2AdminTrigger.hidden = false;
    state.h1Projects = [...state.projects.metaverse];
    renderH1Projects();
    refreshH1ListLayout();
    const latest = state.h1Projects[state.h1Projects.length - 1];
    if (latest) {
      showMetaversePreview(latest);
    } else {
      clearMetaversePreview();
      setActiveView('metaversePreview');
    }
    return;
  }

  if (category === 'extra') {
    h2AdminTrigger.hidden = true;
    state.h1Projects = [...state.projects.extra];
    renderH1Projects();
    refreshH1ListLayout();
    setActiveView('extra');
    const latestExtra = state.h1Projects[state.h1Projects.length - 1];
    if (latestExtra) {
      selectExtraProject(latestExtra);
    } else {
      clearExtraPreview();
    }
  }
}

function renderH1Projects() {
  h1ListTrack.innerHTML = '';
  state.h1ListEntries = buildH1ListEntries(state.h1Projects);

  if (!state.h1Projects.length) {
    const empty = document.createElement('div');
    empty.className = 'h1-project-item is-center';
    empty.textContent = state.category === 'home' ? '' : '등록된 프로젝트 없음';
    h1ListTrack.appendChild(empty);
    updateH1TrackPosition();
    return;
  }

  state.h1ListEntries.forEach((entry) => {
    if (entry.type === 'period') {
      const divider = document.createElement('div');
      divider.className = 'h1-period-divider';
      divider.textContent = entry.label;
      h1ListTrack.appendChild(divider);
      return;
    }

    const project = entry.project;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'h1-project-item';
    item.dataset.projectId = project.id;

    if (state.selectedProjectId === project.id) {
      item.classList.add('is-active');
    }
    if (isClickableInH1(project)) {
      item.classList.add('is-clickable');
    }

    item.innerHTML = `
      <span class="date">${formatProjectDate(project.date)}</span>
      <span class="title">${getDisplayTitle(project)}</span>
    `;

    item.addEventListener('click', () => handleH1ProjectClick(project));

    h1ListTrack.appendChild(item);
  });

  updateH1TrackPosition();
}

function updateH1TrackPosition() {
  const centerY = getH1CenterY();
  const translateY = centerY + state.h1ScrollOffset;
  h1ListTrack.style.transform = `translateY(${translateY}px)`;

  const centeredProjectId = getH1CenteredProjectId();
  h1ListTrack.querySelectorAll('.h1-project-item').forEach((item) => {
    item.classList.toggle('is-center', item.dataset.projectId === centeredProjectId);
  });

  updateH1Scrollbar();
}

function getH1ScrollMetrics() {
  const { entries, totalHeight } = getH1LayoutMetrics();
  const viewportHeight = getH1ViewportHeight();
  const { maxScroll } = getH1ScrollRange();
  const visibleRatio = Math.min(1, viewportHeight / Math.max(totalHeight, 1));
  const thumbHeight = maxScroll > 0
    ? Math.min(viewportHeight, Math.max(24, viewportHeight * visibleRatio))
    : viewportHeight;
  const maxThumbTop = Math.max(0, viewportHeight - thumbHeight);

  return { count: entries.length, viewportHeight, maxScroll, thumbHeight, maxThumbTop };
}

function setH1ScrollFromRatio(ratio) {
  const { maxScroll } = getH1ScrollMetrics();
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  state.h1ScrollOffset = -clampedRatio * maxScroll;
  state.h1Velocity = 0;
  clampH1Scroll();
  updateH1TrackPosition();
}

function updateH1Scrollbar() {
  if (!h1Scrollbar || !h1ScrollbarThumb) {
    return;
  }

  const { count, maxScroll, thumbHeight, maxThumbTop, viewportHeight } = getH1ScrollMetrics();
  if (count <= 1 || maxScroll <= 0) {
    h1Scrollbar.style.visibility = 'hidden';
    return;
  }

  h1Scrollbar.style.visibility = 'visible';
  h1Scrollbar.style.height = `${viewportHeight}px`;
  const scrollRatio = -state.h1ScrollOffset / maxScroll;

  h1ScrollbarThumb.style.height = `${thumbHeight}px`;
  h1ScrollbarThumb.style.top = `${scrollRatio * maxThumbTop}px`;
}

function clampH1Scroll() {
  const { minOffset, maxOffset } = getH1ScrollRange();
  state.h1ScrollOffset = Math.min(maxOffset, Math.max(minOffset, state.h1ScrollOffset));
}

function animateH1Scroll() {
  if (Math.abs(state.h1Velocity) < 0.05) {
    state.h1Velocity = 0;
    state.h1Raf = null;
    return;
  }

  state.h1ScrollOffset -= state.h1Velocity;
  state.h1Velocity *= 0.92;
  clampH1Scroll();
  updateH1TrackPosition();
  state.h1Raf = requestAnimationFrame(animateH1Scroll);
}

function onH1Wheel(event) {
  if (!state.h1Projects.length || state.category === 'home') {
    return;
  }

  event.preventDefault();
  state.h1Velocity += event.deltaY * 0.09;
  if (!state.h1Raf) {
    state.h1Raf = requestAnimationFrame(animateH1Scroll);
  }
}

function handleH1ProjectClick(project) {
  if (project.category === 'history') {
    if (!project.link) {
      return;
    }
    state.selectedProjectId = project.id;
    renderH1Projects();
    historyLinkFrame.src = project.link;
    setActiveView('historyLink');
    return;
  }

  if (project.category === 'metaverse') {
    state.selectedProjectId = project.id;
    state.selectedMetaverseProject = project;
    renderH1Projects();
    showMetaversePreview(project);
    return;
  }

  if (project.category === 'extra') {
    state.selectedProjectId = project.id;
    renderH1Projects();
    selectExtraProject(project);
  }
}

function getMetaversePreviewLayout() {
  return document.querySelector('.h0-metaverse-layout');
}

function setMetaversePreviewLayoutPending(isPending) {
  getMetaversePreviewLayout()?.classList.toggle('is-layout-pending', isPending);
}

function applyFinalMetaverseOverviewAlign() {
  const stage = document.querySelector('.h0-metaverse-preview-stage');
  const layout = getMetaversePreviewLayout();

  if (!stage || !layout) {
    return;
  }

  syncMetaverseSideColumnsPaddingTop(layout, stage, { force: true });
}

function finishMetaversePreviewLayoutSync() {
  const layout = getMetaversePreviewLayout();
  if (!layout?.classList.contains('is-layout-pending')) {
    return;
  }

  applyFinalMetaverseOverviewAlign();

  const switchToken = metaversePreviewSwitchToken;
  const media = metaversePreviewMedia;
  const incoming = media?.querySelector('.preview-media-incoming');
  const outgoing = media?.querySelector('.preview-media-outgoing');

  const reveal = () => {
    if (switchToken !== metaversePreviewSwitchToken) {
      return;
    }
    setMetaversePreviewLayoutPending(false);
  };

  if (incoming && outgoing) {
    media.classList.add('is-crossfading');
    incoming.classList.remove('preview-media-incoming');
    setMetaversePreviewLayoutPending(false);

    const switchMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : METAVERSE_SWITCH_MS;

    window.setTimeout(() => {
      if (switchToken !== metaversePreviewSwitchToken) {
        return;
      }
      outgoing.remove();
      media.classList.remove('is-crossfading', 'has-layer-stack');
    }, switchMs);
    return;
  }

  incoming?.classList.remove('preview-media-incoming');
  if (incoming) {
    incoming.style.opacity = '';
  }
  reveal();
}

function getActiveMetaversePreviewMediaElement() {
  const media = metaversePreviewMedia;
  if (!media) {
    return null;
  }

  return (
    media.querySelector('.preview-media-incoming')
    || media.querySelector('video:not(.preview-media-outgoing), img:not(.preview-media-outgoing)')
    || media.querySelector('video, img')
  );
}

function getMetaversePreviewLaunchElement() {
  const media = metaversePreviewMedia;
  if (!media) {
    return null;
  }

  const candidates = media.querySelectorAll('video, img');
  for (const element of candidates) {
    if (!element.classList.contains('preview-media-outgoing')) {
      return element;
    }
  }

  return null;
}

function abortMetaversePreviewCrossfade() {
  const media = metaversePreviewMedia;
  if (!media) {
    return;
  }

  media.querySelectorAll('.preview-media-outgoing').forEach((element) => element.remove());
  media.querySelectorAll('.preview-media-incoming').forEach((element) => {
    element.classList.remove('preview-media-incoming');
    element.style.opacity = '';
  });
  media.classList.remove('is-crossfading', 'has-layer-stack');
}

function markOutgoingMetaversePreviewMedia() {
  const media = metaversePreviewMedia;
  if (!media) {
    return;
  }

  media.querySelectorAll('video, img').forEach((element) => {
    if (element.classList.contains('preview-media-outgoing')) {
      return;
    }

    element.classList.add('preview-media-outgoing');
    element.style.position = 'absolute';
    element.style.left = `${element.offsetLeft}px`;
    element.style.top = `${element.offsetTop}px`;
    element.style.margin = '0';
    element.style.pointerEvents = 'none';

    if (element.tagName === 'VIDEO') {
      element.pause();
    }
  });
}

function createMetaversePreviewMediaElement(project) {
  if (project.previewType === 'video') {
    const video = document.createElement('video');
    video.src = project.preview;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    return video;
  }

  const img = document.createElement('img');
  img.src = project.preview;
  img.alt = getDisplayTitle(project);
  return img;
}

function dispatchMetaverseChatProject(project) {
  document.dispatchEvent(
    new CustomEvent('rabbit-metaverse-chat-project', {
      detail: { project: project || null }
    })
  );
}

function dispatchExtraChatProject(project) {
  document.dispatchEvent(
    new CustomEvent('rabbit-extra-chat-project', {
      detail: { project: project || null }
    })
  );
}

function clearMetaversePreview() {
  metaversePreviewSwitchToken += 1;
  abortMetaversePreviewCrossfade();
  setMetaversePreviewLayoutPending(false);
  resetMetaversePreviewMediaSize();
  metaversePreviewMedia.innerHTML = '';
  if (metaverseOverview) {
    metaverseOverview.innerHTML = '<p class="overview-empty">프로젝트를 선택하면 설계개요가 표시됩니다.</p>';
  }
  metaversePreviewHint.textContent = '프로젝트를 선택하면 Preview가 표시됩니다.';
  dispatchMetaverseChatProject(null);
}

function formatOverviewLabel(label) {
  const text = String(label || '').replace(/\s+/g, '');

  if (text.length >= 4) {
    return text;
  }

  if (text.length <= 1) {
    return text;
  }

  return text.split('').join(' '.repeat(5 - text.length));
}

function escapeOverviewValue(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMetaverseOverview(project) {
  if (!metaverseOverview) {
    return;
  }

  const overviewId = project.overviewId || project.id;
  const overview = state.projectOverviews?.[overviewId];
  if (!overview) {
    metaverseOverview.innerHTML = `
      <h3 class="overview-title">${getDisplayTitle(project)}</h3>
      <div class="overview-body">
        <p class="overview-empty">등록된 설계개요가 없습니다.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = (overview.rows || [])
    .map(([label, value]) => `
      <dt>${formatOverviewLabel(label)}</dt>
      <dd>${escapeOverviewValue(value)}</dd>
    `)
    .join('');

  metaverseOverview.innerHTML = `
    <h3 class="overview-title">${overview.title || '■ 설계개요'}</h3>
    <div class="overview-body">
      <dl class="overview-list">${rowsHtml}</dl>
    </div>
  `;
}

function resetMetaversePreviewMediaSize(options = {}) {
  const { preserveLayout = false } = options;

  if (!metaversePreviewMedia) {
    return;
  }

  metaversePreviewMedia.classList.remove('is-content-cropped', 'has-preview-video');
  metaversePreviewMedia.onclick = null;

  if (preserveLayout) {
    return;
  }

  metaversePreviewMedia.classList.remove('has-layer-stack', 'is-crossfading');
  metaversePreviewMedia.style.width = '';
  metaversePreviewMedia.style.height = '';
  metaversePreviewMedia.style.position = '';
  metaversePreviewMedia.style.overflow = '';
  metaversePreviewMedia.style.pointerEvents = '';
  metaversePreviewMedia.style.cursor = '';
  metaversePreviewMedia.querySelectorAll('video, img').forEach((element) => {
    element.style.width = '';
    element.style.height = '';
    element.style.objectFit = '';
    element.style.maxWidth = '';
    element.style.maxHeight = '';
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.margin = '';
    element.style.pointerEvents = '';
    element.style.cursor = '';
    element.style.opacity = '';
    element.classList.remove('preview-media-incoming', 'preview-media-outgoing');
  });

  if (metaverseOverview) {
    metaverseOverview.style.paddingTop = '';
  }

  if (metaverseChat) {
    metaverseChat.style.paddingTop = '';
  }

  if (metaversePreviewHint) {
    metaversePreviewHint.style.top = '';
  }
}

function getPreviewMediaNaturalSize(media) {
  if (!media) {
    return { width: 0, height: 0 };
  }

  if (media.tagName === 'VIDEO') {
    const bounds = videoContentBoundsCache.get(media);
    if (bounds) {
      return {
        width: bounds.right - bounds.left + 1,
        height: bounds.bottom - bounds.top + 1
      };
    }

    return { width: media.videoWidth, height: media.videoHeight };
  }

  if (media.tagName === 'IMG') {
    return { width: media.naturalWidth, height: media.naturalHeight };
  }

  return { width: 0, height: 0 };
}

function isVideoContentPixel(data, width, x, y) {
  const index = (y * width + x) * 4;
  const alpha = data[index + 3];
  if (alpha < 8) {
    return false;
  }

  return Math.max(data[index], data[index + 1], data[index + 2]) > VIDEO_CONTENT_LUMA_THRESHOLD;
}

function invalidateVideoContentBounds(video) {
  if (video) {
    videoContentBoundsCache.delete(video);
  }
}

function hasVideoContentLetterbox(bounds, video) {
  if (!bounds || !video?.videoWidth || !video?.videoHeight) {
    return false;
  }

  return (
    bounds.top > 0
    || bounds.bottom < video.videoHeight - 1
    || bounds.left > 0
    || bounds.right < video.videoWidth - 1
  );
}

function sampleVideoPixelIsContent(video, x, y) {
  if (!videoPixelSampleContext || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return false;
  }

  try {
    videoPixelSampleContext.drawImage(video, x, y, 1, 1, 0, 0, 1, 1);
    const pixel = videoPixelSampleContext.getImageData(0, 0, 1, 1).data;
    if (pixel[3] < 8) {
      return false;
    }
    return Math.max(pixel[0], pixel[1], pixel[2]) > VIDEO_CONTENT_LUMA_THRESHOLD;
  } catch (error) {
    console.warn('미리보기 동영상 픽셀 샘플링 실패:', error);
    return false;
  }
}

function clientPointToVideoPixel(video, clientX, clientY) {
  const rect = video.getBoundingClientRect();
  if (!rect.width || !rect.height || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  if (
    clientX < rect.left
    || clientX > rect.right
    || clientY < rect.top
    || clientY > rect.bottom
  ) {
    return null;
  }

  const x = Math.min(
    video.videoWidth - 1,
    Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * video.videoWidth))
  );
  const y = Math.min(
    video.videoHeight - 1,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * video.videoHeight))
  );

  return { x, y };
}

function isMetaversePreviewClickLaunchable(video, clientX, clientY) {
  const media = metaversePreviewMedia;
  if (!video || !media) {
    return false;
  }

  if (media.classList.contains('is-content-cropped')) {
    const mediaRect = media.getBoundingClientRect();
    return (
      clientX >= mediaRect.left
      && clientX <= mediaRect.right
      && clientY >= mediaRect.top
      && clientY <= mediaRect.bottom
    );
  }

  const pixel = clientPointToVideoPixel(video, clientX, clientY);
  if (!pixel) {
    return false;
  }

  return sampleVideoPixelIsContent(video, pixel.x, pixel.y);
}

function detectVideoContentBounds(video, { force = false } = {}) {
  if (!force) {
    const cached = videoContentBoundsCache.get(video);
    if (cached) {
      return cached;
    }
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, width, height);

  let data;
  try {
    data = context.getImageData(0, 0, width, height).data;
  } catch (error) {
    console.warn('미리보기 동영상 콘텐츠 영역 분석 실패:', error);
    return null;
  }

  const step = Math.max(1, Math.floor(Math.min(width, height) / 320));

  let top = 0;
  outerTop: for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += step) {
      if (isVideoContentPixel(data, width, x, y)) {
        top = y;
        break outerTop;
      }
    }
  }

  let bottom = height - 1;
  outerBottom: for (let y = height - 1; y >= top; y -= 1) {
    for (let x = 0; x < width; x += step) {
      if (isVideoContentPixel(data, width, x, y)) {
        bottom = y;
        break outerBottom;
      }
    }
  }

  let left = 0;
  outerLeft: for (let x = 0; x < width; x += 1) {
    for (let y = top; y <= bottom; y += step) {
      if (isVideoContentPixel(data, width, x, y)) {
        left = x;
        break outerLeft;
      }
    }
  }

  let right = width - 1;
  outerRight: for (let x = width - 1; x >= left; x -= 1) {
    for (let y = top; y <= bottom; y += step) {
      if (isVideoContentPixel(data, width, x, y)) {
        right = x;
        break outerRight;
      }
    }
  }

  const bounds = { top, left, right, bottom };
  videoContentBoundsCache.set(video, bounds);
  return bounds;
}

function isClickInsideVideoContent(video, bounds, clientX, clientY) {
  return isMetaversePreviewClickLaunchable(video, clientX, clientY);
}

function scheduleVideoContentBoundsDetection(video, onDetected) {
  if (!video) {
    return;
  }

  const attempt = ({ force = false } = {}) => {
    const bounds = detectVideoContentBounds(video, { force });
    if (bounds) {
      onDetected(bounds);
      return true;
    }
    return false;
  };

  if (attempt()) {
    return;
  }

  const retry = () => {
    invalidateVideoContentBounds(video);
    if (attempt({ force: true })) {
      onDetected(videoContentBoundsCache.get(video));
    }
  };

  video.addEventListener('loadeddata', retry, { once: true });
  video.addEventListener('loadedmetadata', retry, { once: true });
  video.addEventListener('seeked', retry, { once: true });
  video.addEventListener('playing', () => {
    invalidateVideoContentBounds(video);
    retry();
  }, { once: true });

  const onTimeUpdate = () => {
    if (video.currentTime > 0) {
      invalidateVideoContentBounds(video);
    }
    if (attempt({ force: true })) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      onDetected(videoContentBoundsCache.get(video));
    }
  };
  video.addEventListener('timeupdate', onTimeUpdate);
}

function getMetaverseOverviewReferenceProject() {
  return state.projects.metaverse?.find(
    (project) => project.id === METAVERSE_OVERVIEW_REFERENCE_PROJECT_ID
  );
}

function computeMetaverseOverviewReferenceRenderHeight(stage) {
  if (!metaverseOverviewReferenceContentSize || !stage?.clientWidth || !stage?.clientHeight) {
    return null;
  }

  const { width, height } = metaverseOverviewReferenceContentSize;
  const renderSize = computeMetaversePreviewRenderSize(
    width,
    height,
    stage.clientWidth,
    stage.clientHeight
  );

  return renderSize?.height ?? null;
}

function getMetaverseOverviewAlignMediaHeight(stage) {
  const referenceHeight = computeMetaverseOverviewReferenceRenderHeight(stage);
  if (referenceHeight) {
    return referenceHeight;
  }

  return metaversePreviewMedia?.offsetHeight || null;
}

function computeMetaverseSideColumnPaddingTop(layout, stage) {
  const mediaHeight = getMetaverseOverviewAlignMediaHeight(stage);
  if (!mediaHeight) {
    return null;
  }

  const layoutRect = layout.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const mediaTopInStage = Math.max(0, (stage.clientHeight - mediaHeight) / 2);
  const mediaTopInLayout = stageRect.top - layoutRect.top + mediaTopInStage;

  return Math.round(Math.max(0, mediaTopInLayout));
}

function syncMetaverseSideColumnsPaddingTop(layout, stage, options = {}) {
  if (!layout || !stage) {
    return;
  }

  if (!options.force) {
    const layoutEl = layout.classList.contains('h0-metaverse-layout')
      ? layout
      : stage.closest('.h0-metaverse-layout');
    if (!layoutEl?.classList.contains('is-layout-pending')) {
      return;
    }
  }

  const paddingTop = computeMetaverseSideColumnPaddingTop(layout, stage);
  if (paddingTop === null) {
    return;
  }

  const paddingValue = `${paddingTop}px`;
  if (metaverseOverview) {
    metaverseOverview.style.paddingTop = paddingValue;
  }
  if (metaverseChat) {
    metaverseChat.style.paddingTop = paddingValue;
  }
}

function syncMetaverseOverviewPaddingTop(overview, layout, stage, options = {}) {
  syncMetaverseSideColumnsPaddingTop(layout, stage, options);
}

async function loadMetaverseOverviewReferenceMetrics() {
  const project = getMetaverseOverviewReferenceProject();
  if (!project?.preview || project.previewType !== 'video') {
    return;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = project.preview;

  try {
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('reference preview load failed')), { once: true });
    });

    if (video.videoWidth && video.videoHeight) {
      try {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
        await new Promise((resolve) => {
          video.addEventListener('seeked', resolve, { once: true });
        });
      } catch (error) {
        // seek unsupported; use first frame
      }
    }

    const bounds = detectVideoContentBounds(video, { force: true });
    if (bounds && hasVideoContentLetterbox(bounds, video)) {
      metaverseOverviewReferenceContentSize = {
        width: bounds.right - bounds.left + 1,
        height: bounds.bottom - bounds.top + 1
      };
    } else if (video.videoWidth && video.videoHeight) {
      metaverseOverviewReferenceContentSize = {
        width: video.videoWidth,
        height: video.videoHeight
      };
    }
  } catch (error) {
    console.warn('메타버스 설계개요 기준(서충주) 미리보기 로드 실패:', error);
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

function syncOverviewWithPreviewTop(overview, layout, previewEl) {
  if (!overview || !layout || !previewEl) {
    return;
  }

  const layoutRect = layout.getBoundingClientRect();
  const previewRect = previewEl.getBoundingClientRect();

  if (!previewRect.height) {
    return;
  }

  overview.style.paddingTop = `${Math.max(0, Math.round(previewRect.top - layoutRect.top))}px`;
}

function syncPreviewOverviewAlignWithMedia(overview, layout, stage, media, options = {}) {
  if (!overview || !layout || !stage || !media?.offsetHeight) {
    return;
  }

  if (overview === metaverseOverview && !options.force) {
    const layoutEl = layout || stage.closest('.h0-metaverse-layout');
    if (!layoutEl?.classList.contains('is-layout-pending')) {
      return;
    }
  }

  const layoutRect = layout.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const mediaTopInStage = Math.max(0, (stage.clientHeight - media.offsetHeight) / 2);
  const mediaTopInLayout = stageRect.top - layoutRect.top + mediaTopInStage;

  overview.style.paddingTop = `${Math.round(Math.max(0, mediaTopInLayout))}px`;
}

function syncMetaverseOverviewAlign(overview, layout, stage) {
  syncMetaverseOverviewPaddingTop(overview, layout, stage, { force: true });
}

function syncMetaversePreviewHintPosition() {
  const pane = document.querySelector('.h0-metaverse-preview-pane');
  const media = metaversePreviewMedia;
  const hint = metaversePreviewHint;

  if (!pane || !media || !hint) {
    return;
  }

  if (!views.metaversePreview.classList.contains('is-active') || !media.offsetHeight) {
    hint.style.top = '';
    return;
  }

  const paneRect = pane.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();
  const hintStyle = window.getComputedStyle(hint);
  const lineHeight = parseFloat(hintStyle.lineHeight);
  const fontSize = parseFloat(hintStyle.fontSize) || 16;
  const oneLine = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.45;

  hint.style.top = `${Math.round(mediaRect.bottom - paneRect.top + oneLine)}px`;
}

function setMetaversePreviewCropInteraction(isCropped) {
  const media = metaversePreviewMedia;
  if (!media) {
    return;
  }

  media.classList.toggle('is-content-cropped', isCropped);
}

function applyPreviewCropLayout(video, media, stage, bounds) {
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const renderSize = computeMetaversePreviewRenderSize(
    contentWidth,
    contentHeight,
    stage.clientWidth,
    stage.clientHeight
  );

  if (!renderSize) {
    return null;
  }

  const scale = renderSize.width / contentWidth;
  media.style.position = 'relative';
  media.style.overflow = 'hidden';
  media.style.width = `${renderSize.width}px`;
  media.style.height = `${renderSize.height}px`;

  video.style.position = 'absolute';
  video.style.left = `${-bounds.left * scale}px`;
  video.style.top = `${-bounds.top * scale}px`;
  video.style.width = `${frameWidth * scale}px`;
  video.style.height = `${frameHeight * scale}px`;
  video.style.objectFit = 'fill';
  video.style.margin = '0';
  video.style.maxWidth = 'none';
  video.style.maxHeight = 'none';
  video.style.pointerEvents = 'none';

  return renderSize;
}

function applyPreviewNormalLayout(mediaElement, media, renderSize) {
  const { width, height } = renderSize;

  media.style.position = '';
  media.style.overflow = '';
  mediaElement.style.position = '';
  mediaElement.style.left = '';
  mediaElement.style.top = '';
  mediaElement.style.pointerEvents = '';
  mediaElement.style.width = `${width}px`;
  mediaElement.style.height = `${height}px`;
  mediaElement.style.objectFit = 'fill';
  mediaElement.style.maxWidth = '';
  mediaElement.style.maxHeight = '';
  media.style.width = `${width}px`;
  media.style.height = `${height}px`;

  return renderSize;
}

function applyVideoPreviewCropLayout(video, media, stage, overview, bounds, options = {}) {
  if (!applyPreviewCropLayout(video, media, stage, bounds)) {
    return;
  }

  const layout = stage.closest('.h0-metaverse-layout');
  setMetaversePreviewCropInteraction(true);
  syncMetaverseOverviewPaddingTop(overview, layout, stage, options);
  syncMetaversePreviewHintPosition();
}

function applyVideoPreviewNormalLayout(mediaElement, media, stage, overview, renderSize, options = {}) {
  const layout = stage.closest('.h0-metaverse-layout');

  applyPreviewNormalLayout(mediaElement, media, renderSize);
  setMetaversePreviewCropInteraction(false);
  syncMetaverseOverviewPaddingTop(overview, layout, stage, options);
  syncMetaversePreviewHintPosition();
}

function computeMetaversePreviewRenderSize(naturalWidth, naturalHeight, stageWidth, stageHeight) {
  if (!naturalWidth || !naturalHeight || !stageWidth || !stageHeight) {
    return null;
  }

  let width = stageWidth;
  let height = Math.round((width * naturalHeight) / naturalWidth);

  if (height > stageHeight) {
    height = stageHeight;
    width = Math.round((height * naturalWidth) / naturalHeight);
  }

  return { width, height };
}

function syncMetaversePreviewLayout(options = {}) {
  const stage = document.querySelector('.h0-metaverse-preview-stage');
  const layout = stage?.closest('.h0-metaverse-layout');
  const media = metaversePreviewMedia;
  const overview = metaverseOverview;
  const mediaElement = getActiveMetaversePreviewMediaElement();

  if (!stage || !media || !overview || !layout) {
    return;
  }

  if (!mediaElement || !views.metaversePreview.classList.contains('is-active')) {
    return;
  }

  const { width: naturalWidth, height: naturalHeight } = getPreviewMediaNaturalSize(mediaElement);

  if (mediaElement.tagName === 'VIDEO') {
    const bounds = detectVideoContentBounds(mediaElement, { force: false });
    if (bounds && hasVideoContentLetterbox(bounds, mediaElement)) {
      applyVideoPreviewCropLayout(mediaElement, media, stage, overview, bounds, options);
      if (media.offsetHeight) {
        finishMetaversePreviewLayoutSync();
      }
      return;
    }
  }

  const renderSize = computeMetaversePreviewRenderSize(
    naturalWidth,
    naturalHeight,
    stage.clientWidth,
    stage.clientHeight
  );

  if (!renderSize) {
    return;
  }

  applyVideoPreviewNormalLayout(mediaElement, media, stage, overview, renderSize, options);
  if (media.offsetHeight) {
    finishMetaversePreviewLayoutSync();
  }
}

function bindMetaversePreviewMediaEvents(mediaElement, project) {
  const media = metaversePreviewMedia;

  if (mediaElement.tagName === 'VIDEO') {
    media.classList.add('has-preview-video');
  }

  const handleLaunchClick = (event) => {
    const launchElement = getMetaversePreviewLaunchElement();
    if (!launchElement) {
      return;
    }

    if (launchElement.tagName === 'VIDEO') {
      if (!isMetaversePreviewClickLaunchable(launchElement, event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    launchMetaverse(project);
  };

  media.onclick = handleLaunchClick;

  mediaElement.addEventListener('error', () => {
    finishMetaversePreviewLayoutSync();
  }, { once: true });

  const sync = () => {
    if (mediaElement.tagName === 'VIDEO') {
      if (mediaElement.currentTime > 0) {
        invalidateVideoContentBounds(mediaElement);
      }
      detectVideoContentBounds(mediaElement, { force: mediaElement.currentTime > 0 });
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(syncMetaversePreviewLayout);
    });
  };

  if (mediaElement.tagName === 'VIDEO') {
    if (mediaElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      sync();
    } else {
      mediaElement.addEventListener('loadeddata', sync, { once: true });
      mediaElement.addEventListener('loadedmetadata', sync, { once: true });
    }
    mediaElement.addEventListener('seeked', sync, { once: true });
    scheduleVideoContentBoundsDetection(mediaElement, () => sync());
  } else if (mediaElement.tagName === 'IMG') {
    if (mediaElement.complete) {
      sync();
    } else {
      mediaElement.addEventListener('load', sync, { once: true });
    }
  }
}

function showMetaversePreview(project) {
  if (!project) {
    clearMetaversePreview();
    setActiveView('metaversePreview');
    return;
  }

  setActiveView('metaversePreview');
  metaversePreviewSwitchToken += 1;

  const hasExistingPreview = Boolean(metaversePreviewMedia?.querySelector('video, img'));

  setMetaversePreviewLayoutPending(true);

  if (hasExistingPreview) {
    abortMetaversePreviewCrossfade();
    resetMetaversePreviewMediaSize({ preserveLayout: true });
    markOutgoingMetaversePreviewMedia();
  } else {
    resetMetaversePreviewMediaSize();
    metaversePreviewMedia.innerHTML = '';
  }

  renderMetaverseOverview(project);

  const mediaElement = createMetaversePreviewMediaElement(project);
  if (hasExistingPreview) {
    mediaElement.classList.add('preview-media-incoming');
    metaversePreviewMedia.classList.add('has-layer-stack');
  }

  metaversePreviewMedia.appendChild(mediaElement);
  bindMetaversePreviewMediaEvents(mediaElement, project);

  metaversePreviewHint.textContent = `${getDisplayTitle(project)} — Preview를 클릭하면 메타버스로 이동합니다.`;
  dispatchMetaverseChatProject(project);
  requestAnimationFrame(() => {
    requestAnimationFrame(syncMetaversePreviewLayout);
  });
}

function launchMetaverse(project) {
  if (!project?.metaverseUrl) {
    return;
  }

  setActiveView('metaverse');
  metaverseFrame.src = 'about:blank';
  requestAnimationFrame(() => {
    metaverseFrame.src = `${project.metaverseUrl}&embed=1&_reload=${Date.now()}`;
  });
}

function applyExtraOverviewBounds(element, topOffset, bottomEdge) {
  if (!element) {
    return;
  }

  if (topOffset === null || bottomEdge === null) {
    element.style.paddingTop = '';
    element.style.maxHeight = '';
    return;
  }

  element.style.paddingTop = `${topOffset}px`;
  element.style.maxHeight = `${bottomEdge}px`;
  element.style.boxSizing = 'border-box';
}

function applyExtraChatTopAlign(topOffset) {
  if (!extraChat) {
    return;
  }

  extraChat.style.maxHeight = '';
  extraChat.style.paddingTop = topOffset === null ? '' : `${topOffset}px`;
}

function syncExtraOverviewVideoBounds(overview, layout, media) {
  if (!layout || !media) {
    return;
  }

  const layoutRect = layout.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();

  if (!mediaRect.height) {
    applyExtraOverviewBounds(overview, null, null);
    applyExtraChatTopAlign(null);
    return;
  }

  const topOffset = Math.max(0, Math.round(mediaRect.top - layoutRect.top));
  const bottomEdge = Math.round(mediaRect.bottom - layoutRect.top);

  applyExtraOverviewBounds(overview, topOffset, bottomEdge);
  applyExtraChatTopAlign(topOffset);
}

function syncExtraDownloadHintPosition(media) {
  const pane = document.querySelector('.h0-extra-preview-pane');
  const hint = extraDownloadHint;

  if (!pane || !hint || !media) {
    return;
  }

  if (!views.extra.classList.contains('is-active') || !media.offsetHeight) {
    hint.style.top = '';
    return;
  }

  const paneRect = pane.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();
  const hintStyle = window.getComputedStyle(hint);
  const lineHeight = parseFloat(hintStyle.lineHeight);
  const fontSize = parseFloat(hintStyle.fontSize) || 16;
  const oneLine = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.45;

  hint.style.top = `${Math.round(mediaRect.bottom - paneRect.top + oneLine)}px`;
}

function updateExtraDownloadHint(project) {
  if (!extraDownloadHint || !extraDownloadLink) {
    return;
  }

  if (project?.downloadUrl) {
    extraDownloadLink.href = project.downloadUrl;
    extraDownloadHint.hidden = false;
    return;
  }

  extraDownloadHint.hidden = true;
  extraDownloadLink.removeAttribute('href');
  extraDownloadHint.style.top = '';
}

async function selectExtraProject(project) {
  setActiveView('extra');
  resetExtraPreviewMediaSize();
  extraPreviewMedia.innerHTML = '';
  updateExtraDownloadHint(project);
  dispatchExtraChatProject(project);

  const description = await loadDescription(project);
  renderExtraOverview(project, description);

  if (project.previewType === 'video' && project.preview) {
    const video = document.createElement('video');
    video.src = project.preview;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    extraPreviewMedia.appendChild(video);
    const syncExtra = () => requestAnimationFrame(() => {
      requestAnimationFrame(syncExtraPreviewLayout);
    });
    video.addEventListener('loadeddata', syncExtra, { once: true });
    video.addEventListener('loadedmetadata', syncExtra, { once: true });
    video.addEventListener('seeked', syncExtra, { once: true });
    scheduleVideoContentBoundsDetection(video, () => syncExtra());
  } else if (project.preview) {
    const img = document.createElement('img');
    img.src = project.preview;
    img.alt = project.title;
    extraPreviewMedia.appendChild(img);
    img.addEventListener('load', () => requestAnimationFrame(syncExtraPreviewLayout), { once: true });
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(syncExtraPreviewLayout);
  });
}

function clearExtraPreview() {
  resetExtraPreviewMediaSize();
  extraPreviewMedia.innerHTML = '';
  updateExtraDownloadHint(null);
  if (extraOverview) {
    extraOverview.innerHTML = '<p class="overview-empty">등록된 EXTRA 프로젝트가 없습니다.</p>';
  }
  dispatchExtraChatProject(null);
}

function renderExtraOverview(project, description) {
  if (!extraOverview) {
    return;
  }

  extraOverview.innerHTML = `
    <h3 class="overview-title">■ ${escapeOverviewValue(project.title)}</h3>
    <div class="overview-body">
      ${formatDescription(description)}
    </div>
  `;
}

function resetExtraPreviewMediaSize() {
  if (!extraPreviewMedia) {
    return;
  }

  extraPreviewMedia.style.width = '';
  extraPreviewMedia.style.height = '';
  extraPreviewMedia.style.position = '';
  extraPreviewMedia.style.overflow = '';
  extraPreviewMedia.querySelectorAll('video, img').forEach((element) => {
    element.style.width = '';
    element.style.height = '';
    element.style.objectFit = '';
    element.style.maxWidth = '';
    element.style.maxHeight = '';
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.margin = '';
    element.style.pointerEvents = '';
  });

  if (extraOverview) {
    extraOverview.style.paddingTop = '';
    extraOverview.style.maxHeight = '';
  }

  if (extraChat) {
    extraChat.style.paddingTop = '';
    extraChat.style.maxHeight = '';
  }

  if (extraDownloadHint) {
    extraDownloadHint.style.top = '';
  }
}

function syncExtraPreviewLayout() {
  const stage = document.querySelector('.h0-extra-preview-stage');
  const media = extraPreviewMedia;
  const overview = extraOverview;
  const layout = extraLayout;
  const mediaElement = media?.querySelector('video, img');

  if (!stage || !media || !overview || !layout) {
    return;
  }

  if (!mediaElement || !views.extra.classList.contains('is-active')) {
    return;
  }

  const finishLayout = () => {
    syncExtraOverviewVideoBounds(overview, layout, media);
    syncExtraDownloadHintPosition(media);
  };

  const { width: naturalWidth, height: naturalHeight } = getPreviewMediaNaturalSize(mediaElement);

  if (mediaElement.tagName === 'VIDEO') {
    const bounds = detectVideoContentBounds(mediaElement, { force: false });
    if (bounds && hasVideoContentLetterbox(bounds, mediaElement)) {
      if (applyPreviewCropLayout(mediaElement, media, stage, bounds)) {
        finishLayout();
      }
      return;
    }
  }

  const renderSize = computeMetaversePreviewRenderSize(
    naturalWidth,
    naturalHeight,
    stage.clientWidth,
    stage.clientHeight
  );

  if (!renderSize) {
    return;
  }

  applyPreviewNormalLayout(mediaElement, media, renderSize);
  finishLayout();
}

async function loadDescription(project) {
  if (!project.descriptionPath) {
    return project.description || '';
  }
  if (state.descriptionCache.has(project.descriptionPath)) {
    return state.descriptionCache.get(project.descriptionPath);
  }
  try {
    const response = await fetch(project.descriptionPath);
    const text = response.ok ? await response.text() : '';
    state.descriptionCache.set(project.descriptionPath, text);
    return text;
  } catch (error) {
    console.warn('EXTRA 설명 로드 실패:', error);
    return project.description || '';
  }
}

function formatDescription(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

function triggerEmbeddedAdmin() {
  if (state.category === 'history') {
    historyFrame.contentWindow?.postMessage({ type: 'rabbit-admin-open' }, '*');
    return;
  }
  if (state.category === 'metaverse') {
    metaverseFrame.contentWindow?.postMessage({ type: 'rabbit-admin-open' }, '*');
  }
}

function toggleMetaverseFullscreen() {
  const target = views.metaverse;
  if (!document.fullscreenElement) {
    target.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function getKstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatVisitorCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString('ko-KR') : '--';
}

function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('방문자 카운트 저장소 접근 실패:', error);
  }
}

function renderVisitorCounts(data, todayKey) {
  totalVisitorCount.textContent = formatVisitorCount(data?.totalVisitors ?? 0);
  todayVisitorCount.textContent = formatVisitorCount(data?.dailyVisitors?.[todayKey] ?? 0);
}

async function updateVisitorCounter() {
  const todayKey = getKstDateKey();
  const todayStorageKey = `${DAILY_VISIT_COUNTED_PREFIX}${todayKey}`;
  const shouldCountTotal = safeGetStorage(TOTAL_VISIT_COUNTED_KEY) !== 'true';
  const shouldCountToday = safeGetStorage(todayStorageKey) !== 'true';
  const statsRef = doc(db, VISIT_STATS_COLLECTION, VISIT_STATS_DOC);

  try {
    if (shouldCountTotal || shouldCountToday) {
      const updates = { lastVisitedAt: serverTimestamp() };
      if (shouldCountTotal) {
        updates.totalVisitors = increment(1);
      }
      if (shouldCountToday) {
        updates.dailyVisitors = { [todayKey]: increment(1) };
      }
      await setDoc(statsRef, updates, { merge: true });
      if (shouldCountTotal) {
        safeSetStorage(TOTAL_VISIT_COUNTED_KEY, 'true');
      }
      if (shouldCountToday) {
        safeSetStorage(todayStorageKey, 'true');
      }
    }

    const snapshot = await getDoc(statsRef);
    renderVisitorCounts(snapshot.exists() ? snapshot.data() : {}, todayKey);
  } catch (error) {
    console.error('방문자 카운트 업데이트 실패:', error);
    renderVisitorCounts({}, todayKey);
  }
}

let animationStarted = false;

function preloadFrames(frames) {
  frames.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function playFullSequence(callback) {
  let index = 0;
  function nextFrame() {
    ucAnimationImage.src = animationFrames[index];
    index += 1;
    if (index < animationFrames.length) {
      window.setTimeout(nextFrame, frameDuration);
    } else if (typeof callback === 'function') {
      callback();
    }
  }
  nextFrame();
}

function playTailLoop() {
  const startTime = performance.now();
  let index = 0;
  function nextTailFrame() {
    ucAnimationImage.src = tailFrames[index % tailFrames.length];
    index += 1;
    if (performance.now() - startTime < tailLoopDuration) {
      window.setTimeout(nextTailFrame, frameDuration);
    } else {
      playFullSequence(playTailLoop);
    }
  }
  nextTailFrame();
}

function startUcAnimation() {
  if (animationStarted || !ucAnimationImage) {
    return;
  }
  animationStarted = true;
  preloadFrames(animationFrames);
  playFullSequence(playTailLoop);
}

async function loadProjectData() {
  const [jsonResponse, overviewResponse] = await Promise.all([
    fetch('data/homepage-projects.json'),
    fetch('metaverse/data/project-overviews.json')
  ]);

  if (!jsonResponse.ok) {
    throw new Error('homepage-projects.json 로드 실패');
  }

  const data = await jsonResponse.json();
  state.projects.history = await loadHistoryProjectsFromFirestore();
  state.projects.metaverse = sortProjectsForH1(
    (data.metaverse || []).map((project, orderIndex) => ({
      ...project,
      orderIndex,
      registeredAt: project.registeredAt ?? orderIndex
    }))
  );
  state.projects.extra = sortProjectsForH1(
    (data.extra || []).map((project, orderIndex) => ({
      ...project,
      orderIndex,
      registeredAt: project.registeredAt ?? orderIndex
    }))
  );
  state.projectOverviews = overviewResponse.ok ? await overviewResponse.json() : {};
  subscribeHistoryProjects();
  await loadMetaverseOverviewReferenceMetrics();
}

const h1ScrollbarDrag = {
  active: false,
  pointerId: null,
  startPointerY: 0,
  startScrollOffset: 0
};

function bindH1ScrollbarDrag() {
  if (!h1Scrollbar || !h1ScrollbarThumb) {
    return;
  }

  h1ScrollbarThumb.addEventListener('pointerdown', (event) => {
    if (!state.h1Projects.length || state.category === 'home') {
      return;
    }

    event.preventDefault();
    h1ScrollbarDrag.active = true;
    h1ScrollbarDrag.pointerId = event.pointerId;
    h1ScrollbarDrag.startPointerY = event.clientY;
    h1ScrollbarDrag.startScrollOffset = state.h1ScrollOffset;
    h1ScrollbarThumb.setPointerCapture(event.pointerId);
    h1Scrollbar.classList.add('is-dragging');
  });

  h1Scrollbar.addEventListener('pointerdown', (event) => {
    if (event.target === h1ScrollbarThumb) {
      return;
    }
    if (!state.h1Projects.length || state.category === 'home') {
      return;
    }

    event.preventDefault();
    const { thumbHeight, maxThumbTop, maxScroll } = getH1ScrollMetrics();
    if (maxScroll <= 0) {
      return;
    }

    const rect = h1Scrollbar.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const targetThumbTop = Math.min(maxThumbTop, Math.max(0, clickY - thumbHeight / 2));
    const ratio = maxThumbTop > 0 ? targetThumbTop / maxThumbTop : 0;
    setH1ScrollFromRatio(ratio);
  });

  h1ScrollbarThumb.addEventListener('pointermove', (event) => {
    if (!h1ScrollbarDrag.active || event.pointerId !== h1ScrollbarDrag.pointerId) {
      return;
    }

    event.preventDefault();
    const { maxScroll, maxThumbTop } = getH1ScrollMetrics();
    if (maxScroll <= 0 || maxThumbTop <= 0) {
      return;
    }

    const deltaY = event.clientY - h1ScrollbarDrag.startPointerY;
    const startRatio = -h1ScrollbarDrag.startScrollOffset / maxScroll;
    const startThumbTop = startRatio * maxThumbTop;
    const nextThumbTop = Math.min(maxThumbTop, Math.max(0, startThumbTop + deltaY));
    setH1ScrollFromRatio(nextThumbTop / maxThumbTop);
  });

  const endH1ScrollbarDrag = (event) => {
    if (!h1ScrollbarDrag.active) {
      return;
    }
    if (event.pointerId !== undefined && h1ScrollbarDrag.pointerId !== event.pointerId) {
      return;
    }

    const pointerId = h1ScrollbarDrag.pointerId;
    h1ScrollbarDrag.active = false;
    h1ScrollbarDrag.pointerId = null;
    h1Scrollbar.classList.remove('is-dragging');

    try {
      h1ScrollbarThumb.releasePointerCapture(pointerId);
    } catch (error) {
      // pointer capture may already be released
    }
  };

  h1ScrollbarThumb.addEventListener('pointerup', endH1ScrollbarDrag);
  h1ScrollbarThumb.addEventListener('pointercancel', endH1ScrollbarDrag);
}

function bindEvents() {
  h2Menu.querySelectorAll('.h2-menu-item').forEach((button) => {
    button.addEventListener('click', () => setCategory(button.dataset.category));
  });

  h2AdminTrigger.addEventListener('click', triggerEmbeddedAdmin);
  metaverseFullscreenButton.addEventListener('click', toggleMetaverseFullscreen);
  h1ListViewport.addEventListener('wheel', onH1Wheel, { passive: false });
  bindH1ScrollbarDrag();

  let touchStartY = 0;
  h1ListViewport.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0]?.clientY ?? 0;
  }, { passive: true });
  h1ListViewport.addEventListener('touchmove', (event) => {
    if (!state.h1Projects.length || state.category === 'home') {
      return;
    }
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - currentY;
    if (Math.abs(delta) > 0) {
      event.preventDefault();
      state.h1Velocity += delta * 0.175;
      touchStartY = currentY;
      if (!state.h1Raf) {
        state.h1Raf = requestAnimationFrame(animateH1Scroll);
      }
    }
  }, { passive: false });

  window.addEventListener('resize', () => syncMetaversePreviewLayout({ force: true }));
  window.addEventListener('resize', syncExtraPreviewLayout);
  document.addEventListener('pointerover', (event) => {
    const clickable = event.target.closest('.is-clickable, .h2-menu-item, .h2-admin-trigger, .h0-preview-media, .h0-metaverse-toolbar button, .h0-extra-download-link');
    document.body.classList.toggle('is-pointer', Boolean(clickable));
  });
}

function showWelcomeSequence() {
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.innerHTML = WELCOME_TEXT;
    welcomeMessage.classList.add('show');
  }

  window.setTimeout(() => {
    maintenanceMessage?.classList.add('show', 'fade');
    ucAnimationContainer?.classList.add('show');
    startUcAnimation();
  }, 1500);
}

async function init() {
  bindEvents();
  await loadProjectData();
  await updateVisitorCounter();
  showWelcomeSequence();
  setCategory('home');

  if (DEBUG_MODE) {
    console.info('[homepage-shell] DEBUG_MODE enabled');
  }
}

init().catch((error) => {
  console.error('홈페이지 셸 초기화 실패:', error);
});
