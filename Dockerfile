FROM node:14-alpine as build

WORKDIR /app

COPY package.json yarn.lock .
COPY packages/api/package.json ./packages/api/
COPY packages/models/package.json ./packages/models/

RUN yarn install --pure-lockfile --non-interactive

COPY packages/api ./packages/api
COPY packages/models ./packages/models

RUN yarn workspace @battles/api build

# AWS Lambda container image

FROM public.ecr.aws/lambda/nodejs:14

COPY --from=build /app/packages/api/dist ${LAMBDA_TASK_ROOT}/packages/api/dist
COPY --from=build /app/packages/api/package.json ${LAMBDA_TASK_ROOT}/packages/api/package.json

COPY --from=build /app/packages/models/build ${LAMBDA_TASK_ROOT}/packages/models/build
COPY --from=build /app/packages/models/package.json ${LAMBDA_TASK_ROOT}/packages/models/package.json

COPY --from=build /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "packages/api/dist/tsc/main.handler" ]  
