class Ability extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card">
                <div class="card-body">
                    <div class="d-flex m-1">
                        <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.rating}</span></h2>
                        <h5 class="card-title mr-auto">${this.state.name}</h5>
                        <div class="btn-group">
                            <button data-minus="rating" class="btn btn-danger">&darr;</button>
                            <button data-plus="rating" data-max="${this.state.cap}" class="btn btn-success">&uarr;</button>
                            <button data-clear="" class="btn btn-primary">clear progress</button>
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
                            <span data-minus="pass" class="align-self-end btn btn-secondary">&larr;</span>
                            <span data-plus="pass" data-max="${this.maxPass()}" class="align-self-end btn btn-secondary">&rarr;</span>
                        </div>
                    </div>
                    <div class="d-flex m-1">
                        <div class="flex-grow-1">
                            <small>Fail</small>
                            <div class="progress m-1">
                                <div class="progress-bar ${this.failBg()}" style="width: ${this.failPercentage()}%;">${this.failText()}</div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <span data-minus="fail" class="align-self-end btn btn-secondary">&larr;</span>
                            <span data-plus="fail" data-max="${this.maxFails()}" class="align-self-end btn btn-secondary">&rarr;</span>
                        </div>
                    </div>
                </div>
            </div>
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
        this.find('[data-plus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-plus');
            let max = $(e.target).attr('data-max');
            if(this.state[prop] >= max) return;

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