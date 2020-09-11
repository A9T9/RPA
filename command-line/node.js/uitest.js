const child_process = require('child_process');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

//Screencast of running script: https://youtu.be/KAd4d0waPQg

// Change the values here to configure the script
const
    timeoutSeconds = 50,

    repeatIntervalSeconds = 2,

    // *THIS MUST BE THE BROWSER DOWNLOAD FOLDER*, as specified in the browser settings
    downloadDirPath = 'c:\\test\\',

    autorunHtmlPath = 'c://test//ui.vision.html',
    browserPath = 'c:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	
	//macOS Example paths
	//downloadDirPath = '/Users/uitest/Downloads',
    //autorunHtmlPath = '/Users/uitest/WebstormProjects/uitest/ui.vision.html',
    //browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

    closeRPA = true,
    closeBrowser = true,


    macro = "Demo/Core/DemoFrames", //internal storage macro names are case sensitive
    cmdVar1 = '-',
    cmdVar2 = '-',
    cmdVar3 = '-';

run().catch(reason => {
    console.error(reason);
    process.exit(1);
});


// Run the script in a loop
async function run() {
    for (let i = 1; true; i++) {
        try {
            const res = await playAndWait(macro, [cmdVar1, cmdVar2, cmdVar3],
                                          { timeoutSeconds, downloadDirPath, autorunHtmlPath, browserPath,
                                            closeRPA, closeBrowser });
            console.log(`[#${i}] Macro run successful.\nExecution time: ${res.executionTimeMs / 1000} secs.\nStatus: ${res.statusText}\n`);
        } catch (e) {
            console.error(e);
        }
        // delay
        await new Promise(resolve => {setTimeout(resolve, repeatIntervalSeconds * 1000)});
    }

}



async function playAndWait(macro, cmdVars,
                           { timeoutSeconds, downloadDirPath, autorunHtmlPath, browserPath,
                             closeRPA, closeBrowser }) {

    // Check if macro is defined
    if (macro === undefined) {
        console.error('Macro must be defined');
        process.exit(2);
    }

    // Set default values for cmd_vars 1-3
    const cmdVar1 = cmdVars[0] || '-';
    const cmdVar2 = cmdVars[1] || '-';
    const cmdVar3 = cmdVars[2] || '-';

    // bool -> int
    closeRPA = closeRPA ? 1 : 0;
    closeBrowser = closeBrowser ? 1 : 0;

    // Set default timeout of 10 seconds
    const processTimeoutSeconds = timeoutSeconds || 10;

    // Asynchronously check if paths exist
    try {
        await Promise.all([
            fsPromises.access(downloadDirPath, fs.constants.F_OK),
            fsPromises.access(autorunHtmlPath, fs.constants.F_OK),
            fsPromises.access(browserPath, fs.constants.F_OK)
        ]);
    } catch (e) {
        console.error(e);
        process.exit(2);
    }

    // Create log file name like log_2019-12-20T16-37-00.txt
    // The date is in the UTC timezone
    const date = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
    const logFile = `logRPA_${date}.txt`;
    const logPath = path.join(downloadDirPath, logFile);

    // Save the time of the beginning of execution
    const startDate = new Date();

    // Make the browser argument string
    const args = `file:///${autorunHtmlPath}?macro=${macro}&cmd_var1=${cmdVar1}&cmd_var2=${cmdVar2}&cmd_var3=${cmdVar3}&closeRPA=${closeRPA}&closeBrowser=${closeBrowser}&direct=1&savelog=${logFile}`;

    // Spawn the browser process
    const browserProcess = child_process.spawn(browserPath, [args]);


    // Log elapsed time every second
    let timeElapsedTimeout;
    const timeElapsedFunc = (timeElapsed) => {
        timeElapsed = timeElapsed || 0;
        console.log('Waiting for macro to finish, seconds =', timeElapsed);
        timeElapsedTimeout = setTimeout(timeElapsedFunc, 1000, timeElapsed + 1)
    };
    timeElapsedTimeout = setTimeout(timeElapsedFunc, 0);


    return await new Promise((resolve, reject) => {

        // Set up process error handler
        browserProcess.on('error', reject);


        // Set timeout for the process to run
        const processTimeout = setTimeout(() => {
            clearTimeout(timeElapsedTimeout);
            browserProcess.kill() ?
                console.log('Killed the browser process') :
                console.error("Couldn't kill the browser process");
            reject(new Error(`Macro did not complete withing the time given: ${processTimeoutSeconds} seconds`));
        }, processTimeoutSeconds * 1000);


        // Watch the log file
        fs.watchFile(logPath, { persistent: false, interval: 1000 },
            async (curr, prev) => {
                // if the file was just created
                if (curr.mtimeMs !== 0 && prev.mtimeMs === 0) {
                    clearTimeout(processTimeout);
                    clearTimeout(timeElapsedTimeout);

                    const line = await readFirstLine(logPath);

                    const result = {
                        statusText: line,
                        executionTimeMs: (new Date() - startDate),
                    };

                    if (line.search('Status=OK') === -1) {
                        // Something went wrong during macro execution
                        reject(result);
                    } else {
                        // Macro executed successfully
                        resolve(result);
                    }
                }
            }
        );
    });
}


function readFirstLine(filePath, options) {
    // A helper function to read the first line of a file

    // Set defaults
    const { encoding, lineEnding } = {...options, encoding: 'utf8', lineEnding: '\n'};

    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath, {encoding: encoding});
        let readData = '';
        let pos = 0;
        let index;
        readStream
            .on('data', chunk => {
                index = chunk.indexOf(lineEnding);
                readData += chunk;
                if (index === -1) {
                    pos += chunk.length;
                } else {
                    pos += index;
                    readStream.close();
                }
            })
            .on('close', () => resolve(readData.slice(readData.charCodeAt(0) === 0xFEFF ? 1 : 0, pos)))
            .on('error', err => reject(err));
    });
}
