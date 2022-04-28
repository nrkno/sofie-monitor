module.exports = {
	globals: {
		'ts-jest': {
			tsconfig: 'test/tsconfig.json',
			diagnostics: {
				ignoreCodes: ['TS2339'],
			},
		},
	},
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	testMatch: ['**/test/**/*.test.(ts|js)'],
	testEnvironment: 'node',
}
