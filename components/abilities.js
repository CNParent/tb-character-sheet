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
                                <h2 class="mr-auto">Might</h2>
                                <h2><span data-increment="might" class="btn badge badge-dark">${this.state.might}</span></h2>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body d-flex">
                                <h2 class="mr-auto">Precedence</h2>
                                <h2><span data-increment="precedence" class="btn badge badge-dark">${this.state.precedence}</span></h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-increment]').click(e => {
            let prop = $(e.target).attr('data-increment');
            this.state[prop] += e.originalEvent.shiftKey ? -1 : 1;
            if(this.state[prop] == 9) this.state[prop] = 0;
            if(this.state[prop] == -1) this.state[prop] = 8;

            this.update();
        });
    }
}