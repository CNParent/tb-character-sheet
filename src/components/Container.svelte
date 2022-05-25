<script>
    import { afterUpdate } from 'svelte'
    import Item from './Item.svelte'

    export let container;
    export let clipboard;
    export let actions;

    const smallButton = 'badge btn btn-light border border-dark align-self-center p-2';
    const canAdd = ['custom', 'pockets'].includes(container.format);

    let editName = false;
    let input;
    $: occupied = container.items.reduce((a,b) => a + b.size, 0);
    $: space = canAdd ? 1 : container.size - occupied;
    $: canTransfer = clipboard == null || canAdd || clipboard.size <= space;

    afterUpdate(() => {
        if (input) input.focus();
    });
</script>

<div class="col-lg-3 col-md-4 col-sm-6 my-1">
    <div class="card">
        <div class="card-header p-2 d-flex">
            {#if container.format == 'pack'}
            <h4 class="flex-grow-1 m-0">
                <button class="badge btn btn-light text-left card-title w-100 mb-0">{container.name}</button>
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
            {#if container.format == 'custom'}
            <h5 class="ml-auto mr-1">
                <span class="badge btn btn-light">{occupied}</span>
            </h5>
            {:else}
            <h5 class="ml-auto mr-1">
                <span class="badge btn btn-light">{occupied} / {container.size}</span>
            </h5>
            {/if}
            <div class="ml-1 btn-group">
                <span on:click={() => actions.hide(container)} class="{smallButton}">hide</span>
                <span class="{smallButton}">a &rarr; z</span>
            </div>
        </div>
        <div class="card-body">
            <div class="d-flex flex-column">
                {#each container.items as item}
                <Item item={item}/>
                {/each}
                <button disabled={!canTransfer} class="btn border mb-1 {canTransfer ? 'btn-light' : 'disabled btn-secondary'}" style="height: {2.5 * space}em;"></button>
            </div>
            {#if container.format == 'custom'}
            <div class="d-flex">
                <button on:click={() => actions.delete(container)} class="btn btn-light border ml-auto">Delete</button>
            </div>
            {/if}
        </div>
    </div>
</div>