# Simulation Analysis Report (1,000,000 Matches)

We simulated 1,000,000 high-fidelity matches using the exact game logic (ticks, energy, traits, weapon effects). Mobs were generated with equal stat point distribution to ensure fairness.

## 🏆 Trait Winrates

| Trait | Winrate | Appearances | Tier |
| :--- | :--- | :--- | :--- |
| **Berzerk** | **87.22%** | 407,710 | **S+ (Overpowered)** |
| **Appel de l'Astico-Roi** | **62.06%** | 408,079 | **A (Strong)** |
| Coup Critique | 49.41% | 408,260 | B (Balanced) |
| Sprint Final | 48.91% | 408,371 | B (Balanced) |
| Peau de Cuir | 46.49% | 408,811 | C (Slightly Weak) |
| Contre-attaque | 40.42% | 407,795 | D (Weak) |
| **Main de Dentelle** | **36.29%** | 407,953 | **F (Useless)** |

## ⚔️ Weapon Winrates

| Weapon | Winrate | Appearances | Tier |
| :--- | :--- | :--- | :--- |
| **Cutter** | **54.22%** | 687,210 | **A (Strong)** |
| Fourchette | 50.58% | 687,164 | B (Balanced) |
| Capsule | 49.88% | 687,742 | B (Balanced) |
| Cure-dent | 47.59% | 686,841 | C (Weak) |

## 📊 Stat Efficiency
(Normalized impact on victory)
1.  **VITESSE (51.55)**: Most efficient stat. Getting more turns is always better.
2.  **FORCE (50.52)**: Very strong, especially combined with high speed.
3.  **AGILITE (48.99)**: Moderate impact. Dodge is good but RNG-dependent.
4.  **VITALITE (48.94)**: Lowest impact. Increasing HP doesn't compensate for taking more hits from faster enemies.

---

## 🛠️ Balancing Recommendations

### 🔴 Nerfs Needed
- **Berzerk**: The 3-hit burst is devastating. 
    - *Suggestion*: Reduce to 2 attacks, or increase the required hits taken from 3 to 4 or 5.
- **Appel de l'Astico-Roi**: The maggot adds too much free damage.
    - *Suggestion*: Reduce maggot damage to a flat 3-5, or reduce its speed to 60% of the owner.

### 🟢 Buffs Needed
- **Main de Dentelle**: Stealing a weapon is currently a disadvantage because it takes an inventory slot and often replaces a better weapon.
    - *Suggestion*: When stealing a weapon, the thief should also gain a 25% damage bonus for the next 2 turns.
- **Contre-attaque**: Too low impact.
    - *Suggestion*: Increase the proc chance or make the counter-attack deal 100% damage instead of 70%.
- **Cure-dent**: Outclassed by other weapons.
    - *Suggestion*: Add a passive +10% Speed bonus when equipped.

### ⚖️ Global Adjustments
- **Vitalité**: Needs to be more rewarding.
    - *Suggestion*: Increase HP gain per point from 5 to 10.
