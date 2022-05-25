<script>
    import Bubbles from './Bubbles.svelte'

    export let item;
    export let editing;

    $: size = item.stackSize ? item.size + 1 : item.size;
</script>

<div>
    {#if editing}
    <div></div>
    {:else}
    <span class="d-flex btn-group mb-1 w-100" style="min-height: {size * 2.5}em;">
        <span class="btn btn-light text-left border border-dark flex-grow-1">
            <span>{item.text}</span>
            {#if item.stackSize}
            <Bubbles count={item.stackSize} bind:value={item.stack}>used</Bubbles>
            {/if}
        </span>
        <button class="btn btn-light border border-dark flex-grow-0">{item.size}</button>
    </span>
    {/if}
</div>