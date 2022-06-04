<script>
    import { afterUpdate } from 'svelte';

    export let content = '';

    let active = false;
    let control;

    function resizeInput() {
        if (control) 
            control.style.height = `${control.scrollHeight + 2}px`;
    }

    afterUpdate(() => {
        if (active) control.focus();
    });
</script>

{#if active}
<span class="py-2 border-bottom font-weight-bold"><slot></slot></span>
<textarea 
    bind:this={control} 
    bind:value={content}
    on:blur={() => active = false}
    on:focus={resizeInput}
    on:keyup={resizeInput}
    class="flex-grow-1 form-control"></textarea>
{:else}
<span class="py-2 border-bottom font-weight-bold"><slot></slot></span>
<button class="btn btn-light text-left align-top wrap w-100" style="min-height: 2.5em;" on:click={() => active = true}>{content}</button>
{/if}