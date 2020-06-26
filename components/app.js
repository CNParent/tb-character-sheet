class App extends Component {
    draw = () => String.raw`
        <div id="${this.id}">
            ${this.add(new Navbar('navbar'))}
            ${this.add(new Conditions('conditions'))}
            ${this.drawContent()}
        </div>
    `;

    drawContent = () => {
        if (this.state.navbar.tab == 'abilities') return this.add(new Abilities('abilities'));
        if (this.state.navbar.tab == 'advancement') return this.add(new Advancement('advancement'));
        if (this.state.navbar.tab == 'bio') return this.add(new Bio('bio'));
        if (this.state.navbar.tab == 'circles') return this.add(new Circles('circles'));
        if (this.state.navbar.tab == 'traits') return this.add(new Traits('traits', { traits: this.state.traits, edit: false }));
        if (this.state.navbar.tab == 'wises') return this.add(new Wises('wises', { wises: this.state.wises, edit: false }))
    }
}