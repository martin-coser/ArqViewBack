module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 1. Raíz de búsqueda: Solo la carpeta 'test'
  roots: ['<rootDir>/test'],
  
  // 2. Patrón de búsqueda: Busca cualquier archivo que termine en .spec.ts,
  // en cualquier subdirectorio de las raíces (incluyendo 'test/unitario').
  testRegex: '.*\\.spec\\.ts$', 
  
  // Eliminamos 'testMatch' para evitar conflictos.
  
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  transform: {
    // Nota: El uso de la barra inclinada en la expresión regular
    // debe ser doblemente escapada si no es un archivo .js.
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};