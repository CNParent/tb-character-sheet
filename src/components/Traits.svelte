<script>
    import Trait from './Trait.svelte'

    export let traits;

    const traitActions = {
        delete: (trait) => {
            let i = traits.indexOf(trait);
            traits.splice(i, 1);
            traits = traits;
        }
    }

    let showHelp = false;

    function add() {
        traits.push({
            id: crypto.randomUUID(),
            name: 'New trait', 
            level: 1, 
            used: 0, 
            usedAgainst: false,
            checks: 0
        });

        traits = traits;
    }
    
    $: {
        traits.forEach(trait => {
            if (!trait.id) trait.id = crypto.randomUUID();
        });
    }
</script>

<div class="container-fluid">
    <div class="card">
        {#if !showHelp}
        <div class="card-body">
            <div class="btn-group position-topright">
                <button on:click={() => showHelp = true} class="btn badge btn-light border border-dark">?</button>
            </div>
            {#if traits.length < 4}
            <div class="row">
                <div class="col-md-12">
                    <button on:click={add} class="btn btn-light border mb-1">Add trait</button>
                </div>
            </div>
            {/if}
            <div class="row">
                {#each traits as trait (trait.id)}
                <Trait trait={trait} actions={traitActions} />
                {/each}
            </div>
        </div>
        {:else}
        <div class="card-header">
            <h5 class="card-title">Traits</h5>
            <button on:click={() => showHelp = false} class="close position-topright" type="button">&cross;</button>
        </div>
        <div class="card-body">
            <p>Traits grant bonuses by level:</p>
            <ul>
                <li>Level 1 traits grant +1D to a relevent test once per session</li>
                <li>Level 2 traits grant +1D to a relevent test twice per session</li>
                <li>Level 3 traits grant +1s to all relevent tests</li>
            </ul>
            <p>Each trait can be used once per session to generate up to two checks.</p>
            <ul>
                <li>One check is generated when used to apply a -1D penalty to an independent or versus test</li>
                <li>Two checks are generated when used to grant an opponent a +2D advantage in a versus test</li>
                <li>Two checks are generated when used to break a tie in an opponent's favor in a versus test</li>
            </ul>
        </div>
        {/if}
    </div>
</div>