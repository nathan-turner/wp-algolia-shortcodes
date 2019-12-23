const { name } = require('./package.json');
const path = require('path');
require("babel-core/register");
require("babel-polyfill");

const MiniCssExtractPlugin = require("mini-css-extract-plugin"),
    cssPlugin = new MiniCssExtractPlugin({ filename: "[name].css" });

const HtmlWebpackPlugin = require('html-webpack-plugin'),
    htmlPlugin = new HtmlWebpackPlugin({
        title: name,
        inject: 'head',
        template: path.resolve(__dirname, './src/index.html')
    });

module.exports = {
    mode: 'development',
    entry: ['babel-polyfill', path.resolve(__dirname, './src/shortcodes.js')],
	/* {
        'bundle': path.resolve(__dirname, './src/shortcodes.js')
    }, */
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [     
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
				query: {
                    "presets": [
					[
					  "@babel/preset-env",
					  {
						"targets": {							
							"ie": "11"
						  }
					  }
					]
				  ]
				}
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'file-loader',
                options: { name: '[name].[ext]' }
            },
            {
                test: /\.less$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'less-loader'
                ],
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
        ]
    },
    resolve: {
        extensions: ['*', '.js'],
    },
    plugins: [cssPlugin, htmlPlugin],
}
