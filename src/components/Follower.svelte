<script>
    import { afterUpdate } from 'svelte'
    import TagList from './TagList.svelte'
    import TextArea from './TextArea.svelte'

    export let follower;
    export let actions;

    const max = 6;

    let collapse = true;
    let editName = false;
    let input;
    
    function handleClick(e) {
        follower.conditions += e.shiftKey ? -1 : 1;
        if (follower.conditions < 0) follower.conditions = max;
        if (follower.conditions > max) follower.conditions = 0;
    }

    afterUpdate(() => {
        if (input) input.focus();
    });
</script>

<div class="mb-2">
    <div class="d-flex">
        <button on:click={handleClick} class="btn btn-dark" title="Number of conditions">{follower.conditions}</button>
        {#if editName}
        <input class="form-control" on:blur={() => editName = false} bind:this={input} bind:value={follower.name}>
        {:else}
        <button on:click={() => editName = true} class="btn btn-light w-100 text-left font-weight-bold" style="min-height: 2.2em;">{follower.name}</button>
        {/if}
        {#if !collapse}
        <button on:click={() => collapse = true} class="badge btn btn-light border ml-1 p-2">hide</button>
        {:else}
        <button on:click={() => collapse = false} class="badge btn btn-light border ml-1 p-2">show</button>
        {/if}
        <div class="btn-group">
            <button on:click={() =>actions.move(follower, -1)} class="badge btn btn-light border ml-1 p-2">&uarr;</button>
            <button on:click={() =>actions.move(follower, 1)} class="badge btn btn-light border p-2">&darr;</button>
        </div>
    </div>
    {#if !collapse}
    <div class='card'>
        <div class='card-body p-2'>
            <div class="mb-1">
                <TagList items={follower.tags} />
            </div>
            <TextArea bind:content={follower.description} />
            <div class="mt-1">
                <button class="btn btn-dark" on:click={() => actions.delete(follower)}>Delete</button>
            </div>
        </div>
    </div>
    {/if}
</div>
