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
                                ${this.drawLevelBenefit(1)}
                                ${this.drawLevelBenefit(2)}
                            </div>
                            <div class="btn-group ml-1">
                                ${this.drawCheck(1)}
                                ${this.drawCheck(2)}
                                <button data-used-against="" class="btn ${this.state.trait.usedAgainst ? 'btn-dark' : 'btn-light'} border border-dark">Used</button>
                            </div>
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
            <input class="form-control mb-1 mr-1" value="${this.state.trait.name}">
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

        this.find('[data-rename]').click(e => {
            this.state.edit = true;
            this.update();
        });

        this.find('input').blur(e => {
            this.state.trait.name = this.textValue($(e.target).val());
            if(!this.state.trait.name) {
                this.state.delete();
                this.parent.update();
                return;
            } else {
                this.state.edit = false;
                this.update();
            }
        });

        this.find('[data-level]').click(e => {
            this.state.trait.level += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.trait.level == 4) this.state.trait.level = 1;
            if (this.state.trait.level == 0) this.state.trait.level = 3;

            this.update();
        });

        this.find('[data-check]').click(e => {
            let checks = Number($(e.target).attr('data-check'));
            if(this.state.trait.checks >= checks) checks--;
            this.state.trait.checks = checks;
            this.update();
        });

        this.find('[data-used]').click(e => {
            let used = Number($(e.target).attr('data-used'));
            if(this.state.trait.used >= used) used--;
            this.state.trait.used = used;
            this.update();
        });

        this.find('[data-used-against]').click(e => {
            this.state.trait.usedAgainst = !this.state.trait.usedAgainst;
            this.update();
        });

        if(this.state.edit) this.find('input').focus();
    }
}