<script>
    import container from '../models/container.js'
    import Container from './Container.svelte'

    export let inventory;

    let dragContainer;
    let dragItem;
    let selected;

    const actions = {
        delete: (container) => {
            if (!confirm(`Delete ${container.name} permanently?`)) return;

            let i = inventory.indexOf(container);
            inventory.splice(i, 1);
            inventory = inventory;
        },
        dragEnd: (container) => {
            if (container) {
                let i = dragContainer.items.indexOf(dragItem);
                dragContainer.items.splice(i, 1);
                container.items.push(dragItem);
            }
            dragItem = null;
            dragContainer = null;
            selected = null;
            inventory = inventory;
        },
        dragStart: (container, item) => {
            dragContainer = container;
            dragItem = item;
            inventory = inventory;
        },
        hide: (container) => {
            container.hide = true;
            inventory = inventory;
        },
        select: (container, item) => {
            dragContainer = container;
            selected = selected == item ? null : item;
            inventory = inventory;
        },
        selectEnd: (container) => {
            let i = dragContainer.items.indexOf(selected);
            dragContainer.items.splice(i, 1);
            container.items.push(selected);
            selected = null;
            dragContainer = null;
            inventory = inventory;
        }
    }

    function add() {
        let c = container({ name: 'new container',  size: 1, format: 'custom' });
        inventory.push(c);
        inventory = inventory;
    }

    $: {
        inventory.forEach(container => {
            if (!container.id) container.id = crypto.randomUUID();
        })
    }
</script>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12 my-1">
            <div class="card">
                <div class="card-header p-2">
                    <h5 class="m-0">Containers</h5>
                </div>
                <div class="card-body d-flex flex-column">
                    <button on:click={add} class="btn btn-light border">Add container</button>
                    <div>
                        {#each inventory as container}
                        {#if container.hide}
                        <button on:click={() => container.hide = false} class="btn btn-light border mt-1 mr-1">{container.name}</button>
                        {/if}
                        {/each}
                    </div>
                </div>
            </div>
        </div>
        {#each inventory as container (container.id)}
        {#if !container.hide}
        <Container container={container} dragItem={dragItem} actions={actions} selected={selected} />
        {/if}
        {/each}
    </div> 
</div>