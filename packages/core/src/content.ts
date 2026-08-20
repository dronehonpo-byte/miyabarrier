/**
 * Layer 4: テキスト内容判定（営業文面判定）
 * Layer 6: AI 生成文っぽさ判定
 *
 * Layer 4 は patterns/ng-words.json の語彙をスコアリングする。単純な NG ワード判定と
 * 違うのは、(a) カテゴリごとに上限を設けて 1 カテゴリの語の羅列で暴走しないこと、
 * (b) 「見積」「不具合」のような正当な問い合わせ語をマイナス点として持つこと。
 *
 * Layer 6 は外部 API を使わず、文長のばらつき・定型丁寧表現の密度・崩れの無さといった
 * 軽量な統計指標だけで「均質すぎる文章」を拾う。単独では誤検知しやすいため重みは小さい。
 */
import type {
  ContentInput,
  LayerResult,
  LayerWeightConfig,
  MetricValue,
  NgWordList,
  Signal,
} from './types';
import {
  aboveCeiling,
  belowFloor,
  clamp01,
  coefficientOfVariation,
  containsJapanese,
  countOccurrences,
  countUrls,
  mean,
  normalizeText,
  round,
  splitSentences,
  tuneNumber,
  tuneStrings,
} from './util';

const CORPORATE_PATTERN =
  /(株式会社|合同会社|有限会社|一般社団法人|合資会社|\bco\.,?\s?ltd\b|\binc\b)/;
const SELF_INTRO_PATTERN =
  /(と申します|と言います|担当(?:者)?(?:です|でございます)|営業部|マーケティング部)/;
const SIGNATURE_MARKERS: readonly RegExp[] = [
  /〒\s*\d{3}[-ー－]?\d{4}/,
  /(?:tel|電話)[:：]?\s*0\d/,
  /(?:fax)[:：]?\s*0\d/,
  /(?:e-?mail|メール)[:：]/,
  /0\d{1,3}[-(]\d{2,4}[-)]\d{3,4}/,
  /https?:\/\//,
  /(?:所在地|住所|事業内容|会社概要)[:：]/,
];
const LIST_LINE_PATTERN = /^\s*(?:[・･◆●○■□*\-–—]|\d{1,2}[.)、]|[①-⑳])\s*\S/;

export interface NgWordMatch {
  categoryId: string;
  label: string;
  term: string;
  kind: 'term' | 'pattern';
  score: number;
}

export interface NgWordScore {
  score: number;
  matches: NgWordMatch[];
  perCategory: Record<string, number>;
}

/**
 * NG ワードのスコアリング本体。widget からもプレビュー用途で使えるよう独立させている。
 * 同一カテゴリ内は cap で打ち止めになるため、語を大量に足しても総合スコアは暴れない。
 */
export const scoreNgWords = (text: string, list: NgWordList): NgWordScore => {
  const normalized = normalizeText(text);
  const allowPhrases = (list.allowlist?.terms ?? [])
    .map((phrase) => normalizeText(phrase))
    .filter((phrase) => phrase.length > 0 && normalized.includes(phrase));

  const matches: NgWordMatch[] = [];
  const perCategory: Record<string, number> = {};
  let total = 0;

  for (const category of list.categories) {
    let categoryScore = 0;
    const limitReached = () =>
      category.score > 0 ? categoryScore >= category.cap : categoryScore <= category.cap;

    for (const rawTerm of category.terms) {
      if (limitReached()) break;
      const term = normalizeText(rawTerm);
      const hits = countOccurrences(normalized, term);
      if (hits === 0) continue;

      // 誤検知抑制: 許可フレーズの一部としてしか現れていない語は数えない。
      const shieldedHits = allowPhrases
        .filter((phrase) => phrase.includes(term))
        .reduce((sum, phrase) => sum + countOccurrences(normalized, phrase), 0);
      if (hits <= shieldedHits) continue;

      categoryScore += category.score;
      matches.push({
        categoryId: category.id,
        label: category.label,
        term: rawTerm,
        kind: 'term',
        score: category.score,
      });
    }

    for (const source of category.patterns ?? []) {
      if (limitReached()) break;
      let regex: RegExp;
      try {
        regex = new RegExp(source, 'gi');
      } catch {
        continue; // 壊れた正規表現は無視する（ビルド時に検証済み）。
      }
      if (!regex.test(normalized)) continue;
      categoryScore += category.score;
      matches.push({
        categoryId: category.id,
        label: category.label,
        term: source,
        kind: 'pattern',
        score: category.score,
      });
    }

    if (categoryScore !== 0) {
      const capped =
        category.score > 0
          ? Math.min(categoryScore, category.cap)
          : Math.max(categoryScore, category.cap);
      perCategory[category.id] = capped;
      total += capped;
    }
  }

  return { score: round(total, 2), matches, perCategory };
};

