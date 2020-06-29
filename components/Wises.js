class Wises extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.map((x,i) => this.add(new Wise(`wises_${i}`, { 
                        wise: x, 
                        edit: false,
                        delete: () => this.state.splice(i, 1)
                    }))).reduce((a,b) => `${a}${b}`, '')}
                    ${this.drawEditor()}
                </div>
            </div>
        `;
    }

    drawEditor() {
        if(this.state.length == 4) return '';

        return String.raw`
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <button id="${this.id}_add" class="btn btn-light border border-dark">Add wise</button>
                    </div>
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