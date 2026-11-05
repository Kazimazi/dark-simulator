const CURSE_OF_PAIN_DURATION = 8 // Seconds.
const CURSE_OF_PAIN_BASE_DAMAGE = 15
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
  magicDamageReduction: number,
  antimagic: boolean,
  perseverance: boolean, // TODO: implement
  curseOfWeakness: boolean,
  debuffDurationReduction: number,
  demon?: {
    active: boolean,
    intervalId?: number | undefined,
  },
  oneManBand?: {
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
  magicDamageReduction: .5, // 50% very normal for a demon in all stat gear.
  antimagic: true, // This is basic to have.
  perseverance: false,
  curseOfWeakness: false,
  debuffDurationReduction: .2, // 20%
  demon: { active: true },
  oneManBand: { magicalHealing: 21 }, // 21 magical healing can be reached total I think.
}

const ranger: Enemy = {
  health: 110,
  maxHealth: 110,
  curseOfPain: { active: false },
  magicDamageReduction: .1, // 50% very normal for a demon in all stat gear.
  antimagic: false,
  perseverance: false,
  curseOfWeakness: false,
  debuffDurationReduction: 0
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

// Elements under attacker header.
let magicalBaseDamageElement = document.getElementById('magical-base-damage')
let magicPowerBonusElement = document.getElementById('magic-power-bonus')
let magicPenetrationElement = document.getElementById('magic-penetration')
let additionalMagicDamageElement = document.getElementById('additional-magic-damage')
let trueMagicDamageElement = document.getElementById('true-magic-damage')
let infernalUseryElement = document.getElementById('infernal-usery')

// Elements around health bar.
let currentHealthElement = document.getElementById('current-health')
let barMaxHealthElement = document.getElementById('bar-max-health')
let healthBarContainerElement = document.getElementById('health-bar-border')
let healthBarElement = document.getElementById('health-bar')
let timeElement = document.getElementById('time')

if (
  !(
    enemyPresetElement
    && currentHealthElement
    && barMaxHealthElement
    && magicalDamageReductionElement
    && antimagicElement
    && perseveranceElement
    && debuffDurationReductionElement
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
 * Change health, handling when hp goes below 0. On death stops healing effects.
 */
const changeHealth = (d: number) => {
  const newHealth = enemy.health + d
  if (newHealth > 0) {
    enemy.health = newHealth
    updateHealth()
  } else {
    enemy.health = 0
    clearTimeout(enemy.oneManBand?.intervalId)
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
  debuffDurationReductionElement.innerText = '-' + (enemy.debuffDurationReduction * 100).toString() + '%'

  magicalBaseDamageElement.innerText = attacker.magicalBaseDamage.toString()
  magicPowerBonusElement.innerText = (attacker.magicPowerBonus * 100).toString()
  magicPenetrationElement.innerText = (attacker.magicPenetration * 100).toString() + '%'
  additionalMagicDamageElement.innerText = attacker.additionalMagicDamage.toString()
  trueMagicDamageElement.innerText = attacker.trueMagicDamage.toString()
  infernalUseryElement.innerText = attacker.infernalUsery ? "ON" : "OFF"
}

enemyPresetElement.addEventListener('change', function() {
  clearInterval(enemy.curseOfPain.intervalId)
  clearTimeout(enemy.curseOfPain.timeoutId)
  clearTimeout(enemy.demon?.intervalId)
  clearTimeout(enemy.oneManBand?.intervalId)

  if (this.value == "demon") {
    enemy = structuredClone(demon)
  } else if (this.value == "ranger") {
    enemy = structuredClone(ranger)
  }

  update()
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

const applyDot = () => {
  timeElement.innerText = "Going"
  enemy.curseOfPain.intervalId = setInterval(() => {
    const tickDamage = curseOfPainDamage() * 0.5 / CURSE_OF_PAIN_DURATION
    const finalTickDamage = attacker.infernalUsery ? tickDamage + 2 : tickDamage
    changeHealth(-finalTickDamage)
  }, 1000)

  enemy.curseOfPain.timeoutId = setTimeout(() => {
    enemy.curseOfPain.active = false
    timeElement.innerText = "Paused"
    clearInterval(enemy.curseOfPain.intervalId)
    enemy.curseOfPain.intervalId = undefined
  }, (CURSE_OF_PAIN_DURATION * (1 + enemy.debuffDurationReduction) + 1) * 1000) // Base duration + 1 because the first tick doesn't happen immediately.
}

const curseOfPain = () => {
  if (!enemy.curseOfPain.active) {
    enemy.curseOfPain.active = true

    const damage = curseOfPainDamage()
    const finalDamage = attacker.infernalUsery ? damage + 2 : damage
    changeHealth(-finalDamage)
  } else {
    // Clear previous curse.
    clearInterval(enemy.curseOfPain.intervalId)
    clearTimeout(enemy.curseOfPain.timeoutId)
  }

  applyDot()
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
      changeHealth(-tickDamage)
    }
  }, 1000)
}

if (enemy.oneManBand) {
  const tickHeal = 1 + enemy.oneManBand.magicalHealing * ONE_MAN_BAND_HEAL_COEFFICIENT

  enemy.oneManBand.intervalId = setInterval(() => {
    if (enemy.curseOfPain.active) {
      changeHealth(tickHeal)
    }
  }, 1000)
}

// Init UI values.
update()

const attackButton = document.getElementById('attack') as HTMLButtonElement
attackButton.onclick = () => attack(curseOfPain)
