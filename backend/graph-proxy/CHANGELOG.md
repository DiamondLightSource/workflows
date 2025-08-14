# Changelog

## [0.1.9](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.8...graph-proxy@v0.1.9) (2025-08-14)


### Features

* **graph-proxy:** add template to the workflow filter schema ([50a0a6e](https://github.com/DiamondLightSource/workflows/commit/50a0a6e22c55b68c9da4b0d1e5d44ab9ead2197e))
* **graph-proxy:** proof-of-concept total request counter ([735e12a](https://github.com/DiamondLightSource/workflows/commit/735e12a432cd0d681fcf1b83431d716e84126fd3))


### Bug Fixes

* **graph-proxy:** fix lifetime issue ([3a0dabc](https://github.com/DiamondLightSource/workflows/commit/3a0dabc0ff8d23d0907eb936ee2f266f5b3c09e8))
* **graph-proxy:** remove parameter schema stitching ([9c52ad6](https://github.com/DiamondLightSource/workflows/commit/9c52ad6133b7847aee863fadf95264f2ed33920e))

## [0.1.8](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.7...graph-proxy@v0.1.8) (2025-08-04)


### Features

* **graph-proxy:** enable subscriptions on federation ([90fa077](https://github.com/DiamondLightSource/workflows/commit/90fa077c9924135f04214c32b3df25095e696c4e))


### Bug Fixes

* **graph-proxy:** prepend socket path to prefix ([2be5684](https://github.com/DiamondLightSource/workflows/commit/2be5684999b06bd94562369a981adbeb422d11bb))

## [0.1.7](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.6...graph-proxy@v0.1.7) (2025-07-22)


### Features

* **graph-proxy:** add start and end time to task ([f212c5e](https://github.com/DiamondLightSource/workflows/commit/f212c5e6eec3195f5d2ed71e171e34c1447c05a3))
* **graph-proxy:** implement basic workflow subscription ([d016eca](https://github.com/DiamondLightSource/workflows/commit/d016eca1b869c45ed8a7a2a33b7ac98325ff013f))
* **graph-proxy:** return full schema when provided ([251ff09](https://github.com/DiamondLightSource/workflows/commit/251ff09b3f61b1f8be5589f77b55476dd1112fa5))

## [0.1.6](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.5...graph-proxy@v0.1.6) (2025-07-07)


### Features

* **graph-proxy:** add id to Workflow to allow refetchable fragments ([45f70f5](https://github.com/DiamondLightSource/workflows/commit/45f70f5e24005482131e415e6222131ffe355d3e))
* **graph-proxy:** add optional repository field to workflow template ([77fcd20](https://github.com/DiamondLightSource/workflows/commit/77fcd207ce9d2fb837eb706e77391c3d93e7dafa))
* **graph-proxy:** add support for subscriptions ([0851293](https://github.com/DiamondLightSource/workflows/commit/0851293d5df92b6001471d8ce3040606cb63450b))
* **graph-proxy:** impliment basic workflow subscription ([3e6e7a0](https://github.com/DiamondLightSource/workflows/commit/3e6e7a0bacad5fcaa310bec7e841b89894925e7b))
* **graph-proxy:** json forms serializer accepts options field ([b70c5b5](https://github.com/DiamondLightSource/workflows/commit/b70c5b5625c147c35b9ea8cd221acbe5d81d3ce6))


### Bug Fixes

* **graph-proxy:** json forms categorization incorrectly de-serialized ([7e0e17b](https://github.com/DiamondLightSource/workflows/commit/7e0e17b9173e6bbb6256f670dd50b2af0eb05b09))

## [0.1.5](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.4...graph-proxy@v0.1.5) (2025-05-28)


### Features

* **graph-proxy:** add node type ([db6906d](https://github.com/DiamondLightSource/workflows/commit/db6906d9a7747a0c3a48a29e29c5dd765385eb38))
* **graph-proxy:** add options to ui schema ([f9ad40c](https://github.com/DiamondLightSource/workflows/commit/f9ad40cb742deb9a81c5ad7465206213c6a9babd))


### Bug Fixes

* **graph-proxy:** increase limit for workflow templates ([d43d2e8](https://github.com/DiamondLightSource/workflows/commit/d43d2e8e88d677c87720612162184dbbd0ad9f16))

## [0.1.4](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.3...graph-proxy@v0.1.4) (2025-05-19)


### Features

* **graph-proxy:** added filtering for workflow templates ([698622f](https://github.com/DiamondLightSource/workflows/commit/698622f41c354544123d3242f393dd1470e47089))


### Bug Fixes

* **graph-proxy:** expanded dev-container env ([bdee3ab](https://github.com/DiamondLightSource/workflows/commit/bdee3ab3730d7127ebe2edbd268a33175e259085))
* **graph-proxy:** only show desired inputs when submitting to UI ([26d8028](https://github.com/DiamondLightSource/workflows/commit/26d80284f02137add10167a7cb174cfd86152643))

## [0.1.3](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.2...graph-proxy@v0.1.3) (2025-04-24)


### Features

* **graph-proxy:** increase the limit on requested workflows ([f004818](https://github.com/DiamondLightSource/workflows/commit/f00481851d48eaebbd710a74b3c41f937938b712))
* **graph-proxy:** limit number of returned workflows templates results ([9f0e006](https://github.com/DiamondLightSource/workflows/commit/9f0e0065f95c367e4b294e8e4eb5cc852b8c4a6f))
## [0.1.2](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.1...graph-proxy@v0.1.2) (2025-04-15)


### Features

* **graph-proxy:** add parameters to graph ([a258172](https://github.com/DiamondLightSource/workflows/commit/a2581726919ff15706a5c16ac4937d19b3750d8a))
* **graph-proxy:** added filter by creator ([6bd7c42](https://github.com/DiamondLightSource/workflows/commit/6bd7c42a0e35d7c14d301cc9f14961df265cbd4b))
* **graph-proxy:** added template ref to graph ([be3e3ed](https://github.com/DiamondLightSource/workflows/commit/be3e3edb0e4ace02c572a1cb2d75f141fe586af5))
* **graph-proxy:** added test for creator filter ([e1fe530](https://github.com/DiamondLightSource/workflows/commit/e1fe530c6cd798d8e7a5d0faa89ebef7f9775a87))
* **graph-proxy:** restructured filter to accept multiple filters ([383c8be](https://github.com/DiamondLightSource/workflows/commit/383c8bebc92c3ecb43ca4b035a427427f78e381b))
* **graph-proxy:** test case for workflow_template_ref ([6b99d4b](https://github.com/DiamondLightSource/workflows/commit/6b99d4b83aa88e4685ea5d8e03223cb2d89f5b0a))
* **graph-proxy:** test for parameters ([74bf0e0](https://github.com/DiamondLightSource/workflows/commit/74bf0e0098b2e247540409617613c91f2ad33587))


### Bug Fixes

* **backend:** move mockito to workspace level ([37c80ab](https://github.com/DiamondLightSource/workflows/commit/37c80ab152ef5610d87578a4602ad8583d0931a1))
* **graph-proxy:** add status filters to workflows query ([f60007b](https://github.com/DiamondLightSource/workflows/commit/f60007b025669baf6cc5d90819290fb1f900e626))
* **graph-proxy:** add tests for workflows status filter ([e5f35fd](https://github.com/DiamondLightSource/workflows/commit/e5f35fd475a6e733c20f612c0321829dd6a99eb6))
* **graph-proxy:** configure s3 client ([877c596](https://github.com/DiamondLightSource/workflows/commit/877c59684e215407d13a25b43d5f5dbf1c165f16))
* **graph-proxy:** fix incorrect dir in exclude config ([509cf64](https://github.com/DiamondLightSource/workflows/commit/509cf6486d2446ce2b1bc28af1da33b8995c4f4a))
* **graph-proxy:** generated presigned url for artifacts ([10c7ac7](https://github.com/DiamondLightSource/workflows/commit/10c7ac7bcae050bc9b1feeb633b761f40c076791))
* **graph-proxy:** name all telemetry instruments ([c87cfd3](https://github.com/DiamondLightSource/workflows/commit/c87cfd3e92685527279f22914b87c8013f2ac4f1))
* **graph-proxy:** remove metadata from Tasks ([4f143db](https://github.com/DiamondLightSource/workflows/commit/4f143db8280af3e08996a99699f6bbcd1d4372f9))
* **graph-proxy:** removed broken 'short' from cli args ([0dc967e](https://github.com/DiamondLightSource/workflows/commit/0dc967e863f4688433e2d4d9fbd97367d4044c62))
* **graph-proxy:** removed overly-descriptive name for template_ref ([3ea4e99](https://github.com/DiamondLightSource/workflows/commit/3ea4e9915a3a1febd5cd63cc0f3fb9fbec8ade34))
* **graph-proxy:** test artifact download url ([e675f19](https://github.com/DiamondLightSource/workflows/commit/e675f19a4cca6451450fa30f1e1af1bec2aac39b))
* **graph-proxy:** updated tests for restructuring ([4d1e153](https://github.com/DiamondLightSource/workflows/commit/4d1e153803a39a8091bfa0559c2f974205870fe7))

## [0.1.1](https://github.com/DiamondLightSource/workflows/compare/graph-proxy@v0.1.0...graph-proxy@v0.1.1) (2025-03-12)


### Bug Fixes

* **backend:** move common dependencies to workspace ([20f8058](https://github.com/DiamondLightSource/workflows/commit/20f8058d311c12a7f4582f2833f5944a697bb1a5))
* **graph-proxy:** move to backend dir ([653e66b](https://github.com/DiamondLightSource/workflows/commit/653e66bae377119c1c225bfe2472bbaa2e0ce5de))
* **graph-proxy:** use telemetry library ([8e7d7ec](https://github.com/DiamondLightSource/workflows/commit/8e7d7ec178e31e053e8c7d5fa9affa5767fed84f))
