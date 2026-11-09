import {
  CURSE_OF_PAIN_BASE_DAMAGE,
  CURSE_OF_PAIN_DURATION,
  CURSE_OF_SACRIFICE_BASE_DAMAGE,
  CURSE_OF_SACRIFICE_DURATION,
  CURSE_OF_SACRIFICE_HEALTH_BUFF,
  DARK_BOLT_BASE_DAMAGE,
  INFERNAL_USERY_DAMAGE,
  ONE_MAN_BAND_HEAL_COEFFICIENT,
  ONE_MAN_BAND_MAX_MAGICAL_HEALING,
  PERSEVERANCE_DAMAGE_REDUCTION,
} from "./constants.js";
import {
  enemyPresetElement,
  healthInputElement,
  maxHealthInputElement,
  attackTypeSelectElement,
  currentHealthElement,
  barMaxHealthElement,
  magicalDamageReductionInputElement,
  antimagicInputElement,
  perseveranceInputElement,
  debuffDurationReductionInputElement,
  oneManBandInputElement,
  oneManBandMagicalHealingInputElement,
  healthBarElement,
  magicalBaseDamageInputElement,
  magicPowerBonusInputElement,
  magicPenetrationInputElement,
  additionalMagicDamageInputElement,
  trueMagicDamageInputElement,
  infernalUseryInputElement,
  attackButton,
  resumeButton,
  pauseButton,
  resetButton,
  demonFormInputElement,
} from "./selectors.js";
import { Interval, DotTimer } from "./utils.js";

class Attacker {
  magicalBaseDamage: number;
  magicPowerBonus: number;
  magicPenetration: number;
  additionalMagicDamage: number;
  trueMagicDamage: number;
  infernalUsery: boolean;

  constructor(
    magicalBaseDamage: number,
    magicPowerBonus: number,
    magicPenetration: number,
    additionalMagicDamage: number,
    trueMagicDamage: number,
    infernalUsery: boolean,
  ) {
    this.magicalBaseDamage = magicalBaseDamage;
    this.magicPowerBonus = magicPowerBonus;
    this.magicPenetration = magicPenetration;
    this.additionalMagicDamage = additionalMagicDamage;
    this.trueMagicDamage = trueMagicDamage;
    this.infernalUsery = infernalUsery;
  }
}

class Enemy {
  health: number;
  maxHealth: number;
  magicDamageReduction: number;
  antimagic: boolean;
  perseverance: boolean;
  debuffDurationReduction: number;
  buff: {
    oneManBand: {
      active: boolean;
      interval: Interval;
      magicalHealing: number; // Magical healing. TODO: I don't know how often it heals, my guess is every second. Needs testing.
    };
  };
  debuff: {
    demonForm: {
      active: boolean;
      interval: Interval;
    };
    curseOfPain: {
      active: boolean;
      timer?: DotTimer;
    };
    curseOfSacrifice: {
      active: boolean;
      timer?: DotTimer;
    };
    curseOfWeakness: {
      active: boolean;
    };
  };

  constructor(
    health: number,
    maxHealth: number,
    magicDamageReduction: number,
    antimagic: boolean,
    perseverance: boolean,
    debuffDurationReduction: number,
  ) {
    this.health = health;
    this.maxHealth = maxHealth;
    this.magicDamageReduction = magicDamageReduction;
    this.antimagic = antimagic;
    this.perseverance = perseverance;
    this.debuffDurationReduction = debuffDurationReduction;
    this.buff = {
      oneManBand: {
        active: false,
        magicalHealing: 0,
        interval: this.initOneManBandInterval(),
      },
    };
    this.debuff = {
      demonForm: {
        active: false,
        interval: this.initDemonFormInterval(),
      },
      curseOfPain: { active: false },
      curseOfSacrifice: { active: false },
      curseOfWeakness: { active: false },
    };
  }

  initOneManBandInterval() {
    return new Interval(() => {
      if (this.buff.oneManBand?.magicalHealing) {
        const tickHeal =
          1 +
          this.buff.oneManBand.magicalHealing * ONE_MAN_BAND_HEAL_COEFFICIENT;
        changeHealth(tickHeal, "One-Man Band");
      }
    }, 1000);
  }

  initDemonFormInterval() {
    return new Interval(() => {
      const tickDamage = this.maxHealth * 0.01; // 1% of health
      changeHealth(-tickDamage, "Demon degen");
    }, 1000);
  }
}

/**
 * A normal demon player, with all the unfair things he could get.
 */
