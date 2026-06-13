/* ===================================================
   공통 유틸
=================================================== */
const $ = id => document.getElementById(id);

/* ===================================================
   트렌드 슬라이드
=================================================== */
const TREND_IMAGES = ['img/trend1.png','img/trend2.png','img/trend3.png','img/trend4.png'];
let trendIdx = 0, trendBusy = false;

TREND_IMAGES.forEach((_, i) => {
  const dot = Object.assign(document.createElement('div'), {
    id: `tdot-${i}`,
    className: 'trend-dot' + (i === 0 ? ' active' : '')
  });
  $('trendDots').appendChild(dot);
});

function updateTrendDots() {
  TREND_IMAGES.forEach((_, i) => {
    $(`tdot-${i}`).className = 'trend-dot' + (i === trendIdx ? ' active' : '');
  });
}

function updateTrendNav() {
  // 첫 번째 카드에서는 이전 버튼 숨김 (캐릭터 선택으로 되돌아갈 수 없음)
  $('trendPrevBtn').classList.toggle('hidden-nav', trendIdx === 0);
}

function trendFlip(direction) {
  if (trendBusy) return;
  trendBusy = true;

  const wrap    = $('trendCardWrap');
  const img     = $('trendCardImg');
  const EASING  = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const DURATION = 280;

  // next → 현재 카드 왼쪽으로 퇴장, prev → 오른쪽으로 퇴장
  const exitTo    = direction === 'next' ? 'translateX(-108%)' : 'translateX(108%)';
  const enterFrom = direction === 'next' ? 'translateX(108%)'  : 'translateX(-108%)';

  wrap.style.transition = `transform ${DURATION}ms ${EASING}`;
  wrap.style.transform  = exitTo;

  setTimeout(() => {
    const nextIdx = direction === 'next' ? trendIdx + 1 : trendIdx - 1;

    // 마지막 카드에서 next → 설문지로 이동
    if (direction === 'next' && nextIdx >= TREND_IMAGES.length) {
      wrap.style.transition = 'none';
      wrap.style.transform  = '';
      hidePage('pageTrend');
      showPage('pageSurvey');
      trendIdx  = 0;
      trendBusy = false;
      return;
    }

    trendIdx = nextIdx;
    img.src  = TREND_IMAGES[trendIdx];
    updateTrendDots();
    updateTrendNav();

    // 반대편에서 즉시 배치 후 슬라이드 인
    wrap.style.transition = 'none';
    wrap.style.transform  = enterFrom;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      wrap.style.transition = `transform ${DURATION}ms ${EASING}`;
      wrap.style.transform  = 'translateX(0)';
      setTimeout(() => { trendBusy = false; }, DURATION + 20);
    }));
  }, DURATION);
}

function addTapHandler(el, fn) {
  let touched = false;
  el.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); touched = true; fn(); }, { passive: false });
  el.addEventListener('click',      e => { e.stopPropagation(); if (touched) { touched = false; return; } fn(); });
}

addTapHandler($('trendPrevBtn'), () => trendFlip('prev'));
addTapHandler($('trendNextBtn'), () => trendFlip('next'));

function trendSkip() {
  if (trendBusy) return;
  hidePage('pageTrend');
  showPage('pageSurvey');
  trendIdx  = 0;
  trendBusy = false;
}

/* ===================================================
   랜딩 페이지
=================================================== */
let showCardNews = false;

function startFlow(withCardNews) {
  showCardNews = withCardNews;
  hidePage('pageLanding');
  showPage('pageCharacter');
}

/* ===================================================
   설문 / 투표 파트
=================================================== */

/* ===== Google Apps Script 연동 ===== */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbmPgOEE7wy2Dsps1SiyQ664yLa48OYQYKYNsRbCSpns4b-crkPu_mFBCk8SLyIc7V6Q/exec';

function sendToSheet(payload) {
  if (!APPS_SCRIPT_URL) return;
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  }).catch(err => console.error('시트 전송 실패:', err));
}

const characters = [
  { name:'현미',     image:'img/brown_rice.png' },
  { name:'완두',     image:'img/pea.png' },
  { name:'백미',     image:'img/white_rice.png' },
  { name:'흑미',     image:'img/black_rice.png' },
  { name:'렌틸콩',   image:'img/lentils.png' },
  { name:'보리',     image:'img/barley.png' },
  { name:'옥수수',   image:'img/corner.png' },
  { name:'강낭콩',   image:'img/kidney_bean.png' },
  { name:'백미찹쌀', image:'img/white_glutinous.png' }
];

