import container from "./container"

const inventory = () => [
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
];

export default inventory