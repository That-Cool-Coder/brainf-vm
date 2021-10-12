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
const inputBox = spnr.dom.id('assemblyIn');
const outputBox = spnr.dom.id('brainFOut');
const debugCheckbox = spnr.dom.id('debugCheckbox');

inputBox.value = textForEmptyInput;

var crntProjectName = 'unnamed';

function compile() {
    var debug = debugCheckbox.checked;
    outputBox.value = AssemblyToBf.compile(inputBox.value, debug);
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
            projects[key] = localStorage[key];
        }
    });

    return projects;
}

function populateProjectSelector() {
    var projects = loadProjects();
    var cleanProjectNames = spnr.obj.keys(projects).map(cleanProjectName);

    [...projectSelector.children].forEach(child => {
        projectSelector.removeChild(child);
    });
    if (cleanProjectNames.length == 0) {
        var elem = document.createElement('option');
        elem.innerText = noProjectsText;
        projectSelector.appendChild(elem);
    }
    else {
        cleanProjectNames.forEach(name => {
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
    localStorage[projectSavePrefix + crntProjectName] = inputBox.value;
    populateProjectSelector();
}

function tryLoadSelectedProject() {
    var projects = loadProjects();
    var selectedProjectName = [];
    if (spnr.obj.keys(projects).length > 0) {
        crntProjectName = projectSavePrefix + projectSelector.value;
        inputBox.value = projects[crntProjectName];
        crntProjectName = cleanProjectName(crntProjectName); // remove prefix AFTER reading project
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

    // For some reason spaces break the selector
    if (newProjectName.includes(' ')) {
        alert('Spaces are not allowed in project names');
        return;
    }

    saveCrntProject(); // save previous project
    crntProjectName = newProjectName;
    inputBox.value = textForEmptyInput;
    saveCrntProject();
}

function renameCrntProject() {

}

var projects = loadProjects();
if (spnr.obj.keys(projects).length > 0) {
    crntProjectName = spnr.obj.keys(projects)[0];
    inputBox.value = projects[crntProjectName];
    crntProjectName = cleanProjectName(crntProjectName); // remove prefix AFTER reading project
}

populateProjectSelector();
inputBox.addEventListener('keyup', saveCrntProject);