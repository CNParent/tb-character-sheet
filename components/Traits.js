class Traits extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.traits.map((x,i) => this.add(new Trait(`traits_${i}`, { trait: x, edit: false }))).reduce((a,b) => `${a}${b}`, '')}
                    ${this.drawEditor()}
                </div>
            </div>
        `;
    }

    drawEditor() {
        if(this.state.traits.length == 4) return '';

        if(this.state.edit) return String.raw`
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="input-group align-self-center mr-1">
                            <input id="${this.id}_newTraitName" class="form-control">
                            <div class="input-group-append">
                                <button id="${this.id}_confirm" class="btn btn-light border border-dark">&check;</button>
                                <button id="${this.id}_cancel" class="btn btn-light border border-dark">&cross;</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return String.raw`
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <button id="${this.id}_add" class="btn btn-light border border-dark">Add trait</button>
                    </div>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.edit = true;
            this.update();
        });

        $(`#${this.id}_confirm`).click(e => {
            this.state.traits.push({ 
                name: $(`#${this.id}_newTraitName`).val(), 
                level: 1, 
                used: 0, 
                usedAgainst: false,
                checks: 0
            });

            this.state.edit = false;
            this.update();
        })

        $(`#${this.id}_cancel`).click(e => {
            this.state.edit = false;
            this.update();
        })
    }
}