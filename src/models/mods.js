import abilities from "./abilities.js"
import advancement from "./advancement.js"
import bio from "./bio.js"
import circles from "./circles"
import conditions from "./conditions.js"
import container from "./container.js"
import skill from "./skill.js"
import spells from "./spells.js"

const mods = {
    colonialMarines: () => {
        return {
            navbar: { tab: 'bio' },
            abilities: abilities(),
            advancement: advancement(),
            bio: bio(),
            circles: circles(),
            conditions: conditions(),
            inventory: [
                container({ name: 'Armament', size: 5, format: 'pockets' }),
                container({ name: 'Protection', size: 2, format: 'static' }),
                container({ name: 'Pack', size: 1, format: 'pockets' }),
                container({ name: 'Combat Webbing', size: 1, format: 'pockets' })
            ],
            mod: 'colonialMarines',
            notes: [],
            skills: {
                compact: false,
                skills: [
                    skill({ name: 'Admin', bluck: 'Will', special: true }),
                    skill({ name: 'Armorer', bluck: 'Health', special: true }),
                    skill({ name: 'Broker', bluck: 'Will', special: true }),
                    skill({ name: 'Criminal', bluck: 'Will', special: true }),
                    skill({ name: 'Executive', bluck: 'Will', special: true }),
                    skill({ name: 'Gunner', bluck: 'Health', special: true }),
                    skill({ name: 'Instructor', bluck: 'Health', special: true }),
                    skill({ name: 'Leader', bluck: 'Health', special: true }),
                    skill({ name: 'Manipulator', bluck: 'Will', special: true }),
                    skill({ name: 'Medic', bluck: 'Will', special: true }),
                    skill({ name: 'Operator', bluck: 'Health', special: true }),
                    skill({ name: 'Persuader', bluck: 'Will', special: true }),
                    skill({ name: 'Pilot', bluck: 'Health', special: true }),
                    skill({ name: 'Programmer', bluck: 'Will', special: true }),
                    skill({ name: 'Scavenger', bluck: 'Will', special: true }),
                    skill({ name: 'Scientist', bluck: 'Will', special: true }),
                    skill({ name: 'Scout', bluck: 'Will', special: true }),
                    skill({ name: 'Soldier', bluck: 'Health', special: false }),
                    skill({ name: 'Survivalist', bluck: 'Health', special: true }),
                    skill({ name: 'Technician', bluck: 'Health', special: true })
                ]
            },
            spells: spells(),
            traits: [],
            wises: []
        }
    },
    torchbearer: character
}

export default mods