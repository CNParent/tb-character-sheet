class Skills extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex">
                                    ${this.drawAdd()}
                                    ${this.drawControls()}
                                </div>
                                <div class="row mt-2">
                                    ${this.state.skills.skills
                                        .map((x,i) => this.add(new Skill(`${this.id}_${i}`, { 
                                            skill: x, 
                                            edit: false,
                                            hide: this.isSkillHidden(x),
                                            lockspecial: this.state.skills.lockspecial,
                                            delete: () => this.state.skills.skills.splice(i, 1),
                                            setSpecial: () => {
                                                this.state.skills.skills.forEach(y => y.specialty = x == y);
                                                this.update();
                                            }
                                        })))
                                        .reduce((a,b) => `${a}${b}`, '')}
                                </div>
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
            <button id="${this.id}_add" class="btn btn-light border mb-1 mr-1">Add skill</button>
        `;
    }

    drawControls() {
        let specialbg = this.state.skills.lockspecial ? 'btn-dark' : 'btn-light';
        return String.raw`
            <div class="dropdown">
                <button class="dropdown-toggle btn btn-light border mb-1 mr-1" data-toggle="dropdown" >Show skills</button>
                <div class="dropdown-menu">
                    <button data-show-skills="all" class="dropdown-item ${this.styleForShow('all')}">All</button>
                    <button data-show-skills="bluck" class="dropdown-item ${this.styleForShow('bluck')}">Known and learning</button>
                    <button data-show-skills="zero" class="dropdown-item ${this.styleForShow('zero')}">Known</button>
                </div>
            </div>
            <button id="${this.id}_special" class="btn border mb-1 ${specialbg}">Lock specialty</button>
        `;
    }

    styleForShow(value) {
        return this.state.skills.show == value ? 'bg-dark text-light' : '';
    }

    isSkillHidden(skill) {
        if(this.state.skills.show == 'all') return false;
        else if(this.state.skills.show == 'bluck') return skill.rating < 1 && skill.pass < 1;
        else if(this.state.skills.show == 'zero') return skill.rating < 1;

        return false;
    }

    initialize() {
        super.initialize();

        _(`#${this.id}_add`)[0].onclick = e => {
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
        };

        this.find('[data-show-skills]')[0].onclick = e => {
            this.state.skills.show = e.target.dataset.showSkills;
            this.update();
        };

        _(`#${this.id}_special`)[0].onclick = e => {
            this.state.skills.lockspecial = !this.state.skills.lockspecial;
            this.update();
        };
    }
}