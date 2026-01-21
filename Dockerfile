FROM node:lts-alpine3.19 as development

WORKDIR /app

COPY package.json yarn.lock ./

RUN npm install

COPY . .

RUN npm run build


FROM node:lts-alpine3.19 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package.json yarn.lock ./

RUN npm install --only=production

COPY --from=development /app/build ./build

CMD [ "node", "build/index.js" ]




# FROM node:lts-alpine3.19 as development

# WORKDIR /app

# COPY package.json yarn.lock ./

# ARG NODE_ENV
# RUN if [ "$NODE_ENV" = "development" ]; \
#         then npm install; \
#         else npm install --only=production; \
#         fi

# COPY . .

# CMD [ "node", "build/index.js" ]