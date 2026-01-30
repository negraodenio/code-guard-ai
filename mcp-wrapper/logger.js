module.exports = {
    logger: {
        info: (...args) => console.error('[INFO]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        debug: (...args) => {
            if (process.env.DEBUG) console.error('[DEBUG]', ...args);
        }
    }
};
