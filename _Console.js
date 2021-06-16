class _Console {
    constructor() {
        this.Logs = [];
    }

    Previous() {
        if (this.Logs.length > 0) {
            return this.Logs[this.Logs.length - 1];
        } else {
            return null;
        }
    }

    Log(value) {
        console.log(value);
        this.Logs.push(value);
    }

    Info(value) {
        console.log("\x1b[0m\x1b[36m" + value + "\x1b[0m");
        this.Logs.push(value);
    }

    Warning(value) {
        console.log("\x1b[0m\x1b[33m" + value + "\x1b[0m");
        this.Logs.push(value);
    }

    Error(value) {
        console.log("\x1b[0m\x1b[31m" + value + "\x1b[0m");
        this.Logs.push(value);
    }

    Success(value) {
        console.log("\x1b[0m\x1b[32m" + value + "\x1b[0m");
        this.Logs.push(value);
    }
}

module.exports = _Console;