const assemblySaveKey = 'savedAssemblyCode';

wrk.dom.id('assemblyIn').value = localStorage.getItem(assemblySaveKey) || '';

wrk.dom.id('assemblyIn').addEventListener('keyup', () => {
    localStorage.setItem(assemblySaveKey, wrk.dom.id('assemblyIn').value);
})

function compile() {
    var inputBox = wrk.dom.id('assemblyIn');
    var outputBox = wrk.dom.id('brainFOut');

    var debug = wrk.dom.id('debugCheckbox').checked;

    outputBox.value = AssemblyToBf.compile(inputBox.value, debug);
}

function copyBrainF() {
    var text = wrk.dom.id('brainFOut').value;
    wrk.dom.id('brainFOut').setSelectionRange(0, text.length);
    wrk.dom.id('brainFOut').focus();
    document.execCommand('copy');
}