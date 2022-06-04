<script>
    import { afterUpdate } from 'svelte'
    import TextArea from './TextArea.svelte'

    export let actions;
    export let spell;
    export let caster;

    const circles = [
        '1st Circle',
        '2nd Circle',
        '3rd Circle',
        '4th Circle',
        '5th Circle'
    ];
    
    let input;
    let editName = false;

    $: inventoryClass = spell.inventory ? 'btn-dark' : 'btn-light border';
    $: scrollClass = spell.scroll ? 'btn-dark' : 'btn-light border';
    $: memoryClass = spell.memorized ? 'btn-dark' : 'btn-light border';

    function circleClick(e) {
        spell.circle += e.shiftKey ? -1 : 1;
        if (spell.circle > 5) spell.circle = 1;
        else if (spell.circle < 1) spell.circle = 5;
        actions.refresh();
    }

    function setInventory() {
        spell.inventory = !spell.inventory; 
        actions.refresh();
    }

    function setMemory() {
        spell.memorized = !spell.memorized;
        actions.refresh();
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
                <input on:blur={() => editName = false} bind:this={input} class="flex-grow-1 form-control" bind:value={spell.name}>
                {:else}
                <h4 class="flex-grow-1">
                    <button on:click={() => editName = true} class="badge btn btn-light w-100 text-left">{spell.name}</button>
                </h4>
                {/if}
                <button on:click={() => actions.delete(spell)} class="badge btn btn-light">Delete</button>
            </div>
            <div class="d-flex mt-1 flex-wrap">
                <h5><button on:click={circleClick} class="badge btn btn-dark w-100 text-left">{circles[spell.circle - 1]}</button></h5>
                {#if caster == 'magician'}
                <div class="d-flex ml-auto">
                    <button on:click={setInventory} class="btn {inventoryClass} mr-1">Spellbook</button>
                    <button on:click={() => spell.scroll = !spell.scroll} class="btn {scrollClass} mr-1">Scroll</button>
                    <button on:click={setMemory} class="btn {memoryClass} mr-1">Memorized</button>
                </div>
                {:else if caster == 'theurge'}
                <button on:click={() => spell.inventory = !spell.inventory} class="btn {inventoryClass} ml-auto mr-1">Relic</button>
                {/if}
            </div>
            <div class="d-flex mt-1">
            </div>
            <div class="d-flex mt-1">
                <TextArea bind:conent={spell.description} />
            </div>
        </div>
    </div>
</div>