class Demon extends Enemy {
  constructor() {
    super(
      200,
      200,
      0.5, // 50% very normal for a demon in all stat gear.
      true, // This is basic to have.
      false,
      -0.2, // 20%
    );
    this.buff.oneManBand.active = true;
    this.buff.oneManBand.magicalHealing = ONE_MAN_BAND_MAX_MAGICAL_HEALING;
    this.debuff.demonForm.active = true;
  }
}

/**
 * Average ranger with no team synergy.
 */
class Ranger extends Enemy {
  constructor() {
    super(110, 110, 0.1, false, false, 0);
  }
}

export class GameState {
  play: boolean;
  enemy: Enemy;
  attacker: Attacker;

  constructor() {
    this.play = false;
    this.enemy = new Demon();
    this.attacker = new Attacker(
      4, // Rare book.
      0.68, // 48 will without stacks around 68%
      0.05, // 5% coming from rare book.
      0,
      6, // 2 rings (cuz we are not rich) + book.
      true,
    );
  }
}

const SPELL = {
  /**
   * Calculates magic and true parts of a spell.
   */
  calcDamage: (opts: {
    baseDamage: number;
    hitLocationBonus?: number;
    projectile?: boolean;
  }) => {
    let magicDamageReduction = gameState.enemy.antimagic
      ? gameState.enemy.magicDamageReduction + 0.25
      : gameState.enemy.magicDamageReduction;
    magicDamageReduction = gameState.enemy.debuff.curseOfWeakness.active
      ? magicDamageReduction - 0.15
      : magicDamageReduction;
    return {
      magicDamage:
        ((opts.baseDamage + gameState.attacker.magicalBaseDamage) *
          (1 + gameState.attacker.magicPowerBonus) +
          gameState.attacker.additionalMagicDamage) *
        (1 + (opts.hitLocationBonus ? opts.hitLocationBonus : 0)) *
        (1 - magicDamageReduction * (1 - gameState.attacker.magicPenetration)) *
        // TODO: Projectile damage reduction not not implemented!
        (1 - (opts.projectile ? 0 : 0)),
      trueDamage: gameState.attacker.trueMagicDamage,
    };
  },
  /**
   * Calculates instance of damage dealt. Like tick of dot, or hit of a direct spell.
   */
  calcInstanceDamage: (magicDamage: number, trueDamage: number) => {
    let damage: number = 0;

    // Handle magic damage.
    if (gameState.enemy.perseverance) {
      damage += Math.max(magicDamage - PERSEVERANCE_DAMAGE_REDUCTION, 1);
    } else {
      damage += magicDamage;
    }

    // Handle true damage.
    if (gameState.attacker.infernalUsery) {
      if (gameState.enemy.perseverance) {
        damage += Math.max(
          trueDamage - PERSEVERANCE_DAMAGE_REDUCTION + INFERNAL_USERY_DAMAGE,
          1,
        );
      } else {
        damage += trueDamage + INFERNAL_USERY_DAMAGE;
      }
    } else {
      if (gameState.enemy.perseverance) {
        damage += Math.max(trueDamage - PERSEVERANCE_DAMAGE_REDUCTION, 1);
      } else {
        damage += trueDamage;
      }
    }

    return damage;
  },
  curseOfPain: {
    direct: () => {
      const { magicDamage, trueDamage } = SPELL.calcDamage({
        baseDamage: CURSE_OF_PAIN_BASE_DAMAGE,
      });
      if (!gameState.enemy.debuff.curseOfPain.active) {
        const damage = SPELL.calcInstanceDamage(magicDamage, trueDamage);
        changeHealth(-damage, "Curse of Pain");
      }
      if (gameState.enemy.debuff.curseOfPain.active) {
        gameState.enemy.debuff.curseOfPain.timer?.stop();
      }
      SPELL.curseOfPain.dot(magicDamage, trueDamage);
    },
    dot: (magicDamage: number, trueDamage: number) => {
      gameState.enemy.debuff.curseOfPain.active = true;
      gameState.enemy.debuff.curseOfPain.timer = new DotTimer(
        () => {
          const magicTickDamage = (magicDamage * 0.5) / CURSE_OF_PAIN_DURATION;
          const trueTickDamage = (trueDamage * 0.5) / CURSE_OF_PAIN_DURATION;

          const damage = SPELL.calcInstanceDamage(
            magicTickDamage,
            trueTickDamage,
          );

          changeHealth(-damage, "Curse of Pain tick");
        },
        () => {
          gameState.enemy.debuff.curseOfPain.active = false;
        },
        1000,
        CURSE_OF_PAIN_DURATION *
          (1 + gameState.enemy.debuffDurationReduction) *
          1000,
      );
    },
  },
  curseOfSacrifice: {
    dot: () => {
      if (!currentHealthElement || !barMaxHealthElement) {
        throw Error("UI element not found.");
      }
      if (gameState.enemy.debuff.curseOfSacrifice.active) {
        gameState.enemy.debuff.curseOfSacrifice.timer?.stop();
      }

      gameState.enemy.debuff.curseOfSacrifice.active = true;
      gameState.enemy.maxHealth += CURSE_OF_SACRIFICE_HEALTH_BUFF;
      changeHealth(
        CURSE_OF_SACRIFICE_HEALTH_BUFF,
        "Curse of Sacrifice health buff added",
      );
      currentHealthElement.innerText = Math.ceil(
        gameState.enemy.health,
      ).toString();
      barMaxHealthElement.innerText = Math.ceil(
        gameState.enemy.maxHealth,
      ).toString();

      gameState.enemy.debuff.curseOfSacrifice.timer = new DotTimer(
        () => {
          let magicDamageReduction = gameState.enemy.antimagic
            ? gameState.enemy.magicDamageReduction + 0.25
            : gameState.enemy.magicDamageReduction;
          magicDamageReduction = gameState.enemy.debuff.curseOfWeakness.active
            ? magicDamageReduction - 0.15
            : magicDamageReduction;

          // Think it only does a flat amount of damage, no scaling, to added/true magic.
          let damage: number = 0;

          damage =
            CURSE_OF_SACRIFICE_BASE_DAMAGE *
            ((1 - magicDamageReduction) *
              (1 - gameState.attacker.magicPenetration));

          if (gameState.attacker.infernalUsery) {
            if (gameState.enemy.perseverance) {
              damage += Math.max(damage - PERSEVERANCE_DAMAGE_REDUCTION, 1) + 1; // + 1 at the end is infernal usery after perseverance.
            } else {
              damage += 2;
            }
          } else {
            if (gameState.enemy.perseverance) {
              damage += Math.max(damage - PERSEVERANCE_DAMAGE_REDUCTION, 1); // + 1 at the end is infernal usery after perseverance.
            }
          }

          changeHealth(-damage, "Curse of Sacrifice tick");
        },
        () => {
          if (!currentHealthElement || !barMaxHealthElement) {
            throw Error("UI element not found.");
          }
          gameState.enemy.debuff.curseOfSacrifice.active = false;
          gameState.enemy.maxHealth -= CURSE_OF_SACRIFICE_HEALTH_BUFF;
          changeHealth(
            -CURSE_OF_SACRIFICE_HEALTH_BUFF,
            "Curse of Sacrifice health buff remove",
          );
          currentHealthElement.innerText = Math.ceil(
            gameState.enemy.health,
          ).toString();
          barMaxHealthElement.innerText = Math.ceil(
            gameState.enemy.maxHealth,
          ).toString();
        },
        1000,
        CURSE_OF_SACRIFICE_DURATION *
          (1 + gameState.enemy.debuffDurationReduction) *
          1000,
      );
    },
  },
  darkBolt: {
    direct: () => {
      const { magicDamage, trueDamage } = SPELL.calcDamage({
        baseDamage: DARK_BOLT_BASE_DAMAGE,
        hitLocationBonus: 0,
        projectile: true,
      });

      const damage = SPELL.calcInstanceDamage(magicDamage, trueDamage);

      changeHealth(-damage, "Dark Bolt");
    },
  },
};

