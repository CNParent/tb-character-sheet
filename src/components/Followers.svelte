<script>
    import Follower from './Follower.svelte'
    import createFollower from '../models/follower.js'

    export let followers = [];
    
    if (!followers) followers = [];

    const actions = {
        delete: (follower) => {
            if (!confirm(`Delete ${follower.name}?`)) return;

            let index = followers.indexOf(follower);
            followers.splice(index, 1);
            followers = followers;
        },
        move: (follower, n) => {
            let index = followers.indexOf(follower);
            followers.splice(index, 1);

            index += n;
            if (index < 0) index = followers.length;
            else if (index > followers.length) index = 0;

            followers.splice(index, 0, follower);
            followers = followers;
        }
    }

    function add() {
        followers.push(createFollower());
        followers = followers;
    }
</script>

<div class="card">
    <div class="card-body">
        <h2>Followers</h2>
        <div class="d-flex mb-1">
            <button on:click={add} class="btn btn-light border mb-1 mr-1">Add follower</button>
        </div>
        {#each followers as follower (follower.id)}
        <Follower follower={follower} actions={actions} />
        {/each}
    </div>
</div>
