<script>
	import character from "./models/character.js"

	import Abilities from './components/Abilities.svelte'
	import Advancement from './components/Advancement.svelte'
	import Bio from "./components/Bio.svelte"
	import Circles from './components/Circles.svelte'
	import Conditions from "./components/Conditions.svelte"
	import Inventory from './components/Inventory.svelte'
	import Navbar from "./components/Navbar.svelte"
	import Notes from './components/Notes.svelte'
	import Skills from './components/Skills.svelte'
	import Spells from './components/Spells.svelte'
	import Traits from './components/Traits.svelte'
	import Wises from './components/Wises.svelte'

	import { theme } from './lib/styles.js'

	let model = character();
	let tab = 'bio';
</script>

<svelte:head>
	{#if theme == 'dark'}
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vinorodrigues/bootstrap-dark@0.6.1/dist/bootstrap-dark.min.css">
	{:else}
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css" integrity="sha384-zCbKRCUGaJDkqS1kPbPd7TveP5iyJE0EjAuZQTgFLD2ylzuqKfdKlfG/eSrtxUkn" crossorigin="anonymous">
	{/if}
</svelte:head>

<main id="app">
	<Navbar bind:model={model} bind:tab={tab} />
	<Conditions model={model} />
	{#if tab == 'abilities'}
	<Abilities model={model} />
	{:else if tab == 'advancement'}
	<Advancement model={model} />
	{:else if tab == 'bio'}
	<Bio model={model} />
	{:else if tab == 'circles'}
	<Circles circles={model.circles} />
	{:else if tab == 'inventory'}
	<Inventory inventory={model.inventory} />
	{:else if tab == 'notes'}
	<Notes notes={model.notes} />
	{:else if tab == 'skills'}
	<Skills skills={model.skills} bluckTries={model.abilities.nature.maximum} />
	{:else if tab == 'spells'}
	<Spells spells={model.spells} />
	{:else if tab == 'traits'}
	<Traits traits={model.traits} />
	{:else if tab == 'wises'}
	<Wises wises={model.wises} />
	{/if}
</main>
