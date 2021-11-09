const Web3 = require('web3');
const AWS = require('aws-sdk');
exports.bufferToHex = require('ethereumjs-util').bufferToHex;
exports.recoverPersonalSignature = require('eth-sig-util').recoverPersonalSignature;
exports.jwt = require('jsonwebtoken');
exports.dc = new AWS.DynamoDB.DocumentClient();
exports.kms = new AWS.KMS();

const projectId = '001d284c03cc464a9888777474bdb849';
const url = `https://polygon-mumbai.infura.io/v3/${projectId}`;

const web3 = new Web3(new Web3.providers.HttpProvider(url));
exports.web3 = web3;

const adminAddr = '0xdC4574AD472aeB5453e0999461D9f89aDCF11599';
const adminPrivateKey = 'c3459facae9802177a4ba740e3c16ac2958c19dfe05f21f0b689bb4870fb91b5';
//const gasPrice = '35000000000';
//const gas = '6000000'; // limit

const tableName = 'deathroll';

exports.contractAddress = '0x17d9AadB4F3D39199d30B3A8abfC5F79084A67f9';

exports.ABI = JSON.parse('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"betId","type":"uint256"}],"name":"BetCancel","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"betId","type":"uint256"},{"indexed":false,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"BetComplete","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"betId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isAddr1Begin","type":"bool"}],"name":"BetConfirm","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"betId","type":"uint256"}],"name":"BetJoin","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"betId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"BetOpen","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"betId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"result","type":"uint256"}],"name":"RollComplete","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"denominator","type":"uint256"}],"name":"TaxSet","type":"event"},{"inputs":[{"internalType":"uint256","name":"betId","type":"uint256"}],"name":"cancelBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"cancelBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"betId","type":"uint256"},{"internalType":"bool","name":"isAddr1Winner","type":"bool"}],"name":"completeBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"betId","type":"uint256"},{"internalType":"uint256","name":"result","type":"uint256"}],"name":"completeRoll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"betId","type":"uint256"}],"name":"confirmBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes20","name":"auth","type":"bytes20"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes32","name":"pwdHash","type":"bytes32"}],"name":"createBet","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"betId","type":"uint256"}],"name":"getBet","outputs":[{"components":[{"internalType":"bool","name":"isConfirmed","type":"bool"},{"internalType":"address","name":"addr1","type":"address"},{"internalType":"address","name":"addr2","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes32","name":"password","type":"bytes32"}],"internalType":"struct Bet","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getBet","outputs":[{"components":[{"internalType":"bool","name":"isConfirmed","type":"bool"},{"internalType":"address","name":"addr1","type":"address"},{"internalType":"address","name":"addr2","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes32","name":"password","type":"bytes32"}],"internalType":"struct Bet","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getConfig","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractBalance","outputs":[{"internalType":"int256","name":"","type":"int256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTax","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getUser","outputs":[{"components":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"betId","type":"uint256"},{"internalType":"uint256","name":"fromBlock","type":"uint256"},{"internalType":"uint256","name":"toBlock","type":"uint256"}],"internalType":"struct User","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getUser","outputs":[{"components":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"betId","type":"uint256"},{"internalType":"uint256","name":"fromBlock","type":"uint256"},{"internalType":"uint256","name":"toBlock","type":"uint256"}],"internalType":"struct User","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes20","name":"auth","type":"bytes20"},{"internalType":"uint256","name":"betId","type":"uint256"},{"internalType":"bytes32","name":"password","type":"bytes32"}],"name":"joinBet","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"openBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"openBetRenew","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"resolveBet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"min","type":"uint256"},{"internalType":"uint256","name":"max","type":"uint256"}],"name":"setBetLimits","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"denominator","type":"uint256"}],"name":"setTax","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"confirm","type":"uint256"},{"internalType":"uint256","name":"expire","type":"uint256"}],"name":"setTimeLimits","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"taxLimit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]');

web3.eth.accounts.wallet.add(adminPrivateKey);

const contract = new web3.eth.Contract(exports.ABI, exports.contractAddress, {
    from: adminAddr
});
exports.contract = contract;

const authRowPrefix = "AUTH#";
const betRowPrefix = "BET#";

exports.JWT_SECRET = "71618263a703ee11e8ee343b20d074a5c4e816802c18b9a3fcdb34774950efdbaed9d31cd10b5af62abc6fb1bb285266780013d4cd210fd623713d4574900a4fa3b8248088e86f017ad34c77faafe3fe4943c2fa5b7ebda502b683fbb32d45d75b4cb21038749063dce688b15b9d962b60a3da58d1d314352aff87e3cfc98a4e";

const authCooldownSeconds = 10;
const authCooldown = [];

const BN = web3.utils.BN;
const BN_TWO = new BN(2);
const BN_TEN = new BN(10);
const BN_HUNDRED = new BN(100);
const BN_TEN_THOUSAND = new BN(10000);
const BN_BET_SANITY = new BN(256).pow(BN_TWO).div(BN_TEN);
const BN_CEIL_MIN = BN_HUNDRED;
const BN_CEIL_MAX = BN_TEN_THOUSAND;

