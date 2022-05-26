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

	let model = character();
	let tab = 'bio';
</script>

<svelte:head>
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
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
	<Skills skills={model.skills} bluckTries={model.abilities.nature.current} />
	{:else if tab == 'spells'}
	<Spells spells={model.spells} />
	{:else if tab == 'traits'}
	<Traits traits={model.traits} />
	{:else if tab == 'wises'}
	<Wises wises={model.wises} />
	{/if}
</main>
