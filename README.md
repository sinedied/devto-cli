# :postbox: devto-cli

[![NPM version](https://img.shields.io/npm/v/devto-cli.svg)](https://www.npmjs.com/package/devto-cli)
[![Build Status](https://github.com/sinedied/devto-cli/workflows/build/badge.svg)](https://github.com/sinedied/devto-cli/actions)
![Node version](https://img.shields.io/node/v/devto-cli.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<p align="center">
  <img src="https://user-images.githubusercontent.com/593151/82310296-7c85ba80-99c4-11ea-88c2-8e6452885e6a.png" alt="cli logo" width="160px">
</p>

> [Dev.to](https://dev.to) authoring CLI to create and publish markdown files as articles, using assets hosted on GitHub.

#### Main features
- Create & update dev.to articles based on markdown files
- Quickly bootstrap a GitHub repository ready to synchronize with dev.to
- Create new articles with front matter ready
- Show stats for your latest published articles
- No config file needed 😎

#### What's dev.to?

> https://dev.to is a free and open source content platform for developers. It's also an excellent way to engage with developer community, discuss about tech and a welcoming place for beginners.

## Installation

`npm install -g devto-cli`

If you only want to synchronize a GitHub repository with dev.to, you can follow this [quickstart tutorial](#create-a-new-github-repository-synchronized-with-dev.to) and use `npx devto-cli init` without installing the CLI.

## Usage

```
Usage: devto <init|new|push|stats> [options]

Commands:
  i, init               Init current dir as an article repository
    -p, --pull          Pull your articles from dev.to
    -s, --skip-git      Skip git repository init
  n, new <file>         Create new article
  p, push [files]       Push articles to dev.to [default: posts/**/*.md]
    -d, --dry-run       Do not make actual changes on dev.to
    -e, --reconcile     Reconcile articles without id using their title
  s, stats              Display stats for your latest published articles
    -n, --number <n>    Number of articles to list stats for [default: 10]
    -j, --json          Format result as JSON

General options:
  -t, --token <token>   Use this dev.to API token
  -r, --repo <repo>     GitHub repository (in "user/repo" form)
  -b, --branch <branch> GitHub branch [default: master]
  -v, --version         Show version
  --verbose             Show detailed logs
  --help                Show this help
```

### Init

`devto init` initializes the current folder as a repository for all your articles.

It does 3 things:

1. Setup a [GitHub Actions workflow](https://github.com/sinedied/publish-devto) to automatically push your updates to dev.to each time a new commit is added to the `main` branch.

2. Create a `posts` folder with a first article

3. Make the current folder a git repository, unless the `--skip-git` option is used. [Git](https://git-scm.com) must be installed otherwise this step will be skipped.

There are a few more step needed to finish the setup on GitHub, see the [quickstart tutorial](#create-a-new-github-repository-synchronized-with-dev.to) for details.

### New

`devto new <file>` creates a new markdown file with front matter properties prepared for you.

### Push

`devto push [files]` pushes all updates for the specified files to dev.to (`posts/***/*.md` by default, globs supported).

This command only updates articles that have changes.

If an article have an `id` property defined in front matter it will be updated, otherwise a new article will be created and the local file will be updated with the `id`. You can also [reconcile articles](#reconcile-with-existing-articles) without an `id` property using their title if needed.

When an article is pushed with `published: true`, a new property `date` will be added to the local file to recird the article's publication date.

### Images hosting

You can add image files in your repository along your markdown and link to them directly. 

When an article is pushed to dev.to, all **relative** images links (without an `http(s)://` prefix) will be modified with the format `https://raw.githubusercontent.com/<USER>/<REPO_NAME>/<BRANCH>/` prefix to leverage GitHub hosting. You have make sure that you pushed your git changes including the images to your GitHub repository, otherwise you might end up with `404` errors. By default the CLI will [check]((#check-for-offline-images)) that all your linked images are online before pushing to avoid mistakes.

All absolute image links will be left untouched, so you can choose to host your images elsewhere if you prefer.

#### Reconcile with existing articles

If you have markdown files for articles that are already on dev.to but do not have an `id` front matter property, you can use `--reconcile` option to match articles using their title, to avoid duplicates.

Matched local files will then be updated with the corresponding `id` property.

You can use [dry run](#dry-run) mode to ensure that your articles properly match without making any changes.

#### Check for offline images

By default thee CLI will check all images URLs of an article to be online before pushing the changes to dev.to.

If an image is offline, the article will be marked as failed and won't be pushed to dev.to. You can use the `--verbose` option to see which image was found offline.

This is particularly useful as dev.to cache images for quite a long time, including URLs resulting in 404 errors. This means that even if you fix your image after seeing it broken, dev.to will still show a broken image until the cache is expired.

You can disable this behavior using the `--skip-check-images` option, but it's really not recommended to do so.

#### Dry run

Using the `--dry-run` option the whole push process will be executed, but without making any changes on dev.to or local files. You can use this to check your configuration and see what changes you can expect.

### Stats

`devto stats` allows you to see the stats for your latest *published* articles.

Only the latest 10 are shown by default, but you can change that number using the `--number` option.

You can also choose to get the resultats formatted as JSON using the `--json` options.

### Configure dev.to token and GitHub repository URL and branch

Most commands require a [dev.to API key](https://docs.dev.to/api/#section/Authentication/api_key) and a GitHub repository url and branch to work properly.

#### Dev.to token

First, if you don't have a dev.to API key you have to generate one following [this procedure](https://developers.forem.com/api/#section/Authentication/api_key).

You can either use the `--token` to provide the token to CLI commands, or set the `DEVTO_TOKEN` environment variable.

As an alternative, you can also create a `.env` file at the root of your articles repository and add `DEVTO_TOKEN=<YOUR_TOKEN>` in it. BE SURE TO AVOID COMMITTING THAT FILE TO GITHUB, otherwise your token will be exposed.

#### GitHub repository URL and branch

In order to [host your images using GitHub](#images-hosting) the tool needs to know your GitHub repository URL and branch.

If your git repository is initialized and you have the `origin` remote set to your GitHub repository it will be auto-detected and you have nothing to do.

Otherwise, you can either use the `--repo` option to provide your GitHub repository in the form `<USER>/<REPO_NAME>`, or set the `DEVTO_REPO` environment variable.

You can also create a `.env` file at the root of your repository and add `DEVTO_REPO=<USER>/<REPO_NAME>` in it.

By default, the tool will try to detect the branch from which it was run and use it. If you want to use a different branch, you can use the `--branch` option to specify it, or set the `DEVTO_BRANCH` environment variable.

You can also add `DEVTO_REPO=<BRANCH>` in a `.env` file at the root of your repository.

## Using frontmatter properties

Any markdown file matching the specified input pattern and containing at least a `title` frontmatter property will be considered as an article and synchronized with dev.to.

All frontmatter properties [natively supported by dev.to](https://dev.to/p/editor_guide#front-matter) can be used here.

In addition, these frontmatter properties specified to the CLI are used to configure the behavior of the tool:
- `id`: The article ID on dev.to. If not specified, a new article will be created on publish.
- `date`: The publication date of the article. If not specified, the current date will be used on publish.
- `devto_sync`: If set to `false`, the article will not be synchronized with dev.to at all.

## Create a new GitHub repository synchronized with dev.to

The easiest way to get started is to:

1. Create a new GitHub repository using [this template](https://github.com/sinedied/devto-github-template/generate)

1. Go to https://developers.forem.com/api/#section/Authentication/api_key and follow the **Getting an API key** instructions to generate your own dev.to API key.

1. Select the **Settings** tab on your GitHub repository, then go to the **Secrets** section.

1. Add a secret called **DEVTO_TOKEN** with the value of your dev.to API key.

Now your articles are ready to be published on dev.to! 🎉

### Starting from scratch

Alternatively, instead of using the template, you can start from scratch with the CLI.

1. Create a new folder on your machine, the use the `dev init` command to initialize the files.

1. Commit the changes: `git add . && git commit -m "feat: add dev.to workflow"`

1. Create a new repository on GitHub, and follow the instructions to push an existing repository, that was created by `dev init`.

1. Go to https://developers.forem.com/api/#section/Authentication/api_key and follow the **Getting an API key** instructions to generate your own dev.to API key.

1. Select the **Settings** tab on your GitHub repository, then go to the **Secrets** section.

1. Add a secret called **DEVTO_TOKEN** with the value of your dev.to API key.

## Related

This CLI was heavily inspired by the [dev-to-git](https://github.com/maxime1992/dev-to-git). I used in fact `dev-to-git` for some time, but ultimately wanted something more flexible and easier to use and setup without the need for config files. I also wanted full automation support in a GitHub Action, leading me to create this new tool.

The [publish-devto](https://github.com/sinedied/publish-devto) GitHub action use this CLI under the hood to provide a single step dev.to publish workflow with GitHub Actions.
