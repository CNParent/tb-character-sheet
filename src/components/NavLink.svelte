<script>
    export let tabValue;
    export let tab = '';
</script>

<a href='#' on:click={() => tab = tabValue} class:active={tab == tabValue} class="nav-item nav-link"><slot></slot></a>