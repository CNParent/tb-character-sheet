<script>
    export let count = 6;
    export let value = 0;

    $:arr = [...new Array(count)]

    function handleClick(i) {
        value = value == i + 1 ? i : i + 1;
    }
</script>

<div class="d-flex w-100">
    <small class="align-self-center" style="width: 3em;"><slot></slot></small>
    <div>
        {#each arr as x,i}
        <button on:click={() => handleClick(i)} class="bubble btn border border-dark" class:btn-dark={value > i} class:btn-light={value <= i}></button>
        {/each}
    </div>
</div>