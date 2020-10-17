class Wise extends Component {
    draw() {
        if(this.state.wise.old) return String.raw`
            <span id="${this.id}">${this.drawOld()}</span>
        `;

        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            ${this.drawName()}
                        </div>
                        <div class="d-flex">
                            <div class="btn-group">
                                ${this.drawTest('Pass', 'pass')}
                                ${this.drawTest('Fail', 'fail')}
                                ${this.drawTest('Fate', 'fate')}
                                ${this.drawTest('Persona', 'persona')}
                            </div>
                            <button id="${this.id}_forget" class="btn btn-light border ml-auto">Forget</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawTest(text, prop) {
        let bg = this.state.wise[prop] ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button data-wise="${prop}" class="btn ${bg} border border-dark">${text}</button>
        `;
    }

    drawName() {
        if (!this.state.edit) return String.raw`
            <h2 class="flex-grow-1"><span data-rename="" class="badge btn btn-light w-100 text-left">${this.state.wise.name}<span></h2>
        `;

        return String.raw`
            <input class="form-control mb-1" value="${this.state.wise.name}">
        `;
    }

    drawOld() {
        if (this.state.edit) return String.raw`
            <input class="form-control mb-1" value="${this.state.wise.name}">
        `;

        return String.raw`
            <button data-rename="" class="btn btn-light border mb-1 w-100 text-left">${this.state.wise.name}</button>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_forget`).click(e => {
            this.state.wise.old = true;
            this.parent.update();
        });

        this.find('input').blur(e => {
            this.state.wise.name = this.textValue($(e.target).val());
            if(!this.state.wise.name) {
                this.state.delete();
                this.parent.update();
                return;
            }

            this.state.edit = false;
            this.update();
        });

        this.find('[data-rename]').click(e => {
            this.state.edit = true;
            this.update();
        });

        this.find('[data-wise]').click(e => {
            let prop = $(e.target).attr('data-wise');
            this.state.wise[prop] = !this.state.wise[prop];
            this.update();
        });

        if(this.state.edit) this.find('input').focus();
    }
}