<script>
    import container from '../models/container.js'
    import Container from './Container.svelte'

    export let inventory;

    let dragContainer;
    let dragItem;

    const actions = {
        delete: (container) => {
            if (!confirm(`Delete ${container.name} permanently?`)) return;

            let i = inventory.indexOf(container);
            inventory.splice(i, 1);
            inventory = inventory;
        },
        dragEnd: (container) => {
            let i = dragContainer.items.indexOf(dragItem);
            dragContainer.items.splice(i, 1);
            container.items.push(dragItem);
            dragItem = null;
            dragContainer = null;
            inventory = inventory;
        },
        dragStart: (container, item) => {
            dragContainer = container;
            dragItem = item;
            inventory = inventory;
        },
        hide: (container) => {
            container.hidden = true;
            inventory = inventory;
        }
    }

    function add() {
        let c = container({ name: 'new container',  size: 1, format: 'custom' });
        inventory.push(c);
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
                        {#if container.hidden}
                        <button on:click={() => container.hidden = false} class="btn btn-light border mt-1 mr-1">{container.name}</button>
                        {/if}
                        {/each}
                    </div>
                </div>
            </div>
        </div>
        {#each inventory as container}
        {#if !container.hidden}
        <Container container={container} dragItem={dragItem} actions={actions} />
        {/if}
        {/each}
    </div> 
</div>