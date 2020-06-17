let abilities = () => {
    return {
        health: ability({ name: 'Health' }),
        will: ability({ name: 'Will' }),
        nature: nature(),
        resources: ability({ name: 'Resources' }),
        circles: ability({ name: 'Circles' }),
        might: 3,
        precedence: 0
    }
}