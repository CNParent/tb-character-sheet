class Trait extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            <h2><span class="badge btn btn-light border border-dark">${this.state.trait.name}<span></h2>
                            <h2 class="ml-auto"><span data-level="" class="badge btn btn-dark mr-1">${this.state.trait.level}</span></h2>
                        </div>
                        <div class="d-flex">
                            <div class="btn-group">
                                ${this.drawCheck(1)}
                                ${this.drawCheck(2)}
                            </div>
                            <div class="btn-group ml-1">
                                ${this.drawLevelBenefit(1)}
                                ${this.drawLevelBenefit(2)}
                            </div>
                        </div>
                    </div>
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

        this.find('[data-level]').on('click touch', e => {
            this.state.trait.level += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.trait.level == 4) this.state.trait.level = 1;
            if (this.state.trait.level == 0) this.state.trait.level = 3;

            this.update();
        });
    }
}