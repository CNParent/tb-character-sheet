const theme = localStorage['theme'] ?? 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function setTheme(name) {
    localStorage['theme'] = name;
    window.location.reload(true);
}

console.log('Preferred theme is ' + theme)
export {theme, setTheme};
