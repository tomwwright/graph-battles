FROM public.ecr.aws/lambda/nodejs:14

RUN npm install -g yarn
COPY package.json yarn.lock ${LAMBDA_TASK_ROOT}
RUN yarn install

ADD src ${LAMBDA_TASK_ROOT}/src
ADD tsconfig.json ${LAMBDA_TASK_ROOT}
RUN yarn build

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "dist/tsc/main.handler" ]  