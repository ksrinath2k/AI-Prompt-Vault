const { connectLambda } = require("@netlify/blobs");
const serverless = require("serverless-http");
const app = require("../../server/app");

const handler = serverless(app);

exports.handler = async (event, context) => {
  if (event && event.blobs) {
    connectLambda(event);
  }

  return handler(event, context);
};
