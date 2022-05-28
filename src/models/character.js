import abilities from "./abilities.js"
import advancement from "./advancement.js"
import bio from "./bio.js"
import circles from "./circles.js"
import conditions from "./conditions.js"
import inventory from "./inventory.js"
import skills from "./skills.js"
import spells from "./spells.js"

const character = () => {
    return {
        navbar: { tab: 'bio' },
        abilities: abilities(),
        advancement: advancement(),
        bio: bio(),
        circles: circles(),
        conditions: conditions(),
        inventory: inventory(),
        mod: 'torchbearer',
        notes: [],
        skills: skills(),
        spells: spells(),
        traits: [],
        wises: []
    };
}

export default character