class Inventory extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.inventory.map((x, i) => 
                        this.add(new Container(`${this.id}_container_${i}`, { 
                            container: x,
                            edit: this.state.edit,
                            delete: () => {
                                this.state.inventory.splice(i, 1);
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
                        <span id="${this.id}_add" class="btn btn-light border">Add container</span>
                        ${this.state.inventory.map((x,i) => this.drawHiddenButton(x, i)).reduce((a,b) => `${a}${b}`, '')}
                    </div>
                </div>
            </div>
        `;
    }

    drawHiddenButton(container, index) {
        if(!container.hide) return '';

        return String.raw`
            <span data-show="${index}" class="btn btn-light border mt-1">${container.name}</span>
        `;
    }

    initialize() {
        super.initialize();

        $(`#${this.id}_add`).click(e => {
            this.state.inventory.push({
                name: 'Container',
                size: 1,
                format: 'custom',
                items: []
            });

            this.update();
        });

        this.find('[data-show]').click(e => {
            let index = $(e.target).attr('data-show');
            this.state.inventory[index].hide = false;
            this.update();
        });
    }
}