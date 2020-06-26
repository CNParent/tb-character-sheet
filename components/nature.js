class Nature extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card text-nowrap">
                <div class="card-body">
                    <div class="d-flex">
                        <h2 class="mr-auto">Nature</h2>
                        <h2><span data-current="" class="btn badge btn-dark">${this.state.current}</span></h2>
                        <h2><span class="m-1">/</span></h2>
                        <h2><span data-maximum="" class="btn badge btn-dark">${this.state.maximum}</span></h2>
                    </div>
                    ${this.drawPass()}
                    ${this.drawFail()}
                    ${this.add(new ItemList('descriptors', { items: this.state.descriptors }))}
                </div>
            </div>
        `;
    }

    drawPass() {
        if(this.state.maximum == 7) return '';

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
        if(this.maxFails() == 0 || this.state.maximum == 7) return '';

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
        let bg = this.state[prop] >= value ? 'bg-dark' : 'bg-light';
        return String.raw`
            <div data-value="${value}" data-prop="${prop}" class="progress-bar ${bg} btn btn-light border border-dark mr-1" style="width: ${width}%;"></div>
        `;
    }

    maxFails = () => this.state.maximum > 1 ? this.state.maximum - 1 : 0;
    failPercentage = () => this.maxFails() == 0 ? 100 : 100 * this.state.fail / this.maxFails();
    failText = () => this.maxFails() == 0 ? '' : `${this.state.fail} / ${this.maxFails()}`;
    failBg = () => this.maxFails() == 0 ? 'bg-secondary' : '';

    maxPass = () => this.state.maximum < 1 ? 1 : this.state.maximum;
    passPercentage = () => 100 * this.state.pass / this.maxPass();
    passText = () => `${this.state.pass} / ${this.maxPass()}`;

    initialize() {
        super.initialize();
        
        this.find('[data-current]').on('click touch', e => {
            this.state.current -= e.originalEvent.shiftKey ? -1 : 1;
            if(this.state.current < 0) this.state.current = this.state.maximum;
            if(this.state.current > this.state.maximum) this.state.current = 0;

            this.update();
        });

        this.find('[data-maximum]').on('click touch', e => {
            this.state.current += e.originalEvent.shiftKey ? -1 : 1;
            this.state.maximum += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.maximum < 0) this.state.maximum = this.state.current = 7;
            if (this.state.maximum > 7) this.state.maximum = this.state.current = 0;
            if (this.state.current < 0) this.state.current = 0;

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