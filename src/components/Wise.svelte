<script>
    import { afterUpdate } from 'svelte'

    export let actions;
    export let wise;

    let input;
    let editName = false;

    afterUpdate(() => {
        if (input) input.focus();
    })
</script>

{#if wise.old}
<div class="d-flex">
    {#if editName}
    <input on:blur={() => editName = false} class="form-control mb-1 mr-1" bind:value={wise.name} bind:this={input}>
    {:else}
    <button on:click={() => editName = true} class="btn btn-light border mb-1 mr-1 w-100 text-left">{wise.name}</button>
    {/if}
    <button on:click={() => actions.delete(wise)} class="btn btn-light border ml-auto mb-1">Delete</button>
</div>
{:else}
<div class="col-md-6">
    <div class="card">
        <div class="card-body">
            <div class="d-flex mb-1">
                {#if editName}
                <input on:blur={() => editName = false} class="form-control mb-1" bind:value={wise.name} bind:this={input}>
                {:else}
                <button on:click={() => editName = true} class="btn btn-light w-100 text-left font-weight-bold" style="min-height: 2.2em;">{wise.name}</button>
                {/if}
            </div>
            <div class="d-flex">
                <div class="btn-group">
                    <button on:click={() => wise.pass = !wise.pass} class="btn {wise.pass ? 'btn-dark' : 'btn-light'} border border-dark">Pass</button>
                    <button on:click={() => wise.fail = !wise.fail} class="btn {wise.fail ? 'btn-dark' : 'btn-light'} border border-dark">Fail</button>
                    <button on:click={() => wise.fate = !wise.fate} class="btn {wise.fate ? 'btn-dark' : 'btn-light'} border border-dark">Fate</button>
                    <button on:click={() => wise.persona = !wise.persona} class="btn {wise.persona ? 'btn-dark' : 'btn-light'} border border-dark">Persona</button>
                </div>
                <button on:click={() => { wise.old = true; actions.refresh(); }} class="btn btn-light border ml-auto">Forget</button>
            </div>
        </div>
    </div>
</div>
{/if}