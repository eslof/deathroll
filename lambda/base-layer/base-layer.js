const Web3 = require('web3');
const AWS = require('aws-sdk');
let url = 'https://polygon-mumbai.infura.io/v3/';
let projectId = '33bd1e44d24446c2861d2935a95f1963';
exports.blockRange = 10000;

//There is a big difference between responses directly from AWS.DynamoDB and AWS.DynamoDB.DocumentClient. In short, the former will return numbers as strings, while the latter will return numbers as numbers.
exports.dc = new AWS.DynamoDB.DocumentClient();
exports.kms = new AWS.KMS();
exports.web3 = null;
exports.BN = null;

let contractAddr = '';
let adminAddr = '';
let adminPrivateKey = '';
let contractAbi = '';
let gasPrice = '1';
let gas = '2'; // limit

exports.BN_TWO = null;
exports.BN_TEN = null;
exports.BN_HUNDRED = null;
exports.BN_TEN_THOUSAND = null;
exports.BN_BET_SANITY = null;

//        return (betMax, betMin, confirmTime, expireTime);
exports.init = async () => {
    try {
        if (exports.config) return;
        exports.web3 = await new Web3(new Web3.providers.HttpProvider(url+projectId));
        //let toBN = exports.web3.utils.toBN;
        exports.BN = exports.web3.utils.BN;
        let BN = exports.BN;
        exports.BN_TWO = new BN(2);
        exports.BN_TEN = new BN(10);
        exports.BN_HUNDRED = new BN(100);
        exports.BN_TEN_THOUSAND = new BN(10000);
        exports.BN_BET_SANITY= new BN(256).pow(2).div(exports.BN_TEN);
        exports.web3.eth.accounts.wallet.add(adminPrivateKey);
        exports.contract = new exports.web3.eth.Contract(JSON.parse(contractAbi), contractAddr, {
            from: adminAddr,
            gasPrice: gasPrice,
            gas: gas,
        });
        let config = {};
        [config.betMax, config.betMin, config.confirmTime, config.expireTime] = await exports.contract.methods.getConfig().call();
        exports.config = config;
    } catch (e) {
        console.log(e);
    }
};

exports.getBet = async (betId) => {
    let bet = {};
    [bet.isAddr1Begin, bet.isConfirmed, bet.addr1, bet.addr2, bet.balance, bet.timestamp, bet.password] = await exports.contract.methods.getBet(betId).call();
    return bet;
};

exports.getUser = async (address) => {
    let user = {};
    [user.balance, user.betId, user.fromBlock, user.toBlock] = await exports.contract.methods.getUser(address).call();
    return user;
};

exports.getRow = async (betId) => {

};

exports.initRow = async (betId, addr, isP1, ceil) => {

};

exports.confirmRow = async (betId, addr, isP1) => {

};

exports.updateRow = async (betId, result) => {

};

exports.completeRow = async (betId) => {

};

let getBytes = async (ceil) => {
    let bytes = Math.ceil(Math.log(ceil+1) / Math.log(2));
    let params = {
        NumberOfBytes: bytes
    };
    return await new Promise((resolve, reject) => {
        exports.kms.generateRandom(params, function(err, data) {
            if (err) {
                console.log('Error occurred: ' + err, err.stack);
                reject();
            } else {
                console.log('Data: ' + data);
                resolve(data);
            }
        });
    });
};

exports.getRoll = async (ceil) => {
    let data = (await getBytes(ceil)).Plaintext.data;
    let sum = data.reduce((a, b) => a + b);
    return sum % (ceil + 1);
};