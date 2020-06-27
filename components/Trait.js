class Trait extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            ${this.drawName()}
                            <h2 class="ml-auto"><span data-level="" class="badge btn btn-dark mr-1">${this.state.trait.level}</span></h2>
                        </div>
                        <div class="d-flex">
                            <div class="btn-group">
                                ${this.drawCheck(1)}
                                ${this.drawCheck(2)}
                                <button data-used="" class="btn ${this.state.usedAgainst ? 'btn-dark' : 'btn-light'} border border-dark">Used</button>
                            </div>
                            <div class="btn-group ml-1">
                                ${this.drawLevelBenefit(1)}
                                ${this.drawLevelBenefit(2)}
                            </div>
                            <button id="${this.id}_delete" class="btn btn-light border border-dark ml-auto">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawName() {
        if(!this.state.edit) return String.raw`
            <h2 class="flex-grow-1"><span data-rename="" class="badge btn btn-light w-100 text-left">${this.state.trait.name}<span></h2>
        `;

        return String.raw`
            <div class="input-group align-self-center mb-1 mr-1">
                <input class="form-control" value="${this.state.trait.name}">
                <div class="input-group-append">
                    <button data-confirm="" class="btn btn-light border border-dark">&check;</button>
                    <button data-cancel="" class="btn btn-light border border-dark">&cross;</button>
                </div>
            </div>
        `;
    }

    drawLevelBenefit(n) {
        if (this.state.trait.level < n || this.state.trait.level == 3) return '';

        let bg = this.state.trait.used >= n ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button data-used="${n}" class="border border-dark btn ${bg}">+1D</button>
        `;
    }

    drawCheck(n) {
        let bg = this.state.trait.checks >= n ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button data-check="${n}" class="border border-dark btn ${bg}">&check;</button>
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
            this.state.trait.name = this.find('input').val();
            this.state.edit = false;
            this.update();
        });

        this.find('[data-level]').on('click touch', e => {
            this.state.trait.level += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.trait.level == 4) this.state.trait.level = 1;
            if (this.state.trait.level == 0) this.state.trait.level = 3;

            this.update();
        });

        this.find('[data-check]').on('click touch', e => {
            let checks = Number($(e.target).attr('data-check'));
            if(this.state.trait.checks == checks) checks--;
            this.state.trait.checks = checks;
            this.update();
        });

        this.find('[data-used]').on('click touch', e => {
            let used = Number($(e.target).attr('data-used'));
            if(this.state.trait.used == used) used--;
            this.state.trait.used = used;
            this.update();
        });

        $(`#${this.id}_delete`).on('click touch', e => {
            let i = this.id.split('_')[1];
            if(!confirm(`Delete ${this.parent.state.traits[i].name}?`)) return;

            this.parent.state.traits.splice(i, 1);
            this.parent.update();
        });

        this.find('[data-used]').on('click touch', e => {
            this.state.usedAgainst = !this.state.usedAgainst;
            this.update();
        });
    }
}