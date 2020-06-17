class Abilities extends Component {

    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    <div class="col">
                        ${this.add(new Ability('health'))}
                        ${this.add(new Ability('will'))}
                    </div>
                </div>
            </div>
        `;
    }

}