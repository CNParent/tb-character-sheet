class Conditions extends Component{

    help = [
        { title: 'Fresh' , text: '+1D to all tests until other condition.' },
        { title: 'Hungry and Thirsty', text: '-1 disposition to any conflict.' },
        { title: 'Angry (Ob 2 Will)', text: "Can't use wises or beneficial traits." },
        { title: 'Afraid (Ob 3 Will)', text: "Can't help or use Beginner's Luck." },
        { title: 'Exhausted (Ob 3 Health)', text: 'Factor in all tests except Resources, Circles, and recovery.' },
        { title: 'Injured (Ob 4 Health)', text: '-1D to skills, Nature, Will, and Health (but not recovery).' },
        { title: 'Sick (Ob 3 Will)', text: "-1D to skills, Nature, Will, and Health (but not recovery). Can't practice, learn, or advance." },
        { title: 'Dead', text: "May not use wises, test, or help." }
    ]

    draw() {
        if(!this.state.show) return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div data-open="" class="btn btn-light border border-dark col">
                    Conditions
                </div>
            </div>
        `;

        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body d-flex flex-wrap">
                        ${this.drawCondition('Fresh', 'fresh')}
                        ${this.drawCondition('Hungry and Thirsty', 'hungry')}
                        ${this.drawCondition('Angry', 'angry')}
                        ${this.drawCondition('Afraid', 'afraid')}
                        ${this.drawCondition('Exhausted', 'exhausted')}
                        ${this.drawCondition('Injured', 'injured')}
                        ${this.drawCondition('Sick', 'sick')}
                        ${this.drawCondition('Dead', 'dead')}
                    </div>
                    <div class="btn-group position-topright">
                        <span class="btn badge btn-info" data-toggle="modal" data-target="#${this.id}_help">?</span>
                        <span class="btn badge btn-danger" data-close="">&cross;</span>
                    </div>
                </div>
                <div class="modal fade" id="${this.id}_help" tabindex="-1">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Conditions</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span aria-hidden="true">&cross;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                ${this.help.map(x => this.drawHelp(x)).reduce((a,b) => `${a}${b}`, '')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    drawCondition(condition, prop) {
        let bg = this.state.conditions[prop] ? 'btn-dark' : 'btn-light'
        let modal = `${this.id}_modal_${prop}`;
        return String.raw`
            <button class="border border-dark btn ${bg} m-1" data-condition="${prop}">${condition}</button>
        `;
    }

    drawHelp(x) {
        return String.raw`
            <h5>${x.title}</h5>
            <p>${x.text}</p>
        `;
    }

    initialize() {
        super.initialize();

        this.find('[data-condition]').on('click touch', (e) => {
            let prop = $(e.target).attr('data-condition');
            this.state.conditions[prop] = !this.state.conditions[prop];
            this.update();
        });

        this.find('[data-close]').on('click touch', e => {
            this.state.show = false;
            this.update();
        });

        this.find('[data-open]').on('click touch', e => {
            this.state.show = true;
            this.update();
        });
    }
}