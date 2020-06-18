class Bio extends Component {

    stockOptions = ['', 'Dwarf', 'Elf', 'Halfling', 'Human']
    classOptions = ['', 'Outcast', 'Ranger', 'Burglar', 'Theurge', 'Magician', 'Warrior']
    alignOptions = ['', 'Law', 'Unaligned', 'Chaos']

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                ${this.input('Name', 'name')}
                                ${this.select('Stock', 'stock', this.stockOptions)}
                                ${this.select('Class', 'classValue', this.classOptions)}
                                ${this.input('Home', 'home')}
                                ${this.input('Raiment', 'raiment')}
                            </div>
                            <div class="col-md-6">
                                ${this.input('Parents', 'parents')}
                                ${this.input('Mentor', 'mentor')}
                                ${this.input("Age", 'age')}
                                ${this.input('Level', 'level')}
                                ${this.select('Alignment', 'alignment', this.alignOptions)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        ${this.textArea('Belief', 'belief')}
                        ${this.textArea('Creed', 'creed')}
                        ${this.textArea('Goal', 'goal')}
                        ${this.textArea('Instinct', 'instinct')}
                    </div>
                </div>
            </div>
        `
    }
}