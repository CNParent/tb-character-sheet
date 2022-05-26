<script>
    import Spell from './Spell.svelte'

    export let spells;

    const selectedStyle = 'bg-dark text-light';
    const maxMemory = 9;
    const maxUrdr = 9;
    const spellActions = {
        delete: (spell) => {
            let i = spells.spells.indexOf(spell);
            spells.spells.splice(i, 1);
            refresh();
        },
        refresh
    }

    let menu = '';

    $: inventory = spells.spells.reduce((a,b) => a + (b.inventory ? b.circle : 0), 0);
    $: space = spells.memory - spells.spells.reduce((a,b) => a + (b.memorized ? b.circle : 0), 0);
    $: caster = spells.memory > 0 ? 'magician' : 'theurge';

    $: filters = () => {
        let list = [{ val: 'all', text: 'All' }];
        if (spells.memory > 0) {
            list = list.concat([
                { val: 'capacity', text: 'Can memorize' },
                { val: 'inventoryScroll', text: 'Inventory' },
                { val: 'memory', text: 'Memorized' },
                { val: 'scroll', text: 'Scrolls' },
                { val: 'inventory', text: 'Spellbook' }
            ]);
        } else if (spells.urdr > 0) {
            list = list.concat([
                { val: 'inventory', text: 'Relic' },
                { val: 'burden', text: 'Within burden' }
            ]);
        }

        return list;
    }

    $: filtered = spells.spells.filter(spell => {
        if(!spells.show || spells.show == 'all') return true;
        if(spells.show == 'burden') return spell.circle <= spells.urdr - spells.burden;
        if(spells.show == 'capacity') return space >= spell.circle || spell.memorized;
        if(spells.show == 'inventory') return spell.inventory;
        if(spells.show == 'inventory&scroll') return spell.inventory || spell.scroll;
        if(spells.show == 'memory') return spell.memorized;
        if(spells.show == 'scroll') return spell.scroll;
    });

    function add() {
        spells.spells.push({
            id: crypto.randomUUID(),
            name: '~new spell',
            circle: 1,
            memorized: false,
            inventory: false,
            scroll: false,
            description: 'Enter a description'
        });
        refresh();
    }

    function burdenClick(e) {
        spells.burden += e.shiftKey ? -1 : 1;
        if (spells.burden < 0) spells.burden = 0;
    }

    function burdenDownClick() {
        if (spells.burden > 0) spells.burden--;
    }

    function clearMenu(e) {
        if (e.relatedTarget?.className.includes('dropdown-item')) return;
        menu = '';
    }

    function memoryClick(e) {
        spells.memory += e.shiftKey ? -1 : 1;
        if (spells.memory < 0) spells.memory = maxMemory;
        else if (spells.memory > maxMemory) spells.memory = 0;
    }

    function refresh() {
        spells.spells = spells.spells;
        spells.spells.sort((a,b) => {
            if(a.circle == b.circle) return a.name.localeCompare(b.name);
            return a.circle - b.circle;
        });
    }

    function urdrClick(e) {
        spells.urdr += e.shiftKey ? -1 : 1;
        if (spells.urdr < 0) spells.urdr = maxUrdr;
        else if (spells.urdr > maxUrdr) spells.urdr = 0;
    }

    spells.spells.forEach(spell => {
        if (!spell.id) spell.id = crypto.randomUUID();
    });
</script>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        {#if spells.urdr == 0}
                        <div class="d-flex col-md-6">
                            <h3><span class="align-self-center font-weight-bold mr-1">Memory palace</span></h3>
                            <span class:bg-danger={space < 0} class="align-self-center btn badge-light border ml-auto">{space}</span>
                            <span class="align-self-center mx-1">/</span>
                            <button on:click={memoryClick} class="align-self-center btn btn-dark">{spells.memory}</button>
                        </div>
                        {/if}
                        {#if spells.urdr > 0}
                        <div class="d-flex col-md-6">
                            <h3 style="width: 5em;"><span class="align-self-center font-weight-bold">Burden</span></h3>
                            <button on:click={burdenDownClick} class="align-self-center btn btn-light border border-dark ml-auto">&darr;</button>
                            <button on:click={burdenClick} class:bg-danger={spells.burden > spells.urdr} class="align-self-center btn btn-dark">{spells.burden}</button>
                        </div>
                        {/if}
                        {#if spells.memory == 0}
                        <div class="d-flex col-md-6">
                            <h3><span class="align-self-center font-weight-bold">Urdr</span></h3>
                            <button on:click={urdrClick} class="align-self-center btn btn-dark ml-auto">{spells.urdr}</button>
                        </div>
                        {/if}
                        {#if spells.memory > 0}
                        <div class="d-flex col-md-6">
                            <h3><span class="align-self-center font-weight-bold">In Spellbook</span></h3>
                            <span class="align-self-center btn badge-light border ml-auto">{inventory}</span>
                        </div>
                        {/if}
                    </div>
                    <div class="d-flex mt-2">
                        <div class="dropdown">
                            <button on:blur={clearMenu} on:click={() => menu = 'filters'} class="dropdown-toggle btn btn-light border mb-1 mr-1">Show</button>
                            <div class="dropdown-menu" style:display={menu == 'filters' ? 'block' : 'none'}>
                                {#each filters() as f}
                                <button 
                                    on:blur={clearMenu} 
                                    on:click={() => spells.show = f.val} 
                                    class="dropdown-item {spells.show == f.val ? selectedStyle : ''}">
                                    {f.text}
                                </button>
                                {/each}
                            </div>
                        </div>
                        <button on:click={add} class="btn btn-light border mb-1 mr-1">Add spell</button>
                    </div>
                    <div class="row mt-2">
                        {#each filtered as spell (spell.id)}
                        <Spell spell={spell} caster={caster} actions={spellActions} />
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
