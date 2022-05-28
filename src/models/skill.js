const skill = ({ name = '', bluck = 'Health', readonly = true, special = false }) => {
    return {
        id: crypto.randomUUID(),
        name,
        bluck,
        readonly,
        special,
        cap: 7,
        rating: 0,
        pass: 0,
        fail: 0
    };
}

export default skill