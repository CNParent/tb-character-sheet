class Spells extends Component {
    draw() {
        if(!this.state) this.state = spells();

        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex">
                                    <h3><span class="align-self-center font-weight-bold mr-1">Memory palace</span></h3>
                                    <span class="align-self-center btn badge-light border">${this.space()}</span>
                                    <span class="align-self-center mx-1">/</span>
                                    <button id="${this.id}_memory" class="align-self-center btn btn-dark">${this.state.memory}</button>
                                    <button id="${this.id}_add" class="align-self-center btn btn-light border ml-auto">Add spell</button>
                                </div>
                                <div class="row mt-2">
                                    ${this.state.spells
                                        .map((x,i) => this.add(new Spell(`${this.id}_spells_${i}`, { spell: x, edit: false })))
                                        .reduce((a,b) => `${a}${b}`, '')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    space = () => {
        return this.state.memory - this.state.spells.reduce((a,b) => a + b.memorized ? b.circle : 0, 0)
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.spells.push({
                name: '~new spell',
                circle: 1,
                memorized: false,
                description: ''
            });

            this.state.spells.sort((a,b) => {
                if(a.circle == b.circle) return a.name.localeCompare(b.name);
                return a.circle - b.circle;
            });

            this.update();
        });

        $(`#${this.id}_memory`).click(e => {
            this.state.memory += e.originalEvent.shiftKey ? -1 : 1;
            if(this.state.memory < 0) this.state.memory = 5;
            if(this.state.memory > 5) this.state.memory = 0;
            
            this.update();
        })
    }
}
