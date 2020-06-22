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
                                <h2 class="card-subtitle mr-1">
                                    <span data-increment="might" class="btn badge badge-dark">${this.state.might}</span>
                                </h2>
                                <h5 class="card-title mr-auto">Might</h5>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="card-subtitle mr-1">
                                    <span data-increment="precedence" class="btn badge badge-dark">${this.state.precedence}</span>
                                </h2>
                                <h5 class="card-title mr-auto">Precedence</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-increment]').on('click touch', e => {
            let prop = $(e.target).attr('data-increment');
            switch(e.originalEvent.shiftKey) {
                case true: this.state[prop]--; break;
                case false: this.state[prop]++; break;
            }

            if(this.state[prop] == 9) this.state[prop] = 0;
            if(this.state[prop] == -1) this.state[prop] = 9;
            this.update();
        });
    }
}