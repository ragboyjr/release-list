const spawn = require('child_process').spawn;

function promiseWrapProc(proc) {
    return new Promise((resolve, reject) => {
        var stdout = '';
        var stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data;
        });
        proc.stderr.on('data', (data) => {
            stderr += data;
        });
        proc.on('close', (code) => {
            if (!code) {
                return resolve(stdout);
            }

            reject(code, stderr);
        });
    });
}

function trimOutput(s) {
    s = s.trim();
    return s.substr(1, s.length - 2).trim();
}

function reParseBody(pattern) {
    const re = new RegExp(pattern, "g");
    return function(body) {
        var match;
        const parts = [];
        while (match = re.exec(body)) {
            parts.push(match[0])
        }

        return parts.join(" ");
    }
}

function nullParseBody(body) {
    return '';
}

function releaseFormatLine(commitRef, parsedBody) {
    return promiseWrapProc(spawn(
        "git",
        ['show', '--quiet', '--pretty="%s"', commitRef]
    )).then((line) => {
        return "- " + trimOutput(line) + " " + parsedBody;
    });
}

function showBody(commitRef) {
    return promiseWrapProc(spawn(
        "git",
        ['show', '--quiet', '--pretty="%b"', commitRef]
    )).then((body) => {
        return trimOutput(body);
    });
}

function noMergeListGitCommits(revs) {
    const gitLog = promiseWrapProc(spawn(
        'git',
        ['log', '--no-merges', '--pretty="%H"', revs]
    ));

    return gitLog.then((commits) => {
        return commits.split("\n")
            .filter(x => x)
            .map(trimOutput);
    });
}

function listReleases(parseBody, formatLine, listGitCommits) {
    formatLine = formatLine || releaseFormatLine;
    parseBody = parseBody || nullParseBody;
    listGitCommits = listGitCommits || noMergeListGitCommits;

    return function(revs) {
        return listGitCommits(revs).then((commits) => {
            const promises = commits.map(c => {
                return showBody(c).then((body) => {
                    return formatLine(c, parseBody(body))
                });
            });
            return Promise.all(promises);
        });
    }
}

function printReleases(formattedLines) {
    for (line of formattedLines) {
        console.log(line)
    }
}

exports.reParseBody = reParseBody;
exports.nullParseBody = nullParseBody;
exports.listReleases = listReleases;
exports.printReleases = printReleases;
