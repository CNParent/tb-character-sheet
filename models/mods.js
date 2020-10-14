let mods = {
    colonialMarines: () => {
        return {
            navbar: { tab: 'bio' },
            abilities: abilities(),
            advancement: advancement(),
            bio: bio(),
            circles: circles(),
            conditions: conditions(),
            inventory: [
                container({ name: 'Head', size: 1, format: 'static' }),
                container({ name: 'Neck', size: 1, format: 'static' }),
                container({ name: 'Hands (worn)', size: 2, format: 'static' }),
                container({ name: 'Hands (carried)', size: 2, format: 'static' }),
                container({ name: 'Feet', size: 1, format: 'static' }),
                container({ name: 'Torso', size: 3, format: 'static' }),
                container({ name: 'Belt', size: 3, format: 'static' }),
                container({ name: 'Pockets', size: 1, format: 'pockets' }),
                container({ name: 'Backpack', size: 6, format: 'pack' }),
                container({ name: 'Ground', size: 1, format: 'pockets' }),
                container({ name: 'Stash', size: 12, format: 'stash' })
            ],
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
                    skill({ name: 'Scavenger', bluck: 'Will', special: true }),
                    skill({ name: 'Scientist', bluck: 'Will', special: true }),
                    skill({ name: 'Scount', bluck: 'Will', special: true }),
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