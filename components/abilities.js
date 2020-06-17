class Abilities extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col-md-6">
                        ${this.add(new Ability('health'))}
                        ${this.add(new Ability('will'))}
                        ${this.add(new Nature('nature'))}
                    </div>
                    <div class="col-md-6">
                        ${this.add(new Ability('resources'))}
                        ${this.add(new Ability('circles'))}
                    </div>
                </div>
            </div>
        `;
    }

}