class App extends Component {
    draw = () => String.raw`
        <div id="${this.id}">
            ${this.add(new Navbar('navbar'))}
            ${this.add(new Conditions('conditions', { conditions: this.state.conditions, show: true }))}
            ${this.drawContent()}
        </div>
    `;

    drawContent = () => {
        if (this.state.navbar.tab == 'abilities') return this.add(new Abilities('abilities'));
        if (this.state.navbar.tab == 'advancement') return this.add(new Advancement('advancement'));
        if (this.state.navbar.tab == 'bio') return this.add(new Bio('bio'));
        if (this.state.navbar.tab == 'traits') return this.add(new Traits('traits'));
    }
}