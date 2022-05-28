<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let tabValue;
    export let tab = '';

    function setTab() {
        dispatch('setTab', { tab: tabValue });
    }
</script>

<a href='#' on:click={setTab} class:active={tab == tabValue} class="nav-item nav-link"><slot></slot></a>