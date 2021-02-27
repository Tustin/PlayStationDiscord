"use strict";

const { resolve } = require("path");
const nodeExternals = require("webpack-node-externals");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
	entry: resolve(__dirname, "./src/app/main.ts"),
	mode: process.env.NODE_ENV,
	output: {
		path: resolve(__dirname, "./dist/app/")
	},
	module: {
		rules: [{
			enforce: "pre",
			test: /\.m?js$/i,
			loader: "eslint-loader",
			exclude: /node_modules/,
			options: {
				configFile: resolve(__dirname, "./.eslintrc-electron-app.js"),
				emitError: true,
				emitWarning: true,
				failOnError: true,
				failOnWarning: true
			}
		}, {
			test: /\.m?js$/i,
			loader: "babel-loader",
			options: {
				comments: false,
				minified: true
			}
		},{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          }]
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src/app/")
		},
        extensions: ['.tsx', '.ts', '.js'],
	},
	plugins: [
		new CleanWebpackPlugin()
	],
	devtool: process.env.NODE_ENV === "development" ? "eval-cheap-module-source-map" : "",
	target: "electron-main",
	externals: [ nodeExternals() ],
	node: {
		__filename: false,
		__dirname: false
	}
};