const TOTAL_Q = 6;
let selectedChar = null, currentQ = 0;
const data = { preference: null, bookThought: null, bookTrigger: null, categories: new Set(), participation: null };

// 캐릭터 그리드 생성
characters.forEach(c => {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.onclick = () => showPopup(c);
  card.innerHTML = `<img src="${c.image}" alt="${c.name}" loading="lazy">`;
  $('characterGrid').appendChild(card);
});

// 팝업
function showPopup(char) { selectedChar = char; $('popupImage').src = char.image; $('popup').classList.add('active'); }
function closePopup()    { $('popup').classList.remove('active'); selectedChar = null; }
$('popup').addEventListener('click', e => { if (e.target === $('popup')) closePopup(); });

// 투표 확인
function confirmVote() {
  if (!selectedChar) return;
  $('popup').classList.remove('active');
  initSurvey();
  hidePage('pageCharacter');

  if (showCardNews) {
    trendIdx = 0;
    trendBusy = false;
    $('trendCardImg').src = TREND_IMAGES[0];
    updateTrendDots();
    updateTrendNav();
    const wrap = $('trendCardWrap');
    wrap.style.transition = 'none';
    wrap.style.transform  = '';
    wrap.style.boxShadow  = '';
    showPage('pageTrend');
  } else {
    showPage('pageSurvey');
  }
}

// 설문 초기화
function initSurvey() {
  Object.assign(data, { preference: null, bookThought: null, bookTrigger: null, categories: new Set(), participation: null });
  document.querySelectorAll('.sel-card').forEach(el => el.classList.remove('selected'));
  ['q2etc','q3etc','q6etc','hobby','userName','userMbti'].forEach(id => $(id).value = '');
  $('userAge').value = '20';
  ['q2etc','q3etc','q6etc'].forEach(id => $(id).style.display = 'none');
  $('q6etcBtn').classList.remove('selected');
  $('surveyCharImg').src = selectedChar.image;
  $('surveyCharName').textContent = selectedChar.name;

  const track = $('questionsTrack');
  track.style.transition = 'none'; track.style.transform = 'translateX(0)';
  currentQ = 0; updateNav();
  requestAnimationFrame(() => requestAnimationFrame(() => { track.style.transition = ''; }));
}

// 슬라이드 이동
function goToQ(i) { $('questionsTrack').style.transform = `translateX(-${i * 100}%)`; currentQ = i; updateNav(); }
function nextQ()  { currentQ < TOTAL_Q - 1 ? goToQ(currentQ + 1) : doSubmit(); }
function prevQ()  { if (currentQ > 0) goToQ(currentQ - 1); }

function updateNav() {
  const last = currentQ === TOTAL_Q - 1;
  $('prevBtn').style.display = currentQ > 0 ? 'block' : 'none';
  $('nextBtn').textContent = last ? '제출하기 ✓' : '다음 →';
  $('nextBtn').classList.toggle('submit-mode', last);
  $('surveyCharFloat').classList.toggle('hidden-char', last);
}

// 선택 핸들러
function selectList(el, field, value, etcId) {
  el.closest('.cat-grid').querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const etcEl = $(etcId);
  const isEtc = value === null;
  etcEl.style.display = isEtc ? 'block' : 'none';
  $('surveyCharFloat').classList.toggle('hidden-char', isEtc);
  if (isEtc) {
    data[field] = etcEl.value;
    etcEl.oninput = () => data[field] = etcEl.value;
  } else {
    data[field] = value;
  }
}

