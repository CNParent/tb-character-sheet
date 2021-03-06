class Spells extends Component {
    draw() {
        
        this.state.spells.sort((a,b) => {
            if(a.circle == b.circle) return a.name.localeCompare(b.name);
            return a.circle - b.circle;
        });

        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="row">
                                    ${this.drawMemory()}
                                    ${this.drawBurden()}
                                    ${this.drawUrdr()}
                                    ${this.drawInventory()}
                                </div>
                                <div class="d-flex mt-2">
                                    <div class="dropdown">
                                        <button class="dropdown-toggle btn btn-light border mb-1 mr-1" data-toggle="dropdown" >Show</button>
                                        <div class="dropdown-menu">
                                            ${this.drawFilters()}
                                        </div>
                                    </div>
                                    <button id="${this.id}_add" class="btn btn-light border mb-1 mr-1">Add spell</button>
                                </div>
                                <div class="row mt-2">
                                    ${this.state.spells
                                        .map((x,i) => this.add(new Spell(`${this.id}_spells_${i}`, { 
                                            spell: x, 
                                            hide: this.isHidden(x),
                                            canMemorize: this.space() >= x.circle,
                                            edit: false,
                                            caster: this.caster(),
                                            remove: () => this.state.spells.splice(i, 1)
                                        })))
                                        .reduce((a,b) => `${a}${b}`, '')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawBurden() {
        if(this.state.urdr == 0) return '';

        return String.raw`
            <div class="d-flex col-md-6">
                <h3 style="width: 5em;"><span class="align-self-center font-weight-bold">Burden</span></h3>
                <button id="${this.id}_burden_lower" class="align-self-center btn btn-light border border-dark ml-auto">&darr;</button>
                <button id="${this.id}_burden" class="align-self-center btn btn-dark">${this.state.burden}</button>
            </div>
        `;
    }

    drawFilters() {
        let filters = String.raw`
            <button data-show-spells="all" class="dropdown-item ${this.styleForShow('all')}">All</button>
        `;

        if(this.state.memory > 0) filters += String.raw`
            <button data-show-spells="capacity" class="dropdown-item ${this.styleForShow("capacity")}">Can memorize</button>
            <button data-show-spells="inventory&scroll" class="dropdown-item ${this.styleForShow('inventory&scroll')}">Inventory</button>
            <button data-show-spells="memory" class="dropdown-item ${this.styleForShow('memory')}">Memorized</button>
            <button data-show-spells="scroll" class="dropdown-item ${this.styleForShow('scroll')}">Scrolls</button>
            <button data-show-spells="inventory" class="dropdown-item ${this.styleForShow('inventory')}">Spellbook</button>
        `;

        if(this.state.urdr > 0) filters += String.raw`
            <button data-show-spells="inventory" class="dropdown-item ${this.styleForShow('inventory')}">Relic</button>
            <button data-show-spells="burden" class="dropdown-item ${this.styleForShow('burden')}">Within burden</button>
        `;

        return filters;
    }

    drawMemory() {
        if(this.state.urdr > 0) return '';

        return String.raw`
            <div class="d-flex col-md-6">
                <h3><span class="align-self-center font-weight-bold mr-1">Memory palace</span></h3>
                <span class="align-self-center btn badge-light border ml-auto">${this.space()}</span>
                <span class="align-self-center mx-1">/</span>
                <button id="${this.id}_memory" class="align-self-center btn btn-dark">${this.state.memory}</button>
            </div>
        `;
    }

    drawInventory() {
        if(this.state.memory == 0) return '';

        return String.raw`
            <div class="d-flex col-md-6">
                <h3><span class="align-self-center font-weight-bold">In Spellbook</span></h3>
                <span class="align-self-center btn badge-light border ml-auto">${this.inventory()}</span>
            </div>
        `;
    }

    drawUrdr() {
        if(this.state.memory > 0) return '';
        
        return String.raw`
            <div class="d-flex col-md-6">
                <h3><span class="align-self-center font-weight-bold">Urdr</span></h3>
                <button id="${this.id}_urdr" class="align-self-center btn btn-dark ml-auto">${this.state.urdr}</button>
            </div>
        `;
    }

    isHidden(spell) {
        if(this.state.show == 'all') return false;
        if(this.state.show == 'burden') return spell.circle > this.state.urdr - this.state.burden;
        if(this.state.show == 'capacity') return this.space() < spell.circle && !spell.memorized;
        if(this.state.show == 'inventory') return !spell.inventory;
        if(this.state.show == 'inventory&scroll') return !spell.inventory && !spell.scroll;
        if(this.state.show == 'memory') return !spell.memorized;
        if(this.state.show == 'scroll') return !spell.scroll;

        return false;
    }

    caster = () => {
        if(this.state.urdr > 0) return 'theurge';
        if(this.state.memory > 0) return 'magician';

        return '';
    }

    inventory = () => this.state.spells.reduce((a,b) => a + (b.inventory ? b.circle : 0), 0);

    space = () => this.state.memory - this.state.spells.reduce((a,b) => a + (b.memorized ? b.circle : 0), 0)

    styleForShow = (value) => this.state.show == value ? 'bg-dark text-light' : '';

    initialize() {
        super.initialize();

        this.find('[data-show-spells]').map(x => x.onclick = e => {
            this.state.show = e.target.dataset.showSpells;
            this.update();
        });

        _(`#${this.id}_add`).map(x => x.onclick = e => {
            this.state.spells.push({
                name: '~new spell',
                circle: 1,
                memorized: false,
                inventory: false,
                scroll: false,
                description: 'Enter a description'
            });

            this.update();
        });

        _(`#${this.id}_burden`).map(x => x.onclick = e => {
            this.state.burden += e.shiftKey ? -1 : 1;
            if(this.state.burden < 0) this.state.burden = 0;
            
            this.update();
        });

        _(`#${this.id}_burden_lower`).map(x => x.onclick = e => {
            if(this.state.burden == 0) return;

            this.state.burden--;
            this.update();
        });

        _(`#${this.id}_memory`).map(x => x.onclick = e => {
            this.state.memory += e.shiftKey ? -1 : 1;
            if(this.state.memory < 0) this.state.memory = 5;
            if(this.state.memory > 5) this.state.memory = 0;
            
            this.update();
        });

        _(`#${this.id}_urdr`).map(x => x.onclick = e => {
            this.state.urdr += e.shiftKey ? -1 : 1;
            if(this.state.urdr < 0) this.state.urdr = 5;
            if(this.state.urdr > 5) this.state.urdr = 0;
            
            this.update();
        });
    }
}
