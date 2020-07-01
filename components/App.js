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
        if (this.state.navbar.tab == 'inventory') return this.add(new Inventory('inventory'));
        if (this.state.navbar.tab == 'notes') return this.add(new Notes('notes', { notes: this.state.notes }));
        if (this.state.navbar.tab == 'skills') return this.add(new Skills('skills', { skills: this.state.skills, edit: false }));
        if (this.state.navbar.tab == 'spells') return this.add(new Spells('spells'));
        if (this.state.navbar.tab == 'traits') return this.add(new Traits('traits'));
        if (this.state.navbar.tab == 'wises') return this.add(new Wises('wises'))

        return '';
    }

    initialize() {
        super.initialize();
        
        this.find('textarea').on('keyup focus', e => {
            if(Number(e.target.style.height.replace('px', '')) > e.target.scrollHeight)
                return;

            e.target.style.height = `${e.target.scrollHeight + 5}px`;
        });
    }
}
