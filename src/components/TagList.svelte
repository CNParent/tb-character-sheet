<script>
    import { afterUpdate } from 'svelte'

    export let items = [];

    let editing = false;
    let editIndex = -1;
    let input;

    function add() {
        items.push('');
        editIndex = items.length - 1;
        editing = true;
        items = items;
    }

    function end() {
        if (!items[editIndex])
            items.splice(editIndex, 1);
        
        editing = false;
        editIndex = -1;
        items = items;
    }

    afterUpdate(() => {
        if(input) input.focus(); 
    });
</script>

<div>
    <div class="d-flex flex-wrap">
        {#each items as item, i}
            {#if i == editIndex}
            <span class="btn badge badge-light border border-dark p-2 my-1 mr-1">{item}</span>
            {:else}
            <button on:click={() => { editing = true; editIndex = i; }} class="btn badge badge-dark p-2 my-1 mr-1">{item}</button>
            {/if}
        {/each}
        {#if !editing}
        <button on:click={add} class="btn badge badge-light border border-dark p-2 ml-0 mt-1 mb-1">add</button>
        {/if}
    </div>
    {#if editing}
    <input class="form-control" bind:this={input} bind:value={items[editIndex]} on:blur={end} />
    {/if}
</div>