const CURSE_OF_PAIN_DURATION = 8 // Seconds.
const CURSE_OF_PAIN_BASE_DAMAGE = 15
const CURSE_OF_SACRIFICE_DURATION = 12 // Seconds.
const CURSE_OF_SACRIFICE_BASE_DAMAGE = 3
const ONE_MAN_BAND_HEAL_COEFFICIENT = .2 // Perfect song coefficient.

type Attacker = {
  magicalBaseDamage: number,
  magicPowerBonus: number,
  magicPenetration: number,
  additionalMagicDamage: number,
  trueMagicDamage: number,
  infernalUsery: boolean,
}

type Enemy = {
  health: number,
  maxHealth: number,
  curseOfPain: {
    active: boolean,
    intervalId?: number | undefined,
    timeoutId?: number | undefined,
  },
  curseOfSacrifice: {
    active: boolean,
    intervalId?: number | undefined,
    timeoutId?: number | undefined,
  },
  magicDamageReduction: number,
  antimagic: boolean,
  perseverance: boolean, // TODO: implement
  curseOfWeakness: boolean,
  debuffDurationReduction: number,
  demon?: {
    active: boolean,
    intervalId?: number | undefined,
  },
  oneManBand: {
    active: boolean,
    magicalHealing: number, // Magical healing. TODO: I don't know how often it heals, my guess is every second. Needs testing.
    intervalId?: number | undefined,
  },
}

/**
 * A normal demon player, with all the unfair things he could get.
 */
const demon: Enemy = {
  health: 200,
  maxHealth: 200,
  curseOfPain: { active: false },
  curseOfSacrifice: { active: false },
  magicDamageReduction: .5, // 50% very normal for a demon in all stat gear.
  antimagic: true, // This is basic to have.
  perseverance: false,
  curseOfWeakness: false,
  debuffDurationReduction: -.2, // 20%
  demon: { active: true },
  oneManBand: { active: true, magicalHealing: 21 }, // 21 magical healing can be reached total I think.
}

const ranger: Enemy = {
  health: 110,
  maxHealth: 110,
  curseOfPain: { active: false },
  curseOfSacrifice: { active: false },
  magicDamageReduction: .1, // 50% very normal for a demon in all stat gear.
  antimagic: false,
  perseverance: false,
  curseOfWeakness: false,
  debuffDurationReduction: 0,
  oneManBand: { active: false, magicalHealing: 21 },
}

let enemy: Enemy = structuredClone(demon)

/**
 * An attacker in full all stat rare gear, ready to ruin normal lobbies.
 */
const attacker: Attacker = {
  magicalBaseDamage: 4, // Rare book.
  magicPowerBonus: 0.68, // 48 will without stacks around 68%
  magicPenetration: .05, // 5% coming from rare book.
  additionalMagicDamage: 0,
  trueMagicDamage: 6, // 2 rings (cuz we are not rich) + book.
  infernalUsery: true,
}

// Elements under enemy header.
let enemyPresetElement = document.getElementById('enemy-preset') as HTMLSelectElement
let magicalDamageReductionElement = document.getElementById('magical-damage-reduction')
let antimagicElement = document.getElementById('antimagic')
let perseveranceElement = document.getElementById('perseverance')
let debuffDurationReductionElement = document.getElementById('debuff-duration-reduction')
let oneManBandInputElement = document.getElementById('one-man-band') as HTMLInputElement
let oneManBandMagicalHealingInputElement = document.getElementById('one-man-band-magical-healing') as HTMLInputElement

// Elements under attacker header.
let magicalBaseDamageElement = document.getElementById('magical-base-damage')
let magicPowerBonusElement = document.getElementById('magic-power-bonus')
let magicPenetrationElement = document.getElementById('magic-penetration')
let additionalMagicDamageElement = document.getElementById('additional-magic-damage')
let trueMagicDamageElement = document.getElementById('true-magic-damage')
let infernalUseryElement = document.getElementById('infernal-usery')

// Elements around health bar.
let attackTypeSelectElement = document.getElementById('attack-type') as HTMLSelectElement
let currentHealthElement = document.getElementById('current-health')
let barMaxHealthElement = document.getElementById('bar-max-health')
let healthBarContainerElement = document.getElementById('health-bar-border')
let healthBarElement = document.getElementById('health-bar')
let timeElement = document.getElementById('time')

