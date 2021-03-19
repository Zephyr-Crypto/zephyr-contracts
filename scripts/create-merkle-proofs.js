const utils = require("./merkle-utils");

/**
 * A script that will create merkle proofs based on a specified dataset of addresses.
 * 
 * Note that the dataset should never change.  If a change to the dataset occurs,
 * the merkle root and proofs are invalidated and must be recalculated.
 * 
 * To use: node create-merkle-proofs.js >> hardhat-proofs.txt
 */

//The file to parse for addresses.  Should be 1 address per line.
let accounts = "hardhat-accounts.txt";

//Get the proofs for all leaves
let fs = require('fs');
fs.readFile(accounts, 'utf8', function(err, data) {

    if (err) throw err;

    let accounts = data.split('\r\n');

    getProofs(accounts);

});

//Iterate through the dataset and determine each leaf's proofs
//Depending on the size of the dataset, this process can take some time
function getProofs(dataset) {

    console.log("[");

    //For every address in the dataset...
    for (let i = 0; i < dataset.length; i++) {

        let branch = utils.hashLeaves(dataset);
        let hash = branch[i];
        let proofs = [];

        //Run through the merkle tree until we arrive at the root
        while (branch.length > 1) {

            //Find the hash in question, so that we know the proof to match it with
            for (let i = 0; i < branch.length; i+=2) {

                //Odd number of elements; the last element will be hashed with itself
                if (branch.length % 2 == 1) {
                    if (i == (branch.length - 1)) {
                        if (branch[i] == hash) {
                            proofs.push(hash);
                            hash = utils.hashPair(hash, hash);
                            break;
                        }
                    }
                }

                //Even numbered element; hash with the element on the right
                if (branch[i] == hash) {
                    proofs.push(branch[i+1]);
                    hash = utils.hashPair(hash, branch[i+1]);
                    break;
                }

                //Odd numbered element; hash with the element on the left
                if (branch[i+1] == hash) {
                    proofs.push(branch[i]);
                    hash = utils.hashPair(branch[i], hash);
                    break;
                }
                
            }

            //Next branch level
            branch = utils.hashBranch(branch);

        }

        if (i != dataset.length - 1) {
            console.log(JSON.stringify(proofs) + ",");
        } else {
            console.log(JSON.stringify(proofs));
        }

    }

    console.log("]");

}