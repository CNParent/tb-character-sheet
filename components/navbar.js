class Navbar extends Component{

    tabs = [
        { id: 'abilities', label: 'Abilities' },
        { id: 'advancement', label: 'Advancement' },
        { id: 'bio', label: 'Bio' },
        { id: 'circles', label: 'Circles' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'skills', label: 'Skills' },
        { id: 'traits', label: 'Traits' },
        { id: 'wises', label: 'Wises' }
    ]

    characters = [...new Array(window.localStorage.length)].map((x,i) => window.localStorage.key(i))

    draw() {
        return String.raw`
            <div id="${this.id}">
                <nav class="navbar navbar-expand-md navbar-light bg-light">
                    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#${this.id}_nav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div id="${this.id}_nav" class="collapse navbar-collapse">
                        <ul class="navbar-nav mr-auto">
                            ${this.tabs.map((t) => this.drawTab(t)).reduce((a,b) => `${a}${b}`)}
                            <li class="nav-item dropdown">
                                <a href="#" class="nav-link dropdown-toggle ${this.characters.length == 0 ? 'disabled' : ''}" id="${this.id}_characters" data-toggle="dropdown" >Characters</a>
                                <div class="dropdown-menu">
                                    ${this.characters.map(x => String.raw`<a href="#" data-character="${x}" class="dropdown-item">${x}</a>`).reduce((a,b) => `${a}${b}`, '')}
                                </div>
                            </li>
                        </ul>
                        <div class="navbar-nav">
                            <div class="nav-item dropdown">
                                <button class="dropdown-toggle btn btn-light border border-dark" id="${this.id}_options" data-toggle="dropdown" >Options</button>
                                <div class="dropdown-menu">
                                    <a id="${this.id}_save" href="#" class="dropdown-item">Save</a>
                                    <a id="${this.id}_export" href="#" class="dropdown-item">Export</a>
                                    <a id="${this.id}_import" href="#" class="dropdown-item">Import</a>
                                    <a id="${this.id}_delete" href="#" class="dropdown-item">Delete</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
                ${this.drawAlert()}
            </div>
        `;
    }

    drawAlert() {
        if(!this.state.alert) return '';

        let text = this.state.alert;
        this.state.alert = undefined;
        return String.raw`
            <div id="${this.id}_msg" class="alert alert-success btn w-100 text-left">
                ${text}
            </div>
        `;
    }

    drawTab = (t) => String.raw`
        <a href="#" data-tab="${t.id}" class="nav-item nav-link ${this.state.tab == t.id ? 'active' : ''}">${t.label}</a>
    `;

    initialize() {
        super.initialize();

        $(`#${this.id}_save`).click(e => {
            if(!this.parent.state.bio.name) {
                alert('Cannot save an unnamed character');
                return;
            }

            localStorage.setItem(this.parent.state.bio.name, JSON.stringify(this.parent.state));
            this.state.alert = `${this.parent.state.bio.name} saved`;
            this.parent.update();
        });

        $(`#${this.id}_export`).click(e => {
            let href = URL.createObjectURL(new Blob([JSON.stringify(this.parent.state)]));
            e.target.href = href;
            e.target.download = `${this.parent.state.bio.name}.tb2e`;
        });

        $(`#${this.id}_import`).click(e => {
            let file = $('<input type="file" accept=".tb2e">');
            file.change(this.load);
            file.click();
        });

        $(`#${this.id}_delete`).click(e => {
            if(!confirm(`Delete ${this.parent.state.bio.name}?`)) return;

            localStorage.removeItem(this.parent.state.bio.name);
            this.state.alert = `${this.parent.state.bio.name} deleted from character storage`;
            this.parent.update();
        });

        $(`#${this.id}_msg`).click(e => {
            this.state.alert = '';
            this.update();
        });

        this.find('[data-character]').click(e => {
            this.parent.state = JSON.parse(localStorage.getItem($(e.target).attr('data-character')));
            this.parent.state.navbar.alert = `${this.parent.state.bio.name} opened`;
            this.parent.update();
        });

        this.find('[data-tab]').click(e => {
            this.state.tab = $(e.target).attr('data-tab');
            this.parent.update();
        });
    }
    
    load = e => {
        e.target.files[0].text().then((t) => {
            let key = JSON.parse(t).bio.name;
            localStorage.setItem(key, t);
            this.state.alert = `${this.parent.state.bio.name} added to character storage`;
            this.parent.update();
        });
    }
}
