<script>
    import character from "../models/character.js"
    import Condition from "./Condition.svelte"

    export let model = character();

    let shown = true;
    let showHelp = false;

    const help = [
        { title: 'Fresh' , text: '+1D to all tests (except circles and resources) until other condition.' },
        { title: 'Hungry and Thirsty', text: '-1 disposition to any conflict.' },
        { title: 'Angry (Ob 2 Will)', text: "Can't use wises or beneficial traits." },
        { title: 'Afraid (Ob 3 Will)', text: "Can't help or use Beginner's Luck." },
        { title: 'Exhausted (Ob 3 Health)', text: '-1 disposition to any conflict. Instinct takes a turn and carries a -1s penalty.' },
        { title: 'Injured (Ob 4 Health)', text: '-1D to skills, Nature, Will, and Health (but not recovery).' },
        { title: 'Sick (Ob 3 Will)', text: "-1D to skills, Nature, Will, and Health (but not recovery). Can't practice, learn, or advance." },
        { title: 'Dead', text: "May not use wises, test, or help." }
    ];
</script>

{#if shown}
<div class="container-fluid">
    <div class="card">
        {#if !showHelp}
        <div class="card-body d-flex flex-wrap">
            <Condition bind:selected={model.conditions.fresh}>Fresh</Condition>
            <Condition bind:selected={model.conditions.hungry}>Hungry and Thirsty</Condition>
            <Condition bind:selected={model.conditions.angry}>Angry</Condition>
            <Condition bind:selected={model.conditions.afraid}>Afraid</Condition>
            <Condition bind:selected={model.conditions.exhausted}>Exhausted</Condition>
            <Condition bind:selected={model.conditions.injured}>Injured</Condition>
            <Condition bind:selected={model.conditions.sick}>Sick</Condition>
            <Condition bind:selected={model.conditions.dead}>Dead</Condition>
        </div>
        <div class="btn-group position-topright">
            <button class="btn badge btn-light border border-dark" on:click={() => showHelp = true}>?</button>
            <button class="btn badge btn-light border border-dark" on:click={() => shown = false}>&cross;</button>
        </div>
        {:else}
        <div class="card-header">
            <h5 class="card-title">Conditions</h5>
            <button type="button" class="close position-topright" on:click={() => showHelp = false}>
                <span aria-hidden="true">&cross;</span>
            </button>
        </div>
        <div class="card-body">
            {#each help as x}
                <h5>{x.title}</h5>
                <p>{x.text}</p>
            {/each}
        </div>
        {/if}
    </div>
</div>
{:else}
<div class="container-fluid">
    <button class="btn btn-light border col" on:click={() => shown = true}>
        Conditions
    </button>
</div>
{/if}
