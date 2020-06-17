class Nature extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card">
                <div class="card-body">
                    <div class="d-flex m-1">
                        <h4 class="mr-auto">Nature</h4>
                        <button data-clear="" class="btn btn-primary">clear progress</button>
                    </div>
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
                    <div class="d-flex m-1">
                        <div class="flex-grow-1">
                            <small>Pass</small>
                            <div class="progress m-1">
                                <div class="progress-bar" style="width: ${this.passPercentage()}%;">${this.passText()}</div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <span data-minus="pass" class="align-self-end btn btn-dark">&larr;</span>
                            <span data-plus="pass" class="align-self-end btn btn-dark">&rarr;</span>
                        </div>
                    </div>
                    <div class="d-flex m-1">
                        <div class="flex-grow-1">
                            <small>Fail</small>
                            <div class="progress m-1">
                                <div class="progress-bar" style="width: ${this.failPercentage()}%;">${this.failText()}</div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <span data-minus="fail" class="align-self-end btn btn-dark">&larr;</span>
                            <span data-plus="fail" class="align-self-end btn btn-dark">&rarr;</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    maxFails = () => this.state.maximum > 1 ? this.state.maximum - 1 : 0;
    failPercentage = () => this.maxFails() == 0 ? 100 : 100 * this.state.fail / this.maxFails();
    failText = () => this.maxFails() == 0 ? '' : `${this.state.fail} / ${this.maxFails()}`;

    maxPass = () => this.state.maximum < 1 ? 1 : this.state.maximum;
    passPercentage = () => 100 * this.state.pass / this.maxPass();
    passText = () => `${this.state.pass} / ${this.maxPass()}`;

    initialize() {
        
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

        this.find('[data-plus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-plus');
            if(this.state[prop] > 9) return;

            this.state[prop] += 1;
            this.update();
        });

        this.find('[data-minus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-minus');
            if(this.state[prop] < 1) return;

            this.state[prop] -= 1;
            this.update();
        });

        this.find('[data-clear]').on('click touch', (e) => {
            this.state.pass = 0;
            this.state.fail = 0;
            this.update();
        });
    }
}