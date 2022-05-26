<script>
    import Wise from './Wise.svelte'

    export let wises;

    const wiseActions = {
        delete: (wise) => {
            let i = wises.indexOf(wise);
            wises.splice(i, 1);
            refresh();
        },
        refresh
    }

    let showHelp = false;

    $: current = wises.filter(x => !x.old);
    $: old = wises.filter(x => x.old);

    function add() {
        wises.push({
            id: crypto.randomUUID(),
            name: 'New wise', 
            pass: false,
            fail: false,
            fate: false,
            persona: false
        });

        refresh();
    }

    function refresh() {
        wises = wises;
    }

    $: {
        wises.forEach(wise => {
            if (!wise.id) wise.id = crypto.randomUUID();
        });
    }
</script>

<div class="container-fluid">
    <div class="card">
        <div class="card-body">
            <div class="btn-group position-topright">
                <button on:click={() => showHelp = true} class="btn badge btn-light border border-dark">?</button>
            </div>
            {#if current.length < 4}
            <div class="row">
                <div class="col-md-12">
                    <button on:click={add} class="btn btn-light border mb-1">Add wise</button>
                </div>
            </div>
            {/if}
            <div class="row">
                {#each current as wise (wise.id)}
                <Wise wise={wise} actions={wiseActions} />
                {/each}
            </div>
        </div>
    </div>
    {#if old.length > 0}
    <div class="card">
        <div class="card-body">
            <h4>Previous Wises</h4>
            <div class="d-flex flex-column">
                {#each old as wise (wise.id)}
                <Wise wise={wise} actions={wiseActions} />
                {/each}
            </div>
        </div>
    </div>
    {/if}
    <div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="wises" aria-hidden="true" class:show={showHelp} style:display={showHelp ? 'block' : 'none'}>
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Wises</h5>
                    <button on:click={() => showHelp = false} class="close" type="button" data-dismiss="modal">&cross;</button>
                </div>
                <div class="modal-body">
                    <p>Wises can be used to help others in place of a relevent skill. Doing so isolates the helping character from receiving conditions from the test.</p>
                    <p>Wises can be used to salvage a failed roll:</p>
                    <ul>
                        <li><strong>Deeper understanding</strong> Spend a point of fate to reroll a single failed die</li>
                        <li><strong>Of course!</strong> Spend a point of persona to reroll all failed dice</li>
                    </ul>
                    <p>
                        Once a wise has been used to help another in a failed and successful test, as well as <strong>deeper understanding</strong> 
                        and <strong>of course!</strong>, the wise may be replaced with another, or a test for advancement may be marked for a skill related
                        to the wise.
                    </p>
                </div>
            </div>
        </div> 
    </div>
</div>