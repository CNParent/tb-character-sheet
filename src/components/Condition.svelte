<script>
    export let selected = false;
</script>

<button class:btn-dark={selected} class:btn-light={!selected} class="border border-dark btn m-1" on:click={() => selected = !selected}><slot></slot></button>