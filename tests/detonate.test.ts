/**
 * 引爆：自残手段，不是输出手段。
 *
 * 这个功能最容易做错的地方是"顺手给了经验"或"伤害高到能打死人"——
 * 前者让引爆变成免费清场，后者让它变成主要输出，两种都会把反向肉鸽的
 * 取舍彻底改掉。所以下面每条断言都对着一个具体的失衡风险。
 */
import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { DETONATE } from '../src/content/config';
import { MonsterStore } from '../src/ecs/store';
import { Game } from '../src/gameplay/game';
import type { GameEvents, PowerupOption } from '../src/gameplay/game';

interface Log {
  toasts: string[];
  detonates: number;
  deaths: number;
}

function makeEvents(log: Log): GameEvents {
  return {
    onSpawn: () => undefined,
    onDeath: () => {
      log.deaths += 1;
    },
    onHeroHurt: () => undefined,
    onHeroLevel: () => undefined,
    onSwing: () => undefined,
    onQi: () => undefined,
    onWhirl: () => undefined,
    onRangedShot: () => undefined,
    onDetonate: () => {
      log.detonates += 1;
    },
    onTelegraph: () => undefined,
    onEffect: () => undefined,
    toast: (text: string) => log.toasts.push(text),
    onPowerup: (_options: readonly PowerupOption[]) => undefined,
    onFinish: () => undefined,
  };
}

function setup(): { game: Game; log: Log; store: MonsterStore } {
  const log: Log = { toasts: [], detonates: 0, deaths: 0 };
  const game = new Game(makeEvents(log), 20261024);
  game.start();
  return { game, log, store: game.store };
}

/** 在 (x, y) 放一只 1★ 怪，返回槽位。 */
function spawnAt(store: MonsterStore, x: number, y: number, star = 1): number {
  const def = CARDS[0];
  if (!def) throw new Error('没有卡牌定义');
  const slot = store.spawn(def, 0, star, x, y, 0);
  store.refreshActive();
  return slot;
}

describe('引爆', () => {
  it('炸掉半径内所有自家魔物，而不只是点中的那一只', () => {
    const { game, store } = setup();
    const hx = game.hero.x;
    const hy = game.hero.y;

    // 三只挤在一起（都在 110 半径内）
    const a = spawnAt(store, hx + 60, hy);
    const b = spawnAt(store, hx + 60, hy + 40);
    const c = spawnAt(store, hx + 60, hy - 40);
    // 一只在半径外
    const far = spawnAt(store, hx + 400, hy);

    const ok = game.tryDetonate(hx + 60, hy);
    expect(ok).toBe(true);
    expect(store.alive[a]).toBe(0);
    expect(store.alive[b]).toBe(0);
    expect(store.alive[c]).toBe(0);
    // 半径外的必须活着，否则引爆就是全屏清场
    expect(store.alive[far]).toBe(1);
  });

  it('炸掉的魔物一颗经验都不给（这是引爆的用途）', () => {
    const { game, store } = setup();
    const hx = game.hero.x;
    const hy = game.hero.y;

    spawnAt(store, hx + 60, hy, 5);
    spawnAt(store, hx + 60, hy + 30, 5);
    const xpBefore = game.hero.xp;
    const levelBefore = game.hero.level;

    game.tryDetonate(hx + 60, hy);

    expect(game.hero.xp).toBe(xpBefore);
    expect(game.hero.level).toBe(levelBefore);
    // kills 是"锅巴杀掉的"，引爆不该记在他头上
    expect(game.kills).toBe(0);
  });

  it('对锅巴只有一点伤害，且伤害 = 星级 × heroPerStar', () => {
    const { game, store } = setup();
    const hx = game.hero.x;
    const hy = game.hero.y;

    spawnAt(store, hx + 60, hy, 3);
    const hpBefore = game.hero.hp;

    game.tryDetonate(hx + 60, hy);

    const lost = hpBefore - game.hero.hp;
    // 3★ × 8 = 24，再减去护甲减伤。必须远小于他的血量，
    // 否则引爆会变成"输出手段"，玩家就去刷引爆了。
    expect(lost).toBeGreaterThan(0);
    expect(lost).toBeLessThanOrEqual(3 * DETONATE.heroPerStar);
    expect(lost).toBeLessThan(game.hero.maxHp * 0.01);
  });

  it('每次引爆给锅巴叠一层饥渴（代价是可见的）', () => {
    const { game, store } = setup();
    const hx = game.hero.x;
    const hy = game.hero.y;

    expect(game.hero.hunger).toBe(0);
    spawnAt(store, hx + 60, hy);
    game.tryDetonate(hx + 60, hy);
    expect(game.hero.hunger).toBe(1);

    // 饥渴真的能提升攻速，否则这层"代价"是假的
    expect(game.hero.hunger).toBeLessThanOrEqual(DETONATE.hungerMax);
  });

  it('引爆有 CD，连点第二次不生效', () => {
    const { game, store } = setup();
    const hx = game.hero.x;
    const hy = game.hero.y;

    spawnAt(store, hx + 60, hy);
    expect(game.tryDetonate(hx + 60, hy)).toBe(true);

    spawnAt(store, hx + 60, hy + 20);
    expect(game.tryDetonate(hx + 60, hy + 20)).toBe(false);
    expect(game.detonations).toBe(1);
  });

  it('点空处不会引爆（必须有目标）', () => {
    const { game } = setup();
    expect(game.tryDetonate(game.hero.x + 300, game.hero.y + 300)).toBe(false);
    expect(game.detonations).toBe(0);
  });
});