const ui = {
  updateHealth: () => {
    if (!currentHealthElement || !healthBarElement) {
      throw Error("UI element not found.");
    }
    currentHealthElement.innerText = Math.ceil(
      gameState.enemy.health,
    ).toString();
    let newWidth: number =
      (gameState.enemy.health / gameState.enemy.maxHealth) * 100;
    healthBarElement.style.setProperty("width", newWidth + "%");
  },
  /**
   * Updates all changing UI elements to reflext current state of the game.
   */
  update: () => {
    if (!barMaxHealthElement) {
      throw Error("UI element not found.");
    }
    ui.updateHealth();
    healthInputElement.value = gameState.enemy.health.toString();
    maxHealthInputElement.value = gameState.enemy.maxHealth.toString();
    barMaxHealthElement.innerText = gameState.enemy.maxHealth.toString();
    magicalDamageReductionInputElement.value = (
      gameState.enemy.magicDamageReduction * 100
    ).toString();
    antimagicInputElement.checked = gameState.enemy.antimagic;
    perseveranceInputElement.checked = gameState.enemy.perseverance;
    debuffDurationReductionInputElement.value = (
      gameState.enemy.debuffDurationReduction * 100
    ).toString();
    oneManBandInputElement.checked = gameState.enemy.buff.oneManBand.active;
    oneManBandMagicalHealingInputElement.value =
      gameState.enemy.buff.oneManBand.magicalHealing !== undefined
        ? gameState.enemy.buff.oneManBand.magicalHealing.toString()
        : "";
    demonFormInputElement.checked = gameState.enemy.debuff.demonForm.active;
    magicalBaseDamageInputElement.value =
      gameState.attacker.magicalBaseDamage.toString();
    magicPowerBonusInputElement.value = (
      gameState.attacker.magicPowerBonus * 100
    ).toString();
    magicPenetrationInputElement.value = (
      gameState.attacker.magicPenetration * 100
    ).toString();
    additionalMagicDamageInputElement.value =
      gameState.attacker.additionalMagicDamage.toString();
    trueMagicDamageInputElement.value =
      gameState.attacker.trueMagicDamage.toString();
    infernalUseryInputElement.checked = gameState.attacker.infernalUsery;
  },
};

