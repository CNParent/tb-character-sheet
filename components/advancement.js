class Advancement extends Component {

    levels = [
        { level: 1, fate: 0, persona: 0 },
        { level: 2, fate: 3, persona: 3 },
        { level: 3, fate: 7, persona: 6 },
        { level: 4, fate: 13, persona: 9 },
        { level: 5, fate: 22, persona: 12 },
        { level: 6, fate: 31, persona: 16 },
        { level: 7, fate: 41, persona: 20 },
        { level: 8, fate: 52, persona: 24 },
        { level: 9, fate: 64, persona: 28 },
        { level: 10, fate: 77, persona: 32 }
    ]

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid text-nowrap">
                <div class="row">
                    ${this.drawArtha('Fate')}
                    ${this.drawArtha('Persona')}
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h2 class="mr-auto">Level Benefits</h2>
                                ${this.add(new TagList('levelBenefits', { items: this.state.levelBenefits }))}
                                <span class="position-topright btn badge btn-light border border-dark" data-toggle="modal" data-target="#levelRequirements">?</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal fade" id="levelRequirements" tabindex="-1" role="dialog" aria-labelledby="levelRequirements" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="levelRequirementsTitle">Level Requirements</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&cross;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Level</th>
                                            <th>Fate</th>
                                            <th>Persona</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.levels.map((x,i) => this.row(x,i)).reduce((a,b) => `${a}${b}`, '')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawArtha(artha) {
        let current = this.state[`current${artha}`]
        let spent = this.state[`spent${artha}`]
        return String.raw`
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-subtitle mb-1">${artha}</h2>
                        <div class="d-flex">
                            <div class="btn-group align-self-center mr-1">
                                <span data-plus="current${artha}" class="btn btn-dark">${current}</span>
                                <button class="btn btn-light border border-dark" data-minus="current${artha}">&darr;</button>
                            </div>
                            <div class="btn-group align-self-center">
                                <span data-spend="${artha}" class="btn btn-dark">${spent} spent</span>
                                <button class="btn btn-light border border-dark" data-unspend="${artha}">&larr;</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    row = (level, index) => {
        return String.raw`
            <tr>
                <td>${level.level}</td>
                <td>${level.fate}</td>
                <td>${level.persona}</td>
            </tr>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-minus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-minus');
            if(this.state[prop] < 1) return;

            this.state[prop]--;
            this.update();
        });

        this.find('[data-plus]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-plus');
            this.state[prop]++;
            this.update();
        });

        this.find('[data-spend]').on('click touch', (e) => {
            let artha = $(e.target).attr('data-spend');
            let currentProp = `current${artha}`;
            let spentProp = `spent${artha}`;
            if(this.state[currentProp] < 1) return;

            this.state[currentProp]--;
            this.state[spentProp]++;
            this.update();
        })

        this.find('[data-unspend]').on('click touch', (e) => {
            let artha = $(e.target).attr('data-unspend');
            let currentProp = `current${artha}`;
            let spentProp = `spent${artha}`;
            if(this.state[spentProp] < 1) return;

            this.state[currentProp]++;
            this.state[spentProp]--;
            this.update();
        })
    }
}