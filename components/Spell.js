class Spell extends Component{

    circles = [
        '1st Circle',
        '2nd Circle',
        '3rd Circle',
        '4th Circle',
        '5th Circle'
    ]

    draw() {
        if(this.state.hide) return '';

        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            ${this.drawName()}
                        </div>
                        <div class="d-flex mt-1">
                            <h5><button data-circle="" class="badge btn btn-dark w-100 text-left">${this.circles[this.state.spell.circle - 1]}</button></h5>
                            ${this.drawToggles()}
                        </div>
                        <div class="d-flex mt-1">
                        </div>
                        <div class="d-flex mt-1">
                            ${this.drawDescription()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawDescription() {
        if(this.state.edit == 'description') return String.raw`
            <textarea class="flex-grow-1 form-control">${this.state.spell.description}</textarea>
        `;

        return String.raw`
            <button data-edit="description" class="btn btn-light text-left align-top wrap w-100 border" style="min-height: 2.5em;">${this.state.spell.description}</button>
        `;
    }

    drawMemorized() {
        if(!this.state.canMemorize && !this.state.spell.memorized) return '';

        return String.raw`
            <button data-memorized="" class="btn ${this.state.spell.memorized ? 'btn-dark' : 'btn-light border'} mr-1">Memorized</button>
        `;
    }

    drawName() {
        if(this.state.edit == 'name') return String.raw`
            <input class="flex-grow-1 form-control" value="${this.state.spell.name}">
        `;

        return String.raw`
            <h4 class="flex-grow-1"><button data-edit="name" class="badge btn btn-light w-100 text-left">${this.state.spell.name}</button></h4>
        `;
    }

    drawToggles() {
        if(this.state.caster == 'magician') return String.raw`
            <button data-inventory="" class="btn ${this.state.spell.inventory ? 'btn-dark' : 'btn-light border'} ml-auto mr-1">Spellbook</button>
            <button data-scroll="" class="btn ${this.state.spell.scroll ? 'btn-dark' : 'btn-light border'} mr-1">Scroll</button>
            ${this.drawMemorized()}
        `;

        if(this.state.caster == 'theurge') return String.raw`
            <button data-inventory="" class="btn ${this.state.spell.inventory ? 'btn-dark' : 'btn-light border'} ml-auto mr-1">Relic</button>
        `;

        return '';
    }

    initialize() {
        super.initialize();

        this.find('[data-circle]').click(e => {
            this.state.spell.circle += e.originalEvent.shiftKey ? -1 : 1;
            if(this.state.spell.circle < 1) this.state.spell.circle = this.circles.length;
            if(this.state.spell.circle > this.circles.length) this.state.spell.circle = 1;

            this.parent.update(); // Impacts memory palace
        });

        this.find('[data-edit]').click(e => {
            this.state.edit = $(e.target).data('edit');
            this.update();
        });

        this.find('[data-inventory]').click(e => {
            this.state.spell.inventory = !this.state.spell.inventory;
            this.parent.update();
        });

        this.find('[data-scroll]').click(e => {
            this.state.spell.scroll = !this.state.spell.scroll;
            this.update();
        });

        this.find('[data-memorized]').click(e => {
            this.state.spell.memorized = !this.state.spell.memorized;
            this.parent.update(); // Impacts memory palace
        });

        this.find('input').blur(this.completeEdit);
        this.find('textarea').blur(this.completeEdit);

        if(this.state.edit == 'name') this.find('input').focus();
        if(this.state.edit == 'description') this.find('textarea').focus();
    }

    completeEdit = e => {
        this.state.spell[this.state.edit] = this.textValue($(e.target).val());
        if(!this.state.spell.name) {
            this.state.remove();
            this.parent.update();
            return;
        }

        this.state.edit = false;
        this.update();
    }
}