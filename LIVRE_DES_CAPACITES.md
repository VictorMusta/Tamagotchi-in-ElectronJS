# 📖 Livre des Capacités & Stats du Tamagotchi

Ce document recense l'ensemble des mécanismes de combat, statistiques et traits (capacités) disponibles dans le jeu.

---

## 📊 Statistiques (Stats)

Chaque Mob possède 3 statistiques principales qui déterminent son efficacité au combat.

### ⚔️ Force
*   **Description** : La puissance brute du Mob.
*   **Effet en combat** : Détermine les dégâts de base infligés.
*   **Formule** : `Dégâts = Force + Aléatoire(0 à 5)`

### ⚡ Vitesse
*   **Description** : La rapidité d'action du Mob.
*   **Effet en combat** : Détermine la fréquence des attaques.
*   **Fonctionnement** : Chaque combattant possède une jauge d'énergie (0 à 100). À chaque "tick" du combat, l'énergie augmente de la valeur de la **Vitesse**. Le premier à atteindre 100 attaque.

### 💨 Agilité
*   **Description** : La capacité à esquiver les coups.
*   **Effet en combat** : Augmente les chances d'esquiver une attaque ennemie.
*   **Formule** : `Chance Esquive = 10% + (Agilité Défenseur - Agilité Attaquant) * 2%`
    *   *Minimum garanti* : 5% de chance d'esquive.

---

## 🌟 Traits (Capacités Spéciales)

Les traits sont des passifs obtenus à la naissance du Mob. Chaque Mob possède généralement 3 traits.

### ✅ Traits Implémentés

Ces capacités ont un effet actif en jeu actuellement.

#### 🪱 Appel de l'Astico-Roi
*   **Description** : Invoque un compagnon asticot pour mordre l'adversaire.
*   **Effet** : À chaque tour d'attaque, le Mob a **30% de chance** supplémentaire d'infliger une attaque bonus.
*   **Dégâts** : `5 à 10` points de dégâts (ignore l'armure/esquive).
*   **Note** : Une rumeur dit que même sans ce trait, il existe une infime chance (3%) que l'Astico-Roi réponde à l'appel...

#### 💥 Coup Critique (Passif Caché)
*   **Description** : Maîtrise l'art de frapper les points vitaux.
*   **Condition** : Obtenu via le trait "Coup Critique" (non standard) ou base.
*   **Effet** : Augmente les chances de coup critique.
*   **Statistiques** :
    *   **Avec le trait** : **33%** de chance de crit.
    *   **Sans le trait** : **10%** de chance de crit.
*   **Modificateur** : Un coup critique inflige **Dégâts x 2**.

---

### 🚧 Traits Disponibles (Effets Cosmétiques / En Développement)

Ces traits peuvent apparaître sur vos Mobs mais n'ont pas encore d'impact mécanique défini dans le moteur de combat actuel (v1.0).

#### 🏃 Sprint Final
*   **Description** : Une accélération soudaine lorsque la victoire est proche ou la défaite imminente ?
*   **Statut** : En attente d'implémentation.

#### 🛡️ Peau de Cuir
*   **Description** : Une résistance accrue aux coups.
*   **Statut** : En attente d'implémentation (devrait probablement réduire les dégâts reçus).

#### 🤺 Contre-attaque
*   **Description** : Riposter après avoir subi une attaque.
*   **Statut** : En attente d'implémentation.

#### 🧤 Main de Dentelle
*   **Description** : Une touche délicate... peut-être trop ?
*   **Statut** : En attente d'implémentation (Malus de dégâts ? Ou pillage amélioré ?).

#### 😡 Berzerk
*   **Description** : Une rage incontrôlable.
*   **Statut** : En attente d'implémentation (Probablement : Augmente les dégâts quand les PV sont bas).

---

## 📝 Notes pour les Éleveurs
*   Les stats sont générées aléatoirement entre **5 et 15** à la naissance.
*   Les traits sont choisis aléatoirement parmi la liste des traits disponibles.
