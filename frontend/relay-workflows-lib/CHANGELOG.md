# Changelog

## [0.1.7](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.6...relay-workflows-lib@v0.1.7) (2026-02-25)


### Features

* **frontend:** add repository link components ([c317cd0](https://github.com/DiamondLightSource/workflows/commit/c317cd0acf820020963b1393dc98069d8c2e2399))
* **frontend:** preserve template filter settings ([daef9f9](https://github.com/DiamondLightSource/workflows/commit/daef9f944e85c31fd80f9bb905113d7d6205ba01))

## [0.1.6](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.5...relay-workflows-lib@v0.1.6) (2026-01-09)


### Features

* **frontend:** add autocomplete to workflow template filter ([7aa8fb7](https://github.com/DiamondLightSource/workflows/commit/7aa8fb7a8496bfd06dc38d3e127f21607872e8ab))
* **frontend:** add fragments to workflows pages ([8bca25e](https://github.com/DiamondLightSource/workflows/commit/8bca25ec30998156be0cd1d2b9f1abac4689dab7))
* **frontend:** add live workflow status icon to submission message ([b03cc37](https://github.com/DiamondLightSource/workflows/commit/b03cc3709a2cceffe722f880483e2a26273bcc39))
* **frontend:** add mocking ([4e4c6e6](https://github.com/DiamondLightSource/workflows/commit/4e4c6e6e35ad9d0bca229d35d0dc33c86b87b731))
* **frontend:** add search filter to template list ([74d2ead](https://github.com/DiamondLightSource/workflows/commit/74d2ead67bad90bfcc682c5b6659d0d8e2b5d6a0))
* **frontend:** add stories for relay-workflows-lib components ([518e8db](https://github.com/DiamondLightSource/workflows/commit/518e8db7242e8e3ae4b7608017d1564370b65ac0))
* **frontend:** add subscriptions to react flow views ([d756203](https://github.com/DiamondLightSource/workflows/commit/d7562037513f423c1108e5c0d4935b940a0d7a69))
* **frontend:** add workflow error message to ui ([e3c10a8](https://github.com/DiamondLightSource/workflows/commit/e3c10a84efdd33703af969c7929767c99e19bd79))
* **frontend:** added a science group template filter ([f2aa966](https://github.com/DiamondLightSource/workflows/commit/f2aa96675bf5839b9c8b9922f01eeb7e8bc5cbd1))
* **frontend:** button to clear all tasks ([fdeee0b](https://github.com/DiamondLightSource/workflows/commit/fdeee0be04ecf7cdb82d73e92a2e85d0d622e845))
* **frontend:** button to select output tasks ([f2d220f](https://github.com/DiamondLightSource/workflows/commit/f2d220f8462031ba306c8d374125ece49cb32fa3))
* **frontend:** display creator name in workflow list ([1c7c97f](https://github.com/DiamondLightSource/workflows/commit/1c7c97fa60f5bfce52aa6377c8c25f242f7a5f4d))
* **frontend:** fill task when artifact is hovered over ([5610b2a](https://github.com/DiamondLightSource/workflows/commit/5610b2a230a76866fc8c692fc6b490448c9af13f))
* **frontend:** only have open subscriptions for active workflows ([b27c731](https://github.com/DiamondLightSource/workflows/commit/b27c7314909a4143e1d56db6a12baf4a141d7609))
* **frontend:** show input params and template in single workflow UI ([fd3bca2](https://github.com/DiamondLightSource/workflows/commit/fd3bca27f2a30c4a1f52f6783214144d5923b754))
* **frontend:** store instrumentSessionID in localStorage ([3efcfc6](https://github.com/DiamondLightSource/workflows/commit/3efcfc6e4ac734779a231ea431e5a1284cefc5bf))
* **frontend:** support autofilling parameter values from search params ([d5cae5c](https://github.com/DiamondLightSource/workflows/commit/d5cae5c60856456928db2111daa4a880ef9f37b4))
* **frontend:** sync selected tasks between components ([e78347f](https://github.com/DiamondLightSource/workflows/commit/e78347f668021bae04035d5af7588f17d4748184))
* **frontend:** use fragments for Template pages ([3ce12b7](https://github.com/DiamondLightSource/workflows/commit/3ce12b7f4708f310b5bed7883a93c0be123597d2))


### Bug Fixes

* **frontend:** added graphql errorboundaries to retry any failed queries ([a182bd6](https://github.com/DiamondLightSource/workflows/commit/a182bd6d20ba87cd962f05bcc64984495553e517))
* **frontend:** fix bugs caused by tasks with the same name ([a8c39f5](https://github.com/DiamondLightSource/workflows/commit/a8c39f572aa6168b1bbbe8ee29d933bda03f1475))
* **frontend:** improve accessibility of UI ([d25c8a0](https://github.com/DiamondLightSource/workflows/commit/d25c8a0a7f5d20a8bca8f0da144c995f847d3293))
* **frontend:** move graphql consts out of component files ([f3e1fb5](https://github.com/DiamondLightSource/workflows/commit/f3e1fb567e3c814ea3b969e203c09f57b6adbff6))
* **frontend:** nodejs namespace typing ([66542d5](https://github.com/DiamondLightSource/workflows/commit/66542d5244fb832138d0c5807206f84effeecf34))
* **frontend:** prevent pagination limit label clashing & remove extra tooltip title ([efdc080](https://github.com/DiamondLightSource/workflows/commit/efdc0802ab01e9d9ee65c304892cdf1a29c0bc8b))
* **frontend:** remove unused fragment ([2ba60c3](https://github.com/DiamondLightSource/workflows/commit/2ba60c397c64834f7d0d6cec5b4d300287e87c51))
* **frontend:** remove unused util functions ([e7e7df3](https://github.com/DiamondLightSource/workflows/commit/e7e7df38b2325d33f701435a4f6cb78f0a7c910d))
* **relay-workflows-lib:** fix live update bug ([4cc3b83](https://github.com/DiamondLightSource/workflows/commit/4cc3b83447ff59197ff4b356d4855f355da62b2b))

## [0.1.5](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.4...relay-workflows-lib@v0.1.5) (2025-07-22)


### Bug Fixes

* **relay-workflows-lib:** fix task click behaviour in workflows search page ([5f78f6f](https://github.com/DiamondLightSource/workflows/commit/5f78f6feac7b3465720f9276d6653cc5ea3840ef))

## [0.1.4](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.3...relay-workflows-lib@v0.1.4) (2025-07-16)


### Features

* **frontend:** add workflows live update switch ([eab7124](https://github.com/DiamondLightSource/workflows/commit/eab712461f5e260800000f0ee8dfacc643192ec1))
* **frontend:** ctrl click to select multiple tasks ([242d322](https://github.com/DiamondLightSource/workflows/commit/242d322f644bf9c897d13d7ca403cb7b788962ba))
* **frontend:** display all artifacts when no task selected ([354da73](https://github.com/DiamondLightSource/workflows/commit/354da7339c7fe4666bc35d4a494ea6532e1f097d))
* **frontend:** poll workflow names every 5 seconds ([11842a7](https://github.com/DiamondLightSource/workflows/commit/11842a738415f929e38f7a20b53061c18e30bd37))
* **frontend:** show repo for template list and form ([d9aadab](https://github.com/DiamondLightSource/workflows/commit/d9aadabf2b063482e5d897c954b09497550d6c14))
* **frontend:** store multiple tasks in url ([eddc779](https://github.com/DiamondLightSource/workflows/commit/eddc7799fe88a68f988fe539448e2c96c248a60b))
* **frontend:** use query parameters for selected tasks ([4f5c4e9](https://github.com/DiamondLightSource/workflows/commit/4f5c4e9d8cc29b00d06a2845fba8433dddd8f8ea))


### Bug Fixes

* **frontend:** fix task highlighting with breadcrumbs ([2077128](https://github.com/DiamondLightSource/workflows/commit/2077128aacea2587f4087876830627f5cdfbc28f))
* **frontend:** persist tasks flow viewport & add reset button ([c6260b2](https://github.com/DiamondLightSource/workflows/commit/c6260b2a73410b8e12e578470b91087a1c2a80ba))

## [0.1.3](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.2...relay-workflows-lib@v0.1.3) (2025-06-12)


### Features

* **frontend:** add client-side pagination to templates list ([c7b9c6c](https://github.com/DiamondLightSource/workflows/commit/c7b9c6c7d791ec225a744e9c09b5bfcdf27b3e2b))
* **frontend:** add link to single workflow from accordion ([967cf32](https://github.com/DiamondLightSource/workflows/commit/967cf32a933e5166fb6eaf623618e13f9c050698))
* **frontend:** add rerun template from submitted workflow ([bfed855](https://github.com/DiamondLightSource/workflows/commit/bfed8555dac852e6386d6b0ad5c08b043c4faebd))
* **frontend:** report errors/success on template submission ([22c3f09](https://github.com/DiamondLightSource/workflows/commit/22c3f09c78cecb4e0d28d107360e4ff40b6c1532))
* **workflows-lib:** exclude root DAG from flow ([ad68b83](https://github.com/DiamondLightSource/workflows/commit/ad68b832b9c91b0a2ac69bce1fdd54bdf7f7306e))
* **workflows-lib:** filter by creator ([833d61c](https://github.com/DiamondLightSource/workflows/commit/833d61c7ec5bf83dfcd8ed6eb68f391b1862a4b1))


### Bug Fixes

* **frontend:** add ErrorBoundary fallback for retrigger ([68ee397](https://github.com/DiamondLightSource/workflows/commit/68ee397ea64c7e8dcef691879c9292b3955345e1))
* **frontend:** return all templates without limit ([363840d](https://github.com/DiamondLightSource/workflows/commit/363840da45b3ed870b0c727ed110229932854fcf))

## [0.1.2](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.1...relay-workflows-lib@v0.1.2) (2025-05-19)


### Features

* **dashboard:** created templates page ([784530f](https://github.com/DiamondLightSource/workflows/commit/784530fe3c6112fb9cbc5d964db60b14eb16303f))
* **dashboard:** highlight active task ([ba486ea](https://github.com/DiamondLightSource/workflows/commit/ba486eabbd3ab789972c9ed74b969fc461cbd986))
* **dashboard:** set number of workflows to list ([24b8109](https://github.com/DiamondLightSource/workflows/commit/24b8109180f0eae68d4bad85826371cbc71dfb0c))
* **frontend:** add workflow submission page ([d97f0ce](https://github.com/DiamondLightSource/workflows/commit/d97f0ced22a94471e86078434db8ebeb4580abfb))
* **frontend:** make frontend UI more responsive to screen size ([552b75c](https://github.com/DiamondLightSource/workflows/commit/552b75c60c1f4d90bbda39623a0a4d0300dd7a0a))


### Bug Fixes

* **dashboard:** changed file name to workflowfragment ([c47b37b](https://github.com/DiamondLightSource/workflows/commit/c47b37b92e82ef0bdd6059f60d325603306be9e7))
* **dashboard:** reduce height of expanded workflows accordian ([36024f1](https://github.com/DiamondLightSource/workflows/commit/36024f18db71da75ddf7b40d8f9988675f116863))
* **dashboard:** remove unused component ([cbd444c](https://github.com/DiamondLightSource/workflows/commit/cbd444cd871aaa9570d345c2fe2d5d2894e44cbb))

## [0.1.1](https://github.com/DiamondLightSource/workflows/compare/relay-workflows-lib@v0.1.0...relay-workflows-lib@v0.1.1) (2025-04-14)


### Features

* **dashboard:** add dynamic routes for workflows task info ([ab3cac8](https://github.com/DiamondLightSource/workflows/commit/ab3cac86c92701ce9401cfb6e9906b4747ec586c))