if (
  !(
    enemyPresetElement
    && attackTypeSelectElement
    && currentHealthElement
    && barMaxHealthElement
    && magicalDamageReductionElement
    && antimagicElement
    && perseveranceElement
    && debuffDurationReductionElement
    && oneManBandInputElement
    && oneManBandMagicalHealingInputElement
    && healthBarElement
    && healthBarContainerElement
    && magicalBaseDamageElement
    && magicPowerBonusElement
    && magicPenetrationElement
    && additionalMagicDamageElement
    && trueMagicDamageElement
    && infernalUseryElement
    && timeElement
  )
) {
  throw Error("Something went wrong")
}

const updateHealth = (isDead = false) => {
  currentHealthElement.innerText = Math.ceil(enemy.health).toString()
  let newWidth: number = enemy.health / enemy.maxHealth * 100
  healthBarElement.style.setProperty('width', newWidth + "%")
}

/**
 * Change health, handling when hp goes below 0 or above maxHealth. On death stops healing effects.
 */
const changeHealth = (d: number, source: string) => {
  const newHealth = Math.min(enemy.health + d, enemy.maxHealth)
  console.log(`Change health: ${source} ${d}`)
  if (newHealth > 0) {
    enemy.health = newHealth
    updateHealth()
  } else {
    enemy.health = 0
    clearTimeout(enemy.oneManBand.intervalId)
    updateHealth(true)
  }
}

/**
 * Updates all changing UI elements.
 */
const update = () => {
  updateHealth()
  barMaxHealthElement.innerText = enemy.maxHealth.toString()
  magicalDamageReductionElement.innerText = (enemy.magicDamageReduction * 100).toString() + '%'
  antimagicElement.innerText = enemy.antimagic ? "ON" : "OFF"
  perseveranceElement.innerText = enemy.perseverance ? "ON" : "OFF"
  debuffDurationReductionElement.innerText = (enemy.debuffDurationReduction * 100).toString() + '%'
  oneManBandInputElement.checked = enemy.oneManBand.active == true
  oneManBandMagicalHealingInputElement.value =
    enemy.oneManBand.magicalHealing !== undefined
      ? enemy.oneManBand.magicalHealing.toString()
      : ""

  magicalBaseDamageElement.innerText = attacker.magicalBaseDamage.toString()
  magicPowerBonusElement.innerText = (attacker.magicPowerBonus * 100).toString()
  magicPenetrationElement.innerText = (attacker.magicPenetration * 100).toString() + '%'
  additionalMagicDamageElement.innerText = attacker.additionalMagicDamage.toString()
  trueMagicDamageElement.innerText = attacker.trueMagicDamage.toString()
  infernalUseryElement.innerText = attacker.infernalUsery ? "ON" : "OFF"
}

const pauseTime = () => {
  timeElement.innerText = "Paused"
}

enemyPresetElement.addEventListener('change', function() {
  clearInterval(enemy.curseOfPain.intervalId)
  clearTimeout(enemy.curseOfPain.timeoutId)
  clearInterval(enemy.curseOfSacrifice.intervalId)
  clearTimeout(enemy.curseOfSacrifice.timeoutId)
  clearTimeout(enemy.demon?.intervalId)
  clearTimeout(enemy.oneManBand.intervalId)

  pauseTime()

  if (this.value == "demon") {
    enemy = structuredClone(demon)
  } else if (this.value == "ranger") {
    enemy = structuredClone(ranger)
  }

  update()
})

function initOneManBand() {
  enemy.oneManBand.intervalId = setInterval(() => {
    // Only change health, while One-Man Band is still active.
    if (enemy.oneManBand.active) {
      const tickHeal = 1 + enemy.oneManBand.magicalHealing * ONE_MAN_BAND_HEAL_COEFFICIENT
      if (enemy.curseOfPain.active || enemy.curseOfSacrifice.active) {
        changeHealth(tickHeal, "One-Man Band")
      }
    }
  }, 1000)
}

oneManBandInputElement.addEventListener('change', function() {
  // Toggle One-Man Band logic
  if (this.checked) {
    enemy.oneManBand.active = true

    initOneManBand()
  } else {
    enemy.oneManBand.active = false
    clearInterval(enemy.oneManBand.intervalId)
  }
})

oneManBandMagicalHealingInputElement.addEventListener('change', function() {
  if (enemy.oneManBand) {
    const magicalHealing = parseInt(this.value)
    // Validate that input is a number.
    if (!isNaN(magicalHealing)) {
      enemy.oneManBand.magicalHealing = magicalHealing
      console.log("Set magical healing to", magicalHealing)
    }
  }
})

