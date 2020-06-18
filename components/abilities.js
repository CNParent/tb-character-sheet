class Abilities extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-md-6">
                        ${this.add(new Ability('health'))}
                        ${this.add(new Ability('will'))}
                        ${this.add(new Nature('nature'))}
                    </div>
                    <div class="col-md-6">
                        ${this.add(new Ability('resources'))}
                        ${this.add(new Ability('circles'))}
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.might}</span></h2>
                                <h5 class="card-title mr-auto">Might</h5>
                                <div class="btn-group">
                                    <button data-minus="might" class="btn btn-danger">&darr;</button>
                                    <button data-plus="might" class="btn btn-success">&uarr;</button>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="card-subtitle mr-2"><span class="badge badge-dark">${this.state.precedence}</span></h2>
                                <h5 class="card-title mr-auto">Precedence</h5>
                                <div class="btn-group">
                                    <button data-minus="precedence" class="btn btn-danger">&darr;</button>
                                    <button data-plus="precedence" class="btn btn-success">&uarr;</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-plus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-plus');
            if(this.state[prop] >= 4) return;

            this.state[prop]++;
            this.update();
        });
        
        this.find('[data-minus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-minus');
            if(this.state[prop] < 1) return;

            this.state[prop]--;
            this.update();
        });
    }
}