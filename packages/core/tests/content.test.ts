import { describe, expect, it } from 'vitest';
import { evaluateAiText, evaluateContent, scoreNgWords } from '../src/content';
import { defaultNgWords, defaultWeights } from '../src/patterns.data';
import type { LayerResult, NgWordList } from '../src/types';
import { AI_SALES_PITCH, ENGLISH_SPAM, LEGIT_INQUIRY, SALES_PITCH } from './fixtures';

const codes = (result: LayerResult): string[] => result.signals.map((signal) => signal.code);
const contentConfig = defaultWeights.layers.content;
const aiConfig = defaultWeights.layers.aiText;
const intensity = (result: LayerResult, code: string): number =>
  result.signals.find((signal) => signal.code === code)?.intensity ?? 0;

describe('NG ワードのスコアリング', () => {
  it('営業文面は高いスコアになる', () => {
    const result = scoreNgWords(SALES_PITCH, defaultNgWords);
    expect(result.score).toBeGreaterThan(12);
    expect(Object.keys(result.perCategory)).toContain('cold-open');
    expect(Object.keys(result.perCategory)).toContain('cta-meeting');
    expect(Object.keys(result.perCategory)).toContain('mass-mail-boilerplate');
  });

  it('正当な問い合わせはマイナススコアになる', () => {
    const result = scoreNgWords(LEGIT_INQUIRY, defaultNgWords);
    expect(result.score).toBeLessThan(0);
  });

  it('英語のコールドアプローチも検知する', () => {
    const result = scoreNgWords(ENGLISH_SPAM, defaultNgWords);
    expect(result.perCategory['english-outreach']).toBeGreaterThan(0);
  });

  it('全角・大文字の違いを吸収する', () => {
    const plain = scoreNgWords('seo対策のご提案です', defaultNgWords).score;
    const wide = scoreNgWords('ＳＥＯ対策のご提案です', defaultNgWords).score;
    expect(wide).toBe(plain);
    expect(wide).toBeGreaterThan(0);
  });

  it('カテゴリごとの上限を超えて加点しない', () => {
    const repeated =
      'ご提案 ご案内させて ご紹介させて 弊社サービス 弊社では 販路拡大 業務提携 アライアンス';
    const result = scoreNgWords(repeated, defaultNgWords);
    const category = defaultNgWords.categories.find((entry) => entry.id === 'sales-offer')!;
    expect(result.perCategory['sales-offer']).toBe(category.cap);
  });

  it('同じ語を繰り返しても 1 語 1 回として数える', () => {
    const once = scoreNgWords('ご提案があります', defaultNgWords).score;
    const thrice = scoreNgWords('ご提案 ご提案 ご提案', defaultNgWords).score;
    expect(thrice).toBe(once);
  });

  it('allowlist のフレーズ内でしか出ない語は数えない', () => {
    const shielded = scoreNgWords(
      '貴社の求人に応募したいのですが、募集は続いていますか。',
      defaultNgWords,
    );
    const bare = scoreNgWords('貴社の事業について', defaultNgWords);
    expect(shielded.matches.some((match) => match.term === '貴社')).toBe(false);
    expect(bare.matches.some((match) => match.term === '貴社')).toBe(true);
  });

  it('正規表現パターンでも検知する', () => {
    const list: NgWordList = {
      version: 1,
      categories: [
        {
          id: 'test',
          label: 'テスト',
          score: 3,
          cap: 3,
          terms: ['zzz'],
          patterns: ['\\d{3}-\\d{4}'],
        },
      ],
    };
    expect(scoreNgWords('連絡先は 150-0001 です', list).score).toBe(3);
    expect(scoreNgWords('連絡先はありません', list).score).toBe(0);
  });
});

