class Spell extends Component{

    circles = [
        '1st Circle',
        '2nd Circle',
        '3rd Circle',
        '4th Circle',
        '5th Circle'
    ]

    draw() {
        return String.raw`
            <div id="${this.id}" class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex">
                            <h4 class="flex-grow-1"><button class="badge btn btn-light w-100 text-left">${this.state.spell.name}</button></h4>
                            <button class="align-self-center badge btn ${this.state.memorized ? 'btn-dark' : 'btn-light border'} ml-1 p-2">&check;</button>
                        </div>
                        <div class="d-flex">
                            <h5><button class="badge btn btn-dark w-100 text-left">${this.circles[this.state.spell.circle - 1]}</button></h5>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    textarea() {

    }
}