let skill = ({ name = '', bluck = 'H', readonly = false }) => {
    return {
        name,
        bluck,
        readonly,
        rating: 0,
        pass: 0,
        fail: 0
    };
}