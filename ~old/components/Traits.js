class Traits extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body">
                        <div class="btn-group position-topright">
                            <span class="btn badge btn-light border border-dark" data-toggle="modal" data-target="#traits_help">?</span>
                        </div>
                        ${this.drawAdd()}
                        <div class="row">
                            ${this.state.map((x,i) => 
                                this.add(new Trait(`traits_${i}`, { 
                                    trait: x, 
                                    edit: false,
                                    delete: () => this.state.splice(i, 1)
                                }))).reduce((a,b) => `${a}${b}`, '')}
                        </div>
                    </div>
                    <div id="traits_help" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="levelRequirements" aria-hidden="true">
                        <div class="modal-dialog" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Traits</h5>
                                    <button class="close" type="button" data-dismiss="modal">&cross;</button>
                                </div>
                                <div class="modal-body">
                                    <p>Traits grant bonuses by level:</p>
                                    <ul>
                                        <li>Level 1 traits grant +1D to a relevent test once per session</li>
                                        <li>Level 2 traits grant +1D to a relevent test twice per session</li>
                                        <li>Level 3 traits grant +1s to all relevent tests</li>
                                    </ul>
                                    <p>Each trait can be used once per session to generate up to two checks.</p>
                                    <ul>
                                        <li>One check is generated when used to apply a -1D penalty to an independent or versus test</li>
                                        <li>Two checks are generated when used to grant an opponent a +2D advantage in a versus test</li>
                                        <li>Two checks are generated when used to break a tie in an opponent's favor in a versus test</li>
                                    </ul>
                                </div>
                            </div>
                        </div> 
                    </div>
                </div>
            </div>
        `;
    }

    drawAdd() {
        if(this.state.length == 4) return '';

        return String.raw`
        <div class="row">
            <div class="col-md-12">
                <button id="${this.id}_add" class="btn btn-light border mb-1">Add trait</button>
            </div>
        </div>
        `;
    }

    initialize() {
        super.initialize();

        _(`#${this.id}_add`).map(x => x.onclick = e => {
            this.state.push({ 
                name: 'New trait', 
                level: 1, 
                used: 0, 
                usedAgainst: false,
                checks: 0
            });

            this.update();
        });
    }
}