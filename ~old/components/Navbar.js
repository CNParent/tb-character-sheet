class Navbar extends Component{

    tabs = [
        { id: 'abilities', label: 'Abilities' },
        { id: 'advancement', label: 'Advancement' },
        { id: 'bio', label: 'Bio' },
        { id: 'circles', label: 'Circles' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'notes', label: 'Notes' },
        { id: 'skills', label: 'Skills' },
        { id: 'spells', label: 'Spells' },
        { id: 'traits', label: 'Traits' },
        { id: 'wises', label: 'Wises' }
    ]

    characters = [...new Array(localStorage.length)].map((x,i) => localStorage.key(i))

    draw() {
        this.characters.sort((a,b) => a.localeCompare(b));
        let saved = this.characters.find(x => x == this.parent.state.bio.name) != null;
        if (saved) localStorage.setItem(this.parent.state.bio.name, JSON.stringify(this.parent.state));

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
                                <a href="#" class="nav-link dropdown-toggle ${this.characters.length == 0 ? 'disabled' : ''}" id="${this.id}_characters" data-toggle="dropdown">Characters</a>
                                <div class="dropdown-menu">
                                    ${this.characters.map(x => this.drawCharacter(x)).reduce((a,b) => `${a}${b}`, '')}
                                </div>
                            </li>
                            <li class="nav-item dropdown">
                                <a href="#" class="nav-link dropdown-toggle" id="${this.id}_mods" data-toggle="dropdown" >Mods</a>
                                <div class="dropdown-menu">
                                    ${this.drawMod('colonialMarines', 'Colonial Marines')}
                                    ${this.drawMod('torchbearer', 'Torchbearer')}                                    
                                </div>
                            </li>
                        </ul>
                        <div class="navbar-nav">
                            <div class="nav-item dropdown">
                                <button class="dropdown-toggle btn btn-light border border-dark" id="${this.id}_options" data-toggle="dropdown">Options</button>
                                <div class="dropdown-menu">
                                    <a id="${this.id}_save" href="#" class="dropdown-item">Save</a>
                                    <a id="${this.id}_export" href="#" class="dropdown-item">Export</a>
                                    <a id="${this.id}_import" href="#" class="dropdown-item">Import</a>
                                    <a id="${this.id}_delete" href="#" class="dropdown-item">Delete</a>
                                    <a id="${this.id}_delete_all" href="#" class="dropdown-item">Delete all</a>
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
            <div id="${this.id}_msg" class="alert alert-static alert-success btn text-center w-100">
                <strong>${text}</strong>
            </div>
        `;
    }

    drawCharacter(name) {
        let classes = name == this.parent.state.bio.name ? 'bg-dark text-light' : '';
        return String.raw`<a href="#" data-character="${encodeURIComponent(name)}" class="dropdown-item ${classes}">${name}</a>`
    }

    drawMod(value, text) {
        let classes = this.parent.state.mod == value ? 'bg-dark text-light' : '';
        return String.raw`<a href="#" data-mod="${value}" class="dropdown-item ${classes}">${text}</a>`;
    }

    drawTab = (t) => String.raw`
        <a href="#" data-tab="${t.id}" class="nav-item nav-link ${this.state.tab == t.id ? 'active' : ''}">${t.label}</a>
    `;

    initialize() {
        super.initialize();

        _(`#${this.id}_save`).map(x => x.onclick = e => {
            if(!this.parent.state.bio.name) {
                alert('Cannot save an unnamed character');
                return;
            }

            localStorage.setItem(this.parent.state.bio.name, JSON.stringify(this.parent.state));
            this.state.alert = `${this.parent.state.bio.name} saved`;
            this.parent.update();
        });

        _(`#${this.id}_export`)[0].onclick = e => {
            let href = URL.createObjectURL(new Blob([JSON.stringify(this.parent.state)]));
            let a = document.createElement('a');
            a.href = href;
            a.download = `${this.parent.state.bio.name}.tb2e`;
            a.click();
        };

        _(`#${this.id}_import`)[0].onclick = e => {
            let file = document.createElement('input');
            file.type = 'file';
            file.accept = '.tb2e';
            file.onchange = this.load;
            file.click();
        };

        _(`#${this.id}_delete`)[0].onclick = e => {
            if(!confirm(`Delete ${this.parent.state.bio.name}?`)) return;

            localStorage.removeItem(this.parent.state.bio.name);
            this.state.alert = `${this.parent.state.bio.name} deleted from character storage`;
            this.parent.update();
        };

        _(`#${this.id}_delete_all`)[0].onclick = e => {
            if(!confirm('Delete all saved characters?')) return;

            localStorage.clear();
            this.state.alert = 'All characters deleted from character storage';
            this.parent.update();
        };

        _(`#${this.id}_msg`).map(x => x.onclick = e => {
            this.state.alert = '';
            this.update();
        });

        this.find('[data-character]').map(x => x.onclick = e => {
            let name = decodeURIComponent(x.dataset.character);
            if(name == this.parent.state.bio.name) return '';

            let alert = '';
            if(this.parent.state.bio.name && confirm(`Save ${this.parent.state.bio.name} before changing characters?`)) {
                localStorage.setItem(this.parent.state.bio.name, JSON.stringify(this.parent.state));
                alert += `${this.parent.state.bio.name} saved, `;
            }

            this.parent.state = JSON.parse(localStorage.getItem(name));
            if(!this.parent.state.mod) this.parent.state.mod = 'torchbearer';
            
            this.patch(this.parent.state, mods[this.parent.state.mod]());
            this.parent.state.navbar.alert = `${alert}${this.parent.state.bio.name} opened`;
            this.parent.update();
        });

        this.find('[data-tab]').map(x => x.onclick = e => {
            this.state.tab = x.dataset.tab;
            this.parent.update();
        });

        this.find('[data-mod]').map(x => x.onclick = e => {
            let mod = x.dataset.mod;
            this.parent.state = mods[mod]();
            this.parent.state.mod = mod;
            this.parent.update();
        });
    }
    
    load = e => {
        e.target.files[0].text().then((t) => {
            let key = JSON.parse(t).bio.name;
            localStorage.setItem(key, t);
            this.state.alert = `${key} added to character storage`;
            this.parent.update();
        });
    }

    patch(a, b) {
        for(let key in b) {
            if(!a[key]) a[key] = b[key];
            if(typeof(a[key]) == 'object')
                this.patch(a[key], b[key]);
        }
    }
}
