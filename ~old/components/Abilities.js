class Abilities extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-md-6">
                        ${this.add(new Ability('will'))}
                        ${this.add(new Ability('health'))}
                        ${this.add(new Nature('nature'))}
                    </div>
                    <div class="col-md-6">
                        ${this.add(new Ability('resources'))}
                        ${this.add(new Ability('circles'))}
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2>Lifestyle</h2>
                                <h5 class="ml-2"><button data-reset="lifestyle" class="btn badge btn-light border align-self-center">reset</button></h5>
                                <h2 class="ml-auto"><button data-increment="lifestyle" data-max="99" class="btn badge btn-dark">${this.state.lifestyle}</button></h2>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="mr-auto">Might</h2>
                                <h2><button data-increment="might" data-max="8" class="btn badge btn-dark">${this.state.might}</button></h2>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="mr-auto">Precedence</h2>
                                <h2><button data-increment="precedence" data-max="7" class="btn badge btn-dark">${this.state.precedence}</button></h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-reset]').map(x => x.onclick = e => {
            let prop = x.dataset.reset;
            this.state[prop] = 0;
            this.update();
        });

        this.find('[data-increment]').map(x => x.onclick = e => {
            let prop = x.dataset.increment;
            this.state[prop] += e.shiftKey ? -1 : 1;
            let max = Number(x.dataset.max);
            if(this.state[prop] > max) this.state[prop] = 0;
            if(this.state[prop] == -1) this.state[prop] = max;

            this.update();
        });
    }
}
