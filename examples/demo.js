/**
 * デモページの動き。ライブラリ本体ではなく、デモの都合のためのコード。
 *
 * ねらいは「保護なし」と「保護あり」を同じ入力で同時に試せること。
 * 左のフォームは data-miyabarrier="off" で保護対象から外し、
 * 右のフォームだけを widget に保護させている。
 */

const SAMPLES = {
  legit: {
    name: '鈴木一郎',
    message: `先日そちらで購入したコンロなんですが、点火ボタンを押しても火がつかないことが増えてきました。
保証期間内だと思うので修理をお願いできますか。あと、もし有償になる場合の見積もりも知りたいです。
週末しか家にいないので、土日に来てもらえると助かります。よろしくお願いします。`,
  },
  sales: {
    name: '田中太郎',
    message: `突然のご連絡失礼いたします。株式会社サンプルマーケティングの田中と申します。
貴社ホームページを拝見し、ぜひご提案させていただきたくご連絡いたしました。
弊社では中小企業様向けにSEO対策とホームページ制作を提供しており、導入実績は300社を超えております。
検索順位の改善による集客力の向上と、業務効率化によるコスト削減を同時に実現できます。
初期費用0円のキャンペーン中で、まずは無料診断からお試しいただけます。
つきましては、30分ほどオンライン面談のお時間をいただけないでしょうか。ご都合のよい候補日をお知らせください。
なお、本メールは営業目的でお送りしております。ご不要でしたら配信停止のご連絡をお願いいたします。
--------------------
株式会社サンプルマーケティング 営業部 田中太郎
〒150-0001 東京都渋谷区サンプル1-2-3
TEL: 03-1234-5678 / FAX: 03-1234-5679
https://example-sales.co.jp`,
  },
  ai: {
    name: '佐藤',
    message: `お世話になっております。この度は貴社の事業内容を拝見しご連絡いたしました。
弊社では業務効率化を支援するサービスを提供しております。導入により生産性向上が期待できます。
主なメリットは以下の通りです。
・定型業務の工数削減を実現できます
・部門横断でのデータ連携が可能になります
・段階的な導入によりリスクを抑えられます
ご検討いただける場合は、詳細な資料をお送りいたします。
つきましては、一度お打ち合わせのお時間をいただけますと幸いです。
ご確認のほど、何卒よろしくお願い申し上げます。`,
  },
  english: {
    name: 'John Smith',
    message: `Dear Sir or Madam,

I hope this email finds you well. We are a leading digital agency and we specialize in SEO services
that will get you on the first page of Google. We can also provide high quality backlinks and link building.

Let me know if you are interested and we can book a call. It is a free audit with no obligation.

Best regards,
John`,
  },
};

const VERDICT_LABEL = { pass: '通過', review: '確認', block: 'ブロック' };
const VERDICT_COLOR = {
  pass: 'var(--mb-pass)',
  review: 'var(--mb-review)',
  block: 'var(--mb-block)',
};

const $ = (id) => document.getElementById(id);
const guardedForm = $('guarded-form');
const plainForm = $('plain-form');
const guardedMessage = $('guarded-message');

/** ロゴマークを埋める（ページに画像を置かず、ライブラリと同じ SVG を使う）。 */
for (const [id, prefix] of [
  ['brand-mark', 'brand'],
  ['foot-mark', 'foot'],
]) {
  const host = $(id);
  if (host && Miyabarrier.markSvg) host.innerHTML = Miyabarrier.markSvg({ idPrefix: prefix });
}

// ---------------------------------------------------------------------------
// サンプルの流し込み
// ---------------------------------------------------------------------------

/**
 * value を代入するだけだと widget からは「イベントを伴わない機械的な入力」に見える。
 * 人が貼り付けたときと同じ focus / input を発生させる。
 */
