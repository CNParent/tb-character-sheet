<script>
	import character from "./models/character.js"

	import Abilities from './components/Abilities.svelte'
	import Bio from "./components/Bio.svelte"
	import Conditions from "./components/Conditions.svelte"
	import Navbar from "./components/Navbar.svelte"

	let model = character();
	let tab = 'bio';

	function changeTab(newTab) {
		tab = newTab;
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
</svelte:head>

<main id="app">
	<Navbar model={model} bind:tab={tab} />
	<Conditions model={model} />
	<!-- svelte-ignore empty-block -->
	{#if tab == 'abilities'}
	<Abilities model={model} />
	{:else if tab == 'advancement'}
	{:else if tab == 'bio'}
	<Bio model={model} />
	{:else if tab == 'circles'}
	{:else if tab == 'inventory'}
	{:else if tab == 'notes'}
	{:else if tab == 'skills'}
	{:else if tab == 'spells'}
	{:else if tab == 'traits'}
	{:else if tab == 'wises'}
	{/if}
</main>
