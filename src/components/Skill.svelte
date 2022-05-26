<script>
    import { afterUpdate } from 'svelte'
    import Bubbles from './Bubbles.svelte'

    export let actions;
    export let skill;
    export let bluckTries;
    export let lockspecial;

    let editName = false;
    let input;

    $: showPass = skill.rating >= 1 && skill.rating < skill.cap;
    $: showFail = skill.rating >= 2 && skill.rating < skill.cap;
    $: showLuck = skill.rating == 0;

    function setSpecial() {
        if (!lockspecial) {
            actions.setSpecial(skill);
        }
    }

    function ratingClick(e) {
        skill.rating += e.shiftKey ? -1 : 1;
        if (skill.rating < 0) skill.rating = skill.cap;
        else if (skill.rating > skill.cap) skill.rating = 0;
    }

    function toggleBluck() {
        skill.bluck = skill.bluck == 'Health' ? 'Will' : 'Health';
    }

    afterUpdate(() => {
        if (input) input.focus();
    });
</script>

<div class="col-lg-4 col-md-6">
    <div class="card">
        <div class="card-body pt-1">
            <div class="d-flex flex-row-reverse">
                {#if skill.readonly}
                <span class="badge badge-light border border-dark">{skill.bluck}</span>
                {:else}
                <button on:click={toggleBluck} class="badge btn badge-dark">{skill.bluck}</button>
                {/if}
            </div>
            <div class="d-flex">
                {#if editName}
                <input on:blur={() => editName = false} bind:this={input} bind:value={skill.name} class="form-control mb-1 mr-1">
                {:else}
                <h4 class="flex-grow-1">
                    {#if skill.special}
                    <button on:click={setSpecial} class="badge btn btn-light w-100 text-left">
                        {#if skill.specialty}
                        <u>{skill.name}</u>
                        {:else}
                        {skill.name}
                        {/if}
                    </button>
                    {:else if !skill.readonly}
                    <button on:click={() => editName = true} class="badge btn btn-light w-100 text-left">{skill.name}</button>
                    {:else}
                    <span class="badge w-100 text-left">{skill.name}</span>
                    {/if}
                </h4>
                {/if}
                <h4><button on:click={ratingClick} class="badge btn btn-dark">{skill.rating}</button></h4>
            </div>
            {#if showPass}
            <div class="d-flex">
                <Bubbles bind:value={skill.pass} count={skill.rating}>Pass</Bubbles>
            </div>
            {/if}
            {#if showFail}
            <div class="d-flex">
                <Bubbles bind:value={skill.fail} count={skill.rating - 1}>Fail</Bubbles>
            </div>
            {/if}
            {#if showLuck}
            <div class="d-flex">
                <Bubbles bind:value={skill.pass} count={bluckTries}>BL</Bubbles>
            </div>
            {/if}
        </div>
    </div>
</div>