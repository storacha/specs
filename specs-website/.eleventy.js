const pluginWebc = require("@11ty/eleventy-plugin-webc");
const path = require('path')

module.exports = function(eleventyConfig) {
	const dir = path.resolve(__dirname, '../')

	eleventyConfig.addPlugin(pluginWebc);

	return {
		dir,
	}
};
