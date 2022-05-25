<script>
    import Bubbles from './Bubbles.svelte'

    export let ability;

    $: maxFail = ability.rating < 2 ? 0 : ability.rating - 1;
    $: maxPass = ability.rating < 1 ? 1 : ability.rating;

    function handleClick(e) {
        ability.rating += e.shiftKey ? -1 : 1;
        if (ability.rating < 0) ability.rating = ability.cap;
        if (ability.rating > ability.cap) ability.rating = 0;
    }
</script>

<div class="card text-nowrap">
    <div class="card-body">
        <div class="d-flex">
            <h2 class="mr-auto">{ability.name}</h2>
            <h2><span on:click={handleClick} class="badge btn btn-dark">{ability.rating}</span></h2>
        </div>
        {#if ability.rating < ability.cap}
            <Bubbles count={maxPass} bind:value={ability.pass}>pass</Bubbles>
        {/if}
        {#if maxFail > 0 && ability.rating < ability.cap}
            <Bubbles count={maxFail} bind:value={ability.fail}>fail</Bubbles>
        {/if}
    </div>
</div>