const follower = () => {
    return {
        id: crypto.randomUUID(),
        name: 'New follower',
        conditions: 0,
        description: '',
        tags: []
    }
}

export default follower;