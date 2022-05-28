<script>
    import { afterUpdate } from 'svelte'

    export let items = [];

    let input;
    let editIndex = -1;

    function add() {
        items.push('');
        items = items;
        editIndex = items.length - 1;
    }

    function endEdit() {
        if (!items[editIndex])
            items.splice(editIndex, 1);

        editIndex = -1;
    }

    afterUpdate(() => {
        if (input) input.focus();
    })
</script>

<div class="card">
    <div class="card-body">
        <div class="d-flex flex-column">
            <h2><slot></slot></h2>
            {#each items as item, i}
            {#if editIndex == i}
            <input on:blur={endEdit} class="form-control my-1" bind:value={item} bind:this={input}>
            {:else}
            <button on:click={() => editIndex = i} class="btn btn-light border-bottom text-left">{item}</button>
            {/if}
            {/each}
        </div>
        <div class="btn-group">
            <button on:click={add} class="btn btn-light border my-1">Add</button>
            <button on:click={() => { items.sort(); items = items; }} class="btn btn-light border my-1">a &rarr; z</button>
        </div>
    </div>
</div>