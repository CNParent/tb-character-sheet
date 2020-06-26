class Wise extends Component {
    draw() {
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
                            <button id="${this.id}_delete" class="btn btn-light border border-dark ml-auto">Delete</button>
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
        if(!this.state.edit) return String.raw`
            <h2 class="flex-grow-1"><span data-rename="" class="badge btn btn-light w-100 text-left">${this.state.wise.name}<span></h2>
        `;

        return String.raw`
            <div class="input-group align-self-center mb-1">
                <input class="form-control" value="${this.state.wise.name}">
                <div class="input-group-append">
                    <button data-confirm="" class="btn btn-light border border-dark">&check;</button>
                    <button data-cancel="" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-rename]').on('click touch', e => {
            this.state.edit = true;
            this.update();
        });

        this.find('[data-cancel]').on('click touch', e => {
            this.state.edit = false;
            this.update();
        });

        this.find('[data-confirm]').on('click touch', e => {
            this.state.wise.name = this.find('input').val();
            this.state.edit = false;
            this.update();
        });

        this.find('[data-wise]').on('click touch', e => {
            let prop = $(e.target).attr('data-wise');
            this.state.wise[prop] = !this.state.wise[prop];
            this.update();
        });

        $(`#${this.id}_delete`).on('click touch', e => {
            let i = this.id.split('_')[1];
            if(!confirm(`Remove ${this.parent.state.wises[i].name}?`)) return;

            this.parent.state.wises.splice(i, 1);
            this.parent.update();
        });
    }
}