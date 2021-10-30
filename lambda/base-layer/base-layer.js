const Web3 = require('web3');
const AWS = require('aws-sdk');
let url = 'https://polygon-mumbai.infura.io/v3/';
let projectId = '33bd1e44d24446c2861d2935a95f1963';
exports.blockRange = 10000;

//There is a big difference between responses directly from AWS.DynamoDB and AWS.DynamoDB.DocumentClient. In short, the former will return numbers as strings, while the latter will return numbers as numbers.
exports.dc = new AWS.DynamoDB.DocumentClient();
exports.kms = new AWS.KMS();

let web3 = new Web3(new Web3.providers.HttpProvider(url+projectId));
exports.web3 = web3;

let BN = web3.utils.BN; //toBN // todo: figure out what's right here
exports.BN = BN;

exports.BN_TWO = new BN(2);
exports.BN_TEN = new BN(10);
exports.BN_HUNDRED = new BN(100);
exports.BN_TEN_THOUSAND = new BN(10000);
exports.BN_BET_SANITY = new BN(256).pow(exports.BN_TWO).div(exports.BN_TEN);
exports.BN_CEIL_MIN = exports.BN_HUNDRED;
exports.BN_CEIL_MAX = exports.BN_TEN_THOUSAND;

web3.eth.accounts.wallet.add(adminPrivateKey);
let contract = new web3.eth.Contract(JSON.parse(contractAbi), contractAddr, {
    from: adminAddr,
    gasPrice: gasPrice,
    gas: gas,
});
exports.contract = contract;

let contractAddr = '';
let adminAddr = '';
let adminPrivateKey = '';
let contractAbi = JSON.parse('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminAdd","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAdmin","type":"address"}],"name":"AdminRemove","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerSet","type":"event"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"addAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getAdmins","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getOwnerBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isAdmin","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ownerWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"removeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"}]');
let gasPrice = '1';
let gas = '2'; // limit

//        return (betMax, betMin, confirmTime, expireTime);
exports.getConfig = async () => {
    let config = {};
    [config.betMax, config.betMin, config.confirmTime, config.expireTime] = (await contract.methods.getConfig().call()).map(new BN);
    return config;
}

exports.getBet = async (betId) => {
    let data = await contract.methods.getBet(betId).call();
    return {
        isConfirmed: data[0],
        addr1: data[1],
        addr2: data[2],
        balance: new BN(data[3]),
        timestamp: new BN(data[4]),
        password: data[5]
    };
};

exports.getUser = async (address) => {
    let data = await contract.methods.getUser(address).call();
    return {
        balance: new BN(data[0]),
        betId: data[1],
        fromBlock: new BN(data[2]),
        toBlock: new BN(data[3]),
    }
};

exports.tableName = 'deathroll';

exports.getRow = async (betId) => {
    let query = {
        TableName: exports.tableName,
        Key: { id: betId },
        ReturnValues: 'ALL_NEW'
    };
    return (await exports.dc.update(query).promise()).Attributes;
};

exports.initRow = async (betId, addr, isAddr1, ceil) => {
    let query = {
        TableName: exports.tableName,
        Key: { id: betId },
        UpdateExpression: 'SET #addr = :addr, #ceil = :ceil, #rollCount = :zero',
        ExpressionAttributeNames: {
            '#addr': isAddr1 ? 'addr1' : 'addr2',
            '#ceil': 'ceil',
            '#rollCount': 'rollCount'
        },
        ExpressionAttributeValues: {
            ':addr': addr,
            ':ceil': ceil,
            ':zero': 0
        }
    };
    await exports.dc.update(query).promise();
};

exports.confirmRow = async (betId, addr, isAddr1, isAddr1Begin, timestamp) => {
    let query = {
        TableName: exports.tableName,
        Key: { id: betId },
        UpdateExpression: 'SET #addr = :addr, #isAddr1Begin = :isAddr1Begin, #timestamp = :timestamp',
        ExpressionAttributeNames: {
            '#addr': isAddr1 ? 'addr1' : 'addr2',
            '#isAddr1Begin' : 'isAddr1Begin',
            '#timestamp': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':addr': addr,
            'isAddr1Begin': isAddr1Begin,
            ':timestamp': timestamp
        }
    };
    await exports.dc.update(query).promise();
};

exports.updateRow = async (betId, result, timestamp) => {
    let query = {
        TableName: exports.tableName,
        Key: { id: betId },
        UpdateExpression: 'SET #ceil = :ceil, #rollCount = #rollCount + :rollCount, #timestamp = :timestamp',
        ExpressionAttributeNames: {
            '#ceil': 'ceil',
            '#rollCount': 'rollCount',
            '#timestamp': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':ceil': result,
            ':rollCount': 1,
            ':timestamp': timestamp
        }
    };
    await exports.dc.update(query).promise();
};

exports.deleteRow = async (betId) => {
    let query = {
        TableName: exports.tableName,
        Key: { id: betId }
    };
    await exports.dc.delete(query).promise();
};

exports.LOG_TWO = Math.log(2);

let getBytes = async (ceil) => {
    // TODO: BN.js doesn't have ceil, figure it out; but it should be safe, only necessary for checking against bet amount
    let byteCount = Math.max(64, Math.ceil(Math.log(Number(ceil)+1) / exports.LOG_TWO));

    let params = {
        NumberOfBytes: byteCount
    };
    return await exports.kms.generateRandom(params).promise();

    /*return await new Promise((resolve, reject) => {
        exports.kms.generateRandom(params, function(err, data) {
            if (err) {
                console.log('Error occurred: ' + err, err.stack);
                reject();
            } else {
                console.log('Data: ' + data);
                resolve(data);
            }
        });
    });*/
};

exports.getRoll = async (ceil) => {
    let data = (await getBytes(ceil)).Plaintext.data;
    let sum = data.reduce((a, b) => a + b);
    return sum % (ceil + 1);
};