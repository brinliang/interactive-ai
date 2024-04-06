import * as path from 'path';
import { Configuration } from 'webpack';

const config: Configuration = {
    mode: 'development',
    entry: './src/index.tsx',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css?$/,
                use: ['style-loader', 'css-loader'],
                // exclude: /node_modules/,
                exclude: /node_modules\/(?!reactflow).*/,
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'build'),
    },
};

export default config;