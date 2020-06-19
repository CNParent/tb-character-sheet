class Nature extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card text-nowrap">
                <div class="card-body">
                    <h4 class="mr-auto">Nature</h4>
                    <div class="d-flex m-1">
                        <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.current}</span></h2>
                        <h5 class="card-title mr-auto">Current</h5>
                        <div class="btn-group">
                            <button data-current-minus="current" class="btn btn-danger">&darr;</button>
                            <button data-current-plus="current" class="btn btn-success">&uarr;</button>
                        </div>
                    </div>
                    <div class="d-flex m-1">
                        <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.maximum}</span></h2>
                        <h5 class="card-title mr-auto">Maximum</h5>
                        <div class="btn-group">
                            <button data-max-minus="maximum" class="btn btn-danger">&darr;</button>
                            <button data-max-plus="" class="btn btn-success">&uarr;</button>
                        </div>
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
        let bg = this.state[prop] >= value ? 'bg-primary' : 'bg-light';
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
        
        this.find('[data-current-minus]').on('click touch', (e) => {
            if(this.state.current < 1) return;

            this.state.current--;
            this.update();
        });

        this.find('[data-current-plus]').on('click touch', (e) => {
            if(this.state.current >= this.state.maximum) return;

            this.state.current++;
            this.update();
        });

        this.find('[data-max-minus]').on('click touch', (e) => {
            if(this.state.maximum < 1) return;
            
            this.state.maximum--;
            this.state.current = this.state.maximum;
            this.update();
        });

        this.find('[data-max-plus]').on('click touch', (e) => {
            if(this.state.maximum >= 7) return;

            this.state.current++;
            this.state.maximum++;
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