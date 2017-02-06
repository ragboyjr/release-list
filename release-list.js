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

// #!/usr/bin/env bash
//
// # Builds a list of commits to be shown when doing a release.
// # It will parse relevant information in the commits and put it one line for viewing
//
// function parse_commmit_body {
//     bighead=$(echo -e "$1" | grep -o 'BIGHEAD-[0-9]\+')
//     vnu=$(echo -e "$1" | grep -o 'VNU-[0-9]\+')
//     vnudev=$(echo -e "$1" | grep -o 'VNUDEV-[0-9]\+')
//
//     echo "$bighead $vnu $vnudev" | xargs
// }
//
// revlist=$1
// format=$2
//
// if [[ -z $1 ]]; then
//     echo "usage: $0 <revlist> <format>?"
// fi
// if [[ -z $2 ]]; then
//     format="release"
// fi
//
// commits=$(git log --no-merges --pretty="%H" $1)
//
// for c in $commits; do
//     body=$(git show --quiet --pretty="%b" $c)
//
//     if [[ $format == "release" ]]; then
//         line=$(git show --quiet --pretty="%s" $c)" "$(parse_commmit_body "$body")
//         echo -n "- "
//         echo "$line" | xargs
//     elif [[ $format == "githead" ]]; then
//         line=$(git show --quiet --oneline $c)" "$(parse_commmit_body "$body")
//         echo "$line" | xargs
//     else
//         echo "Invalid format: $format. Expected: release, githead"
//         exit 1
//     fi
// done
