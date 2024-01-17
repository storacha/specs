# `w3up` specifications

This repository contains the specs for the `w3up` protocol and associated subsystems.

The implementations of these specs can be found in <https://github.com/web3-storage/w3up>

## specs List

### ![status=stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) specs

Stable specs may be improved but should not change fundamentally.

- [`w3-account`](./w3-account.md) - let users sync and recover delegatated capabilities via a `did` they control.
- [`w3-session`](./w3-session.md) - delegating capabilities to an agent via email verification magic link.
- [`w3-store`](./w3-store.md) - storing shards of a DAGs as CARs; linking root CIDs to shards as uploads.
- [`w3-filecoin`](./w3-filecoin.md) - verfiable aggreagation of CARs for filecoin deals.

### Other specs

Other specs are available, maturing at rates commensurate with general interest.

- [`w3-admin`](./w3-admin.md) ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - `consumer/get`, `customer/get`, `subscription/get`, `admin/*`

## spec status

We use the following label system to identify the status of each spec:

- ![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) A work-in-progress to describe an idea before committing to a full draft.
- ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) A draft ready for review. It should be implementable.
- ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) A spec that has been implemented. It will change as we learn how it works in practice.
- ![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) It may be improved but should not change fundamentally.
- ![permanent](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) This spec will not change.
- ![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) This spec is no longer in use.

Nothing in this spec repository is `permanent` or even `stable` yet. Most of the subsystems are still a `draft` or in `reliable` status.

## Contribute

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.
This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

### Linting

The CI runs [markdownlint](https://github.com/DavidAnson/markdownlint) via [markdownlint-cli2-action](https://github.com/marketplace/actions/markdownlint-cli2-action) with the rules in [.markdownlint.jsonc](.markdownlint.jsonc). To run the linter locally you can use [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) with `npx markdownlint-cli2 '*.md'` or install [vscode-markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) in vscode.

Optionally [prettier-vscode](https://github.com/prettier/prettier-vscode) can also be use to format code blocks inside markdown files.

### Spellcheck

The CI runs a spellcheck using [md-spellcheck-action](https://github.com/matheus23/md-spellcheck-action). If you want to use a word that's being flagged by the spellchecker, add it to [.github/workflows/words-to-ignore.txt](./.github/workflows/words-to-ignore.txt).

Since the spellchecker depends on GitHub Actions, the best way to run it locally is with [act](https://github.com/nektos/act), a Docker-based GitHub Actions workflow runner. When you first run `act`, it will ask what base image to use as a default. The actions in this repo run fine with the default "medium" base image. Once `act` is installed, you can run the full CI suite with `act pull_request`. This will also run the markdown linting action described above.
