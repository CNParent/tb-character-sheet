<script>
    import Circle from './Circle.svelte'

    export let circles;
</script>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-6">
            <Circle items={circles.friends}>Friends</Circle>
        </div>
        <div class="col-md-6">
            <Circle items={circles.enemies}>Enemies</Circle>
        </div>
    </div>
</div>