<script>
	import character from "./models/character.js"
	import Navbar from "./components/Navbar.svelte"
	import Conditions from "./components/Conditions.svelte"

	let model = character();
</script>

<svelte:head>
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
</svelte:head>

<main id="app">
	<Navbar model={model} />
	<Conditions model={model} />
</main>
