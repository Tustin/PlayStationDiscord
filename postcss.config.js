"use strict";

const purgecss = require("@fullhuman/postcss-purgecss");

module.exports = {
	syntax: "postcss-scss",
	plugins: [
		purgecss({
			content: [ "src/renderer/index.html", "src/renderer/**/*.js", "src/renderer/**/*.vue" ],
			defaultExtractor(content) {
				const contentWithoutStyleBlocks = content.replace(/<style[^]+?<\/style>/gi, "");
				return contentWithoutStyleBlocks.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || [];
			},
			safelist: [ /-(leave|enter|appear)(|-(to|from|active))$/, /^(?!(|.*?:)cursor-move).+-move$/, /^router-link(|-exact)-active$/, /data-v-.*/ ],
			keyframes: true,
			fontFace: true,
			variables: true
		})
	]
};
