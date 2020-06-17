class Abilities extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col">
                        ${this.add(new Ability('health'))}
                        ${this.add(new Ability('will'))}
                        ${this.add(new Ability('resources'))}
                        ${this.add(new Ability('circles'))}
                    </div>
                </div>
            </div>
        `;
    }

}