/**
 * Change health, handling when hp goes below 0 or above maxHealth. On death stops healing effects.
 */
const changeHealth = (d: number, source: string) => {
  const newHealth = Math.max(
    Math.min(gameState.enemy.health + d, gameState.enemy.maxHealth),
    0,
  );
  console.log(`Change health: ${source} ${d}`);
  if (newHealth > 0) {
    gameState.enemy.health = newHealth;
    ui.updateHealth();
  } else {
    if (gameState.enemy.debuff.demonForm.active)
      gameState.enemy.debuff.demonForm.interval.pause();
    if (gameState.enemy.buff.oneManBand.active)
      gameState.enemy.buff.oneManBand.interval.pause();
    gameState.enemy.health = newHealth;
    ui.updateHealth();
    if (gameState.enemy.debuff.demonForm.active)
      gameState.enemy.debuff.demonForm.interval.stop();
    if (gameState.enemy.buff.oneManBand.active)
      gameState.enemy.buff.oneManBand.interval.stop();
    if (gameState.enemy.debuff.curseOfPain.active)
      gameState.enemy.debuff.curseOfPain.timer?.stop();
    if (gameState.enemy.debuff.curseOfSacrifice.active)
      gameState.enemy.debuff.curseOfSacrifice.timer?.stop();
  }
};

enemyPresetElement.addEventListener("change", function () {
  if (gameState.enemy.debuff.demonForm.active)
    gameState.enemy.debuff.demonForm.interval.pause();
  if (gameState.enemy.buff.oneManBand.active)
    gameState.enemy.buff.oneManBand.interval.pause();
  if (gameState.enemy.debuff.curseOfPain.active)
    gameState.enemy.debuff.curseOfPain.timer?.pause();
  if (gameState.enemy.debuff.curseOfSacrifice.active)
    gameState.enemy.debuff.curseOfSacrifice.timer?.pause();

  if (this.value == "demon") {
    gameState.enemy = new Demon();
  } else if (this.value == "ranger") {
    gameState.enemy = new Ranger();
  }

  ui.update();
});

antimagicInputElement.addEventListener("change", function () {
  gameState.enemy.antimagic = this.checked;
});

perseveranceInputElement.addEventListener("change", function () {
  gameState.enemy.perseverance = this.checked;
});

healthInputElement.addEventListener("change", function () {
  const health = parseInt(this.value);
  if (!isNaN(health)) {
    gameState.enemy.health = health;
  }
});

maxHealthInputElement.addEventListener("change", function () {
  const maxHealth = parseInt(this.value);
  if (!isNaN(maxHealth)) {
    gameState.enemy.maxHealth = maxHealth;
  }
});

magicalDamageReductionInputElement.addEventListener("change", function () {
  const magicDamageReduction = parseInt(this.value);
  if (!isNaN(magicDamageReduction)) {
    gameState.enemy.magicDamageReduction = magicDamageReduction / 100;
  }
});

debuffDurationReductionInputElement.addEventListener("change", function () {
  const debuffDurationReduction = parseInt(this.value);
  if (!isNaN(debuffDurationReduction)) {
    gameState.enemy.debuffDurationReduction = debuffDurationReduction / 100;
  }
});

