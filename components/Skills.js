class Skills extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.skills
                        .map((x,i) => this.add(new Skill(`${this.id}_${i}`, { 
                            skill: x, 
                            edit: false,
                            remove: () => this.state.skills.splice(i, 1)
                        })))
                        .reduce((a,b) => `${a}${b}`, '')}
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                ${this.drawEditor()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawEditor() {
        if(this.state.skills.length == 24) return '';
        if(this.state.edit) return String.raw`
            <div class="input-group align-self-center mr-1">
                <input id="${this.id}_newSkillName" class="form-control">
                <div class="input-group-append">
                    <button id="${this.id}_confirm" class="btn btn-light border border-dark">&check;</button>
                    <button id="${this.id}_cancel" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;

        return String.raw`
            <button id="${this.id}_add" class="btn btn-light border border-dark">Add skill</button>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_confirm`).on('click touch', e => {
            this.state.skills.push({
                name: $(`#${this.id}_newSkillName`).val(),
                pass: 0,
                fail: 0,
                bluck: "Health",
                readonly: false,
                cap: 7,
                rating: 2
            });

            this.state.edit = false;
            this.update();
        });

        $(`#${this.id}_cancel`).on('click touch', e => {
            this.state.edit = false;
            this.update();
        });

        $(`#${this.id}_add`).on('click touch', e => {
            this.state.edit = true;
            this.update();
        })
    }
}