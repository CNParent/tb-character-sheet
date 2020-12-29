class Inventory extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.drawList()}
                    ${this.state.inventory.map((x, i) => 
                        this.add(new Container(`${this.id}_container_${i}`, { 
                            container: x,
                            edit: this.state.edit,
                            delete: () => {
                                this.state.inventory.splice(i, 1);
                                this.update();
                            }
                        }))).reduce((a,b) => `${a}${b}`, '')}
                </div> 
            <div>
        `;
    }

    drawList() {
        return String.raw`
            <div class="col-md-12 my-1">
                <div class="card">
                    <div class="card-header p-2">
                        <h5 class="m-0">Containers</h5>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <span id="${this.id}_add" class="btn btn-light border">Add container</span>
                        <div>
                            ${this.state.inventory.map((x,i) => this.drawHiddenButton(x, i)).reduce((a,b) => `${a}${b}`, '')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawHiddenButton(container, index) {
        if(!container.hide) return '';

        return String.raw`
            <span data-show="${index}" class="btn btn-light border mt-1 mr-1">${container.name}</span>
        `;
    }

    initialize() {
        super.initialize();

        _(`#${this.id}_add`).map(x => x.addEventListener('click', e => {
            this.state.inventory.push({
                name: 'Container',
                size: 1,
                format: 'custom',
                items: []
            });

            this.update();
        }));

        this.find('[data-show]').map(x => x.addEventListener('click', e => {
            let index = x.dataset.show;
            this.state.inventory[index].hide = false;
            this.update();
        }));
    }
}