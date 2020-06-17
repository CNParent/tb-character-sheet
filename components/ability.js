class Ability extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="card">
                <div class="card-body">
                    <div class="d-flex m-1">
                        <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.rating}</span></h2>
                        <h5 class="card-title mr-auto">${this.state.name}</h5>
                        <div class="btn-group">
                            <button id="${this.id}_minus" class="btn btn-danger">&darr;</button>
                            <button id="${this.id}_plus" class="btn btn-success">&uarr;</button>
                        </div>
                    </div>
                    <div class="d-flex m-1">
                        <div class="flex-grow-1">
                            <small>Pass</small>
                            <div class="progress height-100">
                                <div class="progress-bar ${this.passBg()}" style="width: ${this.passPercentage()}%;">${this.state.pass} / ${this.state.rating}</div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <button id="${this.id}_pass_minus" class="btn btn-secondary">&darr;</button>
                            <button id="${this.id}_pass_plus" class="btn btn-primary">&uarr;</button>
                        </div>
                    </div>
                    <div class="d-flex m-1">
                        <div class="flex-grow-1">
                            <small>Fail</small>
                            <div class="progress flex-grow-1">
                                <div class="progress-bar ${this.failBg()}" style="width: ${this.failPercentage()}%;">${this.state.fail} / ${this.state.rating - 1}</div>
                            </div>
                        </div>
                        <div class="btn-group">
                            <button id="${this.id}_fail_minus" class="btn btn-secondary">&darr;</button>
                            <button id="${this.id}_fail_plus" class="btn btn-primary">&uarr;</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    failBg = () => this.state.fail >= this.state.rating - 1 ? 'bg-success' : '';
    failPercentage = () => 100*this.state.fail/(this.state.rating - 1);
    passBg = () => this.state.pass >= this.state.rating ? 'bg-success' : '';
    passPercentage = () => 100*this.state.pass/this.state.rating;

    initialize() {
        $(`${this.id}_minus`).click(() => { 
            if(this.state.rating < 1) return;

            this.state.rating--;
            this.update();
        });

        $(`${this.id}_plus`).click(() => {
            if(this.state.rating > 9) return;

            this.state.rating++;
            this.update();
        });
    }
}