let abilities = () => {
    return {
        health: ability({ name: 'Health', cap: 7 }),
        will: ability({ name: 'Will', cap: 7 }),
        nature: nature(),
        resources: ability({ name: 'Resources', cap: 10 }),
        circles: ability({ name: 'Circles', cap: 10 }),
        might: 3,
        precedence: 0
    }
}