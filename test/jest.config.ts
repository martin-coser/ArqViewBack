module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'], // Buscar pruebas en la carpeta test
  testMatch: ['**/*.spec.ts'], // Coincidir con archivos .spec.ts
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest', // Transformar archivos TypeScript
  },
  testPathIgnorePatterns: ['/node_modules/'], // Ignorar node_modules
};