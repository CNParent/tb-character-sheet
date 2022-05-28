<script>
    import { afterUpdate } from 'svelte';

    export let content = '';

    let active = false;
    let control;

    afterUpdate(() => {
        if (active) control.focus();
    });
</script>

{#if active}
<div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
    <span class="py-2 border-bottom font-weight-bold"><slot></slot></span>
    <textarea bind:this={control} class="flex-grow-1 form-control" bind:value={content} on:blur={() => active = false}></textarea>
</div>
{:else}
<div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
    <span class="py-2 border-bottom font-weight-bold"><slot></slot></span>
    <button class="btn btn-light text-left align-top wrap" style="min-height: 2.5em;" on:click={() => active = true}>{content}</button>
</div>
{/if}