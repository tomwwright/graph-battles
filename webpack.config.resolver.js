var path = require("path");
var webpack = require("webpack");
var glob = require("glob");

module.exports = {
  entry: {
    resolver: "./build/es5/Resolver/Handlers",
    api: "./build/es5/Resolver/APIHandlers"
  },

  target: "node",

  bail: true,

  devtool: "source-map",

  resolve: {
    extensions: [".js", ".webpack.js", ".web.js"],
    modules: ["node_modules", path.resolve(__dirname, "build/es5")]
  },

  externals: {
    "aws-sdk": "commonjs aws-sdk"
  },

  module: {
    rules: [
      {
        test: /\.json$/,
        loader: "json"
      }
    ]
  },

  output: {
    path: __dirname + "/build/bundle",
    filename: "[name].js",
    libraryTarget: "commonjs"
  }
};
