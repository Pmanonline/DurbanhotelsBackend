##

### Start up Environments

#### Development

- development(1st time): docker compose -f docker-compose.dev.yaml up
- development(consequently): docker compose -f docker-compose.dev.yaml up --build
  - the second command will be used when changes are made to certain files like the package.json

#### Production

- production(first time): docker compose -f docker-compose.prod.yaml up
- production(second time): docker compose -f docker-compose.prod.yaml up --build
  - the second command will be used when changes are made to certain files like the package.json

### Tech Used

- NodeJS
- TypeScript
- Docker
- ESLint
- Prettier: Please use double quotes
