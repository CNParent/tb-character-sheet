import mods from '../models/mods.js'

const patch = (a, b) => {
    for(let key in b) {
        if(!a[key]) a[key] = b[key];
        if(typeof(a[key]) == 'object') {
            patch(a[key], b[key]);
        }
    }
}

export default {
    delete: (model) => {
        if(!confirm(`Delete ${model.bio.name}?`)) return;

        localStorage.removeItem(model.bio.name);
        return { success: `${model.bio.name} deleted from character storage` };
    },
    deleteAll: () => {
        if(!confirm('Delete all saved characters?')) return;

        localStorage.clear();
        return { success: 'All characters deleted from character storage' };
    },
    export: (model) => {
        let href = URL.createObjectURL(new Blob([JSON.stringify(model)]));
        let a = document.createElement('a');
        a.href = href;
        a.download = `${model.bio.name}.tb2e`;
        a.click();
    },
    import: (done) => {
        let file = document.createElement('input');
        file.type = 'file';
        file.accept = '.tb2e';
        file.onchange = (e) => {
            e.target.files[0].text().then((t) => {
                let key = JSON.parse(t).bio.name;
                localStorage.setItem(key, t);
                done(`${key} added to character storage`);
            });
        };
        file.click();
    },
    load: (model, key) => {
        let name = key;
        if(name == model.bio.name) return { model };

        let alert = '';
        if(model.bio.name && confirm(`Save ${model.bio.name} before changing characters?`)) {
            localStorage.setItem(model.bio.name, JSON.stringify(model));
            alert += `${model.bio.name} saved, `;
        }

        model = JSON.parse(localStorage.getItem(name));
        if(!model.mod) model.mod = 'torchbearer';
        
        patch(model, mods[model.mod]());
        return { model, alert: { success: `${alert}${model.bio.name} opened` }};
    },
    loadList: () => {
        let characters = [...new Array(window.localStorage.length)].map((x,i) => window.localStorage.key(i));
        characters.sort((a,b) => a.localeCompare(b));
        return characters;
    },
    loadMod: (model, mod) => {
        let alert = '';
        if(model.bio.name && confirm(`Save ${model.bio.name} before changing characters?`)) {
            localStorage.setItem(model.bio.name, JSON.stringify(model));
            alert += `${model.bio.name} saved, `;
        }

        model = mods[mod]();
        return { model, alert: { success: `${alert}${mod} loaded` }};
    },
    save: (model) => {
        if(!model.bio.name)
            return { error: 'Cannot save an unnamed character' };

        localStorage.setItem(model.bio.name, JSON.stringify(model));
        return { success: `${model.bio.name} saved` };
    }
};