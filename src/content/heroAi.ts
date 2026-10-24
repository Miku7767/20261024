/**
 * 勇者 AI 的全部可调参数。
 *
 * 只改这里、不改 `gameplay/hero.ts` 的逻辑，就能整体调手感 ——
 * 这是策划案 §5.6「体验调参表」的代码落点。
 */
export const AI = {
  /** 感知刷新频率（Hz）。太高会抽搐，太低会迟钝。 */
  perceiveHz: 10,
  /** 新目标分数要超过当前目标多少才切换（迟滞，防抽搐）。 */
  switchGain: 1.25,
  /** 超过这个距离强制换目标 */
  maxChaseDistance: 900,

  /** 攻击 */
  engageRange: 62,
  stopFactor: 0.9,
  windup: 0.18,
  recover: 0.16,
  halfArc: Math.PI / 4,
  /** 普攻一次最多命中几个目标。不设上限的话一刀清光整个扇形，
   *  "用数量淹没他"这条策略就直接失效了。 */
  maxSwingTargets: 3,

  /** 剑气 */
  qiCd: 6,
  qiWindup: 0.35,
  qiRecover: 0.3,
  qiLength: 420,
  qiHalfWidth: 28,
  qiMinTargets: 2,
  qiDamageMul: 1.4,

  /**
   * 旋风斩：被围住时的解围技，不是常规输出。
   *
   * 触发门槛刻意定得很高（要 5 个以上贴身），因为它一旦放出来就是无死角清场，
   * 门槛低了会让"用数量淹没他"这条主策略彻底失效 —— 实测门槛 3 时，
   * 机器人把怪堆在他身边反而送人头，剩余血量比从 27% 涨到 59%。
   * 它应该是"被围到危险时才救一次"，而不是"每 7 秒清一次场"。
   */
  whirlCd: 9,
  whirlWindup: 0.25,
  whirlRecover: 0.35,
  whirlRadius: 96,
  whirlMinTargets: 5,
  whirlDamageMul: 0.85,

  /** 移动 */
  accelK: 12,
  stuckTime: 0.5,
  stuckDist: 8,
  dodgeTime: 0.6,

  /** 撤退 */
  retreatThreshold: 0.25,
  retreatTime: 2.5,
  retreatCooldown: 2,
  backOff: 0.55,

  /** 狂化 */
  enrageThreshold: 0.2,
  enrageLevel: 10,
  enrageAtkSpeed: 1.4,
  enrageSpeed: 1.25,

  /** 目标评分权重 */
  scoreBase: 100,
  scoreDistance: 0.1,
  scoreLowHp: 30,
  scoreAttackingMe: 15,
  scoreRangedFirst: 8,
  scoreArmor: 2,
  scoreSticky: 25,
} as const;
