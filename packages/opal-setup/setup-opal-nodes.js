#! /usr/bin/env node
/**
 *  Copyright Telligro Pte Ltd 2017
 *
 *  This file is part of OPAL.
 *
 *  OPAL is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  OPAL is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OPAL.  If not, see <http://www.gnu.org/licenses/>.
 */
console.log('Setup Node-RED with OPAL nodes');

const child_process = require('child_process');
const path = require('path')
const shell = require('shelljs');
const fs = require('fs-extra');
let child;
console.log(__dirname);
console.log(process.cwd());

let webdriversHome = path.join(__dirname, 'webdrivers');
shell.mkdir('-p', webdriversHome);
shell.exec('webdriver-manager update --ie --out_dir ' + webdriversHome);
let chromeDriverName = process.platform === 'win32' ? 'chromedriver.exe' : 'chromedriver';
let chromeDriverPath = path.join(webdriversHome, chromeDriverName);
let chromeDriverDownloadedExt = process.platform === 'win32' ? '*.exe' : '?.??';
shell.cp(path.join(webdriversHome, 'chromedriver_' + chromeDriverDownloadedExt), chromeDriverPath);

function getOpalModulePath(modName) {
    let modPath = path.join(__dirname, '..', modName);
    if (!fs.existsSync(modPath)) {
        console.log('Checking Local')
        modPath = path.join(__dirname, 'node_modules', '@telligro', modName);
        if (!fs.existsSync(modPath)) {
            console.error('OPAL nodes are missing. Setup will terminate');
            return;
        }
    }
    return modPath;
}

fs.readFile(path.join(__dirname, 'package.json'), { encoding: 'utf8' }, (err, content) => {
    console.log('Reading package');
    if(err){
        console.error(err);
        process.exit(1);
    }
    var packageJSON = JSON.parse(content);
    var opalNodes = Object.keys(packageJSON.dependencies)
        .filter(dep => (dep.indexOf('@telligro/opal-node-') !== -1 || dep.indexOf('@telligro/opal-node-')) !== -1 && dep != '@telligro/opal-node-red')
        .map(dep => dep.replace('@telligro/', ''));

    // console.log(__dirname);
    // console.log(process.cwd());
    var nodeRedHome = path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '.node-red');
    shell.mkdir('-p', nodeRedHome);
    opalNodes.forEach(opalNode => {
        console.log('Linking module:%s', opalNode);
        let opalNodePath = getOpalModulePath(opalNode);
        if (undefined === opalNodePath) {
            console.error('OPAL nodes are missing. Setup will terminate');
            process.exit(1);
        }
        console.log('npm link from %s', opalNodePath);
        shell.cd(opalNodePath);
        shell.exec('npm link');

        console.log('npm link %s from %s', opalNode, nodeRedHome);
        shell.cd(nodeRedHome);
        shell.exec('npm link ' + '@telligro/' + opalNode);
        
    });
    try {
        let nodeRedPath = getOpalModulePath('opal-node-red');
        if (undefined === nodeRedPath) {
            console.error('OPAL node-red is missing. Setup will terminate');
            process.exit(1);
        }
        child = require('child_process').execFile('node', [
            path.join(nodeRedPath, 'red.js')]);
        // use event hooks to provide a callback to execute when data are available: 

        child.stdout.on('data', function (data) {
            if (data.indexOf('Server now running')!==-1){
                console.log('Installation Complete');
                process.exit(0);
            } else if (data.indexOf('error')!==-1){
                process.stdout.write(data.toString());
                console.warn('There were error during setup. Setup could not complete.');
                process.exit(0);
            }
            // process.stdout.write(data.toString());
        });

        child.stderr.on('data', function (data) {
            process.stdout.write(data.toString());
        });
    } catch (ex) {
        process.stdout.write(ex.toString());
    }
});
