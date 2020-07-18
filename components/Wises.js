class Wises extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body">
                        <div class="btn-group position-topright">
                            <span class="btn badge btn-light border border-dark" data-toggle="modal" data-target="#wises_help">?</span>
                        </div>
                        ${this.drawAdd()}
                        <div class="row">
                            ${this.state.map((x,i) => this.add(new Wise(`wises_${i}`, { 
                                wise: x, 
                                edit: false,
                                delete: () => this.state.splice(i, 1)
                            }))).reduce((a,b) => `${a}${b}`, '')}
                        </div>
                    </div>
                </div>
                <div id="wises_help" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="levelRequirements" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Wises</h5>
                                <button class="close" type="button" data-dismiss="modal">&cross;</button>
                            </div>
                            <div class="modal-body">
                                <p>Wises can be used to help others in place of a relevent skill. Doing so isolates the helping character from receiving conditions from the test.</p>
                                <p>Wises can be used to salvage a failed roll:</p>
                                <ul>
                                    <li><strong>Deeper understanding</strong> Spend a point of fate to reroll a single failed die</li>
                                    <li><strong>Of course!</strong> Spend a point of persona to reroll all failed dice</li>
                                </ul>
                                <p>
                                    Once a wise has been used to help another in a failed and successful test, as well as <strong>deeper understanding</strong> 
                                    and <strong>of course!</strong>, the wise may be replaced with another, or a test for advancement may be marked for a skill related
                                    to the wise.
                                </p>
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
                    <button id="${this.id}_add" class="btn btn-light border mb-1">Add wise</button>
                </div>
            </div>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.push({ 
                name: 'New wise', 
                pass: false,
                fail: false,
                fate: false,
                persona: false
            });

            this.state.edit = true;
            this.update();
        });
    }
}