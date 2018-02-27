module.exports = ({
    enabled = true,
    enabledTypes = {}
}) => {
    const consoleOverrides = ['log', 'error', 'debug', 'trace', 'warn', 'info'];
    const konsole = {};
    consoleOverrides.forEach((key) => {
        konsole[key] = console[key];
    });

    var consoleHolder = console;
    var logId = 0;
    (() => {
        if (enabled) {
            consoleHolder = console;
            const len = (num) => (num + '').length;
            const padded = ((padding, num) => String(padding + num).slice(-len(padding) - (len(padding) < len(num) ? (len(num) - len(padding)) : 0)));

            Object.keys(consoleHolder).forEach(function(key) {
                if (consoleOverrides.indexOf(key) >= 0) {
                    console[key] = (...args) => {
                        if (enabledTypes[key]) {
                            konsole[key](padded('           ', `[${key}]`).toUpperCase(), '|', padded('00000000', ++logId), '|', new Date().toUTCString(), '|', args);
                        }
                    };
                }
                else {
                    console[key] = function() {};
                }
            });
        }
        else {
            console = consoleHolder;
        }
    })();
};