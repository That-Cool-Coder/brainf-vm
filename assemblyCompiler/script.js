const projectSavePrefix = 'savedAssemblyProject-';
const noProjectsText = '-- No projects --';

const textForEmptyInput =
`section d
s message 12 Hello World!

section t
cls
outa message
`

const projectSelector = spnr.dom.id('projectSelector');
const editorParent = spnr.dom.id('assemblyEditor').parentElement;
const editor = CodeMirror.fromTextArea(spnr.dom.id('assemblyEditor'), {
    lineNumbers: true,
    lineWrapping: true
});
editor.setValue(textForEmptyInput);
resizeEditor();

var crntProjectName = 'unnamed';
const outputBox = spnr.dom.id('brainFOut');
const debugCheckbox = spnr.dom.id('debugCheckbox');

function resizeEditor() {
    // Can't get editor to stay within bounds of parent element using css,
    // so force it through code
    const factor = 0.95;
    editor.setSize(editorParent.clientWidth * factor, editorParent.clientHeight * factor);
}

function compile() {
    var debug = debugCheckbox.checked;
    outputBox.value = AssemblyCompiler.compile(editor.getValue(), debug);
}

function copyBrainF() {
    var text = spnr.dom.id('brainFOut').value;
    spnr.dom.id('brainFOut').setSelectionRange(0, text.length);
    spnr.dom.id('brainFOut').focus();
    document.execCommand('copy');
}

function cleanProjectName(name) {
    // Remove the prefix from the start
    return name.slice(projectSavePrefix.length);
}

function loadProjects() {
    var projects = {};
    spnr.obj.keys(localStorage).forEach(key => {
        if (key.includes(projectSavePrefix)) {
            projects[cleanProjectName(key)] = localStorage[key];
        }
    });

    return projects;
}

function populateProjectSelector() {
    var projects = loadProjects();
    var projectNames = spnr.obj.keys(projects);

    [...projectSelector.children].forEach(child => {
        projectSelector.removeChild(child);
    });
    if (projectNames.length == 0) {
        var elem = document.createElement('option');
        elem.innerText = noProjectsText;
        projectSelector.appendChild(elem);
    }
    else {
        projectNames.forEach(name => {
            var elem = document.createElement('option');
            elem.innerText = name;
            elem.value = name;
            projectSelector.appendChild(elem);
        })
    }
    if (crntProjectName != null) projectSelector.value = crntProjectName;
    else {
        crntProjectName = projectSelector.children[0].value;
    }
}

function saveCrntProject() {
    localStorage[projectSavePrefix + crntProjectName] = editor.getValue();
    populateProjectSelector();
}

function tryLoadSelectedProject() {
    var projects = loadProjects();
    if (spnr.obj.keys(projects).length > 0) {
        crntProjectName = projectSelector.value;
        editor.setValue(projects[crntProjectName]);
    }
}

function tryDeleteCrntProject() {
    if (crntProjectName != null) {
        if (confirm('Are you sure you want to delete this project?')) {
            localStorage.removeItem(projectSavePrefix + crntProjectName);
            populateProjectSelector();
        }
    }
}

function createNewProject() {
    var newProjectName = prompt('Enter name of new project');

    // Catch all falsy values
    if (newProjectName == null) return;

    // The placeholder name is not allowed
    if (newProjectName == noProjectsText) {
        alert('This name is not allowed');
        return;
    }

    if (newProjectName.includes(projectSavePrefix)) {
        alert(`Project names can't contain "${projectSavePrefix}"`);
        return;
    }

    // For some reason spaces break the selector
    if (newProjectName.includes(' ')) {
        alert('Spaces are not allowed in project names');
        return;
    }

    saveCrntProject(); // save previous project
    crntProjectName = newProjectName;
    editor.setValue(textForEmptyInput);
    saveCrntProject();
}

function renameCrntProject() {
    // todo: code this
}

var projects = loadProjects();
if (spnr.obj.keys(projects).length > 0) {
    crntProjectName = spnr.obj.keys(projects)[0];
    console.log(crntProjectName)
    editor.setValue(projects[crntProjectName]);
}

populateProjectSelector();
editor.on("change", saveCrntProject);

window.addEventListener('resize', resizeEditor);