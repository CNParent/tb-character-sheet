class Skills extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.skills.skills
                        .map((x,i) => this.add(new Skill(`${this.id}_${i}`, { 
                            skill: x, 
                            edit: false,
                            hide: this.state.skills.compact && x.rating == 0 && x.readonly,
                            lockspecial: this.state.skills.lockspecial,
                            remove: () => this.state.skills.skills.splice(i, 1),
                            setSpecial: () => {
                                this.state.skills.skills.forEach(y => y.specialty = x == y);
                                this.update();
                            }
                        })))
                        .reduce((a,b) => `${a}${b}`, '')}
                    <div class="col-lg-4 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                ${this.drawControls()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawControls() {
        if(this.state.skills.skills.filter(x => x.rating > 0).length >= 24) return '';
        if(this.state.edit) return String.raw`
            <div class="input-group align-self-center mr-1">
                <input id="${this.id}_newSkillName" class="form-control">
                <div class="input-group-append">
                    <button id="${this.id}_confirm" class="btn btn-light border border-dark">&check;</button>
                    <button id="${this.id}_cancel" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;

        let compactbg = this.state.skills.compact ? 'btn-dark' : 'btn-light';
        let specialbg = this.state.skills.lockspecial ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button id="${this.id}_add" class="btn btn-light border border-dark">Add skill</button>
            <button id="${this.id}_hide" class="btn ${compactbg} border border-dark">
                ${this.state.skills.compact ? 'Show all' : 'Hide unknown'}            
            </button>
            <button id="${this.id}_special" class="btn ${specialbg} border border-dark">
                ${this.state.skills.lockspecial ? 'Unlock specialty' : 'Lock specialty'}
            </button>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_confirm`).click(e => {
            this.state.skills.skills.push({
                name: $(`#${this.id}_newSkillName`).val(),
                pass: 0,
                fail: 0,
                bluck: "Health",
                readonly: false,
                cap: 7,
                rating: 0
            });

            this.state.edit = false;
            this.update();
        });

        $(`#${this.id}_cancel`).click(e => {
            this.state.edit = false;
            this.update();
        });

        $(`#${this.id}_add`).click(e => {
            this.state.edit = true;
            this.update();
        });

        $(`#${this.id}_hide`).click(e => {
            this.state.skills.compact = !this.state.skills.compact;
            this.update();
        });

        $(`#${this.id}_special`).click(e => {
            this.state.skills.lockspecial = !this.state.skills.lockspecial;
            this.update();
        });
    }
}