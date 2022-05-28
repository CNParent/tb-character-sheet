<script>
    import Bubbles from './Bubbles.svelte'

    export let item;
    export let actions;
    export let selected = false;

    const btnStyle = 'btn border border-dark align-self-start';

    let editing = false;

    $: size = item.stackSize ? item.size + 1 : item.size;

    function select() {
        actions.select(item);
    }

    function stackSize(n) {
        item.stackSize += n;
        if (item.stackSize < 0) item.stackSize = 0;
    }

    if (item.stackSize === undefined) {
        item.stackSize = 0;
        item.stack = 0;
    }
</script>

<div>
    {#if editing}
    <div class="btn bg-light mb-1 p-0 w-100 border">
        <div class="d-flex m-1">
            <input class="form-control flex-grow-1" style="min-width: 0px;" bind:value={item.text}>
            <button on:click={() => editing = false} class="{btnStyle} btn-light ml-1">Done</button>
        </div>
        <div class="d-flex m-1 align-items-center">
            <span class="{btnStyle} btn-dark">{item.size}</span>
            <span class="ml-1">Size</span>
            <div class="btn-group ml-auto">
                <button on:click={() => actions.resize(item, 1)} class="{btnStyle}">&uarr;</button>
                <button on:click={() => actions.resize(item, -1)} class="{btnStyle}">&darr;</button>
            </div>
        </div>
        <div class="d-flex m-1 align-items-center">
            <span class="{btnStyle} btn-dark">{item.stackSize}</span>
            <span class="ml-1">Uses</span>
            <div class="btn-group ml-auto">
                <button on:click={() => stackSize(1)} class="{btnStyle}">&uarr;</button>
                <button on:click={() => stackSize(-1)} class="{btnStyle}">&darr;</button>
            </div>
        </div>
        <div class="d-flex m-1 align-items-center">
            <div class="btn-group">
                <button on:click={() => actions.move(item, -1)} class="{btnStyle} btn-light">&uarr;</button>
                <button on:click={() => actions.move(item, 1)} class="{btnStyle} btn-light">&darr;</button>
            </div>
            <button on:click={() => actions.delete(item)} class="{btnStyle} btn-light ml-auto">Delete</button>
        </div>
    </div>
    {:else}
    <span class:m-2={selected} class="d-flex btn-group mb-1" style="min-height: {size * 2.5}em;">
        <span 
            on:dragstart={() => actions.dragStart(item)} 
            on:dragend={() => actions.dragEnd()} 
            on:click={select}
            tabindex="0"
            class="btn btn-light border border-dark flex-grow-0 align-items-center d-flex" 
            draggable="true" 
            title="Move">
            <span style="align-self: center;">⦀</span>
        </span>
        <span class="btn btn-light text-left border border-dark flex-grow-1">
            <span>{item.text}</span>
            {#if item.stackSize}
            <Bubbles count={item.stackSize} bind:value={item.stack}>Used</Bubbles>
            {/if}
        </span>
        <button on:click={() => editing = true} class="btn btn-light border border-dark flex-grow-0">{item.size}</button>
    </span>
    {/if}
</div>