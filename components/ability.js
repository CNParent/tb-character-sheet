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

        let arr = new Array(this.maxPass());
        return String.raw`
            <div class="d-flex justify-items-center flex-wrap">
                <span class="mr-2" style="width: 25px;"><small>Pass</small></span>
                <div class="progress flex-grow-1 m-1">
                    ${[...arr].map((x, i) => this.drawSegment('pass', i + 1, 100 / this.maxPass())).reduce((a,b) => `${a}${b}`, '')}
                </div>
                <span class="badge badge-dark align-self-center">${this.state.pass} / ${this.maxPass()}</span>
            </div>
        `;
    }

    drawFail() {
        if(this.maxFails() == 0 || this.state.rating == this.state.cap) return '';

        let arr = new Array(this.maxFails());
        return String.raw`
            <div class="d-flex justify-items-center flex-wrap">
                <span class="mr-2" style="width: 25px;"><small>Fail</small></span>
                <div class="progress flex-grow-1 m-1">
                    ${[...arr].map((x, i) => this.drawSegment('fail', i + 1, 100 / this.maxFails())).reduce((a,b) => `${a}${b}`, '')}
                </div>
                <span class="badge badge-dark align-self-center">${this.state.fail} / ${this.maxFails()}</span>
            </div>
        `;
    }

    drawSegment(prop, value, width) {
        let bg = this.state[prop] >= value ? 'bg-secondary' : 'bg-light';
        return String.raw`
            <div data-value="${value}" data-prop="${prop}" class="progress-bar ${bg} btn btn-light border border-dark mr-1" style="width: ${width}%;"></div>
        `;
    }

    maxFails = () => this.state.rating > 1 ? this.state.rating - 1 : 0;
    failPercentage = () => this.maxFails() == 0 ? 100 : 100 * this.state.fail / this.maxFails();
    failText = () => this.maxFails() == 0 ? '' : `${this.state.fail} / ${this.maxFails()}`;
    failBg = () => this.maxFails() == 0 ? 'bg-secondary' : '';

    maxPass = () => this.state.rating < 1 ? 1 : this.state.rating;
    passPercentage = () => 100 * this.state.pass / this.maxPass();
    passText = () => `${this.state.pass} / ${this.maxPass()}`;

    initialize() {
        this.find('[data-increment]').on('click touch', e => {
            this.state.rating += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.rating < 0) this.state.rating = this.state.cap;
            if (this.state.rating > this.state.cap) this.state.rating = 0;

            this.update();
        });

        this.find('[data-value]').on('touch click', e => {
            let prop = $(e.target).attr('data-prop');
            let value = Number($(e.target).attr('data-value'));
            if(value == this.state[prop]) this.state[prop] = value - 1;
            else this.state[prop] = value;

            console.info(`Setting ${prop} to ${this.state[prop]}`)
            this.update();
        });
    }
}