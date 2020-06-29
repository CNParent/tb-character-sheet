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
                            delete: () => this.state.skills.skills.splice(i, 1),
                            setSpecial: () => {
                                this.state.skills.skills.forEach(y => y.specialty = x == y);
                                this.update();
                            }
                        })))
                        .reduce((a,b) => `${a}${b}`, '')}
                    <div class="col-lg-4 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                ${this.drawAdd()}
                                ${this.drawControls()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawAdd() {
        if(this.state.skills.skills.filter(x => x.rating > 0).length >= 24) return '';
        
        return String.raw`
            <button id="${this.id}_add" class="btn btn-light border mb-1">Add skill</button>
        `;
    }

    drawControls() {
        let compactbg = this.state.skills.compact ? 'btn-dark' : 'btn-light';
        let specialbg = this.state.skills.lockspecial ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button id="${this.id}_hide" class="btn border mb-1 ${compactbg}">Hide unknown</button>
            <button id="${this.id}_special" class="btn border mb-1 ${specialbg}">Lock specialty</button>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.skills.skills.push({
                name: 'New skill',
                pass: 0,
                fail: 0,
                bluck: "Health",
                readonly: false,
                cap: 7,
                rating: 0
            });

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