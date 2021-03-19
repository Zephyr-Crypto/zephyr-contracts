const { ethers } = require("hardhat");

//Hash a value with type address
function hashAddress(a) {
    return ethers.utils.solidityKeccak256(["address"],[a]);
}

//Hash two bytes32 nodes together
function hashPair(a, b) {
    return ethers.utils.solidityKeccak256(["bytes32", "bytes32"], [a, b]);
}

//Hash an array of addresses to form leaves
function hashLeaves(data) {
    let hashes = [];
    for (let i = 0; i < data.length; i++) {
        hashes.push(hashAddress(data[i]));
    }
    return hashes;
}

//Hash a branch of nodes together to create a new branch
function hashBranch(nodes) {
    let hashes = [];
    for (let i = 0; i < nodes.length - 1; i+=2) {
        hashes.push(hashPair(nodes[i], nodes[i+1]));
    }
    if (nodes.length % 2 == 1) {
        let node = nodes[nodes.length - 1];
        hashes.push(hashPair(node, node));
    }
    return hashes;
}

module.exports = { 
    hashAddress,
    hashPair,
    hashLeaves,
    hashBranch
};