# Changelog

## [0.1.5](https://github.com/DiamondLightSource/workflows/compare/workflows-lib@v0.1.4...workflows-lib@v0.1.5) (2025-07-16)


### Features

* **frontend:** add clear all filters button ([535be52](https://github.com/DiamondLightSource/workflows/commit/535be5257641d2cd167e51ecba2f7a84f2e016f0))
* **frontend:** add file upload component ([183e0c3](https://github.com/DiamondLightSource/workflows/commit/183e0c3c899cc7e3de98e7f9ecf40e7da996a2dc))
* **frontend:** ctrl click to select multiple tasks ([242d322](https://github.com/DiamondLightSource/workflows/commit/242d322f644bf9c897d13d7ca403cb7b788962ba))
* **frontend:** display all artifacts when no task selected ([354da73](https://github.com/DiamondLightSource/workflows/commit/354da7339c7fe4666bc35d4a494ea6532e1f097d))
* **frontend:** display task name next to artifact ([9e10592](https://github.com/DiamondLightSource/workflows/commit/9e10592c332646f906bd6d38daf9638a5e33f30a))
* **frontend:** show repo for template list and form ([d9aadab](https://github.com/DiamondLightSource/workflows/commit/d9aadabf2b063482e5d897c954b09497550d6c14))
* **frontend:** use query parameters for selected tasks ([4f5c4e9](https://github.com/DiamondLightSource/workflows/commit/4f5c4e9d8cc29b00d06a2845fba8433dddd8f8ea))


### Bug Fixes

* **frontend:** fix Accordion story with MemoryRouter ([45d72ed](https://github.com/DiamondLightSource/workflows/commit/45d72ed620c6b175bc12067cd056bdbf270a6919))
* **frontend:** persist tasks flow viewport & add reset button ([c6260b2](https://github.com/DiamondLightSource/workflows/commit/c6260b2a73410b8e12e578470b91087a1c2a80ba))
* **frontend:** use modified visitRegex in template regex ([1a9950a](https://github.com/DiamondLightSource/workflows/commit/1a9950a38a71de19cb2c5e51d01ebf970f4e6af5))

## [0.1.4](https://github.com/DiamondLightSource/workflows/compare/workflows-lib@v0.1.3...workflows-lib@v0.1.4) (2025-06-12)


### Features

* **dashboard:** allow template width to be set in ui schema ([f18791e](https://github.com/DiamondLightSource/workflows/commit/f18791e02a3490c3061cd3f7e5df4d3cac36f277))
* **frontend:** add link to single workflow from accordion ([967cf32](https://github.com/DiamondLightSource/workflows/commit/967cf32a933e5166fb6eaf623618e13f9c050698))
* **frontend:** add rerun template from submitted workflow ([bfed855](https://github.com/DiamondLightSource/workflows/commit/bfed8555dac852e6386d6b0ad5c08b043c4faebd))
* **frontend:** added workflow status select component to workflow filter drawer ([348defb](https://github.com/DiamondLightSource/workflows/commit/348defbd7d3f541e6f046c7bf23125d3c700ad68))
* **frontend:** report errors/success on template submission ([22c3f09](https://github.com/DiamondLightSource/workflows/commit/22c3f09c78cecb4e0d28d107360e4ff40b6c1532))
* **frontend:** use react-router for sci-react-ui links ([a3c90ec](https://github.com/DiamondLightSource/workflows/commit/a3c90ec9b256e17e43bc17aef8b631367f7ec5db))
* **workflows-lib:** exclude root DAG from flow ([ad68b83](https://github.com/DiamondLightSource/workflows/commit/ad68b832b9c91b0a2ac69bce1fdd54bdf7f7306e))
* **workflows-lib:** filter by creator ([833d61c](https://github.com/DiamondLightSource/workflows/commit/833d61c7ec5bf83dfcd8ed6eb68f391b1862a4b1))


### Bug Fixes

* **frontend:** add ErrorBoundary fallback for retrigger ([68ee397](https://github.com/DiamondLightSource/workflows/commit/68ee397ea64c7e8dcef691879c9292b3955345e1))


### Reverts

* undo storyboard bump ([9adb79a](https://github.com/DiamondLightSource/workflows/commit/9adb79a91da6435aa2d324e8d73ed8b5d2530103))

## [0.1.3](https://github.com/DiamondLightSource/workflows/compare/workflows-lib@v0.1.2...workflows-lib@v0.1.3) (2025-05-19)


### Features

* **dashboard:** add ui component tests ([6230a22](https://github.com/DiamondLightSource/workflows/commit/6230a22ee6c247135b2dffb18447beadfe4476f0))
* **dashboard:** added navigation to header ([a396bab](https://github.com/DiamondLightSource/workflows/commit/a396bab8a82137806fc9610208aa5d5618ba3070))
* **dashboard:** added templatecard component ([5db97d8](https://github.com/DiamondLightSource/workflows/commit/5db97d8093629d2cc7dc608b6341e54ed6203a56))
* **dashboard:** highlight active task ([ba486ea](https://github.com/DiamondLightSource/workflows/commit/ba486eabbd3ab789972c9ed74b969fc461cbd986))
* **frontend:** add workflow submission page ([d97f0ce](https://github.com/DiamondLightSource/workflows/commit/d97f0ced22a94471e86078434db8ebeb4580abfb))
* **frontend:** make frontend UI more responsive to screen size ([552b75c](https://github.com/DiamondLightSource/workflows/commit/552b75c60c1f4d90bbda39623a0a4d0300dd7a0a))


### Bug Fixes

* **dashboad:** define taskflow ordering between pages ([2e55dca](https://github.com/DiamondLightSource/workflows/commit/2e55dca2070f78fc9fa6c527a7e19c18a4064675))
* **dashboard:** reduce height of expanded workflows accordian ([36024f1](https://github.com/DiamondLightSource/workflows/commit/36024f18db71da75ddf7b40d8f9988675f116863))
* **dashboard:** removed all mention to title ([d5fd9d5](https://github.com/DiamondLightSource/workflows/commit/d5fd9d552b5dff37aec6a432ac2d597c59536b65))

## [0.1.2](https://github.com/DiamondLightSource/workflows/compare/workflows-lib@v0.1.1...workflows-lib@v0.1.2) (2025-04-14)


### Features

* **dashboard:** add accordian view of tasks to submitted workflows page ([57238ca](https://github.com/DiamondLightSource/workflows/commit/57238ca878185dad79395f5e97645c090d320960))
* **dashboard:** add dynamic routes for workflows task info ([ab3cac8](https://github.com/DiamondLightSource/workflows/commit/ab3cac86c92701ce9401cfb6e9906b4747ec586c))

## [0.1.1](https://github.com/DiamondLightSource/workflows/compare/workflows-lib@v0.1.0...workflows-lib@v0.1.1) (2025-03-20)


### Bug Fixes

* **frontend:** prevent duplicate nodes & edges in react flow ([00c8864](https://github.com/DiamondLightSource/workflows/commit/00c88643096777fc823a853a72fc62bd3921ca02))
