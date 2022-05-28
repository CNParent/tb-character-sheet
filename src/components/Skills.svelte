<script>
    import Skill from './Skill.svelte'
    import skill from '../models/skill.js'

    export let skills;
    export let bluckTries;

    const selectedStyle = 'bg-dark text-light';
    const actions = {
        delete: (skill) => {
            if (!confirm(`Delete ${skill.name}?`)) return;

            let i = skills.skills.indexOf(skill);
            skills.skills.splice(i, 1);
            skills.skills = skills.skills;
        },
        setSpecial: (skill) => {
            skills.skills.forEach(skill => skill.specialty = false);
            skill.specialty = true;
            skills.skills = skills.skills;
        }
    }

    let menu;
    $: filtered = skills.skills.filter(skill => 
        skills.show == 'all' ||
        (skills.show == 'bluck' && (skill.rating > 0 || skill.pass > 0)) ||
        (skills.show == 'zero' && skill.rating > 0));

    function add() {
        skills.skills.push(skill({ name: 'New Skill', readonly: false }));
        skills.skills = skills.skills;
    }

    function clearMenu(e) {
        if (e.relatedTarget?.className.includes('dropdown-item')) return;
        menu = '';
    }

    function toggleLock() {
        skills.lockspecial = !skills.lockspecial;
        skills.skills = skills.skills;
    }

    $: {
        skills.skills.forEach(skill => {
            if (!skill.id) skill.id = crypto.randomUUID();
        });
    }
</script>

<div class="container-fluid">
    <div class="row">
        <div class="col">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex">
                        <button on:click={add} class="btn btn-light border mb-1 mr-1">Add skill</button>
                        <div class="dropdown">
                            <button on:blur={clearMenu} on:click={() => menu = 'filter'} class="dropdown-toggle btn btn-light border mb-1 mr-1">Show skills</button>
                            <div class="dropdown-menu" style:display={menu == 'filter' ? 'block' : 'none'}>
                                <button on:blur={clearMenu} on:click={() => skills.show = 'all'} class="dropdown-item {skills.show == 'all' ? selectedStyle : ''}">All</button>
                                <button on:blur={clearMenu} on:click={() => skills.show = 'bluck'} class="dropdown-item {skills.show == 'bluck' ? selectedStyle : ''}">Known and learning</button>
                                <button on:blur={clearMenu} on:click={() => skills.show = 'zero'} class="dropdown-item {skills.show == 'zero' ? selectedStyle : ''}">Known</button>
                            </div>
                        </div>
                        <button 
                            on:click={() => toggleLock()} 
                            class="btn border mb-1 {skills.lockspecial ? 'btn-dark' : 'btn-light'}">
                                Lock specialty
                        </button>
                    </div>
                    <div class="row mt-2">
                        {#each filtered as skill (skill.id)}
                        <Skill actions={actions} skill={skill} bluckTries={bluckTries} lockspecial={skills.lockspecial} />
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>