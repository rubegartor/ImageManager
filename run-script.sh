#!/bin/bash
cp -r node_modules/@fortawesome/fontawesome-free/webfonts app/assets/css
cp -r app/assets/sass/Commons/Proton/images app/assets/css
cp -r app/assets/sass/Commons/Proton/fonts app/assets/css
node-sass app/assets/sass/app.scss app/assets/css/app.css
electron main.js