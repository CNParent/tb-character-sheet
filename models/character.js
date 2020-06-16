let character = () => {
    return {
        navbar: { tab: 'bio' },
        bio: bio(),
        circles: circles(),
        conditions: {},
        abilities: {},
        advancement: advancement(),
        skills: skills(),
        traits: traits(),
        wises: wises()
    };
}