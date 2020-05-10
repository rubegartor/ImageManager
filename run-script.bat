echo "%cd%"
xcopy "%cd%/node_modules/@fortawesome/fontawesome-free/webfonts" "%cd%/app/assets/css/webfonts" /S /E
xcopy "%cd%/node_modules/jstree-bootstrap-theme/dist/themes/proton" "%cd%/app/assets/css/proton" /S /E
node-sass app/assets/sass/app.scss app/assets/css/app.css
electron main.js