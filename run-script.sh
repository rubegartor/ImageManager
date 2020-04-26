#!/bin/bash
cp -r node_modules/@fortawesome/fontawesome-free/webfonts app/assets/css
node-sass app/assets/sass/app.scss app/assets/css/app.css
electron main.js