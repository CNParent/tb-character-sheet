class Skill extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
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
                        ${this.drawRemove()}
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
            <div class="input-group align-self-center mb-1 mr-1">
                <input id="${this.id}_name" class="form-control" value="${this.state.skill.name}">
                <div class="input-group-append">
                    <button data-confirm="" class="btn btn-light border border-dark">&check;</button>
                    <button data-cancel="" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;

        let classes = !this.state.skill.readonly ? 'badge btn btn-light' : '';
        return String.raw`
            <h4 class="flex-grow-1">
                <span data-name="" class="${classes} w-100 text-left">${this.state.skill.name}</span>
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

    drawRemove() {
        if(this.state.skill.readonly) return '';

        return String.raw`
            <div class="d-flex">
                <button id="${this.id}_remove" class="btn btn-light border border-dark ml-auto">Delete</button>
            </div>
        `;
    }

    maxPass = () => this.state.skill.rating < 1 ? 1 : this.state.skill.rating;
    maxFail = () => this.state.skill.rating < 2 ? 0 : this.state.skill.rating - 1;

    initialize() {
        super.initialize();

        this.find('[data-confirm]').on('click touch', e => {
            this.state.skill.name = $(`#${this.id}_name`).val();
            this.state.edit = false;
            this.update();
        });

        this.find('[data-cancel]').on('click touch', e => {
            this.state.edit = false;
            this.update();
        });

        this.find('[data-name]').on('click touch', e => {
            if(this.state.skill.readonly) return;

            this.state.edit = true;
            this.update();
        });

        this.find('[data-bluck]').on('click touch', e => {
            if(this.state.skill.readonly) return;

            this.state.skill.bluck = this.state.skill.bluck == "Will" ? "Health" : "Will";
            this.update();
        });

        $(`#${this.id}_remove`).on('click touch', e => {
            if(!confirm(`Delete ${this.state.skill.name}?`)) return;

            this.state.remove();
            this.parent.update();
        })

        $(`#${this.id}_rating`).on('click touch', e => {
            this.state.skill.rating += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.skill.rating < 0) this.state.skill.rating = this.state.skill.cap;
            if (this.state.skill.rating > this.state.skill.cap) this.state.skill.rating = 0;

            this.update();
        });
    }
}