const fillField = (field, value) => {
  if (!field) return;
  field.focus();
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

for (const button of document.querySelectorAll('[data-sample]')) {
  button.addEventListener('click', () => {
    const sample = SAMPLES[button.dataset.sample];
    fillField($('plain-name'), sample?.name ?? '');
    fillField($('plain-message'), sample?.message ?? '');
    fillField($('guarded-name'), sample?.name ?? '');
    fillField(guardedMessage, sample?.message ?? '');
    $('plain-outcome').replaceChildren();
    $('guarded-outcome').replaceChildren();
    refreshScore();
  });
}

// ---------------------------------------------------------------------------
// 文面スコア（Layer 4 / 6 のみ）
// ---------------------------------------------------------------------------

const LAYER_SHORT = {
  content: '営業文面判定',
  aiText: 'AI生成文っぽさ',
};

function refreshScore() {
  const result = Miyabarrier.analyzeText(guardedMessage.value);
  const verdict = result.verdict;

  $('score-value').textContent = result.score.toFixed(2);
  $('score-bar').style.width = `${Math.round(result.score * 100)}%`;
  $('score-bar').style.background = VERDICT_COLOR[verdict];

  const pill = $('score-verdict');
  pill.textContent = VERDICT_LABEL[verdict];
  pill.className = `mb-pill mb-pill--${verdict}`;

  // レイヤー別のスコアバー
  const layers = $('score-layers');
  layers.replaceChildren();
  for (const layer of result.layers) {
    const row = document.createElement('div');
    row.className = 'demo-layer';

    const name = document.createElement('span');
    name.className = 'demo-layer__name';
    name.textContent = LAYER_SHORT[layer.layer] ?? layer.label;

    const track = document.createElement('div');
    track.className = 'mb-track';
    const fill = document.createElement('div');
    fill.className = 'mb-track__fill';
    fill.style.width = layer.applicable ? `${Math.round(layer.score * 100)}%` : '0%';
    if (layer.applicable && layer.score > 0) fill.style.background = VERDICT_COLOR[verdict];
    track.append(fill);

    const score = document.createElement('span');
    score.className = 'demo-layer__score';
    score.textContent = layer.applicable ? layer.score.toFixed(2) : '—';
    if (!layer.applicable) score.title = layer.skipped ?? '判定対象外';

    row.append(name, track, score);
    layers.append(row);
  }

  // 検出語
  const terms = $('score-terms');
  terms.replaceChildren();
  const content = result.layers.find((layer) => layer.layer === 'content');
  const detected = content?.signals.find((signal) => signal.code === 'content.ngWords');
  if (detected?.detail) {
    const list = (detected.detail.split('検出語: ')[1] ?? '').split('、').filter(Boolean);
    for (const term of list) {
      const chip = document.createElement('span');
      chip.className = 'mb-tag';
      chip.textContent = term;
      terms.append(chip);
    }
  }
}

guardedMessage.addEventListener('input', refreshScore);
refreshScore();

// ---------------------------------------------------------------------------
// 送信（デモなので実送信はしない）
// ---------------------------------------------------------------------------

plainForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = $('plain-message').value.trim();
  const outcome = $('plain-outcome');
  outcome.replaceChildren();

  const box = document.createElement('div');
  box.className = 'demo-delivered';
  const body = document.createElement('div');
  body.className = 'demo-delivered__body';
  const title = document.createElement('b');
  title.textContent = '送信されました（受信トレイに届きます）';
  const preview = document.createElement('p');
  preview.textContent = message || '（本文なし）';
  body.append(title, preview);
  box.append(body);
  outcome.append(box);
});

guardedForm.addEventListener('submit', () => {
  // ここに来るのは判定を通過したときだけ（ブロック時は widget が止める）
  const result = Miyabarrier.instances.get(guardedForm)?.lastResult;
  const outcome = $('guarded-outcome');
  outcome.replaceChildren();
  const box = document.createElement('p');
  box.className = 'mb-banner mb-banner--info';
  box.textContent = `判定を通過しました（総合スコア ${result?.score.toFixed(2) ?? '—'}）。実際のサイトではここで送信されます。`;
  outcome.append(box);
});

// widget は capture 段階で止めるので、通過したときだけ既定動作を抑える
guardedForm.addEventListener('submit', (event) => event.preventDefault());

// ---------------------------------------------------------------------------
// 自動送信のシミュレーション
// ---------------------------------------------------------------------------

const simForm = $('sim-form');
const SIM_TEXT = 'お問い合わせフォームの動作確認のためのテスト送信です。ご確認をお願いします。';

// report モードでは widget が送信を止めないので、デモ側でページ遷移を防ぐ
simForm.addEventListener('submit', (event) => event.preventDefault());

