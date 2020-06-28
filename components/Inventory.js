class Inventory extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.map((x, i) => 
                        this.add(new Container(`${this.id}_container_${i}`, { 
                            container: x,
                            delete: () => {
                                this.state.splice(i, 1);
                                this.update();
                            }
                        }))).reduce((a,b) => `${a}${b}`, '')}
                    ${this.drawList()}
                </div> 
            <div>
        `;
    }

    drawList() {
        return String.raw`
            <div class="col-lg-3 col-md-4 col-sm-6 my-1">
                <div class="card">
                    <div class="card-header p-2">
                        <h5 class="m-0">Containers</h5>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <span id="${this.id}_add" class="btn btn-light border border-dark">Add container</span>
                        ${this.state.map((x,i) => this.drawHiddenButton(x, i)).reduce((a,b) => `${a}${b}`, '')}
                    </div>
                </div>
            </div>
        `;
    }

    drawHiddenButton(container, index) {
        if(!container.hide) return '';

        return String.raw`
            <span data-show="${index}" class="btn btn-light border border-dark mt-1">${container.name}</span>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.push({
                name: 'Container',
                size: 1,
                format: 'custom',
                items: []
            });

            this.update();
        });

        this.find('[data-show]').click(e => {
            let index = $(e.target).attr('data-show');
            this.state[index].hide = false;
            this.update();
        });
    }
}