# Release List

`release-list` is a simple utility for generating a description for releasing.

## Usage

From inside of a git repository, just call `release-list {target-ref}..{base-ref}` and it will generate a list of commits that were changed
formatted in a nice way.

For example, let's say we have three main branches: dev, stg, and master.

If you are releasing from dev -> stg, you'd call the following:

```
release-list stg..dev -r 'PROJECT-\d+'
```

This will generate a nicely formatted list to include in an Merge/Pull Request body.

The `-r` flag is for a regex that will scan the body of each commit for that match and will include it into the title of the list item.

So if the commit was formatted like:

```
Title of Commit

Body of commit with a description

jira: PROJECT-24
```

Then you'd get a list like this:

```
- Title of Commit PROJECT-24
```

### .release-list

If no -r flag is being used, release-list will check the current directory for a `.release-list` file which can contain a regex to be used for generating the releases