describe('Layer 4: 営業文面判定', () => {
  it('営業文面から複数のシグナルを出す', () => {
    const result = evaluateContent({ text: SALES_PITCH }, contentConfig, defaultNgWords);
    expect(codes(result)).toContain('content.ngWords');
    expect(codes(result)).toContain('content.companyIntroOpening');
    expect(codes(result)).toContain('content.signatureBlock');
    expect(intensity(result, 'content.ngWords')).toBe(1);
  });

  it('正当な問い合わせではシグナルを出さない', () => {
    const result = evaluateContent({ text: LEGIT_INQUIRY }, contentConfig, defaultNgWords);
    expect(codes(result)).toEqual([]);
  });

  it('短すぎる本文は判定対象外にする', () => {
    const result = evaluateContent({ text: '在庫はありますか' }, contentConfig, defaultNgWords);
    expect(result.applicable).toBe(false);
  });

  it('URL の多さを検知する', () => {
    const text = `お世話になります。詳細はこちらをご覧ください。
https://a.example.com https://b.example.com https://c.example.com https://d.example.com`;
    const result = evaluateContent({ text }, contentConfig, defaultNgWords);
    expect(codes(result)).toContain('content.urlSpam');
    expect(intensity(result, 'content.urlSpam')).toBe(1);
  });

  it('URL 1 件までは許容する', () => {
    const text =
      '参考ページを載せておきます。https://example.com の商品について在庫を教えてください。';
    const result = evaluateContent({ text }, contentConfig, defaultNgWords);
    expect(codes(result)).not.toContain('content.urlSpam');
  });

  it('氏名欄の法人格から自己紹介を検知する', () => {
    const result = evaluateContent(
      { text: LEGIT_INQUIRY, senderName: '株式会社サンプル 山田' },
      contentConfig,
      defaultNgWords,
    );
    expect(codes(result)).toContain('content.companyIntroOpening');
  });

  it('日本語フォームに日本語が無い場合を弱いシグナルにする', () => {
    const result = evaluateContent(
      { text: ENGLISH_SPAM, formLanguage: 'ja' },
      contentConfig,
      defaultNgWords,
    );
    expect(codes(result)).toContain('content.noJapaneseOnJapaneseForm');
  });

  it('言語指定が auto なら英語本文を減点しない', () => {
    const result = evaluateContent(
      {
        text: 'Hello, I bought your product last week and it does not work. Can you repair it?',
        formLanguage: 'auto',
      },
      contentConfig,
      defaultNgWords,
    );
    expect(codes(result)).not.toContain('content.noJapaneseOnJapaneseForm');
  });
});

describe('Layer 6: AI 生成文っぽさ', () => {
  it('AI が書いたような営業文を検知する', () => {
    const result = evaluateAiText({ text: AI_SALES_PITCH }, aiConfig);
    expect(result.applicable).toBe(true);
    expect(codes(result)).toContain('ai.politeTemplateDensity');
    expect(codes(result)).toContain('ai.structuredListing');
  });

  it('口語的な問い合わせでは検知しない', () => {
    const result = evaluateAiText({ text: LEGIT_INQUIRY }, aiConfig);
    expect(codes(result)).not.toContain('ai.politeTemplateDensity');
  });

  it('短い本文は判定対象外にする', () => {
    const result = evaluateAiText({ text: '見積もりをお願いします。' }, aiConfig);
    expect(result.applicable).toBe(false);
  });

  it('文長が均質な文章を検知する', () => {
    const text = Array.from({ length: 6 }, () => 'これはテスト用のちょうど同じ長さの文です。').join(
      '',
    );
    const result = evaluateAiText({ text }, aiConfig);
    expect(codes(result)).toContain('ai.uniformSentenceLength');
    expect(codes(result)).toContain('ai.lowBurstiness');
  });

  it('絵文字や口語の崩れがあれば noTypos を出さない', () => {
    const text = `${AI_SALES_PITCH}\nすみません、ちょっと急いでます！`;
    const result = evaluateAiText({ text }, aiConfig);
    expect(codes(result)).not.toContain('ai.noTypos');
  });
});
