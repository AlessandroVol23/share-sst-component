// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: 'awsfundamentals',
			home: 'aws',
			providers: {
				aws: {
					region: 'eu-central-1',
					version: '6.66.2',
				},
			},
		};
	},
	async run() {},
});
