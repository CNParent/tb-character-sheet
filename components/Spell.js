class Spell extends Component{

    circles = [
        '1st Circle',
        '2nd Circle',
        '3rd Circle',
        '4th Circle',
        '5th Circle'
    ]

    draw() {
        if(this.isHidden()) return '';

        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            <h4 class="flex-grow-1"><button class="badge btn btn-light w-100 text-left">${this.state.spell.name}</button></h4>
                            ${this.drawMemorized()}
                        </div>
                        <div class="d-flex">
                            <h5><button data-circle="" class="badge btn btn-dark w-100 text-left">${this.circles[this.state.spell.circle - 1]}</button></h5>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawMemorized() {
        if(!this.state.canMemorize && !this.state.spell.memorized) return '';

        return String.raw`
            <button data-memorized="" class="align-self-center badge btn ${this.state.spell.memorized ? 'btn-dark' : 'btn-light border'} ml-1 p-2">&check;</button>
        `;
    }

    isHidden() {
        if(this.state.show == 'memory' && !this.state.spell.memorized) return true;

        return false;
    }

    textarea() {
    }

    initialize() {
        super.initialize();

        this.find('[data-circle]').click(e => {
            this.state.spell.circle += e.originalEvent.shiftKey ? -1 : 1;
            if(this.state.spell.circle < 1) this.state.spell.circle = this.circles.length;
            if(this.state.spell.circle > this.circles.length) this.state.spell.circle = 1;

            this.parent.update(); // Impacts memory palace
        });

        this.find('[data-memorized]').click(e => {
            this.state.spell.memorized = !this.state.spell.memorized;
            this.parent.update(); // Impacts memory palace
        });
    }
}