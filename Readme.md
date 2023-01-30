# storage.service Specifications

> This repository contains the specs for the .storage Protocol and associated subsystems.

## Understanding the meaning of the spec badges and their life cycle

We use the following label system to identify the state of each spec:

- ![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square) - A work-in-progress, possibly to describe an idea before actually committing to a full draft of the spec.
- ![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square) - A draft that is ready to review. It should be implementable.
- ![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square) - A spec that has been adopted (implemented) and can be used as a reference point to learn how the system works.
- ![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square) - We consider this spec to close to final, it might be improved but the system it specifies should not change fundamentally.
- ![permanent](https://img.shields.io/badge/status-permanent-blue.svg?style=flat-square) - This spec will not change.
- ![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square) - This spec is no longer in use.

Nothing in this spec repository is `permanent` or even `stable` yet. Most of the subsystems are still a `draft` or in `reliable` state.

## Linting

The CI runs [markdownlint](https://github.com/DavidAnson/markdownlint) via [markdownlint-cli2-action](https://github.com/marketplace/actions/markdownlint-cli2-action) with the rules in [.markdownlint.jsonc](.markdownlint.jsonc).

To run the linter locally you can use [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) with `npx markdownlint-cli2 '*.md'` or install [vscode-markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) in vscode.

Optionally [prettier-vscode](https://github.com/prettier/prettier-vscode) can also be use to format code blocks inside markdown files.

## Contribute

[![contribute](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with IPFS, the models it adopts, and the principles it follows.
This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).