// ---------------------------------------------------------------------------
// Layer 4
// ---------------------------------------------------------------------------

export const evaluateContent = (
  input: ContentInput | undefined,
  config?: LayerWeightConfig,
  list?: NgWordList,
): LayerResult => {
  if (!input || !list) {
    return {
      layer: 'content',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: '本文またはパターン定義がない',
    };
  }

  const tuning = config?.tuning;
  const minChars = tuneNumber(tuning, 'minChars', 24);
  const ngScoreSaturation = tuneNumber(tuning, 'ngScoreSaturation', 12);
  const freeUrlAllowance = tuneNumber(tuning, 'freeUrlAllowance', 1);
  const urlSaturation = tuneNumber(tuning, 'urlSaturation', 4);
  const headChars = tuneNumber(tuning, 'companyIntroHeadChars', 120);

  const text = input.text ?? '';
  const trimmed = text.trim();

  if (trimmed.length < minChars) {
    return {
      layer: 'content',
      applicable: false,
      signals: [],
      metrics: { chars: trimmed.length },
      skipped: `本文が短すぎる (${trimmed.length} 文字 < ${minChars})`,
    };
  }

  const signals: Signal[] = [];
  const ng = scoreNgWords(text, list);

  if (ng.score > 0) {
    const topTerms = ng.matches
      .filter((match) => match.score > 0)
      .slice(0, 6)
      .map((match) => match.term);
    signals.push({
      code: 'content.ngWords',
      intensity: clamp01(ng.score / ngScoreSaturation),
      detail: `営業スコア ${ng.score} / 検出語: ${topTerms.join('、')}`,
    });
  }

  const urls = countUrls(text);
  if (urls > freeUrlAllowance) {
    signals.push({
      code: 'content.urlSpam',
      intensity: aboveCeiling(urls, freeUrlAllowance, urlSaturation),
      detail: `URL ${urls} 件`,
    });
  }

  const head = trimmed.slice(0, headChars);
  const senderName = input.senderName ?? '';
  if (
    (CORPORATE_PATTERN.test(head) && SELF_INTRO_PATTERN.test(head)) ||
    CORPORATE_PATTERN.test(senderName)
  ) {
    signals.push({
      code: 'content.companyIntroOpening',
      detail: CORPORATE_PATTERN.test(senderName) ? '氏名欄に法人格' : '冒頭に法人格つきの自己紹介',
    });
  }

  // 末尾に会社情報が並ぶ「署名ブロック」。3 種類以上の要素が揃ったときだけ数える。
  const tail = trimmed.slice(-260);
  const signatureHits = SIGNATURE_MARKERS.filter((pattern) => pattern.test(tail)).length;
  if (signatureHits >= 3) {
    signals.push({
      code: 'content.signatureBlock',
      intensity: clamp01(signatureHits / 4),
      detail: `署名要素 ${signatureHits} 種`,
    });
  }

  if (input.formLanguage === 'ja' && !containsJapanese(text)) {
    signals.push({ code: 'content.noJapaneseOnJapaneseForm' });
  }

  const categorySummary = Object.entries(ng.perCategory)
    .map(([id, score]) => `${id}:${score}`)
    .join(', ');

  return {
    layer: 'content',
    applicable: true,
    signals,
    metrics: {
      chars: trimmed.length,
      ngScore: ng.score,
      ngMatchCount: ng.matches.length,
      ngCategories: categorySummary,
      urls,
      signatureHits,
    },
  };
};

// ---------------------------------------------------------------------------
// Layer 6
// ---------------------------------------------------------------------------

