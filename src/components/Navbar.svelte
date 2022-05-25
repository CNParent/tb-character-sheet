<script>
	import character from "../models/character.js"
    import NavLink from "./NavLink.svelte"

    export let model = character();
    export let changeCharacter = () => 0;
    export let changeMod = () => 0;
    export let tab = 'bio';

    let isOpen = false;
    let navDisplay = 'none';
    let menu = '';

    function clearMenu(e) {
        if (e.relatedTarget?.className.includes('dropdown-item')) return;
        menu = '';
    }

    function setMenu(item) {
        menu = item;
    }

    function toggleNav() {
        navDisplay = navDisplay == 'none' ? 'block' : 'none';
    }

    let characters = [...new Array(window.localStorage.length)].map((x,i) => window.localStorage.key(i));
    characters.sort((a,b) => a.localeCompare(b));

    let saved = characters.find(x => x == model.bio.name) != null;
    if (saved) localStorage.setItem(model.bio.name, JSON.stringify(model));
</script>

<nav class="navbar navbar-expand-md navbar-light bg-light">
    <button class="navbar-toggler" type="button" on:click={() => toggleNav()}>
        <span class="navbar-toggler-icon"></span>
    </button>
    <div id="${this.id}_nav" class="collapse navbar-collapse" style:display={navDisplay}>
        <ul class="navbar-nav mr-auto">
            <NavLink bind:tab={tab} tabValue="abilities">Abilities</NavLink>
            <NavLink bind:tab={tab} tabValue="advancement">Advancement</NavLink>
            <NavLink bind:tab={tab} tabValue="bio">Bio</NavLink>
            <NavLink bind:tab={tab} tabValue="circles">Circles</NavLink>
            <NavLink bind:tab={tab} tabValue="inventory">Inventory</NavLink>
            <NavLink bind:tab={tab} tabValue="notes">Notes</NavLink>
            <NavLink bind:tab={tab} tabValue="skills">Skills</NavLink>
            <NavLink bind:tab={tab} tabValue="spells">Spells</NavLink>
            <NavLink bind:tab={tab} tabValue="traits">Traits</NavLink>
            <NavLink bind:tab={tab} tabValue="wises">Wises</NavLink>
            <li class="nav-item dropdown">
                <a href='#' class="nav-link dropdown-toggle" class:disabled={!characters.length} on:blur={clearMenu} on:click={() => setMenu('characters')}>Characters</a>
                <div class="dropdown-menu" style="{`display: ${menu == 'characters' ? 'block' : 'none'}`}">
                    {#each characters as character}
                        <button on:blur={clearMenu} on:click={() => changeCharacter(JSON.parse(localStorage[character]))} class="dropdown-item">{character}</button>
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
                    <button class="dropdown-item" on:blur={clearMenu}>Save</button>
                    <button class="dropdown-item" on:blur={clearMenu}>Export</button>
                    <button class="dropdown-item" on:blur={clearMenu}>Import</button>
                    <button class="dropdown-item" on:blur={clearMenu}>Delete</button>
                    <button class="dropdown-item" on:blur={clearMenu}>Delete all</button>
                </div>
            </div>
        </div>
    </div>
</nav>
{#if model.alert}
<div class="alert alert-static alert success btn text-center w-100">
    <strong>{model.alert}</strong>
</div>
{/if}
