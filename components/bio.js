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
                            ${this.input('Name', 'name')}
                            ${this.input('Parents', 'parents')}
                        </div>
                        <div class="row">
                            ${this.select('Stock', 'stock', this.stockOptions)}
                            ${this.input('Mentor', 'mentor')}
                        </div>
                        <div class="row">
                            ${this.select('Class', 'classValue', this.classOptions)}
                            ${this.input("Age", 'age')}
                        </div>
                        <div class="row">
                            ${this.input('Home', 'home')}
                            ${this.input('Level', 'level')}
                        </div>
                        <div class="row">
                            ${this.input('Raiment', 'raiment')}
                            ${this.select('Alignment', 'alignment', this.alignOptions)}
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