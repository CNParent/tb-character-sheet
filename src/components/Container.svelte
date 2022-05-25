<script>
    import { afterUpdate } from 'svelte'
    import Item from './Item.svelte'

    export let container;
    export let clipboard;
    export let actions;

    const smallButton = 'badge btn btn-light border border-dark align-self-center p-2';
    const canAdd = ['custom', 'pockets'].includes(container.format);

    const itemActions = {
        delete: (item) => {
            let i = container.items.indexOf(item);
            container.items.splice(i, 1);
            container.items = container.items;
        },
        move: (item, n) => {
            let index = container.items.indexOf(item);
            container.items.splice(index, 1);

            index += n;
            if (index < 0) index = container.items.length;
            else if (index > container.items.length) index = 0;

            container.items.splice(index, 0, item);
            container.items = container.items;
        },
        resize: (item, n) => {
            console.log('resize(' + item + ', ' + n + ')');
            item.size += n;
            if (space - n < 0) item.size -= n;
            if (item.size == 0) item.size = 1;
            container.items = container.items;
        }
    };
    
    let editName = false;
    let input;
    $: occupied = container.items.reduce((a,b) => a + b.size, 0);
    $: space = canAdd ? 1 : container.size - occupied;
    $: canTransfer = clipboard != null && (canAdd || clipboard.size <= space);
    $: disableAdd = (clipboard == null && space == 0) && !canTransfer;

    function add() {
        if (space == 0) return;

        container.items.push({ text: '', size: 1, id: crypto.randomUUID() });
        container.items = container.items;
    }

    function togglePack() {
        if (container.size == 6 && occupied <= 3) {
            container.size = 3;
            container.name = 'Satchel';
        } else {
            container.size = 6;
            container.name = 'Backpack';
        }
    }

    container.items.forEach(x => {
        if(!x.id) x.id = crypto.randomUUID();
    });

    afterUpdate(() => {
        if (input) input.focus();
    });
</script>

<div class="col-lg-3 col-md-4 col-sm-6 my-1">
    <div class="card">
        <div class="card-header p-2 d-flex">
            {#if container.format == 'pack'}
            <h4 class="flex-grow-1 m-0">
                <button on:click={togglePack} class="badge btn btn-light text-left card-title w-100 mb-0">{container.name}</button>
            </h4>
            {:else if container.format == 'custom' && editName}
            <input bind:this={input} class="form-control mr-2" bind:value={container.name}>
            {:else if container.format == 'custom'}
            <h4 class="flex-grow-1 m-0">
                <button class="badge btn btn-light text-left card-title w-100 mb-0">{container.name}</button>
            </h4>
            {:else}
            <h5 class="m-0">
                <span class="card-title mb-0">{container.name}</span>
            </h5>
            {/if}
            {#if canAdd}
            <h5 class="ml-auto mr-1">
                <span class="badge btn btn-light">{occupied}</span>
            </h5>
            {:else}
            <h5 class="ml-auto mr-1">
                <span class="badge btn btn-light">{occupied} / {container.size}</span>
            </h5>
            {/if}
            <div class="ml-1 btn-group">
                <button on:click={() => actions.hide(container)} class="{smallButton}">hide</button>
                <button class="{smallButton}">a &rarr; z</button>
            </div>
        </div>
        <div class="card-body">
            <div class="d-flex flex-column">
                {#each container.items as item (item.id)}
                <Item bind:item={item} actions={itemActions} />
                {/each}
                {#if space > 0}
                <button on:click={add} disabled={disableAdd} class="btn border mb-1 {disableAdd ? 'disabled btn-secondary' : 'btn-light'}" style="height: {2.5 * space}em;"></button>
                {/if}
            </div>
            {#if container.format == 'custom'}
            <div class="d-flex">
                <button on:click={() => actions.delete(container)} class="btn btn-light border ml-auto">Delete</button>
            </div>
            {/if}
        </div>
    </div>
</div>