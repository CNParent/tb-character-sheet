class Skills extends Component {
    draw() {
        return String.raw`
            <div id="${this.id}" class="container-fluid">
                <div class="row">
                    ${this.state.skills.map((x,i) => this.add(new Skill(`${this.id}_${i}`, { skill: x, edit: false })))}
                </div>
            </div>
        `;
    }
}