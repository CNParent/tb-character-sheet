<script>
    import Circle from './Circle.svelte'
    import Followers from './Followers.svelte'

    export let circles;

    if (!circles.followers) circles.followers = [];
</script>

<div class="container-fluid">
    <Followers followers={circles.followers} />
    <div class="row">
        <div class="col-md-6">
            <Circle items={circles.friends}>Friends</Circle>
        </div>
        <div class="col-md-6">
            <Circle items={circles.enemies}>Enemies</Circle>
        </div>
    </div>
</div>