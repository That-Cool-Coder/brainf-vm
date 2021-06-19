class Terminal {
    constructor(virtualMachine=null, parentElem=document.body) {
        this.parentElem = parentElem;
        this.virtualMachine = virtualMachine;

        this.setupElements();

        this.isRunningCode = false;

        this.inputHistory = [];
        this.historyIndexFromEnd = 0;
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

        this.mainDiv.addEventListener("keyup", e => {
            if (! this.isRunningCode) {
                // If it is enter key, submit
                if (e.keyCode == 13) this.enterCommand();
                // If it is up key, go up in history
                if (e.keyCode == 38) this.previousHistoryItem();
                // If it is down key, go down in history
                if (e.keyCode == 40) this.nextHistoryItem();
            }
        });
    }

    linkVirtualMachine(machine) {
        this.virtualMachine = machine;
    }

    waitForKeypress() {
        return new Promise((resolve) => {
            // Use an arrow function here so that scope is correct
            // also so that we can delete it afterwards
            var onKeyHandler = e => {
                this.mainDiv.removeEventListener('keypress', onKeyHandler);
                resolve(e.keyCode);
                e.preventDefault();
            }
            this.mainDiv.focus();
            this.mainDiv.addEventListener('keypress', onKeyHandler);
        });
    }

    async getChar() {
        var keyCode = await this.waitForKeypress();
        return keyCode;
    }

    async enterCommand() {
        if (this.virtualMachine !== null) {
            this.isRunningCode = true;

            var command = this.inputBox.value;
            this.inputBox.value = '';
            this.write(command + '\n');
            this.historyIndexFromEnd = 0;
            this.inputHistory.push(command);
            await this.virtualMachine.run(command);

            // Pause for a brief moment to stop a getline also registering as a submit
            setTimeout(() => {
                this.isRunningCode = false;
            }, 10);
        }
    }

    write(data) {
        this.outputHolder.innerText += data;
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
}