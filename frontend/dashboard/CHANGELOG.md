# Changelog

## [0.1.11](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.10...dashboard@v0.1.11) (2026-01-09)


### Features

* **frontend:** add fragments to workflows pages ([8bca25e](https://github.com/DiamondLightSource/workflows/commit/8bca25ec30998156be0cd1d2b9f1abac4689dab7))
* **frontend:** add stories for relay-workflows-lib components ([518e8db](https://github.com/DiamondLightSource/workflows/commit/518e8db7242e8e3ae4b7608017d1564370b65ac0))
* **frontend:** added a science group template filter ([f2aa966](https://github.com/DiamondLightSource/workflows/commit/f2aa96675bf5839b9c8b9922f01eeb7e8bc5cbd1))
* **frontend:** support autofilling parameter values from search params ([d5cae5c](https://github.com/DiamondLightSource/workflows/commit/d5cae5c60856456928db2111daa4a880ef9f37b4))
* **frontend:** use fragments for Template pages ([3ce12b7](https://github.com/DiamondLightSource/workflows/commit/3ce12b7f4708f310b5bed7883a93c0be123597d2))


### Bug Fixes

* **frontend:** added graphql errorboundaries to retry any failed queries ([a182bd6](https://github.com/DiamondLightSource/workflows/commit/a182bd6d20ba87cd962f05bcc64984495553e517))

## [0.1.10](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.9...dashboard@v0.1.10) (2025-09-26)


### Features

* **frontend:** add autocomplete to workflow template filter ([7aa8fb7](https://github.com/DiamondLightSource/workflows/commit/7aa8fb7a8496bfd06dc38d3e127f21607872e8ab))


### Bug Fixes

* **frontend:** fix bugs caused by tasks with the same name ([a8c39f5](https://github.com/DiamondLightSource/workflows/commit/a8c39f572aa6168b1bbbe8ee29d933bda03f1475))

## [0.1.9](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.8...dashboard@v0.1.9) (2025-08-29)


### Features

* **frontend:** add help and report links to dashboard ([e18d177](https://github.com/DiamondLightSource/workflows/commit/e18d177466c03ea69fff1bd75cdb91a5833ec611))
* **frontend:** add mocking ([4e4c6e6](https://github.com/DiamondLightSource/workflows/commit/4e4c6e6e35ad9d0bca229d35d0dc33c86b87b731))
* **frontend:** add subscriptions to react flow views ([d756203](https://github.com/DiamondLightSource/workflows/commit/d7562037513f423c1108e5c0d4935b940a0d7a69))
* **frontend:** improve dashboard cards ([c10c142](https://github.com/DiamondLightSource/workflows/commit/c10c142f9c6156838480d26a39176a29ec49871e))
* **frontend:** only have open subscriptions for active workflows ([b27c731](https://github.com/DiamondLightSource/workflows/commit/b27c7314909a4143e1d56db6a12baf4a141d7609))
* **frontend:** remove dev links from dashboard ([7b3b5ff](https://github.com/DiamondLightSource/workflows/commit/7b3b5ffd1a251ea91704c3b7e7ac55ee82ec7680))
* **frontend:** store instrumentSessionID in localStorage ([3efcfc6](https://github.com/DiamondLightSource/workflows/commit/3efcfc6e4ac734779a231ea431e5a1284cefc5bf))

## [0.1.8](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.7...dashboard@v0.1.8) (2025-08-06)


### Features

* **frontend:** use accordion for artifact list ([7fa8b21](https://github.com/DiamondLightSource/workflows/commit/7fa8b21626a7190a0050ca47850b9dc00be86bdd))

## [0.1.7](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.6...dashboard@v0.1.7) (2025-07-16)


### Features

* **dashboard:** determine config at runtime ([a1bfb9c](https://github.com/DiamondLightSource/workflows/commit/a1bfb9c902d2cb70472df51db41bb0b6e83395f2))
* **dashboard:** parameterise graph endpoint ([29f8fd0](https://github.com/DiamondLightSource/workflows/commit/29f8fd0df36cd7ffe731cc710ddb3ff87b234bd2))
* **frontend:** ctrl click to select multiple tasks ([242d322](https://github.com/DiamondLightSource/workflows/commit/242d322f644bf9c897d13d7ca403cb7b788962ba))
* **frontend:** store multiple tasks in url ([eddc779](https://github.com/DiamondLightSource/workflows/commit/eddc7799fe88a68f988fe539448e2c96c248a60b))
* **frontend:** use query parameters for selected tasks ([4f5c4e9](https://github.com/DiamondLightSource/workflows/commit/4f5c4e9d8cc29b00d06a2845fba8433dddd8f8ea))

## [0.1.6](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.5...dashboard@v0.1.6) (2025-06-12)


### Features

* **dashboard:** allow template width to be set in ui schema ([f18791e](https://github.com/DiamondLightSource/workflows/commit/f18791e02a3490c3061cd3f7e5df4d3cac36f277))
* **frontend:** add rerun template from submitted workflow ([bfed855](https://github.com/DiamondLightSource/workflows/commit/bfed8555dac852e6386d6b0ad5c08b043c4faebd))
* **frontend:** report errors/success on template submission ([22c3f09](https://github.com/DiamondLightSource/workflows/commit/22c3f09c78cecb4e0d28d107360e4ff40b6c1532))
* **workflows-lib:** filter by creator ([833d61c](https://github.com/DiamondLightSource/workflows/commit/833d61c7ec5bf83dfcd8ed6eb68f391b1862a4b1))


### Bug Fixes

* **frontend:** return all templates without limit ([363840d](https://github.com/DiamondLightSource/workflows/commit/363840da45b3ed870b0c727ed110229932854fcf))

## [0.1.5](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.4...dashboard@v0.1.5) (2025-05-19)


### Features

* **frontend:** make frontend UI more responsive to screen size ([552b75c](https://github.com/DiamondLightSource/workflows/commit/552b75c60c1f4d90bbda39623a0a4d0300dd7a0a))


### Bug Fixes

* **dashboard:** add error boundary around templates list ([f2cab97](https://github.com/DiamondLightSource/workflows/commit/f2cab97dda6b1dc7fe707a4115fef71c2a203e7a))
* **dashboard:** removed all mention to title ([d5fd9d5](https://github.com/DiamondLightSource/workflows/commit/d5fd9d552b5dff37aec6a432ac2d597c59536b65))

## [0.1.4](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.3...dashboard@v0.1.4) (2025-04-30)


### Features

* **dashboard:** add workflows navigation bar to dashboard page ([9e00bb0](https://github.com/DiamondLightSource/workflows/commit/9e00bb02446ae9b4ceb77c139f1a302f3a19fbc1))
* **dashboard:** added breadcrumbs to workflows/templates pages ([f375f09](https://github.com/DiamondLightSource/workflows/commit/f375f092e408df8fd1cbb1eb1477ef4c5fafdf6c))
* **dashboard:** added individual template view page ([b32cd43](https://github.com/DiamondLightSource/workflows/commit/b32cd43f69532984d53fc606fcf38c863b69943b))
* **dashboard:** created templates page ([784530f](https://github.com/DiamondLightSource/workflows/commit/784530fe3c6112fb9cbc5d964db60b14eb16303f))
* **frontend:** add workflow submission page ([d97f0ce](https://github.com/DiamondLightSource/workflows/commit/d97f0ced22a94471e86078434db8ebeb4580abfb))


### Bug Fixes

* **dashboard:** auto-refresh jwt ([a3d786f](https://github.com/DiamondLightSource/workflows/commit/a3d786fa2829c083ffad38584b06f85726e4d9ff))
* **dashboard:** changed file name to templateslist ([3ce6256](https://github.com/DiamondLightSource/workflows/commit/3ce62560901d7b95c4c82b717a9c01f6999f8c4e))

## [0.1.3](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.2...dashboard@v0.1.3) (2025-04-14)


### Features

* **dashboard:** add accordian view of tasks to submitted workflows page ([57238ca](https://github.com/DiamondLightSource/workflows/commit/57238ca878185dad79395f5e97645c090d320960))
* **dashboard:** add dynamic routes for workflows task info ([ab3cac8](https://github.com/DiamondLightSource/workflows/commit/ab3cac86c92701ce9401cfb6e9906b4747ec586c))

## [0.1.1](https://github.com/DiamondLightSource/workflows/compare/dashboard@v0.1.0...dashboard@v0.1.1) (2025-03-21)


### Features

* add an argocd cargo to the dashboard ([eedffe5](https://github.com/DiamondLightSource/workflows/commit/eedffe5ca5aa5a831ebb505b44771268fada840f))
