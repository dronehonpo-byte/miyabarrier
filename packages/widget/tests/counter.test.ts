/**
 * @vitest-environment jsdom
 *
 * お返しの営業（カウンターピッチ）のテスト。
 * 「作る条件」と「文面の組み立て」を固定する。ここを間違えると
 * 無関係な人にメールを送りかける機能になるので、条件は厳しめに検査する。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  COUNTER_STORAGE_KEY,
  buildCounterMail,
  clearCounterQueue,
  defaultCounterOptions,
  isPlausibleEmail,
  mailtoUrl,
  queueCounterMail,
  readCounterQueue,
  renderTemplate,
  shouldCounter,
  type CounterContext,
} from '../src/counter';

const options = { ...defaultCounterOptions, enabled: true };

const context: CounterContext = {
  email: 'sales@example-corp.co.jp',
  name: '田中太郎',
  score: 0.91,
  salesScore: 0.79,
  reasons: ['営業文面に典型的な表現が含まれている', '会社情報を並べた署名ブロックがある'],
  site: 'example.com',
  path: '/contact',
  at: '2026-08-20T04:05:06.000Z',
};

beforeEach(() => {
  clearCounterQueue();
});

describe('作る条件', () => {
  const input = {
    verdict: 'block',
    salesApplicable: true,
    salesScore: 0.79,
    email: 'sales@example-corp.co.jp',
  };

  it('既定では無効（文面を用意しない限り動かない）', () => {
    expect(shouldCounter(defaultCounterOptions, input).ok).toBe(false);
  });

  it('営業らしさが高いブロックでは作る', () => {
    expect(shouldCounter(options, input).ok).toBe(true);
  });

  it('通過した送信では作らない', () => {
    expect(shouldCounter(options, { ...input, verdict: 'pass' }).ok).toBe(false);
  });

  it('bot らしさだけで止まった送信では作らない（相手が営業とは限らない）', () => {
    const decision = shouldCounter(options, { ...input, salesScore: 0.1 });
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain('しきい値未満');
  });

  it('本文が短くて文面判定できなかったときは作らない', () => {
    expect(shouldCounter(options, { ...input, salesApplicable: false }).ok).toBe(false);
  });

  it('メールアドレスが無い・壊れているときは作らない', () => {
    for (const email of [
      '',
      '  ',
      'not-an-email',
      'a@b',
      'a@b.',
      '@example.com',
      'a b@example.com',
    ]) {
      expect(shouldCounter(options, { ...input, email }).ok, email).toBe(false);
    }
  });

  it('妥当なアドレスの判定', () => {
    expect(isPlausibleEmail('a@example.com')).toBe(true);
    expect(isPlausibleEmail('tanaka.taro+tag@sub.example.co.jp')).toBe(true);
    expect(isPlausibleEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('文面の組み立て', () => {
  it('プレースホルダを埋める', () => {
    const mail = buildCounterMail(
      {
        ...options,
        subject: '【{{site}}】{{name}} 様へ',
        body: '{{name}} 様\n宛先: {{email}}\nスコア: {{score}} / 営業らしさ {{salesScore}}\n日付: {{date}}\n理由:\n{{reasons}}',
      },
      context,
    );

    expect(mail.to).toBe('sales@example-corp.co.jp');
    expect(mail.subject).toBe('【example.com】田中太郎 様へ');
    expect(mail.body).toContain('宛先: sales@example-corp.co.jp');
    expect(mail.body).toContain('スコア: 0.91 / 営業らしさ 0.79');
    expect(mail.body).toContain('日付: 2026-08-20');
    expect(mail.body).toContain('営業文面に典型的な表現が含まれている');
  });

  it('氏名が空なら「ご担当者」にする', () => {
    const mail = buildCounterMail(options, { ...context, name: '' });
    expect(mail.body).toContain('ご担当者 様');
  });

  it('未知のプレースホルダは空にする（テンプレートの誤記で壊さない）', () => {
    expect(renderTemplate('a{{unknown}}b', context)).toBe('ab');
  });

  it('件名の改行は 1 行に畳む', () => {
    const mail = buildCounterMail({ ...options, subject: 'こんにちは\n{{name}} 様' }, context);
    expect(mail.subject).toBe('こんにちは 田中太郎 様');
  });
});

describe('送信箱', () => {
  const mail = () => buildCounterMail(options, context);

  it('積んで読み出せる', () => {
    expect(queueCounterMail(mail(), 50)).toBe('queued');
    const queue = readCounterQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.to).toBe('sales@example-corp.co.jp');
  });

  it('同じ宛先は重ねて積まない（うっかり連投を防ぐ）', () => {
    queueCounterMail(mail(), 50);
    expect(queueCounterMail(mail(), 50)).toBe('duplicate');
    expect(readCounterQueue()).toHaveLength(1);
  });

  it('大文字小文字を無視して同一宛先とみなす', () => {
    queueCounterMail(mail(), 50);
    const upper = buildCounterMail(options, { ...context, email: 'SALES@example-corp.co.jp' });
    expect(queueCounterMail(upper, 50)).toBe('duplicate');
  });

  it('上限を超えると古いものから捨てる', () => {
    for (let i = 0; i < 5; i += 1) {
      queueCounterMail(buildCounterMail(options, { ...context, email: `a${i}@example.com` }), 3);
    }
    const queue = readCounterQueue();
    expect(queue).toHaveLength(3);
    expect(queue[0]?.to).toBe('a2@example.com');
  });

  it('壊れた localStorage でも落ちない', () => {
    localStorage.setItem(COUNTER_STORAGE_KEY, '{not json');
    expect(readCounterQueue()).toEqual([]);
  });

  it('mailto: の URL を作る（人間が自分のメールソフトで送るための導線）', () => {
    const url = mailtoUrl(mail());
    expect(url.startsWith('mailto:sales%40example-corp.co.jp?subject=')).toBe(true);
    expect(url).toContain('body=');
    // 生の改行や空白が URL に混ざらないこと
    expect(url).not.toMatch(/[\n\s]/);
  });
});
