var path = require("path");
var webpack = require("webpack");
var glob = require("glob");

module.exports = {
  entry: {
    game: ["babel-polyfill", "./build/es5/game/game.js"],
    mobx: ["babel-polyfill", "./build/es5/mobx/mobx.js"],
    vendor: ["react", "react-dom", "mobx", "mobx-react"]
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  resolve: {
    extensions: [".webpack.js", ".web.js", ".js"],

    modules: ["node_modules", path.resolve(__dirname, "build/es5")],

    alias: {
      pixi: path.join(__dirname, "node_modules/phaser-ce/build/custom/pixi.js"),
      "phaser-ce": path.join(__dirname, "node_modules/phaser-ce/build/custom/phaser-split.js"),
      p2: path.join(__dirname, "node_modules/phaser-ce/build/custom/p2.js")
    }
  },

  module: {
    rules: [
      { test: /\.js$/, loader: "source-map-loader" }, // re-process existing source maps
      { test: /pixi\.js$/, loader: "expose-loader?PIXI" },
      { test: /phaser-split\.js$/, loader: "imports-loader?pixi,p2!expose-loader?Phaser" },
      { test: /p2\.js$/, loader: "expose-loader?p2" }
    ]
  },

  plugins: [
    new webpack.ExternalsPlugin("commonjs", ["aws-sdk"]),
    new webpack.optimize.CommonsChunkPlugin({
      names: ["model", "vendor"],
      filename: "[name].bundle.js"
    })
  ],

  output: {
    path: __dirname + "/build/bundle",
    filename: "[name].bundle.js"
  }
};
