/**
 * 旋风斩：锅巴被围住时的解围技。
 *
 * 这里只测"会不会放"和"打到谁"，因为这两件事一旦错了，
 * 玩家看到的地面预警圈就是假的 —— 预警必须等于承诺。
 */
import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { THRONE } from '../src/content/config';
import { AI } from '../src/content/heroAi';
import { createRng } from '../src/core/rng';
import { MonsterStore } from '../src/ecs/store';
import { Hero } from '../src/gameplay/hero';
import type { HeroHooks } from '../src/gameplay/hero';

/**
 * 战场必须选在合法位置。
 *
 * 不能直接用 (0, 0)：那在大厅墙外，`updateMovement` 每帧会把他推回来，
 * 结果是"怪在原地、他人在 470 米外"，旋风永远数不到目标。
 * 王座正下方 400 远离全部石柱与王座，且在大厅内。
 */
const CX = THRONE.x;
const CY = THRONE.y + 400;

interface Recorder {
  whirls: { x: number; y: number; radius: number; windup: number }[];
  hits: number[];
  hooks: HeroHooks;
}

function makeRecorder(): Recorder {
  const rec: Recorder = {
    whirls: [],
    hits: [],
    hooks: {
      hitMonster: (slot) => rec.hits.push(slot),
      onQi: () => undefined,
      onWhirl: (x, y, radius, windup) => rec.whirls.push({ x, y, radius, windup }),
      onSwing: () => undefined,
      onLevelUp: () => undefined,
      onHurt: () => undefined,
    },
  };
  return rec;
}

function makeStore(): MonsterStore {
  const store = new MonsterStore();
  store.reset();
  return store;
}

/** 在 (cx, cy) 周围等角放 n 只怪，半径 dist。 */
function ring(store: MonsterStore, n: number, cx: number, cy: number, dist: number): void {
  const def = CARDS[0];
  if (!def) throw new Error('没有卡牌定义');
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    store.spawn(def, 0, 1, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, a);
  }
  store.refreshActive();
}

function makeHero(): Hero {
  const hero = new Hero(createRng(1));
  hero.x = CX;
  hero.y = CY;
  return hero;
}

/** 跑够时间：初始 CD 是 AI.whirlCd × 0.5，必须等它走完才可能放。 */
function run(hero: Hero, store: MonsterStore, hooks: HeroHooks, seconds: number): void {
  const frames = Math.ceil(seconds * 60);
  for (let i = 0; i < frames; i += 1) hero.update(1 / 60, store, hooks);
}

describe('旋风斩', () => {
  it('贴身目标不足门槛时不放，避免浪费 CD', () => {
    const store = makeStore();
    const hero = makeHero();
    const rec = makeRecorder();

    ring(store, AI.whirlMinTargets - 1, CX, CY, 50);
    // 跑够 10 秒：CD 早就好了，如果门槛判断是错的这里就会放
    run(hero, store, rec.hooks, 10);

    expect(rec.whirls).toHaveLength(0);
  });

  it('贴身目标达到门槛时起手，且预警半径与判定半径一致', () => {
    const store = makeStore();
    const hero = makeHero();
    const rec = makeRecorder();

    ring(store, AI.whirlMinTargets + 2, CX, CY, 50);
    run(hero, store, rec.hooks, 10);

    expect(rec.whirls.length).toBeGreaterThan(0);
    const first = rec.whirls[0];
    // 预警圈半径必须就是判定半径，否则玩家照着躲会挨打
    expect(first?.radius).toBe(AI.whirlRadius);
    expect(first?.windup).toBe(AI.whirlWindup);
  });

  it('结算时打到圈内所有目标，而不是只打一个', () => {
    const store = makeStore();
    const hero = makeHero();
    const rec = makeRecorder();

    const n = AI.whirlMinTargets + 2;
    ring(store, n, CX, CY, 40);
    run(hero, store, rec.hooks, 10);

    // 旋风是范围技：一次结算要覆盖圈内全部目标
    expect(rec.hits.length).toBeGreaterThanOrEqual(n);
  });

  it('圈外的怪不会被旋风打到', () => {
    const store = makeStore();
    const hero = makeHero();
    const rec = makeRecorder();

    ring(store, AI.whirlMinTargets + 1, CX, CY, 40);
    const def = CARDS[0];
    if (!def) throw new Error('没有卡牌定义');
    const far = store.spawn(def, 0, 1, CX + 900, CY, 0);
    store.refreshActive();

    run(hero, store, rec.hooks, 10);

    expect(rec.whirls.length).toBeGreaterThan(0);
    expect(rec.hits).not.toContain(far);
  });
});
