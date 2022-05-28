<script>
    import Ability from './Ability.svelte'
    import Nature from './Nature.svelte'

    export let model;

    function increment(e, args) {
        let val = model.abilities[args.ability] + (e.shiftKey ? -1 : 1);
        if (val < 0) val = args.max;
        if (val > args.max) val = 0;

        model.abilities[args.ability] = val;
    }
</script>

<div id="${this.id}" class="container-fluid">
    <div class="row">
        <div class="col-md-6">
            <Ability ability={model.abilities.will} />
            <Ability ability={model.abilities.health} />
            <Nature nature={model.abilities.nature} />
        </div>
        <div class="col-md-6">
            <Ability ability={model.abilities.resources} />
            <Ability ability={model.abilities.circles} />
            <div class="card">
                <div class="card-body d-flex">
                    <h2>Lifestyle</h2>
                    <h5 class="ml-2"><button on:click={() => model.abilities.lifestyle = 0} class="btn badge btn-light border align-self-center">reset</button></h5>
                    <h2 class="ml-auto"><button on:click={(e) => increment(e, { max: 99, ability: 'lifestyle' })} class="btn badge btn-dark">{model.abilities.lifestyle}</button></h2>
                </div>
            </div>
            <div class="card">
                <div class="card-body d-flex">
                    <h2 class="mr-auto">Might</h2>
                    <h2><button on:click={(e) => increment(e, { max: 8, ability: 'might' })} class="btn badge btn-dark">{model.abilities.might}</button></h2>
                </div>
            </div>
            <div class="card">
                <div class="card-body d-flex">
                    <h2 class="mr-auto">Precedence</h2>
                    <h2><button on:click={(e) => increment(e, { max: 7, ability: 'precedence' })} class="btn badge btn-dark">{model.abilities.precedence}</button></h2>
                </div>
            </div>
        </div>
    </div>
</div>