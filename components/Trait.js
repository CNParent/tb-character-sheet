class Trait extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            <h2><span data-level="" class="btn badge badge-dark mr-1">${this.state.level}</span></h2>
                            <h2><span class="btn badge badge-light border border-dark">${this.state.name}</span></h2>
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
        if (this.state.level < n || this.state.level == 3) return '';

        let bg = this.state.used >= n ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button data-used="${n}" class="border border-dark btn ${bg}">+1D</button>
        `;
    }

    drawCheck(n) {
        let bg = this.state.checks >= n ? 'btn-dark' : 'btn-light';
        return String.raw`
            <button data-check="${n}" class="border border-dark btn ${bg}">&check;</button>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-level]').on('click touch', e => {
            switch(e.originalEvent.shiftKey) {
                case true: this.state.level--; break;
                case false: this.state.level++; break;
            }
            
            if (this.state.level == 4) this.state.level = 1;
            if (this.state.level == 0) this.state.level = 3;

            this.update();
        });
    }
}