oneManBandInputElement.addEventListener("change", function () {
  if (this.checked) {
    gameState.enemy.buff.oneManBand.active = true;
    gameState.enemy.buff.oneManBand.interval =
      gameState.enemy.initOneManBandInterval();
    if (gameState.play) {
      gameState.enemy.buff.oneManBand.interval.play();
    }
  } else {
    gameState.enemy.buff.oneManBand.interval.stop();
  }
});

oneManBandMagicalHealingInputElement.addEventListener("change", function () {
  if (gameState.enemy.buff.oneManBand.active) {
    const magicalHealing = parseInt(this.value);
    // Validate that input is a number.
    if (!isNaN(magicalHealing)) {
      gameState.enemy.buff.oneManBand.magicalHealing = magicalHealing;
      console.log("Set magical healing to", magicalHealing);
    }
  }
});

demonFormInputElement.addEventListener("change", function () {
  if (this.checked) {
    gameState.enemy.debuff.demonForm.active = true;
    gameState.enemy.debuff.demonForm.interval =
      gameState.enemy.initDemonFormInterval();
    if (gameState.play) {
      gameState.enemy.debuff.demonForm.interval.play();
    }
  } else {
    gameState.enemy.debuff.demonForm.interval.stop();
  }
});

magicalBaseDamageInputElement.addEventListener("change", function () {
  const magicalBaseDamage = parseInt(this.value);
  if (!isNaN(magicalBaseDamage)) {
    gameState.attacker.magicalBaseDamage = magicalBaseDamage;
  }
});

magicPowerBonusInputElement.addEventListener("change", function () {
  const magicPowerBonus = parseInt(this.value);
  if (!isNaN(magicPowerBonus)) {
    gameState.attacker.magicPowerBonus = magicPowerBonus / 100;
  }
});

magicPenetrationInputElement.addEventListener("change", function () {
  const magicPenetration = parseInt(this.value);
  if (!isNaN(magicPenetration)) {
    gameState.attacker.magicPenetration = magicPenetration / 100;
  }
});

additionalMagicDamageInputElement.addEventListener("change", function () {
  const additionalMagicDamage = parseInt(this.value);
  if (!isNaN(additionalMagicDamage)) {
    gameState.attacker.additionalMagicDamage = additionalMagicDamage;
  }
});

trueMagicDamageInputElement.addEventListener("change", function () {
  const trueMagicDamage = parseInt(this.value);
  if (!isNaN(trueMagicDamage)) {
    gameState.attacker.trueMagicDamage = trueMagicDamage;
  }
});

infernalUseryInputElement.addEventListener("change", function () {
  gameState.attacker.infernalUsery = this.checked;
});

attackButton.onclick = () => {
  if (attackTypeSelectElement.value == "curse-of-pain") {
    SPELL.curseOfPain.direct();
    if (gameState.play) {
      gameState.enemy.debuff.curseOfPain.timer?.play();
    }
  } else if (attackTypeSelectElement.value == "curse-of-sacrifice") {
    SPELL.curseOfSacrifice.dot();
    if (gameState.play) {
      gameState.enemy.debuff.curseOfSacrifice.timer?.play();
    }
  } else if (attackTypeSelectElement.value == "dark-bolt") {
    return SPELL.darkBolt.direct();
  }
};

resumeButton.onclick = () => {
  gameState.play = true;
  if (gameState.enemy.debuff.demonForm.active)
    gameState.enemy.debuff.demonForm.interval.play();
  if (gameState.enemy.buff.oneManBand.active)
    gameState.enemy.buff.oneManBand.interval.play();
  if (gameState.enemy.debuff.curseOfPain.active)
    gameState.enemy.debuff.curseOfPain.timer?.play();
  if (gameState.enemy.debuff.curseOfSacrifice.active)
    gameState.enemy.debuff.curseOfSacrifice.timer?.play();
};

pauseButton.onclick = () => {
  gameState.play = false;
  if (gameState.enemy.debuff.demonForm.active)
    gameState.enemy.debuff.demonForm.interval.pause();
  if (gameState.enemy.buff.oneManBand.active)
    gameState.enemy.buff.oneManBand.interval.pause();
  if (gameState.enemy.debuff.curseOfPain.active)
    gameState.enemy.debuff.curseOfPain.timer?.pause();
  if (gameState.enemy.debuff.curseOfSacrifice.active)
    gameState.enemy.debuff.curseOfSacrifice.timer?.pause();
};

resetButton.onclick = () => {
  gameState = new GameState();
  ui.update();
};

let gameState = new GameState();
ui.update();
