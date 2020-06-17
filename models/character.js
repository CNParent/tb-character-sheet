let character = () => {
    return {
        navbar: { tab: 'bio' },
        bio: bio(),
        circles: circles(),
        conditions: conditions(),
        abilities: abilities(),
        advancement: advancement(),
        skills: skills(),
        traits: traits(),
        wises: wises()
    };
}