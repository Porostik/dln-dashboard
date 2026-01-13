FROM node:20-alpine AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG APP_NAME
COPY . .
RUN npx nx build ${APP_NAME}

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=deps /usr/src/app/node_modules ./node_modules
ARG APP_NAME
COPY --from=build /usr/src/app/apps/${APP_NAME}/dist ./dist

CMD ["node", "dist/main.js"]