const DEFAULT_POLITE_PHRASES = [
  'いただければ',
  'いただけますと',
  'させていただき',
  'ご検討いただ',
  '幸いです',
  '存じます',
  '何卒',
  'よろしくお願い申し上げます',
  'つきましては',
];
const DEFAULT_NOISE_MARKERS = ['！！', '。。', '、、', 'www', '笑', 'すみません', 'ちょっと'];
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** 隣接する文長の平均絶対差を平均文長で割った値。文章のリズムの揺らぎの指標。 */
const burstiness = (lengths: readonly number[]): number => {
  if (lengths.length < 2) return 1;
  const average = mean(lengths);
  if (average === 0) return 1;
  let sum = 0;
  for (let i = 1; i < lengths.length; i += 1) {
    sum += Math.abs((lengths[i] ?? 0) - (lengths[i - 1] ?? 0));
  }
  return sum / (lengths.length - 1) / average;
};

export const evaluateAiText = (
  input: ContentInput | undefined,
  config?: LayerWeightConfig,
): LayerResult => {
  if (!input) {
    return {
      layer: 'aiText',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: '本文がない',
    };
  }

  const tuning = config?.tuning;
  const minChars = tuneNumber(tuning, 'minChars', 80);
  const minSentences = tuneNumber(tuning, 'minSentences', 4);
  const sentenceLengthCvFloor = tuneNumber(tuning, 'sentenceLengthCvFloor', 0.32);
  const politeDensityCeiling = tuneNumber(tuning, 'politePhraseDensityCeiling', 0.012);
  const burstinessFloor = tuneNumber(tuning, 'burstinessFloor', 0.35);
  const politePhrases = tuneStrings(tuning, 'politePhrases', DEFAULT_POLITE_PHRASES);
  const noiseMarkers = tuneStrings(tuning, 'humanNoiseMarkers', DEFAULT_NOISE_MARKERS);

  const text = (input.text ?? '').trim();
  const sentences = splitSentences(text);

  if (text.length < minChars || sentences.length < minSentences) {
    return {
      layer: 'aiText',
      applicable: false,
      signals: [],
      metrics: { chars: text.length, sentences: sentences.length },
      skipped: `統計判定に足る長さがない (${text.length} 文字 / ${sentences.length} 文)`,
    };
  }

  const signals: Signal[] = [];
  const normalized = normalizeText(text);
  const lengths = sentences.map((sentence) => sentence.length);

  const lengthCv = round(coefficientOfVariation(lengths));
  if (lengthCv < sentenceLengthCvFloor) {
    signals.push({
      code: 'ai.uniformSentenceLength',
      intensity: belowFloor(lengthCv, sentenceLengthCvFloor),
      detail: `文長の変動係数 ${lengthCv}`,
    });
  }

  const politeHits = politePhrases.reduce(
    (sum, phrase) => sum + countOccurrences(normalized, normalizeText(phrase)),
    0,
  );
  const politeDensity = politeHits / text.length;
  if (politeDensity > politeDensityCeiling) {
    signals.push({
      code: 'ai.politeTemplateDensity',
      intensity: aboveCeiling(politeDensity, politeDensityCeiling, politeDensityCeiling * 3),
      detail: `定型丁寧表現 ${politeHits} 箇所 / ${text.length} 文字`,
    });
  }

  const rhythm = round(burstiness(lengths));
  if (rhythm < burstinessFloor) {
    signals.push({
      code: 'ai.lowBurstiness',
      intensity: belowFloor(rhythm, burstinessFloor),
      detail: `文長の揺らぎ ${rhythm}`,
    });
  }

  const listLines = text.split(/\n/).filter((line) => LIST_LINE_PATTERN.test(line)).length;
  if (listLines >= 3) {
    signals.push({
      code: 'ai.structuredListing',
      intensity: clamp01((listLines - 2) / 4),
      detail: `箇条書き ${listLines} 行`,
    });
  }

  const noiseHits = noiseMarkers.filter((marker) =>
    normalized.includes(normalizeText(marker)),
  ).length;
  if (noiseHits === 0 && !EMOJI_PATTERN.test(text) && text.length >= 200) {
    // 崩れが皆無なこと自体は弱い証拠。長文のときだけ、しかも低い配点で見る。
    signals.push({ code: 'ai.noTypos', intensity: 0.6 });
  }

  return {
    layer: 'aiText',
    applicable: true,
    signals,
    metrics: {
      chars: text.length,
      sentences: sentences.length,
      sentenceLengthCv: lengthCv,
      burstiness: rhythm,
      politeHits,
      politeDensity: round(politeDensity, 4),
      listLines,
      noiseHits,
    } satisfies Record<string, MetricValue>,
  };
};