/** シミュレーションごとに、まっさらな保護済みフォームを用意する。 */
function freshSimGuard() {
  Miyabarrier.instances.get(simForm)?.destroy();
  Miyabarrier.instances.delete(simForm);
  simForm.querySelector('[name=name]').value = '';
  simForm.querySelector('[name=message]').value = '';
  return Miyabarrier.protect(simForm, {
    mode: 'report', // 画面には出さず、結果だけを取り出す
    badge: false,
    checkbox: true,
    log: false,
  });
}

function reportSim(label, guard) {
  const result = guard.lastResult;
  const log = $('sim-log');
  log.replaceChildren();
  if (!result) {
    log.textContent = `${label}: 判定結果を取得できませんでした。`;
    return;
  }

  const row = document.createElement('div');
  row.className = 'demo-sim__row';
  const pill = document.createElement('span');
  pill.className = `mb-pill mb-pill--${result.verdict}`;
  pill.textContent = VERDICT_LABEL[result.verdict];
  row.append(pill, document.createTextNode(label));
  if (result.hardBlocked) {
    const hard = document.createElement('span');
    hard.className = 'mb-pill mb-pill--ghost';
    hard.textContent = '即時';
    row.append(hard);
  }
  const score = document.createElement('b');
  score.textContent = result.score.toFixed(2);
  row.append(score);
  log.append(row);

  // 反応したレイヤーだけをバーで並べる
  const detail = $('sim-detail');
  detail.replaceChildren();
  for (const layer of result.layers.filter((entry) => entry.signals.length > 0)) {
    const item = document.createElement('div');
    item.className = 'demo-layer';
    const name = document.createElement('span');
    name.className = 'demo-layer__name';
    name.textContent = layer.label.replace(/^Layer [\d.]+ /, '');
    name.title = layer.signals.map((signal) => signal.label).join('\n');
    const track = document.createElement('div');
    track.className = 'mb-track';
    const fill = document.createElement('div');
    fill.className = 'mb-track__fill mb-track__fill--block';
    fill.style.width = `${Math.round(layer.score * 100)}%`;
    track.append(fill);
    const value = document.createElement('span');
    value.className = 'demo-layer__score';
    value.textContent = layer.score.toFixed(2);
    item.append(name, track, value);
    detail.append(item);
  }

  const reasons = document.createElement('p');
  reasons.className = 'mb-note';
  reasons.style.marginTop = '0.75rem';
  reasons.textContent = result.reasons[0] ?? '';
  detail.append(reasons);
}

$('sim-honeypot').addEventListener('click', () => {
  const guard = freshSimGuard();
  simForm.querySelector('[name=message]').value = SIM_TEXT;
  // 人間には見えない欄。DOM を機械的に埋める相手だけが引っかかる
  simForm.querySelector('[name=mb_website]').value = 'https://example-sales.co.jp';
  simForm.requestSubmit();
  reportSim('ハニーポットを埋めて送信', guard);
});

$('sim-instant').addEventListener('click', () => {
  const guard = freshSimGuard();
  simForm.querySelector('[name=name]').value = '営業太郎';
  simForm.querySelector('[name=message]').value = SIM_TEXT;
  simForm.querySelector('[name=mb_confirm]').click(); // スクリプトからのクリック
  simForm.requestSubmit();
  reportSim('値を代入して即送信', guard);
});

$('sim-mimic').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  $('sim-log').textContent = '模倣操作を生成中…（等速のマウス移動と等間隔の打鍵）';
  $('sim-detail').replaceChildren();

  const guard = freshSimGuard();
  const field = simForm.querySelector('[name=message]');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 等速・直線のポインタ移動（人間の手ぶれがない）
  for (let i = 0; i < 40; i += 1) {
    document.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 200 + i * 8,
        clientY: 300 + i * 4,
        bubbles: true,
      }),
    );
    await wait(45);
  }

  // 等間隔の打鍵（間隔のばらつきがない）
  field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  for (const character of SIM_TEXT) {
    field.value += character;
    field.dispatchEvent(new KeyboardEvent('keydown', { key: character, bubbles: true }));
    await wait(60);
  }

  simForm.requestSubmit();
  reportSim('人間の操作を模倣して送信', guard);
  button.disabled = false;
});
