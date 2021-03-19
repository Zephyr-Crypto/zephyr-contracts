const utils = require("./merkle-utils");

/**
 * A script that will create a merkle root based on a specified dataset of addresses.
 * 
 * Note that the dataset should never change.  If a change to the dataset occurs,
 * the merkle root and proofs are invalidated and must be recalculated.
 * 
 * To use: node create-merkle-root.js >> hardhat-root.txt
 */

//The file to parse for addresses
let accounts = "hardhat-accounts.txt";

//Hash all nodes and arrive at a root
let fs = require('fs');
fs.readFile(accounts, 'utf8', function(err, data) {

    if (err) throw err;

    let accounts = data.split('\r\n');

    getRoot(accounts);

});

//Hash all nodes and print them to console until a root is derived
function getRoot(dataset) {

    let branch = utils.hashLeaves(dataset);
    for (e in branch) console.log(e + " : " + branch[e]);
    console.log("");

    while (branch.length > 1) {
        branch = utils.hashBranch(branch);
        for (e in branch) console.log(e + " : " + branch[e]);
        console.log("");
    }
    
}