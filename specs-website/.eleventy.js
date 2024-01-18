const pluginWebc = require("@11ty/eleventy-plugin-webc");
const path = require('path')

module.exports = function(eleventyConfig) {
	eleventyConfig.addPlugin(pluginWebc);
};
