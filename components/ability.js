class Ability extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card text-nowrap">
                <div class="card-body">
                    <div class="d-flex">
                        <h2 class="mr-auto">${this.state.name}</h2>
                        <h2><span data-increment="" class="badge btn btn-dark">${this.state.rating}</span></h2>
                    </div>
                    ${this.drawPass()}
                    ${this.drawFail()}
                </div>
            </div>
        `;
    }

    drawPass() {
        if(this.state.rating == this.state.cap) return '';

        return String.raw`
            <div class="d-flex">
                ${this.add(new Bubbles(`${this.id}_pass`, {
                    count: this.maxPass(),
                    value: this.state.pass,
                    label: 'pass',
                    set: (val) => { this.state.pass = val }
                }))}
            </div>
        `;
    }

    drawFail() {
        if(this.maxFail() == 0 || this.state.rating == this.state.cap) return '';

        return String.raw`
            <div class="d-flex">
                ${this.add(new Bubbles(`${this.id}_fail`, {
                    count: this.maxFail(),
                    value: this.state.fail,
                    label: 'fail',
                    set: (val) => { this.state.fail = val }
                }))}
            </div>
        `;
    }

    maxFail = () => this.state.rating < 2 ? 0 : this.state.rating - 1;
    maxPass = () => this.state.rating < 1 ? 1 : this.state.rating;

    initialize() {
        super.initialize();        

        this.find('[data-increment]').on('click touch', e => {
            this.state.rating += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.rating < 0) this.state.rating = this.state.cap;
            if (this.state.rating > this.state.cap) this.state.rating = 0;

            this.update();
        });
    }
}