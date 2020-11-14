module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      isolatedModules: true, // Disable typechecking
    },
  },
  modulePaths: ['<rootDir>'],
  rootDir: process.cwd(),
};