function selectOpt(el, field, value) {
  el.closest('.option-row').querySelectorAll('.opt-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); data[field] = value;
}
function toggleCat(el, value) { data.categories[el.classList.toggle('selected') ? 'add' : 'delete'](value); }
function selectPart(el, value) {
  document.querySelectorAll('.part-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); data.participation = value;
}
function toggleEtc() {
  const etcEl = $('q6etc');
  const btn = $('q6etcBtn');
  const show = etcEl.style.display === 'none';
  etcEl.style.display = show ? 'block' : 'none';
  btn.classList.toggle('selected', show);
  if (!show) etcEl.value = '';
  else etcEl.focus();
}

// 제출 & 결과
function doSubmit() {
  showPage('submitLoading');
  setTimeout(() => { hidePage('submitLoading'); showResultPage(); }, 1400);
}

function showResultPage() {
  $('resultCharImg').src = selectedChar.image;
  $('resultSub').textContent = `${selectedChar.name} 캐릭터로 참여해주셨습니다`;
  const cats = [...data.categories];
  const card = ([label, value]) =>
    `<div class="res-card"><div class="res-label">${label}</div><div class="res-value">${value || '미입력'}</div></div>`;
  const grid = [
    ['책 선호도',     data.preference],
    ['선호 카테고리', cats.length ? cats.join(', ') : ''],
    ['추후 참여 횟수', data.participation],
    ['이름',          $('userName').value],
    ['나이',          `${$('userAge').value}세`],
    ['MBTI',          $('userMbti').value],
  ];
  $('resultList').innerHTML =
    card(['책에 대한 인식', data.bookThought]) +
    card(['책을 접한 계기', data.bookTrigger]) +
    `<div class="res-grid">${grid.map(card).join('')}</div>` +
    card(['취미/해보고 싶은 활동', $('hobby').value]);

  // 이름이 있을 때만 스프레드시트 전송
  if ($('userName').value.trim()) {
    sendToSheet({
      type:          'survey',
      timestamp:     new Date().toLocaleString('ko-KR'),
      character:     selectedChar.name,
      name:          $('userName').value,
      age:           $('userAge').value,
      mbti:          $('userMbti').value,
      preference:    data.preference,
      bookThought:   data.bookThought,
      bookTrigger:   data.bookTrigger,
      categories:    [...data.categories].join(', '),
      hobby:         $('hobby').value,
      participation: data.participation,
      etc:           $('q6etc').value
    });
  }

  hidePage('pageSurvey'); showPage('pageResult');
  requestAnimationFrame(() => {
    const wrap = $('pageResult').querySelector('.result-wrap');
    wrap.style.transform = 'scale(1)';
    const pageH = $('pageResult').clientHeight - 32;
    const wrapH = wrap.scrollHeight;
    if (wrapH > pageH) wrap.style.transform = `scale(${pageH / wrapH})`;
  });
}

function resetAll() { hidePage('pageResult'); showPage('pageLanding'); selectedChar = null; }
function backToLanding() { hidePage('pageSurvey'); hidePage('pageTrend'); showPage('pageLanding'); selectedChar = null; }
function showPage(id) { $(id).classList.remove('hidden'); }
function hidePage(id) { $(id).classList.add('hidden'); }

/* ===================================================
   체크리스트 파트
=================================================== */
const CL_SECTIONS = [
  {"id":1,"title":"유형 1","items":["나는 모든 일에 개선하기 위해 깊이 생각해서 행동한다.","나는 다른 사람들보다 근면하여 책임감이 강하다.","나는 정직하고 자제력이 있는 사람이다.","나의 행동은 원칙에 기초를 둔다.","나는 완벽을 위해 끝까지 참고 노력한다.","나는 규칙을 잘 지키며 엄격하다.","나는 다른 사람들의 신임을 얻을 수 있다.","나는 정의감이 강하고 근면하다.","나는 주로 나의 양심과 이성에 따른다."]},
  {"id":2,"title":"유형 2","items":["나는 다른 사람들과 함께 일하기를 더 좋아한다.","나의 관심사는 다른 사람들을 도와주는 것이다.","나는 사람들에게 칭찬을 잘 한다.","내 생각보다는 남의 생각에 공감할 때가 많다.","나는 친구들이 나에게 의지할 때 기분이 좋다.","나는 사람들을 관심 있게 대하고 보살피려 한다.","나는 사람들과 친해지려고 많이 노력하고 있다.","나는 타인의 만족을 위해 노력한다.","나는 타인의 호감을 얻기 위해 노력한다."]},
  {"id":3,"title":"유형 3","items":["나는 능력을 발휘하는데 많은 시간을 투자한다.","나는 과정보다는 결과를 중시한다.","나는 인간중심적이기보다는 오히려 목표 중심적이다.","나는 적응력이 뛰어나 상황에 적절히 대응한다.","나는 사람들에게 지나친 경쟁을 강요한다.","나는 사람들에 대한 배려보다는 일의 성취를 더 중요하게 생각한다.","나는 성공만이 애정을 획득할 수 있다고 믿는다.","나는 실패를 두려워하여 과장하는 경향이 있다.","나는 침체에 빠지지 않고 무엇인가를 끊임없이 행한다."]},
  {"id":4,"title":"유형 4","items":["나는 감성적이어서 혼자 있을 때가 많다.","나는 혼자서 자신만의 고상한 취미를 즐긴다.","나는 낭만적이고 예술가적인 기질이 있다.","나는 이방인처럼 느낄 때가 많다.","나는 다른 사람들과는 다른 독특한 감정을 가지고 있다.","나는 분위기에 약하고 자기 생각에 골몰하는 편이다.","나는 내 행동의 동기와 감정에 대해 회의스러운 생각이 들때가 있다.","나는 감동적인 것을 추구하다가 혼자 우울해지기도 한다.","나는 비현실적이며 몽상가적 기질을 가지고 있다."]},
  {"id":5,"title":"유형 5","items":["나는 무엇인가에 대하여 집중하여 통찰한다.","나는 문제가 있으면 풀릴 때까지 그것만 골똘히 생각한다.","나는 공적인 것보다는 개인 생활에 대한 관심이 많다.","나는 감정보다는 이성을 추구한다.","나는 시간이나 돈을 아끼는 경향이 있다.","나의 관심사는 나를 둘러싼 세계를 이해하는 것이다.","나는 권위를 믿지 않고 규칙을 무시한다.","나는 지적이고 냉철하게 관찰하는 편이다.","나는 머리로 모든 것을 이해하고 판단한다."]},
  {"id":6,"title":"유형 6","items":["나는 명확한 지침이 있을 때 일의 능률이 오른다.","나는 사랑하는 사람을 가끔 의심하는 경향이 있다.","나의 성공에 대해서도 가끔 평가 절하하는 경향이 있다.","나는 잘 훈련되어 있어 조직이나 집단에 헌신할 수 있다.","나는 모든 일에서 안전을 중요하게 생각한다.","사람들은 내게 때로 용기가 필요하다고 말한다.","나는 결과에 대한 두려움 때문에 일을 질질 끄는 경우가 있다.","나는 충성할 만한 사람이라고 판단되면 헌신할 수 있다.","나는 친하게 지내는 사람과 영원한 우정을 유지하도록 노력한다."]},
  {"id":7,"title":"유형 7","items":["나는 자발적으로 재미있는 일을 즐긴다.","나는 모험적이여 위험을 감수한다.","나는 끊임없이 변화하는 생활을 좋아한다.","나는 자극과 흥분을 유발하는 활동을 좋아한다.","나는 어린아이처럼 명랑하고 순진하다.","나는 미래에 대해 항상 열정을 가지고 있다.","나는 여러 가지 일들을 즐기며, 새로운 경험을 갈망한다.","나는 한 가지 일에 정착하기가 어렵다.","나는 현실에 만족하지 않고 새로운 것을 추구한다."]},
  {"id":8,"title":"유형 8","items":["나에게는 지도자로서의 기질이 있다.","나는 의사 결정을 할 때 적절히 지도력을 발휘한다.","나는 늘 강해야 된다고 생각한다.","나는 사람들에게 영향력 있는 사람이다.","나는 다른 사람들이 말하기 어려워하는 것을 이야기 한다.","나는 공격적이고 자기주장이 강하다.","나는 사람들을 통제하려 한다.","나는 사람들을 지시하고 동기를 부여한다.","나는 강한 자신감으로 사람들을 설득시킨다."]},
  {"id":9,"title":"유형 9","items":["나는 자기만족적이어서 태평한 편이다.","나는 감정 동요가 많지 않은 원만한 사람이다.","나는 안전한 해결책을 원하고 되도록 갈등을 피한다.","나는 친구들과 긴장을 풀고 마음 편하게 지낸다.","나는 사람들을 유쾌하고 편하게 대한다.","사람들은 나를 그냥 좋아한다.","나는 세상에 대해 낙관적인 편이다.","사람들이 하는 일은 각자의 몫이며, 나와 상관없는 일이다.","나는 조화로움을 추구하는 평화주의자이다."]}
];

const CL_STORAGE_KEY = "seed-book-mobile-check-v1";
const clTotalQuestions = CL_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

function clNowLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function clLoadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CL_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch (e) { return {}; }
}

function clSaveState() {
  const answers = {};
  document.querySelectorAll("#clSections input[type=radio]:checked").forEach(input => {
    answers[input.name] = Number(input.value);
  });
  const state = {
    date:    $('clCheckDate').value,
    name:    $('clUserName').value,
    mbti:    $('clMbti').value,
    answers
  };
  localStorage.setItem(CL_STORAGE_KEY, JSON.stringify(state));
  clUpdateSummary();
}

function clBuildSections() {
  const saved = clLoadState();
  $('clCheckDate').value = saved.date || clNowLocalValue();
  $('clUserName').value  = saved.name || "";
  $('clMbti').value      = saved.mbti || "";

  $('clSections').innerHTML = CL_SECTIONS.map(section => {
    const questionHtml = section.items.map((item, idx) => {
      const name = `s${section.id}q${idx + 1}`;
      const choices = [1, 2, 3, 4, 5].map(score => {
        const checked = saved.answers && saved.answers[name] === score ? "checked" : "";
        return `
          <div class="cl-choice">
            <input ${checked} id="${name}_${score}" name="${name}" type="radio" value="${score}">
            <label for="${name}_${score}">${score}</label>
          </div>`;
      }).join("");
      return `
        <div class="cl-question">
          <div class="cl-qtext">${idx + 1}. ${item}</div>
          <div class="cl-choices">${choices}</div>
        </div>`;
    }).join("");

    return `
      <section class="cl-section" id="cl-section-${section.id}">
        <div class="cl-section-head">
          <div class="cl-section-title">${section.title}</div>
          <div class="cl-score-pill" id="clScore-${section.id}">합계 0점</div>
        </div>
        ${questionHtml}
      </section>`;
  }).join("");

  document.querySelectorAll("#clSections input[type=radio]").forEach(input => {
    input.addEventListener("change", clSaveState);
  });
}

function clComputeScores() {
  const answers = {};
  document.querySelectorAll("#clSections input[type=radio]:checked").forEach(input => {
    answers[input.name] = Number(input.value);
  });
  const sectionScores = CL_SECTIONS.map(section => {
    let total = 0, answered = 0;
    section.items.forEach((_, idx) => {
      const key = `s${section.id}q${idx + 1}`;
      if (answers[key]) { total += answers[key]; answered++; }
    });
    return { id: section.id, title: section.title, total, answered };
  });
  return { answers, sectionScores };
}

function clUpdateSummary() {
  const { answers, sectionScores } = clComputeScores();
  const answeredCount = Object.keys(answers).length;
  const percent = Math.round((answeredCount / clTotalQuestions) * 100);

  $('clProgressText').textContent = `문항 체크됨`;
  $('clPercentText').textContent   = `${percent}%`;
  $('clProgressBar').style.width   = `${percent}%`;

  const submitBtn = $('clSubmitBtn');
  const remaining = clTotalQuestions - answeredCount;
  if (percent < 100) {
    submitBtn.disabled = true;
    submitBtn.textContent = `결과 제출 (${remaining}문항 남음)`;
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = '결과 제출';
  }

  sectionScores.forEach(score => {
    const totalInSection = CL_SECTIONS.find(s => s.id === score.id).items.length;
    const el = $(`clScore-${score.id}`);
    if (el) el.textContent = `합계 ${score.total}점 · ${score.answered}/${totalInSection}문항`;
  });

  const sorted   = [...sectionScores].sort((a, b) => b.total - a.total || a.id - b.id);
  const topThree = sorted.slice(0, 3);

  $('clSeedResult').value = topThree.length
    ? topThree.map(item => `${item.title}(${item.total}점)`).join(" / ")
    : "";
}

function clCopyResults() {
  const { sectionScores } = clComputeScores();
  const sorted   = [...sectionScores].sort((a, b) => b.total - a.total || a.id - b.id);
  const topThree = sorted.slice(0, 3).map((item, idx) => `${idx + 1}순위 ${item.title} (${item.total}점)`).join("\n");
  const allScores = sorted.map(item => `${item.title}: ${item.total}점`).join("\n");
  const text = [
    "씨앗 책방 유형 체크지 결과",
    `일시: ${$('clCheckDate').value || ""}`,
    `이름: ${$('clUserName').value || ""}`,
    `MBTI: ${$('clMbti').value || ""}`,
    "", topThree, "", "[전체 점수]", allScores
  ].join("\n");

  navigator.clipboard.writeText(text)
    .catch(() => alert("복사 권한이 없어요. 길게 눌러 직접 복사해 주세요."));
}

function clSendToSheet() {
  // 이름이 있을 때만 스프레드시트 전송
  if (!$('clUserName').value.trim()) return;

  const { answers, sectionScores } = clComputeScores();
  const sorted = [...sectionScores].sort((a, b) => b.total - a.total || a.id - b.id);

  const scores = {};
  sectionScores.forEach(s => { scores[s.id] = s.total; });

  const items = [];
  CL_SECTIONS.forEach(section => {
    section.items.forEach((_, idx) => {
      const key = `s${section.id}q${idx + 1}`;
      items.push(answers[key] || 0);
    });
  });

  const top = sorted.slice(0, 3).map(s => `${s.title}(${s.total}점)`);

  sendToSheet({
    type:      'checklist',
    timestamp: new Date().toLocaleString('ko-KR'),
    name:      $('clUserName').value,
    mbti:      $('clMbti').value,
    scores,
    items,
    top
  });
}

function clResetAll() {
  if (!confirm("정말 전체 체크를 초기화할까요?")) return;
  localStorage.removeItem(CL_STORAGE_KEY);
  document.querySelectorAll("#clSections input[type=radio]").forEach(input => { input.checked = false; });
  $('clCheckDate').value = clNowLocalValue();
  $('clUserName').value  = "";
  $('clMbti').value      = "";
  clUpdateSummary();
  clSaveState();
}

function showRadarChart() {
  const { sectionScores } = clComputeScores();
  const sorted = [...sectionScores].sort((a, b) => b.total - a.total || a.id - b.id);
  const top3   = sorted.slice(0, 3);

  const medals = ['🥇', '🥈', '🥉'];
  $('clChartRank').innerHTML = top3.map((item, idx) => `
    <div class="cl-chart-rank-item">
      <span class="cl-chart-rank-medal">${medals[idx]}</span>
      <span class="cl-chart-rank-name">${item.title}</span>
      <span class="cl-chart-rank-score">${item.total}점</span>
    </div>`).join('');

  $('clChartModal').classList.add('active');

  requestAnimationFrame(() => {
    if (window._clChart) window._clChart.destroy();
    window._clChart = new Chart($('clRadarChart'), {
      type: 'radar',
      data: {
        labels: sectionScores.map(s => s.title),
        datasets: [{
          data: sectionScores.map(s => s.total),
          backgroundColor: 'rgba(255,139,106,0.18)',
          borderColor: '#ff8b6a',
          borderWidth: 2.5,
          pointBackgroundColor: '#ff8b6a',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0,
            max: 45,
            ticks: { stepSize: 9, display: false, backdropColor: 'transparent' },
            grid: { color: 'rgba(0,0,0,0.08)' },
            angleLines: { color: 'rgba(0,0,0,0.1)' },
            pointLabels: {
              callback: (label, index) => [label, `${sectionScores[index].total}점`],
              font: { size: 12, weight: 'bold', family: "'Nanum Gothic','Apple SD Gothic Neo','Malgun Gothic',sans-serif" },
              color: '#555'
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.parsed.r}점` } }
        }
      }
    });
  });
}

// 체크리스트 페이지 열기 / 닫기
function showChecklist() {
  localStorage.removeItem(CL_STORAGE_KEY);
  document.querySelectorAll("#clSections input[type=radio]").forEach(input => { input.checked = false; });
  $('clCheckDate').value = clNowLocalValue();
  $('clSeedResult').value = "";

  $('clUserName').value = $('userName').value || "";
  $('clMbti').value     = $('userMbti').value || "";

  clSaveState();

  hidePage('pageResult');
  showPage('pageChecklist');
  $('pageChecklist').scrollTop = 0;
}

function hideChecklist() {
  hidePage('pageChecklist');
  showPage('pageResult');
}

// 체크리스트 초기화
clBuildSections();
clUpdateSummary();

[$('clCheckDate'), $('clUserName'), $('clMbti')].forEach(input => {
  input.addEventListener("input",  clSaveState);
  input.addEventListener("change", clSaveState);
});

$('clSubmitBtn').addEventListener("click", function() {
  clSendToSheet();
  showRadarChart();
});

$('clChartCloseBtn').addEventListener('click', function() {
  $('clChartModal').classList.remove('active');
  if (window._clChart) { window._clChart.destroy(); window._clChart = null; }
  hideChecklist();
});

$('clResetBtn').addEventListener("click", clResetAll);
$('clTopBtn').addEventListener("click",   () => $('pageChecklist').scrollTo({ top: 0, behavior: 'smooth' }));
