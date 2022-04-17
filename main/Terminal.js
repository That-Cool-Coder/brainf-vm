class Terminal {
    /* This terminal prints only ASCII characters.

    Here's an overiew of some control characters used when printing:
    0: null char, does nothing and doesn't move cursor
    2: start of text, moves cursor to top left
    4: end of transmission, clears screen
    7: bell char, planned: make bell noise
    10: newline, moves cursor down one line (not changing column)
    13: carriage return, moves cursor to the start of current line
    17: device control 1, moves cursor to left
    18: device control 2, moves cursor to right
    19: device control 3, moves cursor up one line
    20: device control 4, moves cursor down one line

    Here's an overview of key code conversion used when taking input:
    Left arrow key: 17
    Right arrow key: 18
    Up arrow key: 19
    Down arrow key: 20
    */

    plainAsciiKeys = spnr.str.alphabet
        .concat(spnr.str.symbols)
        .concat(spnr.str.digits)
        .concat([' ']);
    keyNameToAsciiCode = {
        // (please order this numerically)

        'Backspace' : 8,
        'Enter' : 10,
        'ArrowLeft' : 17,
        'ArrowRight' : 18,
        'ArrowUp' : 19,
        'ArrowDown' : 20,
        'Delete' : 127
    }

    constructor(parentElem=document.body, size=spnr.v(80, 30)) {
        this.parentElem = parentElem;
        this.size = spnr.v.copy(size);

        this.setupElements();

        this.isRunningCode = false;
        this.inputHistory = [];
        this.historyIndexFromEnd = 0;
        this.cursorPos = spnr.v(0, 0);

        this.clear();
    }

    setupElements() {
        this.mainDiv = document.createElement('div');
        this.mainDiv.tabIndex = 0;
        this.mainDiv.classList.add('terminal');
        this.parentElem.appendChild(this.mainDiv);

        this.outputHolder = document.createElement('p');
        this.outputHolder.classList.add('terminalText');
        this.outputHolder.style.maxHeight = this.mainDiv.clientHeight - 20 + 'px';
        this.outputHolder.style.overflowY = 'scroll';
        this.mainDiv.appendChild(this.outputHolder);

        this.inputBox = document.createElement('input');
        this.inputBox.classList.add('terminalText', 'terminalInput');
        this.mainDiv.appendChild(this.inputBox);
        this.inputBox.focus();

        // Keyboard shortcut listener
        this.mainDiv.addEventListener("keyup", e => {
            if (! this.isRunningCode) {
                if (e.key == 'Enter') this.enterCommand();
                if (e.key == 'ArrowUp') this.previousHistoryItem();
                if (e.key == 'ArrowDown') this.nextHistoryItem();
            }
        });

        // Focus the writing area when clicked
        // and copy text from output area when mouse dragged over
        this.mainDiv.addEventListener('click', e => {
            var selection = '';
            if (window.getSelection) {
                selection = window.getSelection().toString();
            } else if (document.selection && document.selection.type != "Control") {
                selection = document.selection.createRange().text;
            }
            selection = this._removeExtraWhitespace(selection);

            if (selection != '' && selection != ' ') {
                var elem = document.createElement('textarea');
                document.body.appendChild(elem);
                elem.value = selection;
                elem.select();
                document.execCommand('copy');
                document.body.removeChild(elem);
            }

            this.inputBox.focus();
        })
    }

    clear() {
        var spaces = ' '.repeat(this.size.x);
        this.content = new Array(this.size.y).fill(spaces);
        this._updateOutputHolder();
    }

    linkVirtualMachine(machine) {
        this.virtualMachine = machine;
    }

    async getChar() {
        var event = await this._waitForKeypress();
        if (this.plainAsciiKeys.includes(event.key)) return event.key.charCodeAt();
        else if (event.key in this.keyNameToAsciiCode) return this.keyNameToAsciiCode[event.key];
        else return null; // character invalid
    }

    async enterCommand() {
        if (this.virtualMachine !== null) {
            this.isRunningCode = true;

            var command = this.inputBox.value;
            this.inputBox.value = '';
            this.write(command + '\r\n');
            this.historyIndexFromEnd = 0;
            this.inputHistory.push(command);
            await this.virtualMachine.run(command);

            // Pause for a brief moment to stop a getline also registering as a submit
            setTimeout(() => {
                this.isRunningCode = false;
            }, 10);
        }
    }

    get contentUnderCursor() {
        return this.content[this.cursorPos.y][this.cursorPos.x];
    }

    set contentUnderCursor(value) {
        var crntLine = this.content[this.cursorPos.y];
        var newString = crntLine.slice(0, this.cursorPos.x) +
            value + crntLine.slice(this.cursorPos.x + 1);
        this.content[this.cursorPos.y] = newString;
    }

    scrollDown(distance) {
        // Scroll terminal down by distance deleting lines that are offscreen
        for (var i = 0; i < distance; i ++) {
            var crntLine = this.content.shift();
            crntLine = ' '.repeat(this.size.x);
            this.content.push(crntLine);
        }
    }

    write(data) {
        for (var charIdx = 0; charIdx < data.length; charIdx ++) {
            var crntChar = data[charIdx];
            switch(crntChar) {
                case '\n':
                    this.cursorPos.y ++;
                    break;
                case '\r':
                    this.cursorPos.x = 0;
                    break;
                case '\0':
                    // Do nothing
                    break;
                case String.fromCharCode(2):
                    this.cursorPos.x = 0;
                    this.cursorPos.y = 0;
                    break;
                case String.fromCharCode(4):
                    this.cursorPos.x = 0;
                    this.cursorPos.y = 0;
                    this.clear();
                    break;
                case String.fromCharCode(17):
                    this.cursorPos.x --;
                    break;
                case String.fromCharCode(18):
                    this.cursorPos.x ++;
                    break;
                case String.fromCharCode(19):
                    this.cursorPos.y --;
                    break;
                case String.fromCharCode(20):
                    this.cursorPos.y ++;
                    break;
                default:
                    this.contentUnderCursor = crntChar;
                    this.cursorPos.x ++;
                    break;

            }
            if (this.cursorPos.x < 0) {
                this.cursorPos.x = 0;
            }
            if (this.cursorPos.x >= this.size.x) {
                this.cursorPos.x = 0;
                this.cursorPos.y ++;
            }
            if (this.cursorPos.y >= this.size.y) {
                this.cursorPos.y --;
                this.scrollDown(1);
            }
        }

        this._updateOutputHolder();
    }

    previousHistoryItem() {
        if (this.inputHistory.length >= 1) {
            this.historyIndexFromEnd ++;
            if (this.historyIndexFromEnd >= this.inputHistory.length) {
                this.historyIndexFromEnd = this.inputHistory.length;
            }

            this.inputBox.value = this.inputHistory[this.inputHistory.length -
                this.historyIndexFromEnd];
        }
    }

    nextHistoryItem() {
        if (this.inputHistory.length >= 1) {
            this.historyIndexFromEnd --;
            if (this.historyIndexFromEnd < 0) {
                this.historyIndexFromEnd = 0;
            }

            this.inputBox.value = this.inputHistory[this.inputHistory.length -
                this.historyIndexFromEnd];
        }
    }

    _removeExtraWhitespace(text) {
        text = text.replace(/\r/g, ''); // remove carriage returns
        var lines = text.split('\n');
        var trimmedLines = [];

        // First, trim trailing spaces
        lines.forEach(line => {
            while (line[line.length - 1] == ' ') {
                line = line.slice(0, line.length - 2); // of course String.pop() doesn't exist :(
            }
            trimmedLines.push(line);
        });

        // Then trim trailing empty lines
        if (trimmedLines.length > 0) {
            while (trimmedLines[trimmedLines.length - 1].length == 0) {
                trimmedLines.pop();
                if (trimmedLines.length == 0) break;
            }
        }

        return trimmedLines.join('\n');
    }

    _waitForKeypress() {
        return new Promise((resolve) => {
            // Use an arrow function here so that scope is correct
            // also so that we can delete it afterwards
            var onKeyHandler = e => {
                this.mainDiv.removeEventListener('keydown', onKeyHandler);
                resolve(e);
                e.preventDefault();
            }
            this.mainDiv.focus();
            this.mainDiv.addEventListener('keydown', onKeyHandler);
        });
    }

    _updateOutputHolder() {
        this.outputHolder.innerText = this.content.join('\n');
    }
}