exports.getCeil = (bet) => {
    let betAmount = new BN(exports.web3.utils.fromWei(bet.addr2 === emptyAddr ? bet.balance : bet.balance.div(BN_TWO)));
    // todo: get IRL value to determine ceil as 1 token might be 1 cent or 1 billion dollars at any given moment
    //bet sanity might not be necessary here just makes sure bet * 10 doesn't go over uint256 but maybe with BN library it doesn't matter so idk
    return (betAmount.gte(BN_BET_SANITY) ? BN_CEIL_MAX : BN.max(BN_CEIL_MIN, BN.min(betAmount.mul(BN_TEN), BN_CEIL_MAX))).toString();
};

exports.isAuthCooldown = (ip) => {
    let i = authCooldown.length;
    let now = Math.floor(Date.now() / 1000); // todo: maybe not call this so often
    let r = false;
    while (i--) {
        if (authCooldown[i].time <= now) authCooldown.splice(i, 1);
        else if (authCooldown[i].ip === ip) r = true;
    }
    if (!r) authCooldown.push({ ip: ip, time: now + authCooldownSeconds });
    return r;
};

exports.GameException = class GameException extends Error {
    constructor(args){
        super(args);
        this.name = "GameException"
    }
};

exports.sha1 = async (str) => {
    const buffer = new TextEncoder("utf-8").encode(str);
    const hash = await crypto.subtle.digest('SHA-1', buffer);
    const hexCodes = [];
    const view = new DataView(hash);
    for (let i = 0; i < view.byteLength; i += 1) {
        const byte = view.getUint8(i).toString(16)
        hexCodes.push(byte);
    }
    return '0x' + hexCodes.join('');
};

//        return (betMax, betMin, confirmTime, expireTime);
exports.getConfig = async () => {
    let data = await contract.methods.getConfig().call();
    return {
        betMax: new BN(data[0]),
        betMin: new BN(data[1]),
        confirmTime: new BN(data[2]),
        expireTime: new BN(data[3])
    };
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


exports.getBetRow = async (betId) => {
    let query = {
        TableName: tableName,
        Key: { id: betId },
        ReturnValues: 'ALL_NEW'
    };
    return (await exports.dc.update(query).promise()).Attributes;
};

exports.getAuthRow = async (addr) => {
    let query = {
        TableName: tableName,
        Key: { id: authRowPrefix+addr },
        // so users can't spam our db with nonsense addresses:
        ConditionExpression: 'attribute_exists(id)',
    };
    return exports.dc.update(query).promise();
};

exports.setAuthRow = async (addr, betId, token, expire) => {
    let query = {
        TableName: tableName,
        Key: { id: authRowPrefix+addr },
        UpdateExpression: 'SET #betId = :betId, #token = :token, #expire = :expire',
        ExpressionAttributeNames: {
            '#betId': 'betId',
            '#token': 'token',
            '#expire': 'expire',
        },
        ExpressionAttributeValues: {
            ':addr': betId,
            ':ceil': token,
            ':expire': expire,
        }
    };
    await exports.dc.update(query).promise(); //todo: maybe just return the promise?
};

exports.setAuthMsg = async (addr, msg, expire) => {
    let query = {
        TableName: tableName,
        Key: { id: authRowPrefix+addr },
        UpdateExpression: 'SET #msg = :msg',
        ExpressionAttributeNames: {
            '#msg': 'msg',
        },
        ExpressionAttributeValues: {
            ':msg': msg,
        }
    };
    await exports.dc.update(query).promise(); //todo: maybe just return the promise?
};

exports.initBetRow = async (betId, addr, isAddr1, ceil, expire) => {
    let query = {
        TableName: tableName,
        Key: { id: betRowPrefix+betId },
        UpdateExpression: 'SET #addr = :addr, #ceil = :ceil, #rollCount = :zero, #expire = :expire',
        ExpressionAttributeNames: {
            '#addr': isAddr1 ? 'addr1' : 'addr2',
            '#ceil': 'ceil',
            '#rollCount': 'rollCount',
            '#expire': 'expire',
        },
        ExpressionAttributeValues: {
            ':addr': addr,
            ':ceil': ceil,
            ':zero': 0,
            ':expire': expire,
        }
    };
    await exports.dc.update(query).promise();
};

exports.confirmBetRow = async (betId, addr, isAddr1, isAddr1Begin, timestamp) => {
    let query = {
        TableName: tableName,
        Key: { id: betRowPrefix+betId },
        UpdateExpression: 'SET #addr = :addr, #isAddr1Begin = :isAddr1Begin, #timestamp = :timestamp',
        ExpressionAttributeNames: {
            '#addr': isAddr1 ? 'addr1' : 'addr2',
            '#isAddr1Begin' : 'isAddr1Begin',
            '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
            ':addr': addr,
            'isAddr1Begin': isAddr1Begin,
            ':timestamp': timestamp,
        }
    };
    await exports.dc.update(query).promise();
};

exports.updateBetRow = async (betId, result, timestamp) => {
    let query = {
        TableName: tableName,
        Key: { id: betRowPrefix+betId },
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

exports.deleteBetRow = async (betId) => {
    let query = {
        TableName: tableName,
        Key: { id: betRowPrefix+betId }
    };
    await exports.dc.delete(query).promise();
};