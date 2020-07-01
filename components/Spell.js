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
                            ${this.drawMemorized()}
                        </div>
                        <div class="d-flex">
                            <h5><button data-circle="" class="badge btn btn-dark w-100 text-left">${this.circles[this.state.spell.circle - 1]}</button></h5>
                        </div>
                        ${this.drawDescription()}
                    </div>
                </div>
            </div>
        `;
    }

    drawDescription() {
        if(this.state.edit == 'description') return String.raw`
            <div class="d-flex">
                <textarea class="flex-grow-1 form-control">${this.state.spell.description}</textarea>
            </div>
        `;

        return String.raw`
            <div class="d-flex">
                <button data-edit="description" class="btn btn-light text-left align-top wrap w-100 border" style="min-height: 2.5em;">${this.state.spell.description}</button>
            </div>
        `;
    }

    drawMemorized() {
        if(!this.state.canMemorize && !this.state.spell.memorized) return '';

        return String.raw`
            <button data-memorized="" class="align-self-center badge btn ${this.state.spell.memorized ? 'btn-dark' : 'btn-light border'} ml-1 p-2">&check;</button>
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
        })

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
        this.state.spell[this.state.edit] = $(e.target).val();
        if(!this.state.spell.name) {
            this.state.remove();
            this.parent.update();
            return;
        }

        this.state.edit = false;
        this.update();
    }
}