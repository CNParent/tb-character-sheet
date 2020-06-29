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
                    <div class="mt-2">
                        ${this.add(new TagList('descriptors', { items: this.state.descriptors }))}
                    </div>
                </div>
            </div>
        `;
    }

    drawPass() {
        if(this.state.maximum == 7) return '';

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
        if(this.maxFail() == 0 || this.state.maximum == 7) return '';

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

    maxFail = () => this.state.maximum < 2 ? 0 : this.state.maximum - 1;
    maxPass = () => this.state.maximum < 1 ? 1 : this.state.maximum;

    initialize() {
        super.initialize();
        
        this.find('[data-current]').click(e => {
            this.state.current -= e.originalEvent.shiftKey ? -1 : 1;
            if(this.state.current < 0) this.state.current = this.state.maximum;
            if(this.state.current > this.state.maximum) this.state.current = 0;

            this.update();
        });

        this.find('[data-maximum]').click(e => {
            this.state.current += e.originalEvent.shiftKey ? -1 : 1;
            this.state.maximum += e.originalEvent.shiftKey ? -1 : 1;
            if (this.state.maximum < 0) this.state.maximum = this.state.current = 7;
            if (this.state.maximum > 7) this.state.maximum = this.state.current = 0;
            if (this.state.current < 0) this.state.current = 0;

            this.update();
        });
    }
}