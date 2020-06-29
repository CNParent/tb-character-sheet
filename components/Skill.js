class Skill extends Component {
    draw() {
        if(this.state.hide) return '';

        return String.raw`
            <div id="${this.id}" class="col-lg-4 col-md-6">
                <div class="card">
                    <div class="card-body pt-1">
                        ${this.drawLuckToggle()}
                        <div class="d-flex">
                            ${this.drawName()}
                            <h4><span id="${this.id}_rating" class="badge btn btn-dark">${this.state.skill.rating}</span></h4>
                        </div>
                        ${this.drawPass()}
                        ${this.drawFail()}
                        ${this.drawLuck()}
                    </div>
                </div>
            </div>
        `;
    }

    drawLuckToggle() {
        let classes = this.state.skill.readonly ? 'badge-light border border-dark' : 'btn badge-dark';
        return String.raw`
            <div class="d-flex flex-row-reverse">
                <span data-bluck="" class="badge ${classes}">${this.state.skill.bluck}</span>
            </div>
        `;
    }

    drawName() {
        if(this.state.edit) return String.raw`
            <input id="${this.id}_name" class="form-control mb-1 mr-1" value="${this.state.skill.name}">
        `;

        return String.raw`
            <h4 class="flex-grow-1">
                <span data-name="" class="badge btn btn-light w-100 text-left">
                    ${this.state.skill.specialty ? '<u>' : ''}
                    ${this.state.skill.name}
                    ${this.state.skill.specialty ? '</u>' : ''}
                </span>
            </h4>
        `;
    }

    drawPass() {
        if(this.state.skill.rating < 1 || this.state.skill.rating == this.state.skill.cap) return '';
        return String.raw`
            <div class="d-flex">
                ${this.add(new Bubbles(`${this.id}_pass`, {
                    count: this.maxPass(),
                    value: this.state.skill.pass,
                    label: 'pass',
                    set: (val) => { this.state.skill.pass = val }
                }))}
            </div>
        `;
    }

    drawFail() {
        if(this.state.skill.rating < 2 || this.state.skill.rating == this.state.skill.cap) return '';
        return String.raw`
            <div class="d-flex">
                ${this.add(new Bubbles(`${this.id}_fail`, {
                    count: this.maxFail(),
                    value: this.state.skill.fail,
                    label: 'fail',
                    set: (val) => { this.state.skill.fail = val }
                }))}
            </div>
        `;
    }

    drawLuck() {
        if(this.state.skill.rating > 0) return '';
        return String.raw`
            <div class="d-flex">
                ${this.add(new Bubbles(`${this.id}_bluck`, {
                    count: this.parent.parent.state.abilities.nature.maximum,
                    value: this.state.skill.pass,
                    label: 'BL',
                    set: (val) => { this.state.skill.pass = val }
                }))}
            </div>
        `;
    }

    maxPass = () => this.state.skill.rating < 1 ? 1 : this.state.skill.rating;
    maxFail = () => this.state.skill.rating < 2 ? 0 : this.state.skill.rating - 1;

    initialize() {
        super.initialize();

        this.find('[data-name]').click(e => {
            if(this.state.skill.special && !this.state.lockspecial) {
                this.state.setSpecial();
            }
            else if(!this.state.skill.readonly) {
                this.state.edit = true;
                this.update();
            }
        });

        this.find('[data-bluck]').click(e => {
            if(this.state.skill.readonly) return;

            this.state.skill.bluck = this.state.skill.bluck == "Will" ? "Health" : "Will";
            this.update();
        });

        $(`#${this.id}_rating`).click(e => {
            this.state.skill.rating += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.skill.rating < 0) this.state.skill.rating = this.state.skill.cap;
            if (this.state.skill.rating > this.state.skill.cap) this.state.skill.rating = 0;

            this.update();
        });

        this.find('input').blur(e => {
            this.state.skill.name = this.find('input').val();
            if(!this.state.skill.name) {
                this.state.delete();
                this.parent.update();
                return;
            }

            this.state.edit = false;
            this.update();
        });

        if(this.state.edit) this.find('input').focus();
    }
}