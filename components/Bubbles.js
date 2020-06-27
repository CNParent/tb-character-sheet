class Bubbles extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="d-flex w-100">
                <small class="align-self-center" style="width: 3em;">${this.state.label}</small>
                <div>
                    ${[...new Array(this.state.count)].map((x,i) => this.drawBubble(i)).reduce((a,b) => `${a}${b}`, '')}
                </div>
            </div>
        `;
    }

    drawBubble(i) {
        let bg = this.state.value > i ? 'btn-dark' : 'btn-light';
        return String.raw`<div data-index="${i}" class="bubble btn ${bg} border border-dark"></div>`;
    }

    initialize() {
        super.initialize();

        this.find('[data-index]').on('click touch', e => {
            let i = Number($(e.target).attr('data-index'));
            if(this.state.value > i) this.state.value = i;
            else this.state.value = i + 1;

            this.state.set(this.state.value);
            this.update();
        });
    }
}