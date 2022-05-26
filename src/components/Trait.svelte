<script>
    import { afterUpdate } from 'svelte'

    export let actions;
    export let trait;

    const maxLevel = 3;

    let editName = false;
    let input;

    function levelClick(e) {
        trait.level += e.shiftKey ? -1 : 1;
        if (trait.level > maxLevel) trait.level = 1;
        else if (trait.level < 1) trait.level = maxLevel;
    }

    function setChecks(n) {
        if (trait.checks == n) trait.checks--;
        else trait.checks = n;
    }

    function setUsed(n) {
        if (trait.used == n) trait.used--;
        else trait.used = n;
    }

    afterUpdate(() => {
        if (input) input.focus();
    });
</script>

<div class="col-md-6">
    <div class="card">
        <div class="card-body">
            <div class="d-flex">
                {#if editName}
                <input on:blur={() => editName = false} class="form-control mb-1 mr-1" bind:value={trait.name} bind:this={input}>
                {:else}
                <h2 class="flex-grow-1">
                    <button on:click={() => editName = true} class="badge btn btn-light w-100 text-left">{trait.name}</button>
                </h2>
                {/if}
                <h2 class="ml-auto"><button on:click={levelClick} class="badge btn btn-dark mr-1">{trait.level}</button></h2>
            </div>
            <div class="d-flex">
                <div class="btn-group">
                    {#if trait.level < 3}
                    <button on:click={() => setUsed(1)} class="border border-dark btn {trait.used >= 1 ? 'btn-dark' : 'btn-light'}">+1D</button>
                    {/if}
                    {#if trait.level == 2}
                    <button on:click={() => setUsed(2)} class="border border-dark btn {trait.used >= 2 ? 'btn-dark' : 'btn-light'}">+1D</button>
                    {/if}
                </div>
                <div class="btn-group ml-1">
                    <button on:click={() => setChecks(1)} class="border border-dark btn {trait.checks >= 1 ? 'btn-dark' : 'btn-light'}">&check;</button>
                    <button on:click={() => setChecks(2)} class="border border-dark btn {trait.checks >= 2 ? 'btn-dark' : 'btn-light'}">&check;</button>
                    <button on:click={() => trait.usedAgainst = !trait.usedAgainst} class="btn {trait.usedAgainst ? 'btn-dark' : 'btn-light'} border border-dark">Used</button>
                </div>
                <button on:click={() => actions.delete(trait)} class="btn btn-light border border-dark ml-auto">Delete</button>
            </div>
        </div>
    </div>
</div>