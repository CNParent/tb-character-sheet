<script>
    import TextArea from './TextArea.svelte'
    import TextInput from './TextInput.svelte'

    export let model;

</script>

<div id="${this.id}" class="container-fluid">
    <div class="card">
        <div class="card-body">
            <div class="row">
                <TextInput bind:content={model.bio.name}>Name</TextInput>
                <TextInput bind:content={model.bio.stock}>Stock</TextInput>
                <TextInput bind:content={model.bio.classValue}>Class</TextInput>
                <TextInput bind:content={model.bio.home}>Home</TextInput>
                <TextInput bind:content={model.bio.raiment}>Raiment</TextInput>
                <TextInput bind:content={model.bio.epithet}>Epithet</TextInput>
                <TextInput bind:content={model.bio.parents}>Parents</TextInput>
                <TextInput bind:content={model.bio.mentor}>Mentor</TextInput>
                <TextInput bind:content={model.bio.age}>Age</TextInput>
                <TextInput bind:content={model.bio.level}>Level</TextInput>
            </div>
        </div>
    </div>
    <div class="card">
        <div class="card-body">
            <div class="row">
                <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                    <TextArea bind:content={model.bio.belief}>Belief</TextArea>
                </div>
                <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                    <TextArea bind:content={model.bio.creed}>Creed</TextArea>
                </div>
                <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                    <TextArea bind:content={model.bio.goal}>Goal</TextArea>
                </div>
                <div class="d-flex flex-column mb-1 col-lg-3 col-md-4">
                    <TextArea bind:content={model.bio.instinct}>Instinct</TextArea>
                </div>
            </div>
        </div>
    </div>
</div>