const container = ({ name, size, format }) => {
    return {
        id: crypto.randomUUID(),
        name,
        size,
        format,
        items: []
    }
};

export default container