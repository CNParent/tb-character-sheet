let character = () => {
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