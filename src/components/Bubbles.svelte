<script>
    export let count = 6;
    export let value = 0;

    $:arr = [...new Array(count)]
</script>

<div class="d-flex w-100">
    <small class="align-self-center" style="width: 3em;"><slot></slot></small>
    <div>
        {#each arr as x,i}
        <div class="bubble btn border border-dark" class:btn-dark={value > i} class:btn-light={value <= i}></div>
        {/each}
    </div>
</div>