const curseOfPainDamage = () => {
  let magicDamageReduction = enemy.antimagic ? enemy.magicDamageReduction + 0.25 : enemy.magicDamageReduction
  magicDamageReduction = enemy.curseOfWeakness ? magicDamageReduction - 0.15 : magicDamageReduction
  return (
    (CURSE_OF_PAIN_BASE_DAMAGE + attacker.magicalBaseDamage)
    * (1 + attacker.magicPowerBonus)
    + attacker.additionalMagicDamage
  ) * ((1 - magicDamageReduction) * (1 - attacker.magicPenetration))
    + attacker.trueMagicDamage
}

/**
 * Stops time if target is clear of dots.
 */
const maybePauseTime = () => {
  if (!enemy.curseOfPain.active && !enemy.curseOfSacrifice.active) {
    pauseTime()
  }
}

const applyDot = () => {
  timeElement.innerText = "Going"
  enemy.curseOfPain.intervalId = setInterval(() => {
    const tickDamage = curseOfPainDamage() * 0.5 / CURSE_OF_PAIN_DURATION
    const finalTickDamage = attacker.infernalUsery ? tickDamage + 2 : tickDamage
    changeHealth(-finalTickDamage, "Curse of Pain tick")
  }, 1000)

  enemy.curseOfPain.timeoutId = setTimeout(() => {
    enemy.curseOfPain.active = false
    maybePauseTime()
    clearInterval(enemy.curseOfPain.intervalId)
    enemy.curseOfPain.intervalId = undefined
  }, (CURSE_OF_PAIN_DURATION * (1 + enemy.debuffDurationReduction) + 1) * 1000) // Base duration + 1 because the first tick doesn't happen immediately.
}

const curseOfPain = () => {
  if (!enemy.curseOfPain.active) {
    enemy.curseOfPain.active = true

    const damage = curseOfPainDamage()
    const finalDamage = attacker.infernalUsery ? damage + 2 : damage
    changeHealth(-finalDamage, "Curse of Pain")
  } else {
    // Clear previous curse.
    clearInterval(enemy.curseOfPain.intervalId)
    clearTimeout(enemy.curseOfPain.timeoutId)
  }

  applyDot()
}

const curseOfSacrifice = () => {
  // TODO: Should increase health by a flat amount (15 str + 15 vigor).
  if (enemy.curseOfSacrifice.active) {
    clearInterval(enemy.curseOfSacrifice.intervalId)
    clearTimeout(enemy.curseOfSacrifice.timeoutId)
  } else {
    enemy.curseOfSacrifice.active = true
  }

  timeElement.innerText = "Going"
  enemy.curseOfSacrifice.intervalId = setInterval(() => {
    let magicDamageReduction = enemy.antimagic ? enemy.magicDamageReduction + 0.25 : enemy.magicDamageReduction
    magicDamageReduction = enemy.curseOfWeakness ? magicDamageReduction - 0.15 : magicDamageReduction

    // Think it only does a flat amount of damage, no scaling, to added/true magic.
    const tickDamage = CURSE_OF_SACRIFICE_BASE_DAMAGE * ((1 - magicDamageReduction) * (1 - attacker.magicPenetration))
    const finalTickDamage = attacker.infernalUsery ? tickDamage + 2 : tickDamage
    changeHealth(-finalTickDamage, "Curse of Sacrifice tick")
  }, 1000)

  enemy.curseOfSacrifice.timeoutId = setTimeout(() => {
    enemy.curseOfSacrifice.active = false
    maybePauseTime()
    clearInterval(enemy.curseOfSacrifice.intervalId)
    enemy.curseOfSacrifice.intervalId = undefined
  }, (CURSE_OF_SACRIFICE_DURATION * (1 + enemy.debuffDurationReduction) + 1) * 1000)
}

/**
 * `Attacker` curses the `Enemy` and causes instant and periodic damage for 5 seconds. 
 */
const attack = (spell: Function) => {
  spell()
}

// TODO: Demon ticks are happening even while time is stopped. Damage is not taken, but gets desynced.
if (enemy.demon?.active) {
  const tickDamage = enemy.maxHealth * 0.01 // 1% of health

  enemy.demon.intervalId = setInterval(() => {
    if (enemy.curseOfPain.active) {
      changeHealth(-tickDamage, "Demon degen")
    }
  }, 1000)
}

initOneManBand()

// Init UI values.
update()

const attackButton = document.getElementById('attack') as HTMLButtonElement
attackButton.onclick = () => attack(() => {
  if (attackTypeSelectElement.value == "curse-of-pain") {
    return curseOfPain()
  } else if (attackTypeSelectElement.value == "curse-of-sacrifice") {
    return curseOfSacrifice()
  }
})
