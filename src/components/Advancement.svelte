<script>
    import TagList from './TagList.svelte'

    export let model;

    let showHelp = false;

    const levels = [
        { level: 1, fate: 0, persona: 0 },
        { level: 2, fate: 3, persona: 3 },
        { level: 3, fate: 7, persona: 6 },
        { level: 4, fate: 14, persona: 12 },
        { level: 5, fate: 22, persona: 20 },
        { level: 6, fate: 31, persona: 30 },
        { level: 7, fate: 41, persona: 42 },
        { level: 8, fate: 52, persona: 56 },
        { level: 9, fate: 64, persona: 72 },
        { level: 10, fate: 78, persona: 98 }
    ];

    function change(property, val) {
        model.advancement[property] += val;
        if (model.advancement[property] < 0) model.advancement[property] = 0;
    }

    function spend(artha) {
        if (model.advancement[`current${artha}`] == 0) return;

        model.advancement[`current${artha}`]--;
        model.advancement[`spent${artha}`]++;
    }

    function unspend(artha) {
        if (model.advancement[`spent${artha}`] == 0) return;

        model.advancement[`current${artha}`]++;
        model.advancement[`spent${artha}`]--;
    }
</script>

<div id="${this.id}" class="container-fluid text-nowrap">
    <div class="row">
        {#each ['Fate', 'Persona'] as artha}
        <div class="col-md-6">
            <div class="card">
                <div class="card-body">
                    <h2 class="card-subtitle mb-1">{artha}</h2>
                    <div class="d-flex">
                        <div class="btn-group align-self-center mr-1">
                            <button on:click={() => change(`current${artha}`, 1)} class="btn btn-dark" >{model.advancement[`current${artha}`]}</button>
                            <button on:click={() => change(`current${artha}`, -1)} class="btn btn-light border border-dark">&darr;</button>
                        </div>
                        <div class="btn-group align-self-center">
                            <button on:click={() => spend(artha)} class="btn btn-dark">{model.advancement[`spent${artha}`]} spent</button>
                            <button on:click={() => unspend(artha)} class="btn btn-light border border-dark">&larr;</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {/each}
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <h2 class="mr-auto">Level Benefits</h2>
                    <TagList items={model.advancement.levelBenefits} />
                    <button on:click={() => showHelp = true} class="position-topright btn badge btn-light border border-dark">?</button>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" class:show={showHelp} tabindex="-1" role="dialog" aria-labelledby="levelRequirements" aria-hidden="true" style:display={showHelp ? 'block' : 'none'}>
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="levelRequirementsTitle">Level Requirements</h5>
                    <button on:click={() => showHelp = false} type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&cross;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th>Fate</th>
                                <th>Persona</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each levels as level}
                            <tr>
                                <td>{level.level}</td>
                                <td>{level.fate}</td>
                                <td>{level.persona}</td>
                            </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>