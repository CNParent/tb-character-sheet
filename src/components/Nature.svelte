<script>
    import Bubbles from './Bubbles.svelte'
    import TagList from './TagList.svelte'

    export let nature;

    const maxNature = 7;

    $: maxFail = nature.maximum < 2 ? 0 : nature.maximum - 1;
    $: maxPass = nature.maximum < 1 ? 1 : nature.maximum;

    function currentClick(e) {
        nature.current += e.shiftKey ? -1 : 1;
        if (nature.current > nature.maximum) nature.current = 0;
        else if (nature.current < 0) nature.current = nature.maximum;
    }

    function maxClick(e) {
        nature.maximum += e.shiftKey ? -1 : 1;
        if (nature.maximum > maxNature) nature.maximum = 0;
        else if (nature.maximum < 0) nature.maximum = maxNature;

        if (nature.current > nature.maximum) nature.current = nature.maximum;
    }
</script>

<div id="${this.id}" class="card text-nowrap">
    <div class="card-body">
        <div class="d-flex">
            <h2 class="mr-auto">Nature</h2>
            <h2><button on:click={currentClick} class="btn badge btn-dark">{nature.current}</button></h2>
            <h2><span class="m-1">/</span></h2>
            <h2><button on:click={maxClick} class="btn badge btn-dark">{nature.maximum}</button></h2>
        </div>
        {#if nature.maximum < maxNature}
        <div class="d-flex">
            <Bubbles count={maxPass} bind:value={nature.pass}>pass</Bubbles>
        </div>
        {/if}
        {#if maxFail > 0 && nature.maximum < maxNature}
        <div class="d-flex">
            <Bubbles count={maxFail} bind:value={nature.fail}>fail</Bubbles>
        </div>
        {/if}
        <div class="mt-2">
            <TagList bind:items={nature.descriptors} />
        </div>
    </div>
</div>