<script>
    import { afterUpdate, onDestroy } from 'svelte'

	import character from "../models/character.js"
    import NavLink from "./NavLink.svelte"
    import actions from '../actions/characterActions.js'

    export let model = character();
    export let tab = 'bio';

    const autosaveInterval = 10000; // 10s

    let navDisplay = 'none';
    let menu = '';
    let characters = [];
    let alert;
    let dismiss;

    function changeCharacter(character) {
        let result = actions.load(model, character)
        model = result.model;
        alert = result.alert;
        toggleNav();
    }

    function changeMod(mod) {
        let result = actions.loadMod(model, mod);
        model = result.model;
        alert = result.alert;
        toggleNav();
    }

    function clearMenu(e) {
        if (e.relatedTarget?.className.includes('dropdown-item')) return;
        menu = '';
    }

    function deleteClick() {
        alert = actions.delete(model);
        loadCharacterList();
        toggleNav();
    }

    function deleteAllClick() {
        alert = actions.deleteAll()
        loadCharacterList();
        toggleNav();
    }

    function exportClick() {
        actions.export(model);
        toggleNav();
    }

    function loadCharacterList() {
        characters = actions.loadList();
    }

    function saveClick() {
        alert = actions.save(model)
        characters = actions.loadList();
        toggleNav();
    }

    function setMenu(item) {
        menu = item;
    }

    function toggleNav() {
        navDisplay = navDisplay == 'none' ? 'block' : 'none';
    }

    function importClick() {
        actions.import((msg) => {
            alert = { success: msg };
            characters = actions.loadList();
        });

        toggleNav();
    }

    loadCharacterList();

    let autoSave = window.setInterval(() => {
        console.log(`Autosave (${model.bio.name})`);
        let saved = characters.find(x => x == model.bio.name) != null;
        if (saved) actions.save(model);
    }, autosaveInterval);

    afterUpdate(() => {
        if (dismiss) dismiss.focus();
    });

    onDestroy(() => {
        clearInterval(autoSave);
    });
</script>

<nav class="navbar navbar-expand-md navbar-light bg-light">
    <button class="navbar-toggler" type="button" on:click={toggleNav}>
        <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" style:display={navDisplay}>
        <ul class="navbar-nav mr-auto">
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="abilities">Abilities</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="advancement">Advancement</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="bio">Bio</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="circles">Circles</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="inventory">Inventory</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="notes">Notes</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="skills">Skills</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="spells">Spells</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="traits">Traits</NavLink>
            <NavLink on:setTab={toggleNav} bind:tab={tab} tabValue="wises">Wises</NavLink>
            <li class="nav-item dropdown">
                <a href='#' class="nav-link dropdown-toggle" class:disabled={!characters.length} on:blur={clearMenu} on:click={() => setMenu('characters')}>Characters</a>
                <div class="dropdown-menu" style="{`display: ${menu == 'characters' ? 'block' : 'none'}`}">
                    {#each characters as character}
                        <button on:blur={clearMenu} on:click={() => changeCharacter(character)} class="dropdown-item">{character}</button>
                    {/each}
                </div>
            </li>
            <li class="nav-item dropdown">
                <a href='#' class="nav-link dropdown-toggle" on:blur={clearMenu} on:click={() => setMenu('mods')}>Mods</a>
                <div class="dropdown-menu" style="{`display: ${menu == 'mods' ? 'block' : 'none'}`}">
                    <button on:blur={clearMenu} on:click={() => changeMod('colonialMarines')} class="dropdown-item">Colonial Marines</button>
                    <button on:blur={clearMenu} on:click={() => changeMod('torchbearer')} class="dropdown-item">Torchbearer</button>                                
                </div>
            </li>
        </ul>
        <div class="navbar-nav">
            <div class="nav-item dropdown">
                <button href='#' class="dropdown-toggle btn btn-light border border-dark" on:blur={clearMenu} on:click={() => setMenu('options')}>Options</button>
                <div class="dropdown-menu" style="{`display: ${menu == 'options' ? 'block' : 'none'}`}">
                    <button class="dropdown-item" on:click={saveClick} on:blur={clearMenu}>Save</button>
                    <button class="dropdown-item" on:click={exportClick} on:blur={clearMenu}>Export</button>
                    <button class="dropdown-item" on:click={importClick} on:blur={clearMenu}>Import</button>
                    <button class="dropdown-item" on:click={deleteClick} on:blur={clearMenu}>Delete</button>
                    <button class="dropdown-item" on:click={deleteAllClick} on:blur={clearMenu}>Delete all</button>
                </div>
            </div>
        </div>
    </div>
</nav>
{#if alert?.success}
<button bind:this={dismiss} on:blur={() => alert = null} on:click={() => alert = null} class="alert alert-static alert-success btn text-center w-100">
    <strong>{alert.success}</strong>
</button>
{:else if alert?.error}
<button bind:this={dismiss} on:blur={() => alert = null} on:click={() => alert = null} class="alert alert-static alert-danger btn text-center w-100">
    <strong>{alert.error}</strong>
</button>
{/if}
